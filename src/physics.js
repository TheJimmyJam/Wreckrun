// physics.js — Matter.js world setup (zero-gravity, top-down plane)

const { Engine, World, Bodies, Body, Composite, Events } = Matter;

export const CATEGORY = {
  CAR: 0x0001,
  STRUCTURE: 0x0002,
  HAZARD: 0x0004,
  WALL: 0x0008,
  DEBRIS: 0x0010,
  PICKUP: 0x0020, // power-ups + coins — only ever collides with the car
};

export function createPhysicsWorld() {
  const engine = Engine.create();
  engine.gravity.x = 0;
  engine.gravity.y = 0;
  engine.gravity.scale = 0;
  const world = engine.world;
  return { engine, world, Engine, World, Bodies, Body, Composite, Events };
}

export function stepPhysics(engine, deltaMs) {
  Engine.update(engine, deltaMs);
}
