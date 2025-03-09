// src/game/network/index.js
class NetworkManager {
  constructor(socket, serverIp, serverPort) {
    this.socket = socket;
    this.serverAddress = { address: serverIp, port: serverPort };
    this.clientId = Math.random().toString(36).substr(2, 9);
    this.onMessage = null;
    
    // Listen for messages from the server
    this.socket.on('message', (msg, rinfo) => {
      if (rinfo.address === this.serverAddress.address && 
          rinfo.port === this.serverAddress.port) {
        try {
          const message = JSON.parse(msg.toString());
          if (this.onMessage) {
            this.onMessage(message);
          }
        } catch (e) {
          console.error('Failed to parse server message:', e);
        }
      }
    });
    
    // Connect to the server
    this.connect();
  }
  
  connect() {
    const connectMessage = JSON.stringify({
      type: 'connect',
      client_id: this.clientId
    });
    
    this.socket.send(
      Buffer.from(connectMessage), 
      this.serverAddress.port, 
      this.serverAddress.address
    );
    
    // Set up a periodic ping to keep the connection alive
    setInterval(() => this.ping(), 5000);
  }
  
  ping() {
    const pingMessage = JSON.stringify({
      type: 'ping',
      client_id: this.clientId
    });
    
    this.socket.send(
      Buffer.from(pingMessage), 
      this.serverAddress.port, 
      this.serverAddress.address
    );
  }
  
  sendInput(actions) {
    const inputMessage = JSON.stringify({
      type: 'input',
      client_id: this.clientId,
      actions: actions
    });
    
    this.socket.send(
      Buffer.from(inputMessage), 
      this.serverAddress.port, 
      this.serverAddress.address
    );
  }
}

module.exports = NetworkManager;