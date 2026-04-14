import { app, BrowserWindow, ipcMain, Tray, Menu, Notification, dialog, screen, nativeImage } from 'electron'
import path from 'path'
import log from 'electron-log'
import { initDatabase, getContacts, addContact, updateContact, deleteContact, getTodayBirthdays, getContactsInDays } from './database'
import { importExcel, exportExcel } from './excel'
import { getSettings, setAutoStart, setReminderTime, setWeChatBound } from './settings'
import * as wechat from './wechat'

// Configure logging
log.transports.file.level = 'info'
log.transports.console.level = 'debug'
log.info('Application starting...')

// Global references
let mainWindow: BrowserWindow | null = null
let listWindow: BrowserWindow | null = null
let tray: Tray | null = null
let reminderTimer: NodeJS.Timeout | null = null
let wechatPushTimer: NodeJS.Timeout | null = null
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
            showNotification(`成功导入 ${contacts.length} 条记录`)
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
          showNotification('导出成功', result.filePath)
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
    showNotification(`生日提醒 - 今日有 ${todayBirthdays.length} 位生日！`, names)
  }
}

// Check and show today's birthday notification
const checkTodayBirthdays = async () => {
  const todayBirthdays = await getTodayBirthdays()
  if (todayBirthdays.length > 0) {
    const names = todayBirthdays.map(c => c.name).join('、')
    showNotification(`生日提醒 - 今日有 ${todayBirthdays.length} 位生日！`, names)
  }
}

// Start reminder check with configurable time
const startReminder = () => {
  log.info('Starting birthday reminder check...')
  
  const checkAndSchedule = () => {
    const settings = getSettings()
    const [hours, minutes] = settings.reminderTime.split(':').map(Number)
    const now = new Date()
    const targetTime = new Date(now)
    targetTime.setHours(hours, minutes, 0, 0)
    
    // If target time is in the past, schedule for tomorrow
    if (targetTime <= now) {
      targetTime.setDate(targetTime.getDate() + 1)
    }
    
    const delay = targetTime.getTime() - now.getTime()
    
    log.info(`Next birthday check scheduled in ${Math.round(delay / 1000 / 60)} minutes`)
    
    if (reminderTimer) clearTimeout(reminderTimer)
    reminderTimer = setTimeout(async () => {
      await checkTodayBirthdays()
      checkAndSchedule() // Reschedule for next day
    }, delay)
  }
  
  // Initial check
  checkAndSchedule()
}

// Generate birthday message for WeChat push
const generateBirthdayMessage = (contacts: Contact[]): string => {
  const today = new Date()
  const dateStr = `${today.getMonth() + 1}月${today.getDate()}日`
  
  let message = `🎂 生日提醒\n\n今天是 ${dateStr}，以下朋友过生日：\n\n`
  
  for (const contact of contacts) {
    message += `• ${contact.name}`
    if (contact.phoneNumber) {
      message += ` (${contact.phoneNumber})`
    }
    if (contact.remarks) {
      message += `\n  备注: ${contact.remarks}`
    }
    message += '\n'
  }
  
  message += `\n祝他们生日快乐！🎉`
  return message
}

// Start WeChat push timer
const startWeChatPush = () => {
  if (wechatPushTimer) {
    clearInterval(wechatPushTimer)
  }
  
  log.info('Starting WeChat birthday push...')
  
  // Check every hour
  wechatPushTimer = setInterval(async () => {
    const settings = getSettings()
    if (!settings.wechatBound || !wechat.isLoggedIn()) {
      return
    }
    
    const now = new Date()
    const [targetHour] = settings.reminderTime.split(':').map(Number)
    
    // Only push at the configured time
    if (now.getHours() === targetHour && now.getMinutes() === 0) {
      const contacts = await getTodayBirthdays()
      if (contacts.length > 0) {
        const creds = wechat.getCredentials()
        if (creds) {
          const message = generateBirthdayMessage(contacts)
          try {
            await wechat.sendTextMessage(creds.userId, message)
            log.info('WeChat birthday push sent successfully')
          } catch (err) {
            log.error('WeChat push failed:', err)
          }
        }
      }
    }
  }, 60 * 60 * 1000) // Check every hour
  
  // Also do an immediate check
  const settings = getSettings()
  if (settings.wechatBound && wechat.isLoggedIn()) {
    const now = new Date()
    const [targetHour] = settings.reminderTime.split(':').map(Number)
    if (now.getHours() === targetHour) {
      // Run immediately if it's the configured hour
      setTimeout(async () => {
        const contacts = await getTodayBirthdays()
        if (contacts.length > 0) {
          const creds = wechat.getCredentials()
          if (creds) {
            const message = generateBirthdayMessage(contacts)
            try {
              await wechat.sendTextMessage(creds.userId, message)
            } catch (err) {
              log.error('WeChat push failed:', err)
            }
          }
        }
      }, 1000)
    }
  }
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
  // Settings
  ipcMain.handle('get-settings', () => getSettings())
  ipcMain.handle('set-auto-start', (_, enabled: boolean) => setAutoStart(enabled))
  ipcMain.handle('set-reminder-time', (_, time: string) => {
    setReminderTime(time)
    startReminder() // Restart with new time
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
        startWeChatPush() // Start WeChat push timer
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
    if (wechatPushTimer) {
      clearInterval(wechatPushTimer)
      wechatPushTimer = null
    }
    return { success: true }
  })
  ipcMain.handle('wechat-test-send', async () => {
    try {
      const contacts = await getTodayBirthdays()
      if (contacts.length === 0) {
        return { success: false, message: '今日无生日联系人' }
      }
      
      const creds = wechat.getCredentials()
      if (!creds) {
        return { success: false, message: '未绑定微信' }
      }
      
      const message = generateBirthdayMessage(contacts)
      await wechat.sendTextMessage(creds.userId, message)
      return { success: true, message: '测试消息发送成功' }
    } catch (error) {
      log.error('WeChat test send failed:', error)
      return { success: false, error: (error as Error).message }
    }
  })
}

// App ready
app.whenReady().then(async () => {
  log.info('App ready')
  try {
    await initDatabase()
    wechat.initWeChat() // Initialize WeChat and load credentials
    setupIPC()
    createWindow()
    createTray()
    // Check and show today's birthday notification on startup
    await showTodayBirthdaysNotification()
    startReminder()
    
    // Start WeChat push if already bound
    const settings = getSettings()
    if (settings.wechatBound && wechat.isLoggedIn()) {
      startWeChatPush()
    }
    
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
  if (reminderTimer) clearTimeout(reminderTimer)
})

declare module 'electron' {
  interface App { isQuitting?: boolean }
}