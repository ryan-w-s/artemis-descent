export const clamp = (value: number, min: number, max: number): number => {
    return Math.min(Math.max(value, min), max)
}

export const inverseLerp = (start: number, end: number, value: number): number => {
    return clamp((value - start) / (end - start), 0, 1)
}

export const lerp = (start: number, end: number, amount: number): number => {
    return start + ((end - start) * amount)
}

export const shortestAngle = (angle: number): number => {
    return Math.atan2(Math.sin(angle), Math.cos(angle))
}

export const normalizeAngle = (angle: number): number => {
    return shortestAngle(angle)
}

export const pointToSegmentDistance = (
    pointX: number,
    pointY: number,
    startX: number,
    startY: number,
    endX: number,
    endY: number
): number => {
    const segmentX = endX - startX
    const segmentY = endY - startY
    const segmentLengthSquared = (segmentX * segmentX) + (segmentY * segmentY)

    if (segmentLengthSquared === 0)
    {
        return Math.hypot(pointX - startX, pointY - startY)
    }

    const projection = (((pointX - startX) * segmentX) + ((pointY - startY) * segmentY)) / segmentLengthSquared
    const t = clamp(projection, 0, 1)
    const closestX = startX + (segmentX * t)
    const closestY = startY + (segmentY * t)

    return Math.hypot(pointX - closestX, pointY - closestY)
}
