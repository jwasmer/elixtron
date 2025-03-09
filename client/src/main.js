// src/main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');

// Check if this is a second instance
const isSecondInstance = process.env.SECOND_INSTANCE === 'true';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    title: isSecondInstance ? 'Game Client 2' : 'Game Client 1',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Pass the instance information to the renderer
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  
  // Position the second instance slightly offset
  if (isSecondInstance) {
    mainWindow.setPosition(100, 100);
  }
  
  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
  
  // Send instance information to renderer
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('instance-info', { 
      isSecondInstance: isSecondInstance 
    });
  });
}

app.whenReady().then(() => {
  createWindow();
  
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});