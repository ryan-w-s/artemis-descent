import { GameObjects, Scene } from 'phaser'

export class Debris
{
    readonly radius: number
    readonly body: GameObjects.Graphics
    x: number
    y: number

    private readonly velocityX: number
    private readonly velocityY: number
    private readonly spin: number
    private angle = 0

    constructor (scene: Scene, x: number, y: number, velocityX: number, velocityY: number, radius: number)
    {
        this.x = x
        this.y = y
        this.velocityX = velocityX
        this.velocityY = velocityY
        this.radius = radius
        this.spin = (Math.random() - 0.5) * 5
        this.body = scene.add.graphics()
        this.draw()
    }

    update (deltaSeconds: number): void
    {
        this.x += this.velocityX * deltaSeconds
        this.y += this.velocityY * deltaSeconds
        this.angle += this.spin * deltaSeconds
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
        this.body.setRotation(this.angle)
        this.body.fillStyle(0xa8a29e, 1)
        this.body.fillTriangle(-this.radius, -this.radius * 0.4, -this.radius * 0.2, -this.radius, this.radius, -this.radius * 0.2)
        this.body.fillTriangle(-this.radius, -this.radius * 0.4, this.radius, -this.radius * 0.2, this.radius * 0.35, this.radius)
        this.body.lineStyle(2, 0x1c1917, 1)
        this.body.strokeTriangle(-this.radius, -this.radius * 0.4, -this.radius * 0.2, -this.radius, this.radius, -this.radius * 0.2)
        this.body.strokeTriangle(-this.radius, -this.radius * 0.4, this.radius, -this.radius * 0.2, this.radius * 0.35, this.radius)
    }
}
