import { Scene } from 'phaser'
import { BALANCE } from '../config/balance'
import { Debris } from '../entities/Debris'
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

        debris.push(this.createDebris(scene, width, height))
        this.nextSpawnMs = flight.elapsedMs + BALANCE.debris.spawnEveryMs + randomBetween(0, BALANCE.debris.spawnJitterMs)
    }

    private createDebris (scene: Scene, width: number, height: number): Debris
    {
        const radius = randomBetween(BALANCE.debris.radiusMin, BALANCE.debris.radiusMax)
        const x = randomBetween(width * 0.24, width * 0.76)
        const y = -radius - randomBetween(0, height * 0.12)
        const speedX = randomBetween(18, 80) * randomSign()
        const speedY = randomBetween(BALANCE.debris.speedMin, BALANCE.debris.speedMax)

        return new Debris(scene, x, y, speedX, speedY, radius)
    }
}
