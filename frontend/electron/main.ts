import { app, BrowserWindow } from 'electron'
import path from 'path'

// The main window instance
let win: BrowserWindow | null = null

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Discord Clone (SurrealDB BaaS)',
    webPreferences: {
      nodeIntegration: false, // Security best practice: keep renderer isolated
      contextIsolation: true,
    },
  })

  // In development, load the Vite local dev server URL
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    // In production, load the built index.html
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

// When Electron finishes initializing, open the window
app.whenReady().then(createWindow)

// Quit when all windows are closed (standard Windows/Linux behavior)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})