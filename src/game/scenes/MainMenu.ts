import { GameObjects, Input, Scene } from 'phaser'
import { GAME_CENTER_X, GAME_HEIGHT, GAME_WIDTH } from '../config/screen'
import { MUSIC_KEYS, playMusic } from '../systems/MusicSystem'

type MenuKeys = {
    space: Input.Keyboard.Key;
    enter: Input.Keyboard.Key;
};

type MenuStar = {
    x: number;
    y: number;
    radius: number;
    alpha: number;
};

const MENU_STARS: MenuStar[] = [
    { x: 26, y: 52, radius: 1.1, alpha: 0.52 },
    { x: 62, y: 142, radius: 1.7, alpha: 0.7 },
    { x: 92, y: 86, radius: 0.9, alpha: 0.45 },
    { x: 124, y: 242, radius: 1.3, alpha: 0.58 },
    { x: 158, y: 48, radius: 1.5, alpha: 0.66 },
    { x: 196, y: 172, radius: 0.8, alpha: 0.42 },
    { x: 232, y: 94, radius: 1.6, alpha: 0.7 },
    { x: 276, y: 218, radius: 1.2, alpha: 0.58 },
    { x: 318, y: 62, radius: 1.8, alpha: 0.74 },
    { x: 356, y: 154, radius: 1.1, alpha: 0.5 },
    { x: 394, y: 248, radius: 1.5, alpha: 0.68 }
]

export class MainMenu extends Scene
{
    private capsule!: GameObjects.Graphics
    private plasma!: GameObjects.Graphics
    private prompt!: GameObjects.Text
    private keys!: MenuKeys
    private hasStarted = false

    constructor ()
    {
        super('MainMenu')
    }

    create (): void
    {
        this.hasStarted = false

        playMusic(this, MUSIC_KEYS.menu)

        this.cameras.main.setBackgroundColor(0x06080d)
        this.drawBackdrop()
        this.drawTitle()
        this.drawCapsule()
        this.drawBriefing()

        this.prompt = this.add.text(GAME_CENTER_X, GAME_HEIGHT - 86, 'Press SPACE, ENTER, or click to start', {
            fontFamily: 'Arial Black',
            fontSize: 17,
            color: '#fde68a',
            stroke: '#05060a',
            strokeThickness: 5,
            align: 'center',
            wordWrap: { width: GAME_WIDTH - 48 }
        }).setOrigin(0.5)

        this.keys = this.createKeys()
        this.input.once('pointerdown', () => this.startGame())
    }

    update (timeMs: number): void
    {
        const pulse = 0.68 + (Math.sin(timeMs * 0.004) * 0.32)
        this.prompt.setAlpha(pulse)
        this.capsule.setRotation(Math.sin(timeMs * 0.0018) * 0.08)
        this.plasma.setAlpha(0.42 + (pulse * 0.18))

        if (Input.Keyboard.JustDown(this.keys.space) || Input.Keyboard.JustDown(this.keys.enter))
        {
            this.startGame()
        }
    }

    private createKeys (): MenuKeys
    {
        if (!this.input.keyboard)
        {
            throw new Error('Keyboard input is required for Artemis Descent.')
        }

        return {
            space: this.input.keyboard.addKey(Input.Keyboard.KeyCodes.SPACE),
            enter: this.input.keyboard.addKey(Input.Keyboard.KeyCodes.ENTER)
        }
    }

    private startGame (): void
    {
        if (this.hasStarted)
        {
            return
        }

        this.hasStarted = true
        this.scene.start('Game')
    }

    private drawBackdrop (): void
    {
        const graphics = this.add.graphics()
        graphics.fillGradientStyle(0x06080d, 0x08111e, 0x17304a, 0x601909, 1)
        graphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

        for (const star of MENU_STARS)
        {
            graphics.fillStyle(0xdbeafe, star.alpha)
            graphics.fillCircle(star.x, star.y, star.radius)
        }

        graphics.lineStyle(2, 0xffd166, 0.24)
        for (let y = 356; y < GAME_HEIGHT + 80; y += 62)
        {
            graphics.lineBetween(-24, y, GAME_WIDTH + 24, y + 30)
        }

        graphics.fillGradientStyle(0xff7a2f, 0xff7a2f, 0xffd166, 0xffd166, 0.18)
        graphics.fillRect(0, 384, GAME_WIDTH, GAME_HEIGHT - 384)
    }

    private drawTitle (): void
    {
        this.add.text(GAME_CENTER_X, 118, 'ARTEMIS DESCENT', {
            fontFamily: 'Arial Black',
            fontSize: 37,
            color: '#f8fafc',
            stroke: '#05060a',
            strokeThickness: 8,
            align: 'center',
            wordWrap: { width: GAME_WIDTH - 34 }
        }).setOrigin(0.5)

        this.add.text(GAME_CENTER_X, 177, 'Keep the shield into the fire.', {
            fontFamily: 'Arial',
            fontSize: 20,
            color: '#cbd5e1',
            align: 'center',
            wordWrap: { width: GAME_WIDTH - 56 }
        }).setOrigin(0.5)
    }

    private drawCapsule (): void
    {
        this.plasma = this.add.graphics()
        this.plasma.setPosition(GAME_CENTER_X, 326)
        this.plasma.fillStyle(0xff5a1f, 0.54)
        this.plasma.fillTriangle(-64, 50, 64, 50, 0, 128)
        this.plasma.lineStyle(5, 0xffd166, 0.38)
        this.plasma.lineBetween(-52, 50, 0, 118)
        this.plasma.lineBetween(52, 50, 0, 118)

        this.capsule = this.add.graphics()
        this.capsule.setPosition(GAME_CENTER_X, 326)
        this.capsule.fillStyle(0xdbeafe, 1)
        this.capsule.fillTriangle(-28, -40, 28, -40, 42, 18)
        this.capsule.fillTriangle(-28, -40, -42, 18, 42, 18)
        this.capsule.lineStyle(4, 0x07111f, 1)
        this.capsule.strokeTriangle(-28, -40, 28, -40, 42, 18)
        this.capsule.strokeTriangle(-28, -40, -42, 18, 42, 18)
        this.capsule.fillStyle(0x0f172a, 0.78)
        this.capsule.fillCircle(0, -12, 11)
        this.capsule.fillStyle(0xff5c2e, 1)
        this.capsule.fillRoundedRect(-46, 15, 92, 26, 8)
        this.capsule.lineStyle(3, 0xffd166, 0.78)
        this.capsule.strokeRoundedRect(-46, 15, 92, 26, 8)
    }

    private drawBriefing (): void
    {
        const briefing = [
            'Hold left / right side or use A / D to correct.',
            'Keep the heat shield facing down.',
            'Survive instability, heat, and debris.'
        ].join('\n')

        this.add.text(GAME_CENTER_X, 538, briefing, {
            fontFamily: 'Arial',
            fontSize: 20,
            color: '#f8fafc',
            align: 'center',
            lineSpacing: 10,
            wordWrap: { width: GAME_WIDTH - 60 }
        }).setOrigin(0.5)
    }
}
