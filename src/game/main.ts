import { Boot } from './scenes/Boot'
import { GameOver } from './scenes/GameOver'
import { Game as MainGame } from './scenes/Game'
import { GAME_HEIGHT, GAME_WIDTH } from './config/screen'
import { AUTO, Game, Scale } from 'phaser'

const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    backgroundColor: '#06080d',
    scene: [
        Boot,
        MainGame,
        GameOver
    ]
}

const StartGame = (parent: string) => {

    return new Game({
        ...config,
        scale: {
            parent,
            width: GAME_WIDTH,
            height: GAME_HEIGHT,
            mode: Scale.FIT,
            autoCenter: Scale.CENTER_BOTH
        }
    })

}

export default StartGame
