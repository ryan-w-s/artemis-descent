import { Capsule } from '../entities/Capsule'
import { Debris } from '../entities/Debris'

export type CollisionResult = {
    debris: Debris[];
    impacts: number;
};

export class CollisionSystem
{
    update (capsule: Capsule, debris: Debris[]): CollisionResult
    {
        const survivors: Debris[] = []
        let impacts = 0

        for (const item of debris)
        {
            if (item.collidesWithCircle(capsule.x, capsule.y, capsule.getCollisionRadius()))
            {
                capsule.applyImpact()
                impacts += 1
                item.destroy()
            }
            else
            {
                survivors.push(item)
            }
        }

        return {
            debris: survivors,
            impacts
        }
    }
}
