import { GameObjects, Input, Scene } from 'phaser';
import { BALANCE } from '../config/balance';
import { Capsule } from '../entities/Capsule';
import { Debris } from '../entities/Debris';
import { CollisionSystem } from '../systems/CollisionSystem';
import { FlightSystem } from '../systems/FlightSystem';
import { HeatSystem } from '../systems/HeatSystem';
import { InstabilitySystem } from '../systems/InstabilitySystem';
import { SpawnSystem } from '../systems/SpawnSystem';
import type { FailureReason, FlightState, HeatState, RunResult } from '../types';
import { Hud } from '../ui/Hud';
import { clamp, shortestAngle } from '../utils/math';

type ControlKeys = {
    left: Input.Keyboard.Key;
    right: Input.Keyboard.Key;
    a: Input.Keyboard.Key;
    d: Input.Keyboard.Key;
};

export class Game extends Scene
{
    private capsule!: Capsule;
    private hud!: Hud;
    private flight!: FlightState;
    private heat!: HeatState;
    private debris: Debris[] = [];
    private speedLines!: GameObjects.Graphics;
    private ocean!: GameObjects.Graphics;
    private impactFlash = 0;
    private ending = false;

    private readonly flightSystem = new FlightSystem();
    private readonly heatSystem = new HeatSystem();
    private readonly instabilitySystem = new InstabilitySystem();
    private readonly spawnSystem = new SpawnSystem();
    private readonly collisionSystem = new CollisionSystem();

    private keys!: ControlKeys;

    constructor ()
    {
        super('Game');
    }

    create (): void
    {
        this.cameras.main.setBackgroundColor(0x06080d);
        this.drawBackdrop();

        this.flight = this.flightSystem.createInitialState();
        this.heat = this.heatSystem.createInitialState();
        this.debris = [];
        this.impactFlash = 0;
        this.ending = false;
        this.spawnSystem.reset();

        this.capsule = new Capsule(this, 512, 392);
        this.hud = new Hud(this);
        this.keys = this.createKeys();

        this.add.text(512, 724, 'Keep the heat shield down. Left/Right or A/D to correct.', {
            fontFamily: 'Arial',
            fontSize: 20,
            color: '#cbd5e1',
            align: 'center'
        }).setOrigin(0.5);
    }

    update (_time: number, deltaMs: number): void
    {
        const deltaSeconds = deltaMs / 1000;
        const disturbanceAngleSigned = shortestAngle(this.capsule.angle);
        const heatRatioForDisturbance = clamp(this.heat.current / BALANCE.heat.max, 0, 1);
        const disturbance = this.instabilitySystem.calculateDisturbance(
            this.flight,
            disturbanceAngleSigned,
            heatRatioForDisturbance,
            this.capsule.angularVelocity
        );

        this.flight = this.flightSystem.update(this.flight, deltaMs);
        this.capsule.update(deltaSeconds, this.readControls(), disturbance, this.flight.atmosphere, this.flight.speed);
        const orientationErrorSigned = shortestAngle(this.capsule.angle);
        const orientationError = Math.abs(orientationErrorSigned);
        this.heat = this.heatSystem.update(
            this.heat,
            this.flight,
            orientationError,
            this.capsule.angularVelocity,
            deltaMs
        );

        this.applyHeatStress(deltaSeconds);
        this.spawnSystem.update(this, this.debris, this.flight, 1024, 768);
        this.updateDebris(deltaSeconds);
        this.resolveCollisions();

        this.impactFlash = Math.max(0, this.impactFlash - (deltaSeconds * 4));
        this.capsule.updateSpinDanger(deltaMs);
        const heatRatio = clamp(this.heat.current / BALANCE.heat.max, 0, 1);
        this.capsule.render(heatRatio, this.flight.atmosphere, orientationError, this.impactFlash);
        this.updateAtmosphereFx(heatRatio);
        this.updateOceanFx();
        this.hud.update(this.flight, this.heat, orientationError, this.capsule.damage, this.getSpinRatio());
        this.applyDangerShake(orientationError);
        this.checkEndState();
    }

