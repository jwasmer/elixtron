// src/game/ecs/component.js
class Component {
  constructor(data = {}) {
    Object.assign(this, data);
  }
  
  serialize() {
    return { ...this };
  }
  
  static deserialize(data) {
    return new this(data);
  }
}

module.exports = Component;