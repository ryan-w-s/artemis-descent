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

type LandingPhase = 'reentry' | 'parachute' | 'splashdown';

type ConfettiPiece = {
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
    rotation: number;
    spin: number;
    size: number;
    color: number;
    delay: number;
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
const COLLISION_CUE_MS = 520

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
    private parachute!: GameObjects.Graphics
    private confetti!: GameObjects.Graphics
    private collisionCue!: GameObjects.Text
    private landingText!: GameObjects.Text
    private confettiPieces: ConfettiPiece[] = []
    private impactFlash = 0
    private collisionCueMs = 0
    private ending = false
    private landingPhase: LandingPhase = 'reentry'
    private landingElapsedMs = 0
    private splashdownElapsedMs = 0

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
        this.collisionCueMs = 0
        this.ending = false
        this.landingPhase = 'reentry'
        this.landingElapsedMs = 0
        this.splashdownElapsedMs = 0
        this.confettiPieces = []
        this.spawnSystem.reset()
        this.updateBackdropFx()
        this.updateOceanFx(0)
        this.drawParachute(0)
        this.drawConfetti(0)

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
        if (this.landingPhase === 'splashdown')
        {
            this.updateSplashdown(deltaMs)
            return
        }

        if (this.ending)
        {
            return
        }

        if (this.landingPhase === 'parachute')
        {
            this.updateLanding(deltaMs)
            return
        }

        const deltaSeconds = deltaMs / 1000
        const disturbanceAngleSigned = shortestAngle(this.capsule.angle)
        const disturbance = this.instabilitySystem.calculateDisturbance(
            this.flight,
            disturbanceAngleSigned,
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
        this.updateCollisionCue(deltaMs)
        const heatRatio = clamp(this.heat.current / BALANCE.heat.max, 0, 1)
        this.capsule.render(heatRatio, this.flight.atmosphere, orientationError, this.impactFlash)
        this.updateAtmosphereFx(heatRatio)
        this.updateOceanFx(0)
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
        this.showCollisionCue(result.impacts > 0 ? 'IMPACT' : 'SHIELD GLANCE', result.impacts > 0)
        this.cameras.main.shake(110, result.impacts > 0 ? 0.006 : 0.003)
    }

    private showCollisionCue (message: string, damaging: boolean): void
    {
        this.collisionCueMs = COLLISION_CUE_MS
        this.collisionCue
            .setText(message)
            .setColor(damaging ? '#fca5a5' : '#fde68a')
            .setAlpha(1)
            .setVisible(true)
    }

    private updateCollisionCue (deltaMs: number): void
    {
        if (this.collisionCueMs <= 0)
        {
            this.collisionCue.setVisible(false)
            return
        }

        this.collisionCueMs = Math.max(0, this.collisionCueMs - deltaMs)
        this.collisionCue.setAlpha(clamp(this.collisionCueMs / COLLISION_CUE_MS, 0, 1))
    }

    private applyHeatStress (deltaSeconds: number): void
    {
        if (this.heat.current < BALANCE.damage.heatStressStart)
        {
            return
        }

        const stress = clamp(
            (this.heat.current - BALANCE.damage.heatStressStart) / (BALANCE.heat.max - BALANCE.damage.heatStressStart),
            0,
            1
        )
        const creep = Math.pow(stress, 1.35) * BALANCE.damage.heatStressPerSecond * deltaSeconds
        this.capsule.damage = clamp(
            this.capsule.damage + creep,
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

    private updateLanding (deltaMs: number): void
    {
        this.landingElapsedMs += deltaMs
        this.flight = {
            ...this.flight,
            elapsedMs: this.flight.elapsedMs + deltaMs
        }

        const progress = clamp(this.landingElapsedMs / BALANCE.landing.parachuteDurationMs, 0, 1)
        const easedProgress = smoothstep(progress)
        const heatRatio = clamp(this.heat.current / BALANCE.heat.max, 0, 1)

        this.heat.current = Math.max(BALANCE.heat.starting, this.heat.current - (16 * (deltaMs / 1000)))
        this.capsule.angularVelocity *= Math.max(0, 1 - (3.8 * (deltaMs / 1000)))
        this.capsule.angle = shortestAngle(this.capsule.angle * Math.max(0, 1 - (1.8 * (deltaMs / 1000))))
        this.impactFlash = Math.max(0, this.impactFlash - ((deltaMs / 1000) * 4))

        this.updateBackdropFx()
        this.altitudeLines.clear()
        this.hideAltitudeLabels()
        this.capsule.render(heatRatio, this.flight.atmosphere, 0, this.impactFlash)
        this.drawParachute(easedProgress)
        this.updateOceanFx(easedProgress)
        this.hud.update(this.flight, this.heat, 0, this.capsule.damage, 0)

        if (progress >= 1)
        {
            this.startSplashdown()
        }
    }

    private updateSplashdown (deltaMs: number): void
    {
        this.splashdownElapsedMs += deltaMs
        this.flight = {
            ...this.flight,
            elapsedMs: this.flight.elapsedMs + deltaMs
        }

        const progress = clamp(this.splashdownElapsedMs / BALANCE.landing.splashdownDurationMs, 0, 1)
        const heatRatio = clamp(this.heat.current / BALANCE.heat.max, 0, 1)

        this.updateBackdropFx()
        this.altitudeLines.clear()
        this.hideAltitudeLabels()
        this.capsule.render(heatRatio, this.flight.atmosphere, 0, 0)
        this.drawSplashdownBurst(progress)
        this.drawConfetti(progress)
    }

    private updateOceanFx (landingProgress: number): void
    {
        this.ocean.clear()

        if (landingProgress <= 0)
        {
            return
        }

        const surfaceY = lerp(BALANCE.landing.waterStartY, BALANCE.landing.waterSurfaceY, landingProgress)
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
            this.startParachuteLanding()
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

        this.landingPhase = 'splashdown'
        this.splashdownElapsedMs = 0
        this.ending = true
        this.debris.forEach((item) => item.destroy())
        this.debris = []
        this.parachute.clear()
        this.landingText.setText('SPLASHDOWN')
        this.confettiPieces = this.createConfettiPieces()
        this.drawSplashdownBurst(0)
        this.drawConfetti(0)
        this.cameras.main.shake(260, 0.004)

        this.time.delayedCall(BALANCE.landing.splashdownDurationMs, () => {
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

    private startParachuteLanding (): void
    {
        if (this.landingPhase !== 'reentry')
        {
            return
        }

        this.landingPhase = 'parachute'
        this.landingElapsedMs = 0
        this.flight = {
            ...this.flight,
            altitude: BALANCE.reentry.endingAltitude,
            progress: 1,
            atmosphere: 0.28,
            speed: 0.22
        }
        this.debris.forEach((item) => item.destroy())
        this.debris = []
        this.spawnSystem.reset()
        this.landingText.setText('PARACHUTE DEPLOYED')
        this.cameras.main.shake(140, 0.002)
    }

    private getSpinRatio (): number
    {
        return clamp(Math.abs(this.capsule.angularVelocity) / BALANCE.capsule.maxAngularVelocity, 0, 1)
    }

    private drawSplashdownBurst (progress: number): void
    {
        this.updateOceanFx(1)

        const spread = smoothstep(progress)
        const fade = 1 - smoothstep(clamp((progress - 0.58) / 0.42, 0, 1))
        const centerY = this.capsule.y + 48
        const rippleWidth = lerp(18, 214, spread)
        const rippleHeight = lerp(8, 32, spread)
        const innerWidth = lerp(8, 124, spread)
        const sprayReach = lerp(8, 104, spread)
        const sprayLift = lerp(2, 36, spread)

        this.ocean.fillStyle(0x7dd3fc, 0.56 * fade)
        this.ocean.fillEllipse(this.capsule.x, centerY + 6, rippleWidth, rippleHeight)
        this.ocean.fillStyle(0xbae6fd, 0.38 * fade)
        this.ocean.fillEllipse(this.capsule.x, centerY, innerWidth, lerp(6, 18, spread))
        this.ocean.lineStyle(4, 0xbae6fd, 0.62 * fade)
        this.ocean.lineBetween(this.capsule.x - sprayReach, centerY, this.capsule.x - (sprayReach * 0.36), centerY - sprayLift)
        this.ocean.lineBetween(this.capsule.x + sprayReach, centerY, this.capsule.x + (sprayReach * 0.36), centerY - sprayLift)
        this.ocean.lineStyle(2, 0xe0f2fe, 0.46 * fade)
        this.ocean.lineBetween(this.capsule.x - (sprayReach * 0.72), centerY - 10, this.capsule.x - 16, centerY - (sprayLift * 0.35))
        this.ocean.lineBetween(this.capsule.x + (sprayReach * 0.72), centerY - 10, this.capsule.x + 16, centerY - (sprayLift * 0.35))
    }

    private createConfettiPieces (): ConfettiPiece[]
    {
        const colors = [0xfacc15, 0x22c55e, 0x38bdf8, 0xf472b6, 0xf97316, 0xe0f2fe]

        return Array.from({ length: 36 }, () => {
            const angle = (-Math.PI / 2) + ((Math.random() - 0.5) * 1.35)
            const speed = 150 + (Math.random() * 190)

            return {
                x: this.capsule.x + ((Math.random() - 0.5) * 36),
                y: this.capsule.y + 20 + (Math.random() * 28),
                velocityX: Math.cos(angle) * speed,
                velocityY: Math.sin(angle) * speed,
                rotation: Math.random() * Math.PI,
                spin: (Math.random() - 0.5) * 9,
                size: 4 + (Math.random() * 5),
                color: colors[Math.floor(Math.random() * colors.length)] ?? 0xe0f2fe,
                delay: Math.random() * 0.22
            }
        })
    }

    private drawConfetti (splashProgress: number): void
    {
        this.confetti.clear()

        if (this.confettiPieces.length === 0)
        {
            return
        }

        const elapsedSeconds = (splashProgress * BALANCE.landing.splashdownDurationMs) / 1000

        for (const piece of this.confettiPieces)
        {
            const age = elapsedSeconds - piece.delay

            if (age <= 0)
            {
                continue
            }

            const x = piece.x + (piece.velocityX * age)
            const y = piece.y + (piece.velocityY * age) + (360 * age * age)
            const alpha = 1 - smoothstep(clamp((age - 0.42) / 0.55, 0, 1))
            const rotation = piece.rotation + (piece.spin * age)
            const halfSize = piece.size * 0.5

            if (alpha <= 0)
            {
                continue
            }

            this.confetti.save()
            this.confetti.translateCanvas(x, y)
            this.confetti.rotateCanvas(rotation)
            this.confetti.fillStyle(piece.color, alpha)
            this.confetti.fillRect(-halfSize, -halfSize, piece.size, piece.size * 0.62)
            this.confetti.restore()
        }
    }

    private drawParachute (progress: number): void
    {
        this.parachute.clear()

        if (progress <= 0)
        {
            return
        }

        const canopyWidth = lerp(18, 144, progress)
        const canopyHeight = lerp(8, 62, progress)
        const canopyY = this.capsule.y - 116
        const alpha = clamp(progress * 1.25, 0, 1)

        this.parachute.lineStyle(2, 0xe0f2fe, 0.78 * alpha)
        this.parachute.lineBetween(this.capsule.x - 31, this.capsule.y - 22, this.capsule.x - (canopyWidth * 0.4), canopyY + 28)
        this.parachute.lineBetween(this.capsule.x, this.capsule.y - 31, this.capsule.x, canopyY + 18)
        this.parachute.lineBetween(this.capsule.x + 31, this.capsule.y - 22, this.capsule.x + (canopyWidth * 0.4), canopyY + 28)
        this.parachute.fillStyle(0xf8fafc, 0.92 * alpha)
        this.parachute.fillEllipse(this.capsule.x, canopyY + 24, canopyWidth, canopyHeight)
        this.parachute.lineStyle(3, 0x0f172a, 0.74 * alpha)
        this.parachute.strokeEllipse(this.capsule.x, canopyY + 24, canopyWidth, canopyHeight)
    }

    private drawBackdrop (): void
    {
        this.backdrop = this.add.graphics()
        this.altitudeLines = this.add.graphics()
        this.ocean = this.add.graphics()
        this.parachute = this.add.graphics()
        this.confetti = this.add.graphics()
        this.backdrop.setDepth(-30)
        this.altitudeLines.setDepth(-20)
        this.parachute.setDepth(1)
        this.ocean.setDepth(2)
        this.confetti.setDepth(3)
        this.collisionCue = this.add.text(GAME_CENTER_X, CAPSULE_SCREEN_Y + 72, '', {
            fontFamily: 'Arial Black',
            fontSize: 18,
            color: '#fde68a',
            stroke: '#05060a',
            strokeThickness: 5,
            align: 'center',
            wordWrap: { width: GAME_WIDTH - 32 }
        }).setOrigin(0.5).setDepth(5).setVisible(false)
        this.landingText = this.add.text(GAME_CENTER_X, 156, '', {
            fontFamily: 'Arial Black',
            fontSize: 23,
            color: '#e0f2fe',
            stroke: '#05060a',
            strokeThickness: 6,
            align: 'center',
            wordWrap: { width: GAME_WIDTH - 32 }
        }).setOrigin(0.5).setDepth(4)
        this.altitudeLabels = Array.from({ length: ALTITUDE_MARKER_LABELS }, () => {
            return this.add.text(0, 0, '', {
                fontFamily: 'Arial',
                fontSize: 13,
                color: '#ffe6a3'
            })
                .setOrigin(0, 0.5)
                .setStroke('#07111f', 4)
                .setDepth(-19)
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