    private createKeys (): ControlKeys
    {
        if (!this.input.keyboard)
        {
            throw new Error('Keyboard input is required for Artemis Descent.');
        }

        return {
            left: this.input.keyboard.addKey(Input.Keyboard.KeyCodes.LEFT),
            right: this.input.keyboard.addKey(Input.Keyboard.KeyCodes.RIGHT),
            a: this.input.keyboard.addKey(Input.Keyboard.KeyCodes.A),
            d: this.input.keyboard.addKey(Input.Keyboard.KeyCodes.D)
        };
    }

    private readControls ()
    {
        return {
            left: this.keys.left.isDown || this.keys.a.isDown,
            right: this.keys.right.isDown || this.keys.d.isDown
        };
    }

    private updateDebris (deltaSeconds: number): void
    {
        const activeDebris: Debris[] = [];

        for (const item of this.debris)
        {
            item.update(deltaSeconds);

            if (item.isOffscreen(1024, 768))
            {
                item.destroy();
            }
            else
            {
                activeDebris.push(item);
            }
        }

        this.debris = activeDebris;
    }

    private resolveCollisions (): void
    {
        const result = this.collisionSystem.update(this.capsule, this.debris);
        this.debris = result.debris;

        if (result.impacts === 0 && result.shieldGlances === 0)
        {
            return;
        }

        const heatImpulse = (result.impacts * BALANCE.capsule.heatImpulseOnImpact) + (result.shieldGlances * 4);
        this.heat.current = clamp(this.heat.current + heatImpulse, 0, BALANCE.heat.max);
        this.heat.maxObserved = Math.max(this.heat.maxObserved, this.heat.current);
        this.impactFlash = 1;
        this.cameras.main.shake(110, result.impacts > 0 ? 0.006 : 0.003);
    }

    private applyHeatStress (deltaSeconds: number): void
    {
        if (this.heat.current < BALANCE.damage.heatStressStart)
        {
            return;
        }

        const stress = (this.heat.current - BALANCE.damage.heatStressStart) / (BALANCE.heat.max - BALANCE.damage.heatStressStart);
        this.capsule.damage = clamp(
            this.capsule.damage + (stress * BALANCE.damage.heatStressPerSecond * deltaSeconds),
            0,
            BALANCE.damage.max
        );
    }

    private applyDangerShake (orientationError: number): void
    {
        if (
            this.heat.current >= BALANCE.heat.critical ||
            orientationError >= BALANCE.orientation.criticalAngle ||
            this.getSpinRatio() > 0.78
        )
        {
            this.cameras.main.shake(55, 0.0028);
        }
    }

    private updateAtmosphereFx (heatRatio: number): void
    {
        const intensity = clamp((this.flight.atmosphere * 0.85) + (heatRatio * 0.45), 0, 1);
        this.speedLines.clear();

        if (intensity <= 0.05)
        {
            return;
        }

        const offset = (this.flight.elapsedMs * (0.2 + intensity * 0.36)) % 110;
        const skew = clamp(this.capsule.lateralVelocity / BALANCE.capsule.maxLateralSpeed, -1, 1) * 18;
        this.speedLines.lineStyle(2, 0xff7a2f, 0.08 + (intensity * 0.18));

        for (let x = 150; x < 900; x += 62)
        {
            for (let y = -160 + offset; y < 860; y += 150)
            {
                this.speedLines.lineBetween(x, y, x + skew, y + 96 + (intensity * 60));
            }
        }

        this.speedLines.lineStyle(4, 0xffd166, 0.05 + (intensity * 0.08));
        for (let x = 220; x < 840; x += 150)
        {
            for (let y = -120 + (offset * 1.4); y < 860; y += 240)
            {
                this.speedLines.lineBetween(x, y, x + (skew * 1.4), y + 130);
            }
        }
    }

