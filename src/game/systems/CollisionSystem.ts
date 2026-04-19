import { Capsule } from '../entities/Capsule'
import { Debris } from '../entities/Debris'

export type CollisionResult = {
    debris: Debris[];
    impacts: number;
    shieldGlances: number;
};

export class CollisionSystem
{
    update (capsule: Capsule, debris: Debris[]): CollisionResult
    {
        const survivors: Debris[] = []
        let impacts = 0
        let shieldGlances = 0

        for (const item of debris)
        {
            const distance = Math.hypot(item.x - capsule.x, item.y - capsule.y)
            if (distance <= item.getCollisionRadius() + capsule.getCollisionRadius())
            {
                if (capsule.isShieldFacingPoint(item.x, item.y))
                {
                    capsule.applyShieldGlance()
                    shieldGlances += 1
                }
                else
                {
                    capsule.applyImpact()
                    impacts += 1
                }

                item.destroy()
            }
            else
            {
                survivors.push(item)
            }
        }

        return {
            debris: survivors,
            impacts,
            shieldGlances
        }
    }
}
