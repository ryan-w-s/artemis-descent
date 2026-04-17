import { GameObjects, Input, Scene } from 'phaser'
import { BALANCE } from '../config/balance'
import { GAME_CENTER_X, GAME_HEIGHT, GAME_WIDTH } from '../config/screen'
import { Capsule } from '../entities/Capsule'
import { Debris } from '../entities/Debris'
import { CollisionSystem } from '../systems/CollisionSystem'
import { FlightSystem } from '../systems/FlightSystem'
import { HeatSystem } from '../systems/HeatSystem'
import { InstabilitySystem } from '../systems/InstabilitySystem'
import { SpawnSystem } from '../systems/SpawnSystem'
import type { FailureReason, FlightState, HeatState, RunResult } from '../types'
import { Hud } from '../ui/Hud'
import { clamp, lerp, shortestAngle } from '../utils/math'

type ControlKeys = {
    left: Input.Keyboard.Key;
    right: Input.Keyboard.Key;
    a: Input.Keyboard.Key;
    d: Input.Keyboard.Key;
};

type Star = {
    x: number;
    y: number;
    radius: number;
    alpha: number;
};

const BACKDROP_STARS: Star[] = [
    { x: 28, y: 42, radius: 1.1, alpha: 0.55 },
    { x: 62, y: 196, radius: 1.7, alpha: 0.7 },
    { x: 84, y: 82, radius: 0.9, alpha: 0.45 },
    { x: 112, y: 238, radius: 1.4, alpha: 0.55 },
    { x: 141, y: 34, radius: 1.2, alpha: 0.6 },
    { x: 164, y: 156, radius: 1.8, alpha: 0.72 },
    { x: 188, y: 95, radius: 0.8, alpha: 0.42 },
    { x: 214, y: 218, radius: 1.3, alpha: 0.58 },
    { x: 238, y: 52, radius: 1.5, alpha: 0.68 },
    { x: 262, y: 128, radius: 0.9, alpha: 0.45 },
    { x: 289, y: 247, radius: 1.9, alpha: 0.74 },
    { x: 318, y: 72, radius: 1.2, alpha: 0.62 },
    { x: 352, y: 188, radius: 1.6, alpha: 0.68 },
    { x: 381, y: 31, radius: 0.8, alpha: 0.46 },
    { x: 405, y: 226, radius: 1.4, alpha: 0.57 }
]

const CAPSULE_SCREEN_Y = 200
const ATMOSPHERE_BACKDROP_START = 0.08
const ALTITUDE_MARKER_INTERVAL = 100
const ALTITUDE_MARKER_PIXELS_PER_UNIT = 8
const ALTITUDE_MARKER_LABELS = 4

export class Game extends Scene
{
    private capsule!: Capsule
    private hud!: Hud
    private flight!: FlightState
    private heat!: HeatState
    private debris: Debris[] = []
    private backdrop!: GameObjects.Graphics
    private altitudeLines!: GameObjects.Graphics
    private altitudeLabels: GameObjects.Text[] = []
    private ocean!: GameObjects.Graphics
    private impactFlash = 0
    private ending = false

    private readonly flightSystem = new FlightSystem()
    private readonly heatSystem = new HeatSystem()
    private readonly instabilitySystem = new InstabilitySystem()
    private readonly spawnSystem = new SpawnSystem()
    private readonly collisionSystem = new CollisionSystem()

    private keys!: ControlKeys

    constructor ()
    {
        super('Game')
    }

    create (): void
    {
        this.cameras.main.setBackgroundColor(0x06080d)
        this.drawBackdrop()

        this.flight = this.flightSystem.createInitialState()
        this.heat = this.heatSystem.createInitialState()
        this.debris = []
        this.impactFlash = 0
        this.ending = false
        this.spawnSystem.reset()
        this.updateBackdropFx()

        this.capsule = new Capsule(this, GAME_CENTER_X, CAPSULE_SCREEN_Y)
        this.hud = new Hud(this)
        this.keys = this.createKeys()

        this.add.text(GAME_CENTER_X, GAME_HEIGHT - 36, 'Shield down. Left/Right or A/D to correct.', {
            fontFamily: 'Arial',
            fontSize: 17,
            color: '#cbd5e1',
            align: 'center',
            wordWrap: { width: GAME_WIDTH - 48 }
        }).setOrigin(0.5)
    }

