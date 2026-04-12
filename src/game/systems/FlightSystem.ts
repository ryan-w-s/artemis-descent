import { BALANCE } from '../config/balance'
import type { FlightState } from '../types'
import { inverseLerp, lerp } from '../utils/math'

export class FlightSystem
{
    createInitialState (): FlightState
    {
        return {
            altitude: BALANCE.reentry.startingAltitude,
            speed: BALANCE.reentry.speedMin,
            atmosphere: 0,
            progress: 0,
            elapsedMs: 0
        }
    }

    update (state: FlightState, deltaMs: number): FlightState
    {
        const deltaSeconds = deltaMs / 1000
        const progress = inverseLerp(
            BALANCE.reentry.startingAltitude,
            BALANCE.reentry.endingAltitude,
            state.altitude
        )
        const speed = lerp(BALANCE.reentry.speedMin, BALANCE.reentry.speedMax, progress)
        const atmosphere = Math.pow(progress, 1.35)
        const altitude = Math.max(
            BALANCE.reentry.endingAltitude,
            state.altitude - (BALANCE.reentry.baseDescentRate * speed * deltaSeconds)
        )

        return {
            altitude,
            speed,
            atmosphere,
            progress: inverseLerp(BALANCE.reentry.startingAltitude, BALANCE.reentry.endingAltitude, altitude),
            elapsedMs: state.elapsedMs + deltaMs
        }
    }
}
