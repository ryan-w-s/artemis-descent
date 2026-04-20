import { Scene } from 'phaser'
import { GAME_CENTER_X, GAME_HEIGHT, GAME_WIDTH } from '../config/screen'
import { MUSIC_KEYS, playMusic } from '../systems/MusicSystem'
import type { RunResult } from '../types'

export class GameOver extends Scene
{
    private result: RunResult = {
        survived: false,
        reason: 'Signal lost',
        durationSeconds: 0,
        maxHeat: 0,
        damage: 0
    }

    constructor ()
    {
        super('GameOver')
    }

    init (data: RunResult): void
    {
        this.result = data
    }

    create (): void
    {
        playMusic(this, MUSIC_KEYS.results)

        this.cameras.main.setBackgroundColor(this.result.survived ? 0x081915 : 0x170609)
        this.drawBackdrop()

        const title = this.result.survived ? 'Splashdown Signal Acquired' : 'Capsule Lost'
        const status = this.result.survived ? 'Crew survived reentry.' : this.result.reason
        const report = [
            status,
            '',
            `Time in corridor: ${this.result.durationSeconds.toFixed(1)}s`,
            `Hull damage: ${Math.round(this.result.damage)}%`,
            '',
            'Press SPACE, R, or click to retry'
        ].join('\n')

        this.add.text(GAME_CENTER_X, 222, title, {
            fontFamily: 'Arial Black',
            fontSize: 34,
            color: this.result.survived ? '#bbf7d0' : '#fecdd3',
            stroke: '#05060a',
            strokeThickness: 8,
            align: 'center',
            wordWrap: { width: GAME_WIDTH - 48 }
        }).setOrigin(0.5)

        this.add.text(GAME_CENTER_X, 412, report, {
            fontFamily: 'Arial',
            fontSize: 22,
            color: '#f8fafc',
            align: 'center',
            lineSpacing: 8,
            wordWrap: { width: GAME_WIDTH - 56 }
        }).setOrigin(0.5)

        const restart = () => this.scene.start('Game')

        this.input.once('pointerdown', restart)
        this.input.keyboard?.once('keydown-SPACE', restart)
        this.input.keyboard?.once('keydown-R', restart)
    }

    private drawBackdrop (): void
    {
        const graphics = this.add.graphics()
        graphics.fillGradientStyle(0x0d111d, 0x0d111d, 0x22070b, 0x062019, 1)
        graphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

        graphics.lineStyle(2, this.result.survived ? 0x45d483 : 0xef4444, 0.25)
        for (let y = 120; y < GAME_HEIGHT - 48; y += 80)
        {
            graphics.lineBetween(40, y, GAME_WIDTH - 40, y + 28)
        }
    }
}