    update (_time: number, deltaMs: number): void
    {
        const deltaSeconds = deltaMs / 1000
        const disturbanceAngleSigned = shortestAngle(this.capsule.angle)
        const heatRatioForDisturbance = clamp(this.heat.current / BALANCE.heat.max, 0, 1)
        const disturbance = this.instabilitySystem.calculateDisturbance(
            this.flight,
            disturbanceAngleSigned,
            heatRatioForDisturbance,
            this.capsule.angularVelocity
        )

        this.flight = this.flightSystem.update(this.flight, deltaMs)
        this.capsule.update(deltaSeconds, this.readControls(), disturbance, this.flight.atmosphere, this.flight.speed)
        const orientationErrorSigned = shortestAngle(this.capsule.angle)
        const orientationError = Math.abs(orientationErrorSigned)
        this.heat = this.heatSystem.update(
            this.heat,
            this.flight,
            orientationError,
            this.capsule.angularVelocity,
            deltaMs
        )

        this.applyHeatStress(deltaSeconds)
        this.updateBackdropFx()
        this.spawnSystem.update(this, this.debris, this.flight, GAME_WIDTH, GAME_HEIGHT)
        this.updateDebris(deltaSeconds)
        this.resolveCollisions()

        this.impactFlash = Math.max(0, this.impactFlash - (deltaSeconds * 4))
        this.capsule.updateSpinDanger(deltaMs)
        const heatRatio = clamp(this.heat.current / BALANCE.heat.max, 0, 1)
        this.capsule.render(heatRatio, this.flight.atmosphere, orientationError, this.impactFlash)
        this.updateAtmosphereFx(heatRatio)
        this.updateOceanFx()
        this.hud.update(this.flight, this.heat, orientationError, this.capsule.damage, this.getSpinRatio())
        this.applyDangerShake(orientationError)
        this.checkEndState()
    }

    private createKeys (): ControlKeys
    {
        if (!this.input.keyboard)
        {
            throw new Error('Keyboard input is required for Artemis Descent.')
        }

        return {
            left: this.input.keyboard.addKey(Input.Keyboard.KeyCodes.LEFT),
            right: this.input.keyboard.addKey(Input.Keyboard.KeyCodes.RIGHT),
            a: this.input.keyboard.addKey(Input.Keyboard.KeyCodes.A),
            d: this.input.keyboard.addKey(Input.Keyboard.KeyCodes.D)
        }
    }

    private readControls ()
    {
        return {
            left: this.keys.left.isDown || this.keys.a.isDown,
            right: this.keys.right.isDown || this.keys.d.isDown
        }
    }

    private updateDebris (deltaSeconds: number): void
    {
        const activeDebris: Debris[] = []

        for (const item of this.debris)
        {
            item.update(deltaSeconds)

            if (item.isOffscreen(GAME_WIDTH, GAME_HEIGHT))
            {
                item.destroy()
            }
            else
            {
                activeDebris.push(item)
            }
        }

        this.debris = activeDebris
    }

    private resolveCollisions (): void
    {
        const result = this.collisionSystem.update(this.capsule, this.debris)
        this.debris = result.debris

        if (result.impacts === 0 && result.shieldGlances === 0)
        {
            return
        }

        const heatImpulse = (result.impacts * BALANCE.capsule.heatImpulseOnImpact) + (result.shieldGlances * 4)
        this.heat.current = clamp(this.heat.current + heatImpulse, 0, BALANCE.heat.max)
        this.heat.maxObserved = Math.max(this.heat.maxObserved, this.heat.current)
        this.impactFlash = 1
        this.cameras.main.shake(110, result.impacts > 0 ? 0.006 : 0.003)
    }

    private applyHeatStress (deltaSeconds: number): void
    {
        if (this.heat.current < BALANCE.damage.heatStressStart)
        {
            return
        }

        const stress = (this.heat.current - BALANCE.damage.heatStressStart) / (BALANCE.heat.max - BALANCE.damage.heatStressStart)
        this.capsule.damage = clamp(
            this.capsule.damage + (stress * BALANCE.damage.heatStressPerSecond * deltaSeconds),
            0,
            BALANCE.damage.max
        )
    }

    private applyDangerShake (orientationError: number): void
    {
        if (
            this.heat.current >= BALANCE.heat.critical ||
            orientationError >= BALANCE.orientation.criticalAngle ||
            this.getSpinRatio() > 0.78
        )
        {
            this.cameras.main.shake(55, 0.0028)
        }
    }

