import { app, BrowserWindow, ipcMain, Tray, Menu, Notification, dialog, screen, nativeImage, shell } from 'electron'
import path from 'path'
import log from 'electron-log'
import { initDatabase, getContacts, addContact, updateContact, deleteContact, getTodayBirthdays, getContactsInDays, updateLastNotifiedDate } from './database'
import { importExcel, exportExcel } from './excel'
import { getSettings, setAutoStart, setReminderTime, setWeChatBound } from './settings'
import * as wechat from './wechat'
import { Contact, notificationRegistry, WindowsNotificationChannel, WeChatNotificationChannel } from './notification-channel'
import { NotificationScheduler } from './notification-scheduler'

// Configure logging
log.transports.file.level = 'info'
log.transports.console.level = 'debug'
log.info('Application starting...')

// Global references
let mainWindow: BrowserWindow | null = null
let listWindow: BrowserWindow | null = null
let tray: Tray | null = null
let notificationScheduler: NotificationScheduler | null = null
let wechatLoginAbortController: AbortController | null = null

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
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'icon.png')
    : path.join(__dirname, '../icon.png')

  listWindow = new BrowserWindow({
    width: 600,
    height: 500,
    x: Math.round((screenWidth - 600) / 2),
    y: Math.round((screenHeight - 500) / 2),
    title: type === 'today' ? '今日生日' : '即将生日',
    icon: iconPath,
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

  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'icon.png')
    : path.join(__dirname, '../icon.png')

  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    title: '生日提醒',
    icon: iconPath,
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

  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'icon.png')
    : path.join(__dirname, '../icon.png')
  const icon = nativeImage.createFromPath(iconPath)

  if (icon.isEmpty()) {
    log.warn('Tray icon is empty, using default')
    return
  }

  tray = new Tray(icon.resize({ width: 16, height: 16 }))
  tray.setToolTip('生日提醒')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
      }
    },
    { type: 'separator' },
    {
      label: '导入Excel',
      click: async () => {
        const result = await dialog.showOpenDialog({ filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }] })
        if (!result.canceled && result.filePaths[0]) {
          const contacts = await importExcel(result.filePaths[0])
          if (contacts && contacts.length > 0) {
            for (const contact of contacts) {
              await addContact(contact)
            }
            showSimpleNotification('生日提醒', `成功导入 ${contacts.length} 条记录`)
            mainWindow?.webContents.send('contacts-updated')
          }
        }
      }
    },
    {
      label: '导出Excel',
      click: async () => {
        const result = await dialog.showSaveDialog({ defaultPath: 'birthdays.xlsx', filters: [{ name: 'Excel', extensions: ['xlsx'] }] })
        if (!result.canceled && result.filePath) {
          await exportExcel(result.filePath)
          showSimpleNotification('导出成功', result.filePath)
        }
      }
    },
    { type: 'separator' },
    {
      label: '设置',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
        mainWindow?.webContents.send('open-settings')
      }
    },
    {
      label: '今日生日',
      click: () => createListWindow('today')
    },
    { type: 'separator' },
    {
      label: '打开日志目录',
      click: () => {
        const logPath = log.transports.file.getFile().path
        const logDir = path.dirname(logPath)
        shell.openPath(logDir).then(err => {
          if (err) log.error('Failed to open log directory:', err)
        })
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)

  // Single click to show window
  tray.on('click', () => {
    mainWindow?.show()
    mainWindow?.focus()
  })

  // Double click to show window
  tray.on('double-click', () => {
    mainWindow?.show()
    mainWindow?.focus()
  })

  log.info('System tray created')
}

// =========================================
// New Notification System
// =========================================

/** Initialize notification channels and registry */
const initNotificationSystem = (): void => {
  // Register Windows notification channel
  const windowsChannel = new WindowsNotificationChannel((type) => {
    createListWindow(type)
  })
  notificationRegistry.register(windowsChannel)
  
  // Register WeChat notification channel
  const wechatChannel = new WeChatNotificationChannel()
  notificationRegistry.register(wechatChannel)
  
  log.info('[Notification] System initialized with channels:', notificationRegistry.getAll().map(c => c.channelId).join(', '))
}

/** Create and start the notification scheduler */
const createScheduler = (): NotificationScheduler => {
  return new NotificationScheduler(
    getTodayBirthdays,
    updateLastNotifiedDate
  )
}

