import Store from 'electron-store'
import { app } from 'electron'
import log from 'electron-log'

interface Settings {
  autoStart: boolean
  reminderTime: string  // HH:mm format, default "10:00"
}

const store = new Store<Settings>({
  defaults: {
    autoStart: false,
    reminderTime: '10:00'
  }
})

export const getSettings = (): Settings => {
  return {
    autoStart: store.get('autoStart'),
    reminderTime: store.get('reminderTime')
  }
}

export const setAutoStart = (enabled: boolean) => {
  store.set('autoStart', enabled)
  
  // Set/remove auto-start in system
  if (process.platform === 'win32') {
    const exePath = app.getPath('exe')
    app.setLoginItemSettings({
      openAtLogin: enabled,
      path: exePath,
      args: []
    })
  }
  
  log.info(`Auto-start ${enabled ? 'enabled' : 'disabled'}`)
}

export const setReminderTime = (time: string) => {
  store.set('reminderTime', time)
  log.info(`Reminder time set to: ${time}`)
}

export default store
