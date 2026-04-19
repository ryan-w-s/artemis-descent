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
            const distance = Math.hypot(item.x - capsule.x, item.y - capsule.y)
            if (distance <= item.getCollisionRadius() + capsule.getCollisionRadius())
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
