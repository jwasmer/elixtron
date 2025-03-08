/**
 * Game protocol types for client-server communication
 */

// Common types
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Rotation {
  x: number;
  y: number;
  z: number;
}

export interface Timestamp {
  timestamp: number;
}

// Message types
export type MessageType = 
  | 'welcome'
  | 'join'
  | 'player_joined'
  | 'player_left'
  | 'player_position'
  | 'game_state'
  | 'game_action'
  | 'ping'
  | 'pong';

// Base message interface
export interface Message extends Timestamp {
  type: MessageType;
}

// Server -> Client messages
export interface WelcomeMessage extends Message {
  type: 'welcome';
  playerId: number;
  message: string;
}

export interface PlayerJoinedMessage extends Message {
  type: 'player_joined';
  playerId: number;
  name: string;
}

export interface PlayerLeftMessage extends Message {
  type: 'player_left';
  playerId: number;
}

export interface PlayerPositionMessage extends Message {
  type: 'player_position';
  playerId: number;
  position: Vector3;
  rotation?: Rotation;
}

export interface PlayerState {
  id: number;
  name: string;
  position: Vector3;
  rotation: Rotation;
  joined_at: number;
}

export interface GameStateMessage extends Message {
  type: 'game_state';
  state: {
    players: Record<number, PlayerState>;
    objects: Record<string, any>;
    timestamp: number;
  };
}

export interface PongMessage extends Message {
  type: 'pong';
}

// Client -> Server messages
export interface JoinMessage extends Message {
  type: 'join';
  name: string;
}

export interface ClientPositionMessage extends Message {
  type: 'player_position';
  position: Vector3;
  rotation?: Rotation;
}

export interface GameActionMessage extends Message {
  type: 'game_action';
  action: string;
  data: any;
}

export interface PingMessage extends Message {
  type: 'ping';
}

// Union type for all possible messages
export type GameMessage =
  | WelcomeMessage
  | PlayerJoinedMessage
  | PlayerLeftMessage
  | PlayerPositionMessage
  | GameStateMessage
  | PongMessage
  | JoinMessage
  | ClientPositionMessage
  | GameActionMessage
  | PingMessage;