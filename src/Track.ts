export interface Track {
    id: string
    name: string
    external_urls: { spotify: string }
    artists: {
        name: string,
        external_urls: {
            spotify: string
        }
    }[]
}