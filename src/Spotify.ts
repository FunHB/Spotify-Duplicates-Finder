import fetch from 'node-fetch'
import { Track } from './Track.js'

export class Spotify {
    private readonly token: string
    private readonly playlistId: string
    private readonly limit: number
    private readonly start: number

    private total: number = 0
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

            const trackIndex = this.list.findIndex(_track => _track.id == track.id)
            const nextIndex = this.list.findIndex(_track => _track.id == next.id)

            if (this.compareTracks(track, next)) this.duplicates.push({
                first: { index: trackIndex, track: this.list[trackIndex]! },
                second: { index: nextIndex, track: this.list[nextIndex]! },
            })
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
            if (!this.total) this.total = json.total

            return json.items.map((item: { track: Track }) => item.track)
        } catch (exception) {
            throw new Error(`[Request] ${exception}`)
        }
    }

    private compareTracks(first: Track, second: Track): boolean {
        return first.name == second.name && first.id != second.id
    }

    public async validate(): Promise<void> {
        console.info("[Validate] Starting...")

        for (let i = 0; i < Math.ceil(this.total / this.limit) + 1; ++i) {
            this.offset = this.start + (i * this.limit) - i

            console.info(`[Validate] Offset: ${this.offset}, Limit: ${this.limit}`)

            this.list = this.list.concat(await this.getList())
            await new Promise(resolve => setTimeout(resolve, 1000))
        }

        await this.findDuplicate()
        console.info("[Validate] Done!")
    }
}