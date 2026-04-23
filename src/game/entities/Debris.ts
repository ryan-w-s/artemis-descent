import { GameObjects, Scene } from 'phaser'
import { pointToSegmentDistance } from '../utils/math'

export type DebrisKind = 'asteroid' | 'satellite' | 'plane' | 'seagull';
const PLANE_TEXTURE_KEY = 'obstacle-plane'
const PLANE_SPRITE_WIDTH_MULTIPLIER = 5.2
const PLANE_SPRITE_ASPECT_RATIO = 0.34
const PLANE_COLLISION_LENGTH_MULTIPLIER = 0.66
const PLANE_COLLISION_RADIUS_MULTIPLIER = 0.42

export class Debris
{
    readonly radius: number
    readonly body: GameObjects.Graphics | GameObjects.Image
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
        this.body = this.createBody(scene)
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

    getCollisionRadius (): number
    {
        switch (this.kind)
        {
            case 'satellite':
                return this.radius * 1.85
            case 'plane':
            case 'seagull':
                return this.radius * 1.6
            case 'asteroid':
                return this.radius * 1.05
        }
    }

    collidesWithCircle (x: number, y: number, radius: number): boolean
    {
        if (this.kind === 'plane')
        {
            return this.planeCollidesWithCircle(x, y, radius)
        }

        const distance = Math.hypot(this.x - x, this.y - y)
        return distance <= this.getCollisionRadius() + radius
    }

    private draw (): void
    {
        this.body.setPosition(this.x, this.y)

        switch (this.kind)
        {
            case 'asteroid':
                this.requireGraphics().clear()
                this.body.setRotation(0)
                this.drawAsteroid()
                break
            case 'satellite':
                this.requireGraphics().clear()
                this.body.setRotation(0)
                this.drawSatellite()
                break
            case 'plane':
                this.drawPlane()
                break
            case 'seagull':
                this.requireGraphics().clear()
                this.body.setRotation(0)
                this.drawSeagull()
                break
        }
    }

    private createBody (scene: Scene): GameObjects.Graphics | GameObjects.Image
    {
        if (this.kind === 'plane')
        {
            return scene.add.image(this.x, this.y, PLANE_TEXTURE_KEY)
                .setOrigin(0.5)
                .setDepth(1)
        }

        return scene.add.graphics()
    }

    private requireGraphics (): GameObjects.Graphics
    {
        if (this.body instanceof GameObjects.Graphics)
        {
            return this.body
        }

        throw new Error(`Debris kind "${this.kind}" does not use a graphics body.`)
    }

    private drawAsteroid (): void
    {
        const graphics = this.requireGraphics()

        graphics.fillStyle(0xa8a29e, 1)
        graphics.fillTriangle(-this.radius, -this.radius * 0.4, -this.radius * 0.2, -this.radius, this.radius, -this.radius * 0.2)
        graphics.fillTriangle(-this.radius, -this.radius * 0.4, this.radius, -this.radius * 0.2, this.radius * 0.35, this.radius)
        graphics.lineStyle(2, 0x1c1917, 1)
        graphics.strokeTriangle(-this.radius, -this.radius * 0.4, -this.radius * 0.2, -this.radius, this.radius, -this.radius * 0.2)
        graphics.strokeTriangle(-this.radius, -this.radius * 0.4, this.radius, -this.radius * 0.2, this.radius * 0.35, this.radius)
    }

    private drawSatellite (): void
    {
        const graphics = this.requireGraphics()
        const size = this.radius

        graphics.fillStyle(0x9ca3af, 1)
        graphics.fillRect(-size * 0.45, -size * 0.45, size * 0.9, size * 0.9)
        graphics.lineStyle(2, 0x111827, 1)
        graphics.strokeRect(-size * 0.45, -size * 0.45, size * 0.9, size * 0.9)

        graphics.fillStyle(0x38bdf8, 0.85)
        graphics.fillRect(-size * 1.85, -size * 0.38, size * 1.1, size * 0.76)
        graphics.fillRect(size * 0.75, -size * 0.38, size * 1.1, size * 0.76)
        graphics.lineStyle(2, 0x082f49, 1)
        graphics.strokeRect(-size * 1.85, -size * 0.38, size * 1.1, size * 0.76)
        graphics.strokeRect(size * 0.75, -size * 0.38, size * 1.1, size * 0.76)
        graphics.lineBetween(-size * 0.75, 0, size * 0.75, 0)
    }

    private drawPlane (): void
    {
        if (!(this.body instanceof GameObjects.Image))
        {
            return
        }

        const width = this.getPlaneSpriteWidth()
        const height = width * PLANE_SPRITE_ASPECT_RATIO
        const tilt = this.getPlaneRotation()

        this.body
            .setDisplaySize(width, height)
            .setRotation(tilt)
    }

    private planeCollidesWithCircle (x: number, y: number, radius: number): boolean
    {
        const rotation = this.getPlaneRotation()
        const halfLength = (this.getPlaneSpriteWidth() * PLANE_COLLISION_LENGTH_MULTIPLIER) * 0.5
        const collisionRadius = (this.radius * PLANE_COLLISION_RADIUS_MULTIPLIER) + radius
        const directionX = Math.cos(rotation)
        const directionY = Math.sin(rotation)
        const startX = this.x - (directionX * halfLength)
        const startY = this.y - (directionY * halfLength)
        const endX = this.x + (directionX * halfLength)
        const endY = this.y + (directionY * halfLength)
        const distance = pointToSegmentDistance(x, y, startX, startY, endX, endY)

        return distance <= collisionRadius
    }

    private getPlaneRotation (): number
    {
        return Math.atan2(this.velocityY, this.velocityX) + Math.PI / 2
    }

    private getPlaneSpriteWidth (): number
    {
        return this.radius * PLANE_SPRITE_WIDTH_MULTIPLIER
    }

    private drawSeagull (): void
    {
        const graphics = this.requireGraphics()
        const size = this.radius

        graphics.lineStyle(4, 0xf8fafc, 1)
        graphics.lineBetween(-size * 1.55, 0, -size * 0.35, -size * 0.45)
        graphics.lineBetween(-size * 0.35, -size * 0.45, 0, 0)
        graphics.lineBetween(0, 0, size * 0.35, -size * 0.45)
        graphics.lineBetween(size * 0.35, -size * 0.45, size * 1.55, 0)
        graphics.lineStyle(2, 0x334155, 1)
        graphics.lineBetween(-size * 0.24, 0, size * 0.24, 0)
    }
}
