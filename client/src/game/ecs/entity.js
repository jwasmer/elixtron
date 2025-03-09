// src/game/ecs/entity.js
class Entity {
  constructor(id) {
    this.id = id || Math.random().toString(36).substr(2, 9);
    this.components = new Map();
  }
  
  addComponent(component) {
    this.components.set(component.constructor.name, component);
    return this;
  }
  
  removeComponent(componentType) {
    this.components.delete(componentType.name);
    return this;
  }
  
  getComponent(componentType) {
    return this.components.get(componentType.name);
  }
  
  hasComponent(componentType) {
    return this.components.has(componentType.name);
  }
}

module.exports = Entity;