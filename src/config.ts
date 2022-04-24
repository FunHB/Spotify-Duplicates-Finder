import { readFileSync } from 'fs'

export class Config {
    public readonly token: string
    public readonly playlistId: string

    constructor() {
        const { token, playlistId } = JSON.parse(readFileSync('./config.json') as unknown as string)
        this.token = token
        this.playlistId = playlistId
    }
}