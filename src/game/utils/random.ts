export const randomBetween = (min: number, max: number): number => {
    return min + (Math.random() * (max - min));
};

export const randomSign = (): number => {
    return Math.random() < 0.5 ? -1 : 1;
};