/** Show simple notification (for tray menu feedback) */
const showSimpleNotification = (title: string, body: string): void => {
  if (Notification.isSupported()) {
    const notification = new Notification({ title, body })
    notification.show()
  }
}

// =========================================
// Old Functions Removed (migrated to notification system)
// =========================================

// OLD: showNotification - use WindowsNotificationChannel instead
// OLD: showTodayBirthdaysNotification - use NotificationScheduler instead
// OLD: checkTodayBirthdays - use NotificationScheduler instead
// OLD: startReminder - use NotificationScheduler instead
// OLD: generateBirthdayMessage - use formatBirthdayMessage in channel instead
// OLD: startWeChatPush - replaced by WeChatNotificationChannel

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
  // Settings
  ipcMain.handle('get-settings', () => getSettings())
  ipcMain.handle('set-auto-start', (_, enabled: boolean) => setAutoStart(enabled))
  ipcMain.handle('set-reminder-time', (_, time: string) => {
    setReminderTime(time)
    notificationScheduler?.restart() // Restart with new time
  })
  // WeChat handlers
  ipcMain.handle('wechat-init-login', async () => {
    try {
      const result = await wechat.initWeChatLogin()
      return { success: true, qrcode: result.qrcode, textCode: result.textCode }
    } catch (error) {
      log.error('WeChat login init failed:', error)
      return { success: false, error: (error as Error).message }
    }
  })
  ipcMain.handle('wechat-complete-login', async (_, textCode: string) => {
    // Create new abort controller for this login attempt
    wechatLoginAbortController = new AbortController()

    try {
      const result = await wechat.completeWeChatLogin(textCode, wechatLoginAbortController.signal)
      if (result.success) {
        setWeChatBound(true, result.userId)
        // Note: WeChat push is now handled by notification scheduler automatically
        return { success: true, userId: result.userId }
      } else {
        return { success: false, error: result.error, expired: result.expired }
      }
    } catch (error) {
      log.error('WeChat login complete failed:', error)
      return { success: false, error: (error as Error).message }
    } finally {
      wechatLoginAbortController = null
    }
  })
  ipcMain.handle('wechat-get-status', () => {
    return {
      bound: wechat.isLoggedIn(),
      userId: wechat.getCredentials()?.userId
    }
  })
  ipcMain.handle('wechat-cancel-login', () => {
    if (wechatLoginAbortController) {
      wechatLoginAbortController.abort()
      wechatLoginAbortController = null
      log.info('[WeChat] Login cancelled by user')
      return { success: true }
    }
    return { success: false }
  })
  ipcMain.handle('wechat-unbind', () => {
    wechat.clearCredentials()
    setWeChatBound(false)
    // Note: Notification scheduler automatically handles disabled channels
    return { success: true }
  })
  ipcMain.handle('wechat-test-send', async () => {
    // Use notification channel directly for testing
    const wechatChannel = notificationRegistry.get('wechat')
    if (!wechatChannel) {
      return { success: false, message: '微信通知渠道未注册' }
    }
    
    const isAvailable = wechatChannel.isAvailable()
    if (!isAvailable) {
      return { success: false, message: '微信未绑定或未登录' }
    }
    
    try {
      const contacts = await getTodayBirthdays()
      if (contacts.length === 0) {
        return { success: false, message: '今日无生日联系人' }
      }
      
      const result = await wechatChannel.sendNotification('测试消息', contacts)
      if (result.success) {
        return { success: true, message: '测试消息发送成功' }
      } else {
        return { success: false, error: result.error }
      }
    } catch (error) {
      log.error('WeChat test send failed:', error)
      return { success: false, error: (error as Error).message }
    }
  })
}

app.setAppUserModelId("生日提醒");

// App ready
app.whenReady().then(async () => {
  log.info('App ready')
  try {
    await initDatabase()
    wechat.initWeChat() // Initialize WeChat and load credentials
    
    // Initialize notification system
    initNotificationSystem()
    
    // Create and start scheduler
    notificationScheduler = createScheduler()
    notificationScheduler.start()
    
    setupIPC()
    createWindow()
    createTray()
    
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
  notificationScheduler?.stop()
})

declare module 'electron' {
  interface App { isQuitting?: boolean }
}