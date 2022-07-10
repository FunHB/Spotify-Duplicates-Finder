import fetch from 'node-fetch'
import { Track } from './Track.js'

interface TrackWithIndex {
    index: number,
    track: Track
}

export class Spotify {
    private readonly token: string
    private readonly playlistId: string
    private readonly limit: number
    private readonly start: number

    private total: number = 1
    private offset: number = 0

    private list: Track[] = []
    public duplicates: { first: { index: number, track: Track }, second: { index: number, track: Track } }[] = []

    private get url(): string { return `https://api.spotify.com/v1/playlists/${this.playlistId}/tracks?market=ES&limit=${this.limit}&offset=${this.offset}` }

    constructor(token: string, playlistId: string, start = 0, limit = 100) {
        this.token = `Bearer ${token}`
        this.playlistId = playlistId
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
            const json = await (await fetch(this.url, {
                method: 'GET',
                headers: {
                    'Authorization': this.token,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            })).json()

            if (json.error) throw `(${json.error.status}) ${json.error.message}`
            if (this.total < this.limit) this.total = json.total

            return json.items.map((item: { track: Track }) => item.track)
        } catch (exception) {
            throw new Error(`[Request] ${exception}`)
        }
    }

    private compareTracks(first: TrackWithIndex, second: TrackWithIndex): boolean {
        return first.track.name == second.track.name && first.index != second.index
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