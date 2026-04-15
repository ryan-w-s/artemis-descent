import { Scene } from 'phaser'
import { BALANCE } from '../config/balance'
import { Debris, type DebrisKind } from '../entities/Debris'
import type { FlightState } from '../types'
import { randomBetween, randomSign } from '../utils/random'

export class SpawnSystem
{
    private nextSpawnMs: number = BALANCE.debris.spawnEveryMs

    reset (): void
    {
        this.nextSpawnMs = BALANCE.debris.spawnEveryMs
    }

    update (scene: Scene, debris: Debris[], flight: FlightState, width: number, height: number): void
    {
        if (flight.progress < BALANCE.debris.firstProgress || flight.elapsedMs < this.nextSpawnMs)
        {
            return
        }

        debris.push(this.createDebris(scene, flight, width, height))
        this.nextSpawnMs = flight.elapsedMs + BALANCE.debris.spawnEveryMs + randomBetween(0, BALANCE.debris.spawnJitterMs)
    }

    private createDebris (scene: Scene, flight: FlightState, width: number, height: number): Debris
    {
        const kind = this.getDebrisKind(flight.progress)
        const radius = randomBetween(BALANCE.debris.radiusMin, BALANCE.debris.radiusMax)
        const x = randomBetween(width * 0.16, width * 0.84)
        const y = height + radius + randomBetween(0, height * 0.16)
        const speedX = randomBetween(8, 42) * randomSign()
        const speedY = -randomBetween(BALANCE.debris.speedMin, BALANCE.debris.speedMax)

        return new Debris(scene, x, y, speedX, speedY, radius, kind)
    }

    private getDebrisKind (progress: number): DebrisKind
    {
        if (progress < BALANCE.debris.satelliteProgress)
        {
            return 'meteor'
        }

        if (progress < BALANCE.debris.planeProgress)
        {
            return 'satellite'
        }

        if (progress < BALANCE.debris.seagullProgress)
        {
            return 'plane'
        }

        return 'seagull'
    }
}
