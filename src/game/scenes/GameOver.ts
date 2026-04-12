import { Scene } from 'phaser'
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
        this.cameras.main.setBackgroundColor(this.result.survived ? 0x081915 : 0x170609)
        this.drawBackdrop()

        const title = this.result.survived ? 'Splashdown Signal Acquired' : 'Capsule Lost'
        const status = this.result.survived ? 'Crew survived reentry.' : this.result.reason
        const report = [
            status,
            '',
            `Time in corridor: ${this.result.durationSeconds.toFixed(1)}s`,
            `Peak heat: ${Math.round(this.result.maxHeat)}%`,
            `Hull damage: ${Math.round(this.result.damage)}%`,
            '',
            'Press SPACE, R, or click to retry'
        ].join('\n')

        this.add.text(512, 250, title, {
            fontFamily: 'Arial Black',
            fontSize: 46,
            color: this.result.survived ? '#bbf7d0' : '#fecdd3',
            stroke: '#05060a',
            strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5)

        this.add.text(512, 410, report, {
            fontFamily: 'Arial',
            fontSize: 26,
            color: '#f8fafc',
            align: 'center',
            lineSpacing: 8
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
        graphics.fillRect(0, 0, 1024, 768)

        graphics.lineStyle(2, this.result.survived ? 0x45d483 : 0xef4444, 0.25)
        for (let y = 120; y < 720; y += 80)
        {
            graphics.lineBetween(160, y, 864, y + 28)
        }
    }
}
