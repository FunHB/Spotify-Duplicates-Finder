import { Spotify } from "./Spotify.js"
import { Config } from './config.js'
import { Track } from "./Track.js"
import { writeFileSync } from 'fs'

const main = async () => {
    const config = new Config()
    const spotify = new Spotify(config.token, config.playlistId)
    await spotify.validate()

    const duplicates = `[\n${spotify.duplicates.map(tracks => `\t[${toString(tracks.first)}, ${toString(tracks.second)}]`).join(',\n\n')}\n]`
    // console.info(`Duplicates: ${duplicates}`)
    writeFileSync('./duplicates.json', duplicates)
}

const toString = (element: { index: number, track: Track }) => {
    return `{
        "index": "${element.index}",
        "name": "${element.track.name}",
        "artists": [ ${element.track.artists.map(artist => `"${artist.name}"`).join(', ')} ],
        "link": "${element.track.external_urls.spotify}"
    }`
}

main()