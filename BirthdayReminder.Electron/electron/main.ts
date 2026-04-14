import { app, BrowserWindow, ipcMain, Tray, Menu, Notification, dialog, screen } from 'electron'
import path from 'path'
import log from 'electron-log'
import { initDatabase, getContacts, addContact, updateContact, deleteContact, getTodayBirthdays, getContactsInDays } from './database'
import { importExcel, exportExcel } from './excel'

// Configure logging
log.transports.file.level = 'info'
log.transports.console.level = 'debug'
log.info('Application starting...')

// Global references
let mainWindow: BrowserWindow | null = null
let listWindow: BrowserWindow | null = null
let tray: Tray | null = null
let reminderInterval: NodeJS.Timeout | null = null

// Environment
const isDev = !app.isPackaged

// Get preload path
const getPreloadPath = () => path.join(__dirname, 'preload.js')

// Create list window for birthday contacts
const createListWindow = (type: 'today' | 'upcoming') => {
  log.info(`Creating list window for: ${type}`)
  
  if (listWindow) {
    listWindow.focus()
    listWindow.webContents.send('load-birthday-list', type)
    return
  }
  
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize
  
  listWindow = new BrowserWindow({
    width: 600,
    height: 500,
    x: Math.round((screenWidth - 600) / 2),
    y: Math.round((screenHeight - 500) / 2),
    title: type === 'today' ? '今日生日' : '即将生日',
    frame: false,
    resizable: true,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false
    },
    show: false
  })
  
  listWindow.once('ready-to-show', () => {
    listWindow?.show()
    listWindow?.webContents.send('load-birthday-list', type)
  })
  
  if (isDev) {
    listWindow.loadURL('http://localhost:5173/#/list')
  } else {
    listWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: '/list' })
  }
  
  listWindow.on('closed', () => {
    listWindow = null
  })
}

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
const showNotification = (title: string, body?: string, type: 'today' | 'upcoming' = 'today') => {
  if (Notification.isSupported()) {
    const notification = new Notification({ title, body: body || '' })
    notification.show()
    notification.on('click', () => {
      createListWindow(type)
    })
  }
}

// Show notification for today birthdays
const showTodayBirthdaysNotification = async () => {
  const todayBirthdays = await getTodayBirthdays()
  if (todayBirthdays.length > 0) {
    const names = todayBirthdays.map(c => c.name).join('、')
    showNotification(`🎂 今日有 ${todayBirthdays.length} 位生日！`, names)
  }
}

// Start reminder check
const startReminder = () => {
  log.info('Starting birthday reminder check...')
  reminderInterval = setInterval(async () => {
    const todayBirthdays = await getTodayBirthdays()
    if (todayBirthdays.length > 0) {
      const names = todayBirthdays.map(c => c.name).join('、')
      showNotification(`🎂 今日有 ${todayBirthdays.length} 位生日！`, names)
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
  ipcMain.handle('get-upcoming-birthdays', async () => await getContactsInDays(30))
  // Show today's birthdays in UI
  ipcMain.handle('show-today-birthdays', async () => {
    createListWindow('today')
    return await getTodayBirthdays()
  })
  ipcMain.handle('show-upcoming-birthdays', async () => {
    createListWindow('upcoming')
    return await getContactsInDays(30)
  })
  ipcMain.handle('close-list-window', () => listWindow?.close())
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
  // List window controls
  ipcMain.handle('list-window-minimize', () => listWindow?.minimize())
  ipcMain.handle('list-window-close', () => listWindow?.close())
}

// App ready
app.whenReady().then(async () => {
  log.info('App ready')
  try {
    await initDatabase()
    setupIPC()
    createWindow()
    // Check and show today's birthday notification on startup
    await showTodayBirthdaysNotification()
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