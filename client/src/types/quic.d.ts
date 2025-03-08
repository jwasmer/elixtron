/**
 * Type definitions for Node.js QUIC module
 * Based on the experimental QUIC API in Node.js
 */

declare module 'quic' {
  import { EventEmitter } from 'events';
  import { Socket } from 'net';

  export interface QUICSocketOptions {
    client?: {
      key?: Buffer | string;
      cert?: Buffer | string;
      ca?: Buffer | string | Array<Buffer | string>;
      alpn?: string | string[];
      requestCert?: boolean;
      rejectUnauthorized?: boolean;
    };
    server?: {
      key?: Buffer | string;
      cert?: Buffer | string;
      ca?: Buffer | string | Array<Buffer | string>;
      alpn?: string | string[];
      requestCert?: boolean;
      rejectUnauthorized?: boolean;
    };
    endpoint?: {
      address?: string;
      port?: number;
    };
  }

  export interface QUICSessionOptions {
    address: string;
    port: number;
    servername?: string;
  }

  export interface QUICStreamOptions {
    bidirectional?: boolean;
    halfOpen?: boolean;
  }

  export interface QUICSocket extends EventEmitter {
    connect(options: QUICSessionOptions): QUICSession;
    listen(options?: any): void;
    close(): void;
    on(event: 'close', listener: () => void): this;
    on(event: 'error', listener: (err: Error) => void): this;
    on(event: 'listening', listener: () => void): this;
    on(event: 'session', listener: (session: QUICSession) => void): this;
  }

  export interface QUICSession extends EventEmitter {
    openStream(options?: QUICStreamOptions): QUICStream;
    close(): void;
    on(event: 'stream', listener: (stream: QUICStream) => void): this;
    on(event: 'close', listener: () => void): this;
    on(event: 'error', listener: (err: Error) => void): this;
    on(event: 'secure', listener: () => void): this;
  }

  export interface QUICStream extends EventEmitter {
    id: number;
    write(data: string | Buffer): boolean;
    read(size?: number): Buffer | null;
    end(data?: string | Buffer): void;
    on(event: 'data', listener: (chunk: Buffer) => void): this;
    on(event: 'end', listener: () => void): this;
    on(event: 'error', listener: (err: Error) => void): this;
    on(event: 'close', listener: () => void): this;
  }

  export const constants: {
    NGTCP2_DEFAULT_MAX_PKTLEN: number;
    QUIC_ERROR_APPLICATION: number;
    QUICJS_ALPN: number;
    [key: string]: any;
  };

  export function createSocket(options: QUICSocketOptions): QUICSocket;
}