import fetch, { RequestInit } from 'node-fetch'
import { Config } from './config.js'
import { Track } from './Track.js'

interface TrackWithIndex {
    index: number,
    track: Track
}

export class Spotify {
    private readonly config: Config

    private readonly limit: number
    private readonly start: number

    private total: number = 1
    private offset: number = 0

    private list: Track[] = []
    public duplicates: { first: { index: number, track: Track }, second: { index: number, track: Track } }[] = []

    private get url(): string { return `https://api.spotify.com/v1/playlists/${this.config.playlistId}/tracks?market=ES&limit=${this.limit}&offset=${this.offset}` }
    private get requestData(): RequestInit {
        return {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.config.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        }
    }

    private async response(): Promise<any> {
        return (await fetch(this.url, this.requestData)).json()
    }

    constructor(start = 0, limit = 100) {
        this.config = new Config()
        this.start = start
        this.limit = limit
    }

    private async findDuplicate(): Promise<void> {
        const array = this.list.slice()
        array.sort((a, b) => {
            if (!a.name || a.name < b.name) return -1
            if (!b.name || a.name > b.name) return 1
            return 0
        })
        array.forEach((track, index) => {
            if (index + 1 == array.length) return

            const next = array[index + 1]
            if (!next?.name) return

            const trackWithIndex: TrackWithIndex = { index: this.list.findIndex(_track => _track.id == track.id), track }
            const nextWithIndex: TrackWithIndex = { index: this.list.findIndex(_track => _track.id == next.id), track: next }

            if (this.compareTracks(trackWithIndex, nextWithIndex)) {
                this.duplicates.push({
                    first: trackWithIndex,
                    second: nextWithIndex
                })
            }
        })
    }

    private async getList(): Promise<Track[]> {
        try {
            let json = await this.response()

            if (json.error) {
                if (json.error.status != 401) throw `(${json.error.status}) ${json.error.message}`

                await this.getToken()
                json = await this.response()
            }

            if (this.total < this.limit) this.total = json.total

            return json.items.map((item: { track: Track }) => item.track)
        } catch (exception) {
            throw new Error(`[Request] ${exception}`)
        }
    }

    private async getToken(): Promise<void> {
        try {
            console.info(`[Request] Getting token...`)
            const json = await (await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + Buffer.from(this.config.client_id + ':' + this.config.client_secret).toString('base64')
                },
                body: 'grant_type=client_credentials'
            })).json()

            if (json.error) throw `(${json.error.status}) ${json.error.message}`

            this.config.token = json.access_token
            this.config.save()

            return json.access_token;
        } catch (exception) {
            throw new Error(`[Request] ${exception}`)
        }
    }

    private compareTracks(first: TrackWithIndex, second: TrackWithIndex): boolean {
        return first.index != second.index && first.track.name == second.track.name
            && first.track.artists.map(_artist => _artist.name).some(_artist => second.track.artists.map(_artist => _artist.name).includes(_artist))
    }

    public async validate(): Promise<void> {
        console.info("[Validate] Starting...")

        for (let i = 0; i < Math.ceil(this.total / this.limit); ++i) {
            this.offset = this.start + (i * this.limit)

            console.info(`[Validate] Offset: ${this.offset}, Limit: ${this.limit}`)

            this.list = this.list.concat(await this.getList())
            await new Promise(resolve => setTimeout(resolve, 1000))
        }

        await this.findDuplicate()
        console.info("[Validate] Done!")
    }
}