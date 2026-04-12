export const clamp = (value: number, min: number, max: number): number => {
    return Math.min(Math.max(value, min), max);
};

export const inverseLerp = (start: number, end: number, value: number): number => {
    return clamp((value - start) / (end - start), 0, 1);
};

export const lerp = (start: number, end: number, amount: number): number => {
    return start + ((end - start) * amount);
};

export const shortestAngle = (angle: number): number => {
    return Math.atan2(Math.sin(angle), Math.cos(angle));
};

export const normalizeAngle = (angle: number): number => {
    return shortestAngle(angle);
};