    private updateBackdropFx (): void
    {
        const atmosphereProgress = smoothstep(clamp((this.flight.progress - ATMOSPHERE_BACKDROP_START) / (1 - ATMOSPHERE_BACKDROP_START), 0, 1))
        const starVisibility = 1 - smoothstep(clamp((this.flight.progress - 0.08) / 0.54, 0, 1))
        const hazeVisibility = smoothstep(clamp((this.flight.progress - 0.18) / 0.62, 0, 1))
        const horizonY = lerp(606, 446, atmosphereProgress)

        const topColor = lerpColor(0x06080d, 0x4aa3df, atmosphereProgress)
        const midColor = lerpColor(0x06080d, 0x79c6f2, atmosphereProgress)
        const bottomColor = lerpColor(0x06080d, 0xa8daf5, atmosphereProgress)

        this.backdrop.clear()
        this.backdrop.fillGradientStyle(topColor, topColor, midColor, bottomColor, 1)
        this.backdrop.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

        if (starVisibility > 0.02)
        {
            for (const star of BACKDROP_STARS)
            {
                const driftY = star.y + (this.flight.progress * 54)
                this.backdrop.fillStyle(0xdbeafe, star.alpha * starVisibility)
                this.backdrop.fillCircle(star.x, driftY, star.radius)
            }
        }

        if (hazeVisibility <= 0.02)
        {
            return
        }

        this.backdrop.fillGradientStyle(0x93c5fd, 0x93c5fd, 0xdbeafe, 0xdbeafe, 0.08 * hazeVisibility)
        this.backdrop.fillRect(0, horizonY, GAME_WIDTH, GAME_HEIGHT - horizonY)
    }

    private updateAtmosphereFx (heatRatio: number): void
    {
        const intensity = clamp((this.flight.atmosphere * 0.85) + (heatRatio * 0.45), 0, 1)
        this.altitudeLines.clear()
        this.hideAltitudeLabels()

        if (intensity <= 0.05)
        {
            return
        }

        const markerAlpha = 0.1 + (intensity * 0.16)
        const drift = clamp(this.capsule.lateralVelocity / BALANCE.capsule.maxLateralSpeed, -1, 1) * 34
        const firstMarker = Math.ceil(BALANCE.reentry.endingAltitude / ALTITUDE_MARKER_INTERVAL) * ALTITUDE_MARKER_INTERVAL
        const lastMarker = Math.floor(BALANCE.reentry.startingAltitude / ALTITUDE_MARKER_INTERVAL) * ALTITUDE_MARKER_INTERVAL
        let labelIndex = 0

        for (let markerAltitude = firstMarker; markerAltitude <= lastMarker; markerAltitude += ALTITUDE_MARKER_INTERVAL)
        {
            const y = CAPSULE_SCREEN_Y + ((this.flight.altitude - markerAltitude) * ALTITUDE_MARKER_PIXELS_PER_UNIT)

            if (y < -48 || y > GAME_HEIGHT + 48)
            {
                continue
            }

            const crossing = 1 - clamp(Math.abs(y - CAPSULE_SCREEN_Y) / 120, 0, 1)
            const lineAlpha = markerAlpha + (crossing * 0.18)

            this.altitudeLines.lineStyle(2, 0xffd166, lineAlpha)
            this.altitudeLines.lineBetween(-24 + (drift * 0.2), y, GAME_WIDTH + 24 + (drift * 0.2), y)
            this.altitudeLines.lineStyle(1, 0xff7a2f, lineAlpha * 0.55)
            this.altitudeLines.lineBetween(24 + (drift * 0.32), y + 7, 112 + (drift * 0.32), y + 7)
            this.altitudeLines.lineBetween(GAME_WIDTH - 112 + (drift * 0.32), y + 7, GAME_WIDTH - 24 + (drift * 0.32), y + 7)

            if (labelIndex < this.altitudeLabels.length)
            {
                const label = this.altitudeLabels[labelIndex]
                label.setText(`${markerAltitude}`)
                label.setPosition(18 + (drift * 0.2), y - 1)
                label.setAlpha(clamp(lineAlpha + 0.25, 0, 0.9))
                label.setVisible(true)
                labelIndex += 1
            }
        }
    }

    private hideAltitudeLabels (): void
    {
        for (const label of this.altitudeLabels)
        {
            label.setVisible(false)
        }
    }

