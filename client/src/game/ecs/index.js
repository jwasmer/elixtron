// src/game/ecs/index.js
const Component = require('./component');
const Entity = require('./entity');
const System = require('./system');
const EntityManager = require('./entity-manager');
const SystemManager = require('./system-manager');

// Systems
const RenderSystem = require('./systems/render-system');
const PhysicsSystem = require('./systems/physics-system');
const NetworkSyncSystem = require('./systems/network-sync-system');

module.exports = {
  Component,
  Entity,
  System,
  EntityManager,
  SystemManager,
  RenderSystem,
  PhysicsSystem,
  NetworkSyncSystem
};