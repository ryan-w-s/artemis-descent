import { Boot } from './scenes/Boot'
import { GameOver } from './scenes/GameOver'
import { Game as MainGame } from './scenes/Game'
import { GAME_HEIGHT, GAME_WIDTH } from './config/screen'
import { AUTO, Game } from 'phaser'

const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: 'game-container',
    backgroundColor: '#06080d',
    scene: [
        Boot,
        MainGame,
        GameOver
    ]
}

const StartGame = (parent: string) => {

    return new Game({ ...config, parent })

}

export default StartGame
