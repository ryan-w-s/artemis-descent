import { BALANCE } from '../config/balance'
import type { FlightState, HeatState } from '../types'
import { clamp } from '../utils/math'

export class HeatSystem
{
    createInitialState (): HeatState
    {
        return {
            current: BALANCE.heat.starting,
            maxObserved: BALANCE.heat.starting,
            wrongSideExposureMs: 0
        }
    }

    update (
        state: HeatState,
        flight: FlightState,
        orientationError: number,
        angularVelocity: number,
        deltaMs: number
    ): HeatState
    {
        const deltaSeconds = deltaMs / 1000
        const errorRatio = clamp(
            (orientationError - BALANCE.heat.safeAngle) / (BALANCE.heat.wrongSideAngle - BALANCE.heat.safeAngle),
            0,
            1
        )
        const alignmentRatio = 1 - errorRatio
        const wrongSide = orientationError >= BALANCE.heat.wrongSideAngle
        const spinRatio = clamp(Math.abs(angularVelocity) / BALANCE.capsule.maxAngularVelocity, 0, 1)
        const heatingPressure = Math.pow(flight.atmosphere, 1.15) * flight.speed

        const gain = (
            (BALANCE.heat.baseGain * flight.atmosphere) +
            (BALANCE.heat.shieldedGain * heatingPressure) +
            (BALANCE.heat.errorGain * errorRatio * errorRatio * heatingPressure) +
            (BALANCE.heat.spinGain * spinRatio * spinRatio * heatingPressure) +
            (wrongSide ? BALANCE.heat.wrongSideGain * heatingPressure : 0)
        ) * deltaSeconds

        const controlledRecovery = BALANCE.heat.recovery * alignmentRatio * alignmentRatio * deltaSeconds
        const emergencyBleed = state.current > BALANCE.heat.warning && orientationError < BALANCE.orientation.warningAngle
            ? BALANCE.heat.emergencyBleed * deltaSeconds
            : 0
        const cooling = controlledRecovery + emergencyBleed
        const current = clamp(state.current + gain - cooling, BALANCE.heat.starting, BALANCE.heat.max)

        return {
            current,
            maxObserved: Math.max(state.maxObserved, current),
            wrongSideExposureMs: wrongSide ? state.wrongSideExposureMs + deltaMs : Math.max(0, state.wrongSideExposureMs - (deltaMs * 1.8))
        }
    }
}
