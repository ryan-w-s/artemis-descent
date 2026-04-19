import { GameObjects, Scene } from 'phaser'
import { BALANCE } from '../config/balance'
import { GAME_CENTER_X, GAME_WIDTH } from '../config/screen'
import type { FlightState, HeatState } from '../types'
import { clamp } from '../utils/math'

const HUD_MARGIN = 24
const METER_WIDTH = GAME_WIDTH - (HUD_MARGIN * 2)
const HEAT_FILL_MAX = METER_WIDTH - 6

export class Hud
{
    private readonly heatBack: GameObjects.Rectangle
    private readonly heatFill: GameObjects.Rectangle
    private readonly altitudeBack: GameObjects.Rectangle
    private readonly altitudeFill: GameObjects.Rectangle
    private readonly damageBack: GameObjects.Rectangle
    private readonly damageFill: GameObjects.Rectangle
    private readonly warning: GameObjects.Text

    constructor (scene: Scene)
    {
        this.heatBack = scene.add.rectangle(HUD_MARGIN, 36, METER_WIDTH, 18, 0x111827, 0.9).setOrigin(0, 0.5)
        this.heatFill = scene.add.rectangle(HUD_MARGIN, 36, 8, 14, 0x38bdf8, 1).setOrigin(0, 0.5)
        scene.add.text(HUD_MARGIN, 13, 'HEAT', { fontFamily: 'Arial Black', fontSize: 14, color: '#e2e8f0' })

        this.altitudeBack = scene.add.rectangle(HUD_MARGIN, 82, METER_WIDTH, 12, 0x111827, 0.9).setOrigin(0, 0.5)
        this.altitudeFill = scene.add.rectangle(HUD_MARGIN, 82, HEAT_FILL_MAX, 8, 0x86efac, 1).setOrigin(0, 0.5)
        scene.add.text(HUD_MARGIN, 60, 'DESCENT', { fontFamily: 'Arial Black', fontSize: 14, color: '#e2e8f0' })

        this.damageBack = scene.add.rectangle(HUD_MARGIN, 124, METER_WIDTH, 12, 0x111827, 0.9).setOrigin(0, 0.5)
        this.damageFill = scene.add.rectangle(HUD_MARGIN, 124, 4, 8, 0x22c55e, 1).setOrigin(0, 0.5)
        scene.add.text(HUD_MARGIN, 102, 'DAMAGE', { fontFamily: 'Arial Black', fontSize: 14, color: '#e2e8f0' })

        this.warning = scene.add.text(GAME_CENTER_X, 164, '', {
            fontFamily: 'Arial Black',
            fontSize: 22,
            color: '#fca5a5',
            stroke: '#05060a',
            strokeThickness: 6,
            align: 'center',
            wordWrap: { width: GAME_WIDTH - 32 }
        }).setOrigin(0.5)

        this.heatBack.setStrokeStyle(2, 0x334155)
        this.altitudeBack.setStrokeStyle(2, 0x334155)
        this.damageBack.setStrokeStyle(2, 0x334155)
    }

    update (flight: FlightState, heat: HeatState, orientationError: number, damage: number, spinRatio: number): void
    {
        const heatRatio = clamp(heat.current / BALANCE.heat.max, 0, 1)
        this.heatFill.width = Math.max(8, HEAT_FILL_MAX * heatRatio)
        this.heatFill.fillColor = heat.current >= BALANCE.heat.critical ? 0xef4444 : heat.current >= BALANCE.heat.warning ? 0xf97316 : 0x38bdf8

        this.altitudeFill.width = Math.max(4, HEAT_FILL_MAX * (1 - flight.progress))
        this.altitudeFill.fillColor = flight.progress > 0.72 ? 0xf97316 : 0x86efac

        const damageRatio = clamp(damage / BALANCE.damage.max, 0, 1)
        this.damageFill.width = Math.max(4, HEAT_FILL_MAX * damageRatio)
        this.damageFill.fillColor = damageRatio > 0.72 ? 0xef4444 : damageRatio > 0.42 ? 0xf97316 : 0x22c55e

        if (orientationError >= BALANCE.heat.wrongSideAngle)
        {
            this.warning.setText('WRONG SIDE EXPOSED')
        }
        else if (orientationError >= BALANCE.orientation.criticalAngle)
        {
            this.warning.setText('SHIELD SLIPPING')
        }
        else if (heat.current >= BALANCE.heat.critical)
        {
            this.warning.setText('CRITICAL HEAT')
        }
        else if (spinRatio > 0.82)
        {
            this.warning.setText('SPIN WARNING')
        }
        else
        {
            this.warning.setText('')
        }
    }
}
