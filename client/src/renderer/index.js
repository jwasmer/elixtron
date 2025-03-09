// src/renderer/index.js
const { createSocket } = require('dgram');
const { ipcRenderer } = require('electron');
const BABYLON = require('babylonjs');

// Game client ID - will be unique for each instance
const CLIENT_ID = Math.random().toString(36).substr(2, 9);

// Create canvas and engine
const canvas = document.getElementById('renderCanvas');
const engine = new BABYLON.Engine(canvas, true);

// Store other players
const playerMeshes = new Map(); // entity_id => mesh

// Create a basic scene with a camera
const createScene = function() {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color3(0.1, 0.1, 0.2);
  
  // Add a camera
  const camera = new BABYLON.ArcRotateCamera("camera", 
    -Math.PI / 2, Math.PI / 3, 10, 
    BABYLON.Vector3.Zero(), scene);
  camera.attachControl(canvas, true);
  
  // Add a light
  const light = new BABYLON.HemisphericLight("light", 
    new BABYLON.Vector3(0, 1, 0), scene);
  
  // Add ground
  const ground = BABYLON.MeshBuilder.CreateGround("ground", {
    width: 20, 
    height: 20
  }, scene);
  ground.position.y = 0;
  
  // Material for ground
  const groundMaterial = new BABYLON.StandardMaterial("groundMat", scene);
  groundMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.1);
  ground.material = groundMaterial;
  
  // Create a player mesh
  const playerMaterial = new BABYLON.StandardMaterial("playerMat", scene);
  playerMaterial.diffuseColor = new BABYLON.Color3(0, 0.5, 0.7);
  
  // Create our player box
  const playerMesh = BABYLON.MeshBuilder.CreateBox("player", {
    width: 1, 
    height: 2, 
    depth: 1
  }, scene);
  playerMesh.position.y = 1; // Place on ground
  playerMesh.material = playerMaterial;
  
  // Store our player mesh globally
  window.playerMesh = playerMesh;
  
  // Add directional arrows to help identify orientation
  const arrowMaterial = new BABYLON.StandardMaterial("arrowMat", scene);
  arrowMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0);
  
  const frontArrow = BABYLON.MeshBuilder.CreateCylinder("frontArrow", {
    height: 1.5, 
    diameter: 0.2
  }, scene);
  frontArrow.parent = playerMesh;
  frontArrow.position.z = 0.8;
  frontArrow.position.y = 0;
  frontArrow.rotation.x = Math.PI / 2;
  frontArrow.material = arrowMaterial;
  
  return scene;
};

const scene = createScene();

// Create a UDP socket for the game client
const socket = createSocket('udp4');
socket.bind(0); // Bind to any available port

// Communication with the game server
const serverAddress = '127.0.0.1';
const serverPort = 12345;

// Send connect message
function connectToServer() {
  const connectMessage = JSON.stringify({
    type: 'connect',
    client_id: CLIENT_ID
  });
  
  socket.send(connectMessage, serverPort, serverAddress);
  console.log('Connecting to server with client ID:', CLIENT_ID);
}

// Send player position and rotation updates
function sendPlayerUpdate() {
  if (!window.playerMesh) return;
  
  const playerMesh = window.playerMesh;
  
  const updateMessage = JSON.stringify({
    type: 'input',
    client_id: CLIENT_ID,
    position: {
      x: playerMesh.position.x,
      y: playerMesh.position.y,
      z: playerMesh.position.z
    },
    rotation: {
      x: playerMesh.rotation.x,
      y: playerMesh.rotation.y,
      z: playerMesh.rotation.z
    }
  });
  
  socket.send(updateMessage, serverPort, serverAddress);
}

// Handle messages from the server
socket.on('message', (msg, rinfo) => {
  if (rinfo.address === serverAddress && rinfo.port === serverPort) {
    try {
      const message = JSON.parse(msg.toString());
      
      if (message.type === 'connect_ack') {
        console.log('Connected to server!');
      } 
      else if (message.type === 'state_update') {
        updateGameState(message.entities);
      }
    } catch (e) {
      console.error('Failed to parse server message:', e);
    }
  }
});

