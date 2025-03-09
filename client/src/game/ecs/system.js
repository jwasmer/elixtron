// src/game/ecs/system.js
class System {
  constructor() {
    this.requiredComponents = [];
  }
  
  update(entities, deltaTime) {
    const relevantEntities = entities.filter(entity => 
      this.requiredComponents.every(comp => entity.hasComponent(comp))
    );
    
    this.processEntities(relevantEntities, deltaTime);
  }
  
  processEntities(entities, deltaTime) {
    // Override this method in subclasses
  }
}

module.exports = System;