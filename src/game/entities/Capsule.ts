import { GameObjects, Math as PhaserMath, Scene } from 'phaser'
import { BALANCE } from '../config/balance'
import { clamp, normalizeAngle } from '../utils/math'

export type CapsuleControl = {
    left: boolean;
    right: boolean;
};

export class Capsule
{
    x: number
    readonly y: number
    angle = 0
    angularVelocity = 0
    damage = 0
    lateralVelocity = 0

    private readonly body: GameObjects.Graphics
    private readonly plasma: GameObjects.Graphics
    private readonly shield: GameObjects.Graphics
    private spunOutMs = 0

    constructor (scene: Scene, x: number, y: number)
    {
        this.x = x
        this.y = y
        this.plasma = scene.add.graphics()
        this.body = scene.add.graphics()
        this.shield = scene.add.graphics()
        this.draw(0, 0)
    }

    update (deltaSeconds: number, controls: CapsuleControl, disturbance: number, _atmosphere: number, _speed: number): void
    {
        const direction = Number(controls.right) - Number(controls.left)
        const inputTorque = direction * BALANCE.capsule.controlTorque

        this.angularVelocity += (inputTorque + disturbance) * deltaSeconds
        this.angularVelocity -= this.angularVelocity * BALANCE.capsule.damping * deltaSeconds
        this.angularVelocity = clamp(
            this.angularVelocity,
            -BALANCE.capsule.maxAngularVelocity,
            BALANCE.capsule.maxAngularVelocity
        )

        this.angle = normalizeAngle(this.angle + (this.angularVelocity * deltaSeconds))
        this.lateralVelocity += Math.sin(this.angle) * BALANCE.capsule.lateralAcceleration * deltaSeconds
        this.lateralVelocity -= this.lateralVelocity * BALANCE.capsule.lateralDamping * deltaSeconds
        this.lateralVelocity = clamp(
            this.lateralVelocity,
            -BALANCE.capsule.maxLateralSpeed,
            BALANCE.capsule.maxLateralSpeed
        )
        this.x = clamp(this.x + (this.lateralVelocity * deltaSeconds), BALANCE.capsule.minX, BALANCE.capsule.maxX)

        if (this.x === BALANCE.capsule.minX || this.x === BALANCE.capsule.maxX)
        {
            this.lateralVelocity *= -0.25
        }
    }

    applyImpact (): void
    {
        this.damage = clamp(this.damage + BALANCE.capsule.impactDamage, 0, BALANCE.damage.max)
        this.angularVelocity += (Math.random() < 0.5 ? -1 : 1) * 1.8
    }

    updateSpinDanger (deltaMs: number): boolean
    {
        if (Math.abs(this.angularVelocity) >= BALANCE.capsule.spunOutVelocity)
        {
            this.spunOutMs += deltaMs
        }
        else
        {
            this.spunOutMs = Math.max(0, this.spunOutMs - (deltaMs * 1.8))
        }

        return this.spunOutMs >= BALANCE.capsule.spunOutMs
    }

    render (heatRatio: number, atmosphere: number, orientationError: number, impactFlash: number): void
    {
        this.draw(heatRatio, impactFlash)
        this.drawPlasma(heatRatio, atmosphere, orientationError)
    }

    getCollisionRadius (): number
    {
        return 42
    }

    private draw (heatRatio: number, impactFlash: number): void
    {
        const hotColor = heatRatio > 0.86 ? 0xfff1a6 : heatRatio > 0.68 ? 0xff8c42 : 0xdbeafe
        const bodyColor = impactFlash > 0 ? 0xffffff : hotColor
        const shieldColor = heatRatio > 0.72 ? 0xff5c2e : 0x3a4658

        this.body.clear()
        this.body.setPosition(this.x, this.y)
        this.body.setRotation(this.angle)
        this.body.fillStyle(bodyColor, 1)
        this.body.fillTriangle(-28, -32, 28, -32, 38, 18)
        this.body.fillTriangle(-28, -32, -38, 18, 38, 18)
        this.body.lineStyle(3, 0x07111f, 1)
        this.body.strokeTriangle(-28, -32, 28, -32, 38, 18)
        this.body.strokeTriangle(-28, -32, -38, 18, 38, 18)
        this.body.lineStyle(2, 0x93c5fd, 0.65)
        this.body.lineBetween(0, -26, 0, 12)
        this.body.fillStyle(0x0f172a, 0.75)
        this.body.fillCircle(0, -8, 10)

        this.shield.clear()
        this.shield.setPosition(this.x, this.y)
        this.shield.setRotation(this.angle)
        this.shield.fillStyle(shieldColor, 1)
        this.shield.fillRoundedRect(-42, 12, 84, 23, 10)
        this.shield.lineStyle(3, 0xffc266, heatRatio > 0.55 ? 1 : 0.35)
        this.shield.strokeRoundedRect(-42, 12, 84, 23, 10)
    }

    private drawPlasma (heatRatio: number, atmosphere: number, orientationError: number): void
    {
        const flicker = 0.88 + (Math.random() * 0.26)
        const intensity = clamp(((heatRatio * 0.9) + (atmosphere * 0.7) + (orientationError * 0.18)) * flicker, 0, 1)

        this.plasma.clear()
        if (intensity <= 0.08)
        {
            return
        }

        const haloPadding = 5 + (intensity * 13)
        const shieldBloom = intensity * 12
        const outerAlpha = 0.16 + (intensity * 0.24)
        const rimAlpha = 0.34 + (intensity * 0.36)

        this.plasma.setPosition(this.x, this.y)
        this.plasma.setRotation(this.angle)
        this.plasma.fillStyle(0xff5a1f, outerAlpha)
        this.plasma.fillPoints(this.createHeatSilhouette(haloPadding, shieldBloom), true, true)
        this.plasma.lineStyle(4 + (intensity * 5), 0xffd166, rimAlpha)
        this.drawShieldArc(this.plasma, 44 + haloPadding, 32 + shieldBloom)
    }

    private createHeatSilhouette (padding: number, shieldBloom: number): PhaserMath.Vector2[]
    {
        return [
            new PhaserMath.Vector2(-28 - (padding * 0.7), -32 - padding),
            new PhaserMath.Vector2(28 + (padding * 0.7), -32 - padding),
            new PhaserMath.Vector2(38 + padding, 12 + (padding * 0.25)),
            new PhaserMath.Vector2(42 + padding, 22 + (padding * 0.35)),
            new PhaserMath.Vector2(34 + (padding * 0.75), 35 + padding + shieldBloom),
            new PhaserMath.Vector2(-34 - (padding * 0.75), 35 + padding + shieldBloom),
            new PhaserMath.Vector2(-42 - padding, 22 + (padding * 0.35)),
            new PhaserMath.Vector2(-38 - padding, 12 + (padding * 0.25))
        ]
    }

    private drawShieldArc (graphics: GameObjects.Graphics, halfWidth: number, y: number): void
    {
        graphics.beginPath()
        graphics.moveTo(-halfWidth, y - 8)
        graphics.lineTo(-halfWidth * 0.82, y + 4)
        graphics.lineTo(-halfWidth * 0.46, y + 11)
        graphics.lineTo(0, y + 13)
        graphics.lineTo(halfWidth * 0.46, y + 11)
        graphics.lineTo(halfWidth * 0.82, y + 4)
        graphics.lineTo(halfWidth, y - 8)
        graphics.strokePath()
    }
}