// Update the game state based on server data
function updateGameState(entities) {
  if (!entities || !Array.isArray(entities)) return;
  
  // Track which entities we've seen this frame
  const seenEntities = new Set();
  
  // Update all entities
  entities.forEach(entity => {
    const entityId = entity.id;
    seenEntities.add(entityId);
    
    // Get components
    const components = entity.components || {};
    const position = components.position;
    const rotation = components.rotation;
    const player = components.player;
    
    // Skip if the entity is our own player
    if (player && player.client_id === CLIENT_ID) {
      // Only update our y position from server (to handle gravity, etc.)
      // but use local position for x and z (to avoid jitter)
      if (position && window.playerMesh) {
        window.playerMesh.position.y = position.y;
      }
      return;
    }
    
    // If this is another player, create or update their mesh
    if (player && position) {
      let playerMesh = playerMeshes.get(entityId);
      
      // Create a new mesh for this player if we don't have one
      if (!playerMesh) {
        playerMesh = BABYLON.MeshBuilder.CreateBox(`player_${entityId}`, {
          width: 1, 
          height: 2, 
          depth: 1
        }, scene);
        
        // Use a different color for other players
        const playerMaterial = new BABYLON.StandardMaterial(`playerMat_${entityId}`, scene);
        playerMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.2, 0.2);
        playerMesh.material = playerMaterial;
        
        // Add direction arrow
        const arrowMaterial = new BABYLON.StandardMaterial(`arrowMat_${entityId}`, scene);
        arrowMaterial.diffuseColor = new BABYLON.Color3(1, 1, 0);
        
        const frontArrow = BABYLON.MeshBuilder.CreateCylinder(`frontArrow_${entityId}`, {
          height: 1.5, 
          diameter: 0.2
        }, scene);
        frontArrow.parent = playerMesh;
        frontArrow.position.z = 0.8;
        frontArrow.position.y = 0;
        frontArrow.rotation.x = Math.PI / 2;
        frontArrow.material = arrowMaterial;
        
        playerMeshes.set(entityId, playerMesh);
      }
      
      // Update the mesh position and rotation
      playerMesh.position.x = position.x;
      playerMesh.position.y = position.y;
      playerMesh.position.z = position.z;
      
      if (rotation) {
        playerMesh.rotation.x = rotation.x;
        playerMesh.rotation.y = rotation.y;
        playerMesh.rotation.z = rotation.z;
      }
    }
  });
  
  // Remove any entities that were not in this update
  for (const [entityId, mesh] of playerMeshes.entries()) {
    if (!seenEntities.has(entityId)) {
      mesh.dispose();
      playerMeshes.delete(entityId);
    }
  }
}

// Use keyboard to control player movement
const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.key] = true;
});

window.addEventListener('keyup', (e) => {
  keys[e.key] = false;
});

// Main game loop
engine.runRenderLoop(() => {
  const playerMesh = window.playerMesh;
  
  if (playerMesh) {
    // Movement speed
    const speed = 0.1;
    let moved = false;
    
    // Forward/backward
    if (keys['w'] || keys['ArrowUp']) {
      playerMesh.position.z += speed;
      moved = true;
    }
    if (keys['s'] || keys['ArrowDown']) {
      playerMesh.position.z -= speed;
      moved = true;
    }
    
    // Left/right
    if (keys['a'] || keys['ArrowLeft']) {
      playerMesh.position.x -= speed;
      moved = true;
    }
    if (keys['d'] || keys['ArrowRight']) {
      playerMesh.position.x += speed;
      moved = true;
    }
    
    // Rotation
    if (keys['q']) {
      playerMesh.rotation.y -= 0.05;
      moved = true;
    }
    if (keys['e']) {
      playerMesh.rotation.y += 0.05;
      moved = true;
    }
    
    // If player moved, send update to server
    if (moved) {
      sendPlayerUpdate();
    }
  }
  
  scene.render();
});

// Handle window resize
window.addEventListener('resize', () => {
  engine.resize();
});

// Connect to server on load
window.addEventListener('load', () => {
  connectToServer();
  
  // Send periodic updates (for kept connections and to handle network issues)
  setInterval(() => {
    sendPlayerUpdate();
  }, 100); // 10 updates per second
});

// Check if this is a second instance
ipcRenderer.on('instance-info', (event, { isSecondInstance }) => {
  if (isSecondInstance) {
    // If it's a second instance, change the color of our player
    if (window.playerMesh) {
      const playerMaterial = window.playerMesh.material;
      playerMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.8, 0.2);
    }
    
    // Delay connection slightly to avoid port conflicts
    setTimeout(connectToServer, 500);
  }
});