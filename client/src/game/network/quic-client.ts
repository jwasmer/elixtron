import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { GameMessage } from '../../../../shared/types/protocol';
import { createSocket, constants, QUICSocket, QUICSession, QUICStream } from 'quic'

// Grab QUIC constants for easier reference
const {
  NGTCP2_DEFAULT_MAX_PKTLEN,
  QUIC_ERROR_APPLICATION,
  QUICJS_ALPN,
} = constants;

interface QuicClientEvents {
  on(event: 'connecting', listener: () => void): this;
  on(event: 'connected', listener: () => void): this;
  on(event: 'disconnected', listener: () => void): this;
  on(event: 'error', listener: (error: Error) => void): this;
  on(event: 'message', listener: (message: GameMessage) => void): this;
  on(event: 'stream_ended', listener: () => void): this;
  on(event: 'connection_failed', listener: () => void): this;
  
  emit(event: 'connecting'): boolean;
  emit(event: 'connected'): boolean;
  emit(event: 'disconnected'): boolean;
  emit(event: 'error', error: Error): boolean;
  emit(event: 'message', message: GameMessage): boolean;
  emit(event: 'stream_ended'): boolean;
  emit(event: 'connection_failed'): boolean;
}

export class QuicClient extends EventEmitter implements QuicClientEvents {
  private client: QUICSocket | null = null;
  private connection: QUICSession | null = null;
  private stream: QUICStream | null = null;
  private connected: boolean = false;
  private connectionAttempts: number = 0;
  private readonly maxConnectionAttempts: number = 5;
  private messageBuffer: string = '';
  private lastMessageTime: number = 0;

  /**
   * Connect to the QUIC server
   * @param host Server hostname
   * @param port Server port
   * @returns Whether connection was successful
   */
  async connect(host: string, port: number): Promise<boolean> {
    try {
      this.connectionAttempts++;
      this.emit('connecting');

      // Check if QUIC is available
      if (!createSocket) {
        throw new Error('QUIC module not available. Make sure you\'re using Node.js version 24+ with the --experimental-quic flag');
      }

      // Create QUIC socket
      this.client = createSocket({
        client: {
          key: fs.readFileSync(path.join(__dirname, '../../../../shared/certs/client-key.pem')),
          cert: fs.readFileSync(path.join(__dirname, '../../../../shared/certs/client-cert.pem')),
          alpn: 'game-protocol',
          requestCert: true,
          // In development, we can skip certificate verification
          rejectUnauthorized: false 
        }
      });

      // Handle socket events
      this.client.on('close', () => {
        this.connected = false;
        this.emit('disconnected');
      });

      // Connect to server
      this.connection = await this._createConnection(host, port);
      this.connected = true;
      this.connectionAttempts = 0;
      this.emit('connected');

      // Create a bidirectional stream
      this.stream = await this._createStream();
      return true;
    } catch (error) {
      console.error('QUIC connection error:', error);
      this.connected = false;
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
      
      if (this.connectionAttempts < this.maxConnectionAttempts) {
        // Try to reconnect after a delay
        setTimeout(() => {
          this.connect(host, port).catch(err => console.error('Reconnect failed:', err));
        }, 2000);
      } else {
        this.emit('connection_failed');
      }
      
      return false;
    }
  }

  /**
   * Send a message to the server
   * @param message Message to send
   * @returns Whether message was sent successfully
   */
  sendMessage(message: GameMessage): boolean {
    if (!this.connected || !this.stream) {
      console.error('Cannot send message: not connected');
      return false;
    }

    try {
      // Convert message to JSON with a delimiter
      const messageData = JSON.stringify(message) + '\n';
      
      // Send through QUIC stream
      this.stream.write(messageData);
      this.lastMessageTime = Date.now();
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * Send a ping to keep the connection alive
   */
  sendPing(): void {
    if (this.connected && Date.now() - this.lastMessageTime > 15000) {
      this.sendMessage({ 
        type: 'ping', 
        timestamp: Date.now() 
      });
    }
  }

  /**
   * Disconnect from the server
   */
  disconnect(): void {
    if (this.stream) {
      this.stream.end();
      this.stream = null;
    }

    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }

    if (this.client) {
      this.client.close();
      this.client = null;
    }

    this.connected = false;
    this.emit('disconnected');
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  // Private methods

  /**
   * Create a QUIC connection
   * @param host Server hostname
   * @param port Server port
   * @returns QUIC connection
   * @private
   */
  private _createConnection(host: string, port: number): Promise<QUICSession> {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new Error('QUIC client not initialized'));
        return;
      }

      // Connect to the server
      const connection = this.client.connect({
        address: host,
        port: port,
        servername: host, // SNI
      });

      // Set up connection handlers
      connection.on('secure', () => {
        console.log('Connection secured');
        resolve(connection);
      });

      connection.on('close', () => {
        this.connected = false;
        this.emit('disconnected');
      });

      connection.on('error', (err) => {
        console.error('Connection error:', err);
        this.emit('error', err instanceof Error ? err : new Error(String(err)));
        if (!this.connected) {
          reject(err);
        }
      });

      // Set a timeout for the connection attempt
      const timeout = setTimeout(() => {
        if (!this.connected) {
          reject(new Error('Connection timeout'));
        }
      }, 10000);

      connection.on('secure', () => {
        clearTimeout(timeout);
      });
    });
  }

  /**
   * Create a bidirectional stream
   * @returns QUIC stream
   * @private
   */
  private async _createStream(): Promise<QUICStream> {
    return new Promise((resolve, reject) => {
      try {
        if (!this.connection) {
          reject(new Error('No connection available'));
          return;
        }

        // Create a bidirectional stream
        const stream = this.connection.openStream({ halfOpen: false });
        
        // Set up data handling
        stream.on('data', (chunk: Buffer) => {
          // Convert chunk to string and add to buffer
          const data = chunk.toString('utf8');
          this.messageBuffer += data;
          
          // Process messages (assuming JSON format with newline delimiter)
          let delimIndex;
          while ((delimIndex = this.messageBuffer.indexOf('\n')) !== -1) {
            const messageStr = this.messageBuffer.substring(0, delimIndex);
            this.messageBuffer = this.messageBuffer.substring(delimIndex + 1);
            
            try {
              const message = JSON.parse(messageStr) as GameMessage;
              this.emit('message', message);
              
              // If it's a ping response, don't log it
              if (message.type !== 'pong') {
                console.log('Received message:', message);
              }
            } catch (error) {
              console.error('Error parsing message:', error);
              this.emit('error', new Error('Invalid message format'));
            }
          }
        });

        stream.on('end', () => {
          console.log('Stream ended by server');
          this.emit('stream_ended');
        });

        stream.on('error', (err) => {
          console.error('Stream error:', err);
          this.emit('error', err instanceof Error ? err : new Error(String(err)));
        });

        resolve(stream);
      } catch (error) {
        reject(error);
      }
    });
  }
}