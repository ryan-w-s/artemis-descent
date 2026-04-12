
# AGENTS.md

## Project Overview

This project is a small, arcade-style atmospheric reentry game built with the TypeScript + Vite + Phaser 4 template.

The player controls a returning space capsule during Earth reentry. The main challenge is staying properly oriented so the heat shield faces into the airflow while fighting aerodynamic instability, rising heat, and occasional debris. If the capsule rotates too far, exposes the wrong side, spins out, or overheats, the run ends.

The game should feel tense, readable, and easy to pick up. It is not a full simulation. Physics should be simplified and tuned for good game feel.

---

## Core Design Goals

- Build a short-session arcade game with a strong central mechanic
- Keep the control scheme simple: left/right only
- Make survival depend on orientation, stability, and heat management
- Favor readability and responsiveness over realism
- Keep the codebase small, modular, and easy to iterate on
- Ship a polished playable loop before adding content or complexity

---

## Player Fantasy

The player is piloting a crew capsule through the most dangerous part of the mission: reentry.

The fantasy is:
- the ship is barely holding together
- the atmosphere is trying to flip the capsule
- the heat shield must stay pointed correctly
- small mistakes can cascade into disaster

The player should feel like they are constantly correcting, stabilizing, and surviving by skill.

---

## Core Gameplay Loop

1. Start at high altitude during initial reentry
2. Descend into denser atmosphere
3. Manage capsule orientation with left/right controls
4. Resist growing instability and aerodynamic torque
5. Keep the heat shield facing the direction of travel
6. Avoid debris during the hottest phase
7. Survive until descent is complete
8. Show results / restart

A full run should be short, likely around 30 to 90 seconds.

---

## Core Mechanics

### 1. Capsule Orientation
The player rotates the capsule left and right.

Orientation is the main input and the main skill:
- correct orientation reduces danger
- incorrect orientation increases heat
- large errors can cause rapid failure

### 2. Directional Heating
The capsule has a protected heat shield side and an unprotected back side.

Heat should depend on:
- speed
- atmospheric density
- orientation relative to travel direction

If the shield is facing correctly, heat rises at a manageable rate.
If the capsule rotates too far off-axis, heat rises much faster.
If the wrong side is exposed, failure should come quickly.

### 3. Instability
As the capsule descends, atmospheric forces make it harder to stay aligned.

Instability should increase with:
- speed
- atmospheric density
- bad orientation
- possibly accumulated damage or heat

This should create wobble, drift, and rotational pressure without requiring realistic simulation.

### 4. Spin / Rotation Penalty
Fast rotation should be dangerous.

Possible effects:
- increases instability
- makes recovery harder
- contributes to damage or heat spikes

This prevents button mashing from being the best strategy.

### 5. Debris
During the dangerous phase of descent, debris can cross the play area.

Debris exists to force micro-corrections and disrupt stable play.
It should add pressure, not dominate the game.

### 6. Failure States
The run can end from:
- overheating
- exposing the wrong side too long
- spinning out of control
- accumulating too much damage from debris or instability

---

## MVP Scope

The first playable version should include only:

- one gameplay scene
- one capsule
- left/right controls
- altitude progression
- heat meter
- simplified instability
- directional heating
- basic debris
- game over and restart

Do not add:
- multiple ships
- upgrade systems
- complex menus
- realistic orbital mechanics
- procedural mission structure
- story mode
- fuel systems
- multiplayer
- mobile controls
- online features

If the basic loop is not fun, more features will not fix it.

---

## Tech Stack

- Phaser 4
- TypeScript
- Vite
- Browser-based deployment
- Minimal external dependencies beyond the template unless clearly justified

---

## Architecture Principles

### Keep gameplay code deterministic enough to tune
Game systems should be easy to tweak with constants and config values.

### Prefer simple systems over realistic systems
Fake the physics where needed. The game should feel right, not model real aerospace behavior.

### Separate data/config from runtime logic
Core tuning values should live in config files or clearly grouped constants.

### Keep scene responsibilities clean
Avoid dumping all logic into one giant scene file. Use managers / entities / helpers where useful.

### Make the game easy to rebalance
Most gameplay values should be easy to change without rewriting logic.

---

## Suggested Project Structure

This is a suggested structure, not a rigid rule:

