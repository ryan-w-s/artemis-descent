import { GameObjects, Scene } from 'phaser'

export type DebrisKind = 'meteor' | 'satellite' | 'plane' | 'seagull';

export class Debris
{
    readonly radius: number
    readonly body: GameObjects.Graphics
    readonly kind: DebrisKind
    x: number
    y: number

    private readonly velocityX: number
    private readonly velocityY: number

    constructor (
        scene: Scene,
        x: number,
        y: number,
        velocityX: number,
        velocityY: number,
        radius: number,
        kind: DebrisKind
    )
    {
        this.x = x
        this.y = y
        this.velocityX = velocityX
        this.velocityY = velocityY
        this.radius = radius
        this.kind = kind
        this.body = scene.add.graphics()
        this.draw()
    }

    update (deltaSeconds: number): void
    {
        this.x += this.velocityX * deltaSeconds
        this.y += this.velocityY * deltaSeconds
        this.draw()
    }

    isOffscreen (width: number, height: number): boolean
    {
        const pad = this.radius + 80
        return this.x < -pad || this.x > width + pad || this.y < -pad || this.y > height + pad
    }

    destroy (): void
    {
        this.body.destroy()
    }

    private draw (): void
    {
        this.body.clear()
        this.body.setPosition(this.x, this.y)
        this.body.setRotation(0)

        switch (this.kind)
        {
            case 'meteor':
                this.drawMeteor()
                break
            case 'satellite':
                this.drawSatellite()
                break
            case 'plane':
                this.drawPlane()
                break
            case 'seagull':
                this.drawSeagull()
                break
        }
    }

    private drawMeteor (): void
    {
        this.body.fillStyle(0xa8a29e, 1)
        this.body.fillTriangle(-this.radius, -this.radius * 0.4, -this.radius * 0.2, -this.radius, this.radius, -this.radius * 0.2)
        this.body.fillTriangle(-this.radius, -this.radius * 0.4, this.radius, -this.radius * 0.2, this.radius * 0.35, this.radius)
        this.body.lineStyle(2, 0x1c1917, 1)
        this.body.strokeTriangle(-this.radius, -this.radius * 0.4, -this.radius * 0.2, -this.radius, this.radius, -this.radius * 0.2)
        this.body.strokeTriangle(-this.radius, -this.radius * 0.4, this.radius, -this.radius * 0.2, this.radius * 0.35, this.radius)
    }

    private drawSatellite (): void
    {
        const size = this.radius

        this.body.fillStyle(0x9ca3af, 1)
        this.body.fillRect(-size * 0.45, -size * 0.45, size * 0.9, size * 0.9)
        this.body.lineStyle(2, 0x111827, 1)
        this.body.strokeRect(-size * 0.45, -size * 0.45, size * 0.9, size * 0.9)

        this.body.fillStyle(0x38bdf8, 0.85)
        this.body.fillRect(-size * 1.85, -size * 0.38, size * 1.1, size * 0.76)
        this.body.fillRect(size * 0.75, -size * 0.38, size * 1.1, size * 0.76)
        this.body.lineStyle(2, 0x082f49, 1)
        this.body.strokeRect(-size * 1.85, -size * 0.38, size * 1.1, size * 0.76)
        this.body.strokeRect(size * 0.75, -size * 0.38, size * 1.1, size * 0.76)
        this.body.lineBetween(-size * 0.75, 0, size * 0.75, 0)
    }

    private drawPlane (): void
    {
        const size = this.radius

        this.body.save()
        this.body.rotateCanvas(Math.PI / 2)
        this.body.fillStyle(0xe5e7eb, 1)
        this.body.fillTriangle(0, -size * 1.6, -size * 0.38, size * 1.05, size * 0.38, size * 1.05)
        this.body.fillTriangle(-size * 1.55, size * 0.1, 0, -size * 0.35, size * 1.55, size * 0.1)
        this.body.fillTriangle(-size * 0.9, size * 1.25, 0, size * 0.65, size * 0.9, size * 1.25)
        this.body.lineStyle(2, 0x1f2937, 1)
        this.body.lineBetween(0, -size * 1.6, -size * 0.38, size * 1.05)
        this.body.lineBetween(0, -size * 1.6, size * 0.38, size * 1.05)
        this.body.lineBetween(-size * 1.55, size * 0.1, size * 1.55, size * 0.1)
        this.body.restore()
    }

    private drawSeagull (): void
    {
        const size = this.radius

        this.body.lineStyle(4, 0xf8fafc, 1)
        this.body.lineBetween(-size * 1.55, 0, -size * 0.35, -size * 0.45)
        this.body.lineBetween(-size * 0.35, -size * 0.45, 0, 0)
        this.body.lineBetween(0, 0, size * 0.35, -size * 0.45)
        this.body.lineBetween(size * 0.35, -size * 0.45, size * 1.55, 0)
        this.body.lineStyle(2, 0x334155, 1)
        this.body.lineBetween(-size * 0.24, 0, size * 0.24, 0)
    }
}
