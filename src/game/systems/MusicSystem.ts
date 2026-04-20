import type { Scene, Sound } from 'phaser'

export const MUSIC_KEYS = {
    gameplay: 'music-gameplay',
    results: 'music-results'
} as const

type MusicKey = typeof MUSIC_KEYS[keyof typeof MUSIC_KEYS]

const MUSIC_VOLUME: Record<MusicKey, number> = {
    [MUSIC_KEYS.gameplay]: 0.42,
    [MUSIC_KEYS.results]: 0.32
}

let activeKey: MusicKey | undefined
let activeSound: Sound.BaseSound | undefined

export const preloadMusic = (scene: Scene): void => {
    scene.load.audio(MUSIC_KEYS.gameplay, 'assets/game-music.mp3')
    scene.load.audio(MUSIC_KEYS.results, 'assets/menu-music.mp3')
}

export const playMusic = (scene: Scene, key: MusicKey): void => {
    if (activeKey === key && activeSound)
    {
        if (activeSound.isPaused)
        {
            activeSound.resume()
        }

        return
    }

    stopActiveMusic()

    activeKey = key
    activeSound = scene.sound.add(key, {
        loop: true,
        volume: MUSIC_VOLUME[key]
    })

    const start = (): void => {
        if (activeKey === key && activeSound && !activeSound.isPlaying)
        {
            activeSound.play()
        }
    }

    if (scene.sound.locked)
    {
        scene.sound.once('unlocked', start)
        return
    }

    start()
}

const stopActiveMusic = (): void => {
    if (!activeSound)
    {
        return
    }

    activeSound.stop()
    activeSound.destroy()
    activeSound = undefined
}
