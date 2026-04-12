export type FailureReason = 'Overheated' | 'Wrong side exposed' | 'Spun out' | 'Hull breached';

export type RunResult = {
    survived: boolean;
    reason: FailureReason | 'Descent complete' | 'Signal lost';
    durationSeconds: number;
    maxHeat: number;
    damage: number;
};

export type FlightState = {
    altitude: number;
    speed: number;
    atmosphere: number;
    progress: number;
    elapsedMs: number;
};

export type HeatState = {
    current: number;
    maxObserved: number;
    wrongSideExposureMs: number;
};