    private updateOceanFx (): void
    {
        if (this.ending)
        {
            return;
        }

        const oceanProgress = clamp((this.flight.progress - 0.82) / 0.18, 0, 1);
        this.ocean.clear();

        if (oceanProgress <= 0)
        {
            return;
        }

        const surfaceY = 768 - (oceanProgress * 145);
        this.ocean.fillStyle(0x0f4c81, 0.82);
        this.ocean.fillRect(0, surfaceY, 1024, 768 - surfaceY);
        this.ocean.lineStyle(3, 0x7dd3fc, 0.45);

        for (let x = -80; x < 1120; x += 120)
        {
            const waveY = surfaceY + (Math.sin((this.flight.elapsedMs * 0.004) + x) * 8);
            this.ocean.lineBetween(x, waveY, x + 70, waveY + 5);
        }
    }

    private checkEndState (): void
    {
        if (this.flight.altitude <= BALANCE.reentry.endingAltitude)
        {
            this.startSplashdown();
            return;
        }

        const failureReason = this.getFailureReason();
        if (failureReason)
        {
            this.finish(false, failureReason);
        }
    }

    private getFailureReason (): FailureReason | undefined
    {
        if (this.heat.current >= BALANCE.heat.max)
        {
            return 'Overheated';
        }

        if (this.capsule.damage >= BALANCE.damage.max)
        {
            return 'Hull breached';
        }

        return undefined;
    }

    private finish (survived: boolean, reason: RunResult['reason']): void
    {
        if (this.ending)
        {
            return;
        }

        this.ending = true;
        for (const item of this.debris)
        {
            item.destroy();
        }

        const result: RunResult = {
            survived,
            reason,
            durationSeconds: this.flight.elapsedMs / 1000,
            maxHeat: this.heat.maxObserved,
            damage: this.capsule.damage
        };

        this.scene.start('GameOver', result);
    }

    private startSplashdown (): void
    {
        if (this.ending)
        {
            return;
        }

        this.ending = true;
        this.debris.forEach((item) => item.destroy());
        this.debris = [];
        this.drawSplashdownBurst();
        this.cameras.main.shake(260, 0.004);

        this.time.delayedCall(950, () => {
            const result: RunResult = {
                survived: true,
                reason: 'Descent complete',
                durationSeconds: this.flight.elapsedMs / 1000,
                maxHeat: this.heat.maxObserved,
                damage: this.capsule.damage
            };

            this.scene.start('GameOver', result);
        });
    }

    private getSpinRatio (): number
    {
        return clamp(Math.abs(this.capsule.angularVelocity) / BALANCE.capsule.maxAngularVelocity, 0, 1);
    }

    private drawSplashdownBurst (): void
    {
        this.ocean.fillStyle(0xe0f2fe, 0.9);
        this.ocean.fillCircle(this.capsule.x, this.capsule.y + 38, 46);
        this.ocean.fillStyle(0x7dd3fc, 0.75);
        this.ocean.fillEllipse(this.capsule.x, this.capsule.y + 60, 170, 34);
        this.ocean.lineStyle(5, 0xe0f2fe, 0.8);
        this.ocean.lineBetween(this.capsule.x - 86, this.capsule.y + 52, this.capsule.x - 22, this.capsule.y + 4);
        this.ocean.lineBetween(this.capsule.x + 86, this.capsule.y + 52, this.capsule.x + 22, this.capsule.y + 4);
    }

    private drawBackdrop (): void
    {
        const graphics = this.add.graphics();
        graphics.fillGradientStyle(0x05070d, 0x05070d, 0x1f2937, 0x3b1012, 1);
        graphics.fillRect(0, 0, 1024, 768);

        graphics.lineStyle(2, 0xf97316, 0.08);
        for (let y = 140; y < 768; y += 55)
        {
            graphics.lineBetween(0, y, 1024, y + 90);
        }

        graphics.fillStyle(0x93c5fd, 0.7);
        for (let i = 0; i < 52; i += 1)
        {
            graphics.fillCircle(Math.random() * 1024, Math.random() * 260, Math.random() * 1.8);
        }

        this.speedLines = this.add.graphics();
        this.ocean = this.add.graphics();
    }
}