```text
src/
  main.ts
  game/
    Game.ts
    config/
      gameConfig.ts
      balance.ts
    scenes/
      BootScene.ts
      MainMenuScene.ts
      GameScene.ts
      GameOverScene.ts
    entities/
      Capsule.ts
      Debris.ts
    systems/
      HeatSystem.ts
      FlightSystem.ts
      InstabilitySystem.ts
      SpawnSystem.ts
      CollisionSystem.ts
    ui/
      Hud.ts
      Meter.ts
      WarningIndicator.ts
    utils/
      math.ts
      random.ts
      debug.ts
    assets/
      ...
````

A smaller project can collapse some of these, but do not let `GameScene` become an unreadable god file.

---

## Scene Responsibilities

### BootScene

* load assets
* initialize shared data
* move to menu or directly into gameplay

### MainMenuScene

* title
* start prompt
* optional quick instructions

### GameScene

* owns main run state
* updates gameplay systems
* handles win/loss transition

### GameOverScene

* show outcome
* show score / survival stats
* restart

---

## Entity Responsibilities

### Capsule

Represents the player vehicle.

Owns:

* position
* angle
* angular velocity
* damage state
* visual effects hooks

Should not own all gameplay rules itself. Systems can operate on it.

### Debris

Simple hazard object.

Owns:

* movement
* collision shape
* cleanup when off-screen

---

## System Responsibilities

### HeatSystem

Calculates and applies heat gain.

Inputs may include:

* velocity
* atmosphere intensity
* orientation error
* spin rate

Outputs:

* current heat
* overheat state
* warning thresholds

### FlightSystem

Handles simplified descent progression.

Inputs may include:

* altitude
* descent rate
* control state
* angle

Outputs:

* updated altitude
* travel direction
* progression through reentry phases

### InstabilitySystem

Applies aerodynamic disturbance and rotational pressure.

Inputs may include:

* current speed
* atmosphere intensity
* orientation error

Outputs:

* rotational force / wobble
* recovery difficulty

### SpawnSystem

Controls debris spawning and pacing.

### CollisionSystem

Checks capsule vs debris and applies damage / feedback.

---

## Data / Balance Tuning

Centralize balance values. Avoid magic numbers spread throughout the code.

Examples:

* max safe orientation error
* heat gain multiplier
* instability multiplier
* max angular velocity
* debris spawn interval
* altitude start / end
* warning thresholds
* game over thresholds

A `balance.ts` file should contain most gameplay constants.

Example shape:

```ts
export const BALANCE = {
  reentry: {
    startingAltitude: 1000,
    endingAltitude: 0,
  },
  heat: {
    max: 100,
    warning: 70,
    critical: 90,
  },
  flight: {
    baseDescentRate: 1.2,
    maxAngularVelocity: 0.05,
  },
  instability: {
    base: 0.001,
    heatInfluence: 0.002,
    angleInfluence: 0.003,
  },
  debris: {
    spawnEveryMs: 1500,
    speedMin: 180,
    speedMax: 320,
  },
};
```

---

## Code Style Expectations

* Use TypeScript strictly
* Prefer explicit types for public APIs and important state
* Keep functions short and named by behavior
* Use classes only where they help; utility modules are fine
* Avoid deep inheritance
* Prefer composition over clever abstractions
* Avoid premature ECS-style complexity unless the project truly needs it

---

## Gameplay Feel Guidelines

The game should feel:

* tense
* readable
* responsive
* slightly unforgiving, but fair

The game should not feel:

* floaty in a sloppy way
* random in a frustrating way
* over-simulated
* cluttered with UI or effects

Randomness should pressure the player, not invalidate skill.

---

## Visual Direction

Keep visuals clean and readable.

Priorities:

* clear capsule silhouette
* obvious facing direction
* strong heat feedback
* strong danger feedback
* distinct debris visibility

Useful feedback:

* plasma trail intensity
* screen shake under extreme stress
* warning flashes
* red/orange heat cues
* orientation indicator
* heat meter
* damage or instability visual wobble

Placeholder art is fine early on. Readability matters more than detail.

---

## Audio Direction

Audio should reinforce stress and danger.

Useful layers:

* rumbling atmospheric roar
* warning beeps for critical heat
* debris impact sounds
* subtle input / correction sounds
* game over sting

Audio can come later, but the game will benefit from it a lot.

---

## UI Priorities

The HUD should stay minimal.

MVP HUD:

* heat meter
* altitude or progress meter
* orientation warning
* optional damage indicator

Do not bury the player in numbers. The UI should communicate danger at a glance.

---

## Testing Priorities

Test these first:

* left/right controls feel responsive
* capsule can recover from mild instability
* bad orientation reliably causes extra heat
* overheating happens for understandable reasons
* debris collisions feel fair
* runs are short and replayable
* failure feels like the player’s fault, not random nonsense

---

## Development Priorities

Build in this order:

1. Basic Phaser scene setup
2. Capsule rendering and left/right rotation
3. Descent / altitude progression
4. Heat system
5. Orientation penalty
6. Instability
7. Game over conditions
8. Debris
9. HUD polish
10. Juice and balance passes

Do not start with menus, audio pipelines, or fancy effects.

---

## Non-Goals

This project is not trying to be:

* a NASA simulator
* a hard science orbital mechanics game
* a massive content-heavy game
* a realistic aerospace training tool
* a live-service project

It is a focused arcade game with a strong theme and one good mechanic stack.

---

## Definition of Done for v1

v1 is done when:

* the game starts and is playable end-to-end
* controls are responsive
* the player clearly understands how to survive
* orientation and heat create real tension
* instability makes the run harder in a fun way
* debris adds pressure without overwhelming the game
* the player can lose, restart, and immediately try again
* the whole loop feels polished enough to show someone

---

## Notes for Future Expansion

Only expand after the core loop works.

Possible later additions:

* multiple reentry profiles
* score system
* medals / ranking
* different capsules with different handling
* challenge modifiers
* visual/audio polish
* endless survival mode
* parachute / final descent phase

These are optional and should not delay the MVP.

---

## Summary

Make a small, sharp, replayable reentry game.

The heart of the project is:

* keep the heat shield facing correctly
* fight instability
* survive the descent

If that feels good, the project works.

# Instructions:

* this is a Phaser v4 project, bringing many improvements from previous versions
* This project uses bun 
* this project uses typescript 