    private updateOceanFx (): void
    {
        if (this.ending)
        {
            return
        }

        const oceanProgress = clamp((this.flight.progress - 0.82) / 0.18, 0, 1)
        this.ocean.clear()

        if (oceanProgress <= 0)
        {
            return
        }

        const surfaceY = GAME_HEIGHT - (oceanProgress * 145)
        this.ocean.fillStyle(0x0f4c81, 0.82)
        this.ocean.fillRect(0, surfaceY, GAME_WIDTH, GAME_HEIGHT - surfaceY)
        this.ocean.lineStyle(3, 0x7dd3fc, 0.45)

        for (let x = -80; x < GAME_WIDTH + 120; x += 120)
        {
            const waveY = surfaceY + (Math.sin((this.flight.elapsedMs * 0.004) + x) * 8)
            this.ocean.lineBetween(x, waveY, x + 70, waveY + 5)
        }
    }

    private checkEndState (): void
    {
        if (this.flight.altitude <= BALANCE.reentry.endingAltitude)
        {
            this.startSplashdown()
            return
        }

        const failureReason = this.getFailureReason()
        if (failureReason)
        {
            this.finish(false, failureReason)
        }
    }

    private getFailureReason (): FailureReason | undefined
    {
        if (this.heat.current >= BALANCE.heat.max)
        {
            return 'Overheated'
        }

        if (this.capsule.damage >= BALANCE.damage.max)
        {
            return 'Hull breached'
        }

        return undefined
    }

    private finish (survived: boolean, reason: RunResult['reason']): void
    {
        if (this.ending)
        {
            return
        }

        this.ending = true
        for (const item of this.debris)
        {
            item.destroy()
        }

        const result: RunResult = {
            survived,
            reason,
            durationSeconds: this.flight.elapsedMs / 1000,
            maxHeat: this.heat.maxObserved,
            damage: this.capsule.damage
        }

        this.scene.start('GameOver', result)
    }

    private startSplashdown (): void
    {
        if (this.ending)
        {
            return
        }

        this.ending = true
        this.debris.forEach((item) => item.destroy())
        this.debris = []
        this.drawSplashdownBurst()
        this.cameras.main.shake(260, 0.004)

        this.time.delayedCall(950, () => {
            const result: RunResult = {
                survived: true,
                reason: 'Descent complete',
                durationSeconds: this.flight.elapsedMs / 1000,
                maxHeat: this.heat.maxObserved,
                damage: this.capsule.damage
            }

            this.scene.start('GameOver', result)
        })
    }

    private getSpinRatio (): number
    {
        return clamp(Math.abs(this.capsule.angularVelocity) / BALANCE.capsule.maxAngularVelocity, 0, 1)
    }

    private drawSplashdownBurst (): void
    {
        this.ocean.fillStyle(0xe0f2fe, 0.9)
        this.ocean.fillCircle(this.capsule.x, this.capsule.y + 38, 46)
        this.ocean.fillStyle(0x7dd3fc, 0.75)
        this.ocean.fillEllipse(this.capsule.x, this.capsule.y + 60, 170, 34)
        this.ocean.lineStyle(5, 0xe0f2fe, 0.8)
        this.ocean.lineBetween(this.capsule.x - 86, this.capsule.y + 52, this.capsule.x - 22, this.capsule.y + 4)
        this.ocean.lineBetween(this.capsule.x + 86, this.capsule.y + 52, this.capsule.x + 22, this.capsule.y + 4)
    }

    private drawBackdrop (): void
    {
        this.backdrop = this.add.graphics()
        this.altitudeLines = this.add.graphics()
        this.ocean = this.add.graphics()
        this.altitudeLabels = Array.from({ length: ALTITUDE_MARKER_LABELS }, () => {
            return this.add.text(0, 0, '', {
                fontFamily: 'Arial',
                fontSize: 13,
                color: '#ffe6a3'
            })
                .setOrigin(0, 0.5)
                .setStroke('#07111f', 4)
                .setVisible(false)
        })
    }
}

const smoothstep = (amount: number): number => {
    const value = clamp(amount, 0, 1)
    return value * value * (3 - (2 * value))
}

const lerpColor = (from: number, to: number, amount: number): number => {
    const red = Math.round(lerp((from >> 16) & 0xff, (to >> 16) & 0xff, amount))
    const green = Math.round(lerp((from >> 8) & 0xff, (to >> 8) & 0xff, amount))
    const blue = Math.round(lerp(from & 0xff, to & 0xff, amount))

    return (red << 16) | (green << 8) | blue
}
