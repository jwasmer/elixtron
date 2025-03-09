import { BABYLON, GridMaterial } from './babylon-imports';
import { Vector3, Rotation } from '../../../../shared/types/protocol';

// Input state from keyboard/mouse
export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
}

// Player object
export interface Player {
  id: number;
  mesh: BABYLON.Mesh;
  isLocal: boolean;
  position: Vector3;
  rotation: Rotation;
  velocity: Vector3;
}

// Game object
export interface GameObject {
  id: string;
  mesh: BABYLON.Mesh;
  type: string;
  position: Vector3;
  rotation: Rotation;
  data: any;
}

// Update callback type
export type UpdateCallback = (deltaTime: number) => void;

export class GameEngine {
  // Babylon.js components
  private canvas: HTMLCanvasElement | null = null;
  private engine: BABYLON.Engine | null = null;
  private scene: BABYLON.Scene | null = null;
  private camera: BABYLON.FollowCamera | null = null;
  
  // Game state
  public players: Record<string, Player> = {};
  public gameObjects: Record<string, GameObject> = {};
  public localPlayer: Player | null = null;
  private inputState: InputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false
  };
  
  // Rendering state
  private lastFrameTime: number = 0;
  private initialized: boolean = false;
  private deltaTime: number = 0;

  // Event callbacks
  private onUpdateCallbacks: UpdateCallback[] = [];

  /**
   * Initialize the game engine
   * @param container DOM element to render in
   */
  init(container: HTMLElement): void {
    if (this.initialized) return;

    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    container.appendChild(this.canvas);
    
    // Create Babylon engine
    this.engine = new BABYLON.Engine(this.canvas, true, { 
      preserveDrawingBuffer: true, 
      stencil: true 
    });
    
    // Create scene
    this.scene = this._createScene();
    
    // Set up window resize handler
    window.addEventListener('resize', this._handleResize.bind(this));
    
    // Set initialization flag
    this.initialized = true;
    
    // Start the render loop
    this.lastFrameTime = performance.now();
    if (this.engine) {
      this.engine.runRenderLoop(() => this._renderLoop());
    }
    
    // Show inspector in development mode
    if (process.env.NODE_ENV === 'development' && this.scene) {
      this.scene.debugLayer.show({
        embedMode: true,
        overlay: true
      });
    }
  }

  /**
   * Create the scene with basic environment
   * @returns The created scene
   * @private
   */
  private _createScene(): BABYLON.Scene {
    if (!this.engine) {
      throw new Error('Cannot create scene: Engine not initialized');
    }
    
    // Create scene
    const scene = new BABYLON.Scene(this.engine);
    scene.clearColor = new BABYLON.Color4(0.0, 0.0, 0.2, 1.0);
    
    // Add ambient light
    const ambientLight = new BABYLON.HemisphericLight(
      'ambientLight',
      new BABYLON.Vector3(0, 1, 0),
      scene
    );
    ambientLight.intensity = 0.5;
    
    // Add directional light (for shadows)
    const directionalLight = new BABYLON.DirectionalLight(
      'directionalLight',
      new BABYLON.Vector3(-1, -2, -1),
      scene
    );
    directionalLight.intensity = 0.8;
    
    // Create ground
    const ground = BABYLON.MeshBuilder.CreateGround(
      'ground',
      { width: 100, height: 100 },
      scene
    );
    const groundMaterial = new BABYLON.StandardMaterial('groundMaterial', scene);
    groundMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.3);
    groundMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    
    // Create procedural texture for grid pattern
    const groundTexture = new BABYLON.DynamicTexture('groundTexture', 1024, scene, true);
    const textureContext = groundTexture.getContext();
    
    // Draw grid pattern
    const size = textureContext.canvas.width;
    textureContext.fillStyle = '#1E1E2D';
    textureContext.fillRect(0, 0, size, size);
    textureContext.lineWidth = 1;
    textureContext.strokeStyle = '#444466';
    
    // Draw grid lines
    const gridSize = 10;
    const gridStep = size / gridSize;
    
    textureContext.beginPath();
    for (let i = 0; i <= gridSize; i++) {
      // Draw major grid lines darker
      textureContext.strokeStyle = i % 5 === 0 ? '#6666AA' : '#444466';
      textureContext.lineWidth = i % 5 === 0 ? 2 : 1;
      
      // Vertical line
      textureContext.moveTo(i * gridStep, 0);
      textureContext.lineTo(i * gridStep, size);
      
      // Horizontal line
      textureContext.moveTo(0, i * gridStep);
      textureContext.lineTo(size, i * gridStep);
    }
    textureContext.stroke();
    
    // Apply texture
    groundTexture.update();
    groundMaterial.diffuseTexture = groundTexture;
    ground.material = groundMaterial;
    
    // Enable shadows
    const shadowGenerator = new BABYLON.ShadowGenerator(1024, directionalLight);
    shadowGenerator.useBlurExponentialShadowMap = true;
    shadowGenerator.blurKernel = 32;
    
    // Enable physics (if needed)
    // scene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), new BABYLON.CannonJSPlugin());
    
    return scene;
  }

  /**
   * Add a player to the game
   * @param playerId Player ID
   * @param isLocalPlayer Whether this is the local player
   * @param initialPosition Initial position
   * @returns The created player object
   */
  addPlayer(playerId: number, isLocalPlayer: boolean = false, initialPosition: Vector3 = { x: 0, y: 0, z: 0 }): Player {
    const playerKey = playerId.toString();
    if (this.players[playerKey]) {
      return this.players[playerKey];
    }

    if (!this.scene) {
      throw new Error('Scene not initialized');
    }

    // Create player mesh
    const mesh = BABYLON.MeshBuilder.CreateBox(
      `player-${playerId}`,
      { width: 1, height: 1, depth: 1 },
      this.scene
    );
    
    // Create player material
    const material = new BABYLON.StandardMaterial(`player-material-${playerId}`, this.scene);
    material.diffuseColor = isLocalPlayer ? 
      new BABYLON.Color3(0, 0.8, 0) :  // Green for local player
      new BABYLON.Color3(0.8, 0, 0);   // Red for other players
    mesh.material = material;
    
    // Set initial position
    mesh.position = new BABYLON.Vector3(
      initialPosition.x, 
      initialPosition.y + 0.5, // Add half height to place on ground
      initialPosition.z
    );
    
    // Create player object
    const player: Player = {
      id: playerId,
      mesh,
      isLocal: isLocalPlayer,
      position: { ...initialPosition, y: initialPosition.y + 0.5 },
      rotation: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 }
    };
    
    this.players[playerKey] = player;
    
    // If local player, set up camera to follow
    if (isLocalPlayer) {
      this.localPlayer = player;
      this._setupCamera(player.mesh);
    }
    
    // // Enable shadows for player
    // if (this.scene.shadowGenerator) {
    //   this.scene.shadowGenerator.addShadowCaster(mesh);
    // }
    
    return player;
  }

  /**
   * Remove a player from the game
   * @param playerId Player ID
   */
  removePlayer(playerId: number): void {
    const playerKey = playerId.toString();
    const player = this.players[playerKey];
    
    if (player && this.scene) {
      player.mesh.dispose();
      delete this.players[playerKey];
    }
  }

  /**
   * Update a player's position
   * @param playerId Player ID
   * @param position New position
   * @param rotation New rotation (optional)
   */
  updatePlayerPosition(playerId: number, position: Vector3, rotation?: Rotation): void {
    const playerKey = playerId.toString();
    const player = this.players[playerKey];
    
    if (player && !player.isLocal) {
      // For remote players, update directly
      player.position = position;
      player.mesh.position.set(position.x, position.y, position.z);
      
      if (rotation) {
        player.rotation = rotation;
        player.mesh.rotation.set(rotation.x, rotation.y, rotation.z);
      }
    }
  }

  /**
   * Set the input state (e.g. from keyboard/mouse)
   * @param inputState The current input state
   */
  setInputState(inputState: InputState): void {
    this.inputState = inputState;
  }

  /**
   * Register callback for game update events
   * @param callback Callback function
   */
  onUpdate(callback: UpdateCallback): void {
    this.onUpdateCallbacks.push(callback);
  }

  /**
   * Set up camera to follow player
   * @param target Target mesh to follow
   * @private
   */
  private _setupCamera(target: BABYLON.Mesh): void {
    if (!this.scene) return;
    
    // Create follow camera
    this.camera = new BABYLON.FollowCamera('playerCamera', 
      new BABYLON.Vector3(0, 5, -10), this.scene);
      
    // Configure camera parameters
    this.camera.heightOffset = 3;
    this.camera.radius = 10;
    this.camera.rotationOffset = 0;
    this.camera.cameraAcceleration = 0.05;
    this.camera.maxCameraSpeed = 10;
    
    // Set camera target
    this.camera.lockedTarget = target;
    
    // Set as active camera
    this.scene.activeCamera = this.camera;
  }

  /**
   * Handle window resize
   * @private
   */
  private _handleResize(): void {
    if (!this.initialized || !this.engine) return;
    
    this.engine.resize();
  }

  /**
   * Main render loop
   * @private
   */
  private _renderLoop(): void {
    if (!this.initialized || !this.scene || !this.engine) return;
    
    // Calculate delta time
    const currentTime = performance.now();
    this.deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;
    
    // Update local player based on input
    this._updateLocalPlayer(this.deltaTime);
    
    // Trigger update callbacks
    this._triggerUpdateCallbacks(this.deltaTime);
    
    // Render the scene
    this.scene.render();
  }

  /**
   * Update the local player based on input
   * @param deltaTime Time since last frame (ms)
   * @private
   */
  private _updateLocalPlayer(deltaTime: number): void {
    if (!this.localPlayer || !this.scene) return;
    
    const moveSpeed = 0.01 * deltaTime;
    let moved = false;
    
    // Calculate movement direction relative to camera
    const cameraDirection = this.scene.activeCamera?.getDirection(BABYLON.Vector3.Forward());
    const cameraSideDirection = this.scene.activeCamera?.getDirection(BABYLON.Vector3.Right());
    
    if (cameraDirection && cameraSideDirection) {
      // Zero out y component to move only on xz plane
      cameraDirection.y = 0;
      cameraSideDirection.y = 0;
      
      // Normalize directions
      cameraDirection.normalize();
      cameraSideDirection.normalize();
      
      // Calculate movement vector
      const movement = new BABYLON.Vector3(0, 0, 0);
      
      if (this.inputState.forward) {
        movement.addInPlace(cameraDirection.scale(moveSpeed));
        moved = true;
      }
      
      if (this.inputState.backward) {
        movement.addInPlace(cameraDirection.scale(-moveSpeed));
        moved = true;
      }
      
      if (this.inputState.left) {
        movement.addInPlace(cameraSideDirection.scale(-moveSpeed));
        moved = true;
      }
      
      if (this.inputState.right) {
        movement.addInPlace(cameraSideDirection.scale(moveSpeed));
        moved = true;
      }
      
      if (this.inputState.jump && this.localPlayer.mesh.position.y <= 0.6) {
        // Simple jump
        this.localPlayer.velocity.y = 0.2;
        moved = true;
      }
      
      if (moved) {
        // Apply movement
        this.localPlayer.mesh.position.addInPlace(movement);
        
        // Apply gravity and velocity
        this.localPlayer.velocity.y -= 0.01; // Simple gravity
        this.localPlayer.mesh.position.y += this.localPlayer.velocity.y;
        
        // Ground constraint
        if (this.localPlayer.mesh.position.y < 0.5) {
          this.localPlayer.mesh.position.y = 0.5;
          this.localPlayer.velocity.y = 0;
        }
        
        // Update position for network sync
        this.localPlayer.position.x = this.localPlayer.mesh.position.x;
        this.localPlayer.position.y = this.localPlayer.mesh.position.y;
        this.localPlayer.position.z = this.localPlayer.mesh.position.z;
        
        // Update rotation to face movement direction
        if (movement.length() > 0) {
          const targetRotation = Math.atan2(movement.x, movement.z);
          this.localPlayer.mesh.rotation.y = targetRotation;
          this.localPlayer.rotation.y = targetRotation;
        }
      }
    }
  }

  /**
   * Trigger update callbacks
   * @param deltaTime Time since last frame (ms)
   * @private
   */
  private _triggerUpdateCallbacks(deltaTime: number): void {
    for (const callback of this.onUpdateCallbacks) {
      callback(deltaTime);
    }
  }
}