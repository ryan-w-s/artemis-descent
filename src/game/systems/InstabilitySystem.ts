import { BALANCE } from '../config/balance'
import type { FlightState } from '../types'
import { clamp } from '../utils/math'

export class InstabilitySystem
{
    calculateDisturbance (
        flight: FlightState,
        orientationErrorSigned: number,
        angularVelocity: number
    ): number
    {
        const wobble = Math.sin(flight.elapsedMs * BALANCE.instability.wobbleFrequency) * BALANCE.instability.wobbleStrength
        const errorPressure = Math.sign(orientationErrorSigned || 1) * Math.abs(orientationErrorSigned) * BALANCE.instability.errorInfluence
        const spinPressure = clamp(angularVelocity, -1, 1) * 0.8

        return (
            BALANCE.instability.baseTorque +
            (flight.atmosphere * BALANCE.instability.atmosphereTorque) +
            errorPressure +
            wobble +
            spinPressure
        ) * flight.atmosphere
    }
}
