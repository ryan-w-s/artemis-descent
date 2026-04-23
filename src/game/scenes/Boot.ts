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
        this.load.image('obstacle-plane', 'assets/obstacles/plane.png')
    }

    create ()
    {
        this.scene.start('MainMenu')
    }
}
