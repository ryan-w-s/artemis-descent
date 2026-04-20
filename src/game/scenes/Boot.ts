import { Scene } from 'phaser'
import { preloadMusic } from '../systems/MusicSystem'

export class Boot extends Scene
{
    constructor ()
    {
        super('Boot')
    }

    preload (): void
    {
        preloadMusic(this)
    }

    create ()
    {
        this.scene.start('Game')
    }
}
