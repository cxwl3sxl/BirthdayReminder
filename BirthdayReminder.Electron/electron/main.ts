import { app, BrowserWindow, ipcMain, Tray, Menu, Notification, dialog } from 'electron'
import path from 'path'
import log from 'electron-log'
import { initDatabase, getContacts, addContact, updateContact, deleteContact, getTodayBirthdays } from './database'
import { importExcel, exportExcel } from './excel'

// Configure logging
log.transports.file.level = 'info'
log.transports.console.level = 'debug'
log.info('Application starting...')

// Global references
let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let reminderInterval: NodeJS.Timeout | null = null

// Environment
const isDev = !app.isPackaged

// Get preload path
const getPreloadPath = () => path.join(__dirname, 'preload.js')

// Create main window
const createWindow = () => {
  log.info('Creating main window...')
  
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    title: '生日提醒',
    frame: false,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false
    },
    show: false
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    log.info('Main window displayed')
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Create tray
const createTray = () => {
  log.info('Creating system tray...')
  // Note: In production, you would use an icon
  // For now, we skip tray if no icon available
  log.info('System tray skipped (no icon)')
}

// Show notification
const showNotification = (title: string, body?: string) => {
  if (Notification.isSupported()) {
    const notification = new Notification({ title, body: body || '' })
    notification.show()
    notification.on('click', () => {
      mainWindow?.show()
      mainWindow?.focus()
    })
  }
}

// Start reminder check
const startReminder = () => {
  log.info('Starting birthday reminder check...')
  reminderInterval = setInterval(async () => {
    const todayBirthdays = await getTodayBirthdays()
    if (todayBirthdays.length > 0) {
      showNotification(`今日有 ${todayBirthdays.length} 位生日`, '点击查看详情')
    }
  }, 60 * 60 * 1000)
}

// IPC Handlers
const setupIPC = () => {
  ipcMain.handle('get-contacts', async () => await getContacts())
  ipcMain.handle('add-contact', async (_, contact) => await addContact(contact))
  ipcMain.handle('update-contact', async (_, contact) => await updateContact(contact))
  ipcMain.handle('delete-contact', async (_, id: number) => await deleteContact(id))
  ipcMain.handle('get-today-birthdays', async () => await getTodayBirthdays())
  ipcMain.handle('import-excel', async () => {
    try {
      const result = await dialog.showOpenDialog({ filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }] })
      if (!result.canceled && result.filePaths[0]) {
        log.info('Opening file:', result.filePaths[0])
        const contacts = await importExcel(result.filePaths[0])
        log.info('Import result:', contacts?.length ?? 0, 'contacts')
        return contacts
      }
      return null
    } catch (error) {
      log.error('import-excel handler error:', error)
      return null
    }
  })
  ipcMain.handle('export-excel', async () => {
    const result = await dialog.showSaveDialog({ defaultPath: 'birthdays.xlsx', filters: [{ name: 'Excel', extensions: ['xlsx'] }] })
    if (!result.canceled && result.filePath) return await exportExcel(result.filePath)
    return null
  })
  // Window controls
  ipcMain.handle('window-minimize', () => mainWindow?.minimize())
  ipcMain.handle('window-maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize()
    else mainWindow?.maximize()
  })
  ipcMain.handle('window-close', () => mainWindow?.close())
  ipcMain.handle('window-is-maximized', () => mainWindow?.isMaximized())
}

// App ready
app.whenReady().then(async () => {
  log.info('App ready')
  try {
    await initDatabase()
    setupIPC()
    createWindow()
    startReminder()
    log.info('Application started successfully')
  } catch (error) {
    log.error('Error during startup:', error)
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
  else mainWindow?.show()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  app.isQuitting = true
  if (reminderInterval) clearInterval(reminderInterval)
})

declare module 'electron' {
  interface App { isQuitting?: boolean }
}