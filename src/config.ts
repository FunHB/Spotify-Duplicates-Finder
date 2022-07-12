import { readFileSync, writeFileSync } from 'fs'

export class Config {
    public token: string
    public readonly client_id: string
    public readonly client_secret: string
    public readonly playlistId: string

    constructor() {
        const { token, client_id, client_secret, playlistId } = JSON.parse(readFileSync('./config.json') as unknown as string)
        this.token = token
        this.client_id = client_id
        this.client_secret = client_secret
        this.playlistId = playlistId
    }

    public save(): void {
        const { token, client_id, client_secret, playlistId } = this
        const config = JSON.stringify({ token: token, client_id:client_id, client_secret:client_secret, playlistId:playlistId })
        writeFileSync('./config.json', config)
    }
}