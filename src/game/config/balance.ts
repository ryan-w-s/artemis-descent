export const BALANCE = {
    reentry: {
        startingAltitude: 1000,
        endingAltitude: 0,
        baseDescentRate: 25,
        speedMin: 0.7,
        speedMax: 1.45
    },
    capsule: {
        controlTorque: 8.8,
        damping: 4.8,
        maxAngularVelocity: 6.4,
        lateralAcceleration: 620,
        lateralDamping: 2.6,
        maxLateralSpeed: 230,
        minX: 74,
        maxX: 358,
        spinDangerVelocity: 4.5,
        spunOutVelocity: 6,
        spunOutMs: 1050,
        impactDamage: 18,
        heatImpulseOnImpact: 11
    },
    heat: {
        max: 100,
        warning: 66,
        critical: 86,
        starting: 0,
        baseGain: 0.25,
        shieldedGain: 1.4,
        errorGain: 80,
        wrongSideGain: 70,
        spinGain: 16,
        recovery: 5.4,
        emergencyBleed: 8,
        safeAngle: 0.26,
        wrongSideAngle: 2.25,
        wrongSideFailureMs: 950
    },
    orientation: {
        warningAngle: 0.5,
        criticalAngle: 1
    },
    instability: {
        baseTorque: 1.1,
        atmosphereTorque: 3.3,
        heatInfluence: 1.8,
        errorInfluence: 3.2,
        wobbleFrequency: 0.006,
        wobbleStrength: 3.4
    },
    debris: {
        firstProgress: 0.22,
        satelliteProgress: 0.4,
        planeProgress: 0.68,
        seagullProgress: 0.88,
        spawnEveryMs: 820,
        spawnJitterMs: 360,
        speedMin: 260,
        speedMax: 460,
        radiusMin: 10,
        radiusMax: 22
    },
    damage: {
        max: 100,
        heatStressStart: 88,
        heatStressPerSecond: 7
    }
} as const
