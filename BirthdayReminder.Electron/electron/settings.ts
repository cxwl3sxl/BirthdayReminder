import Store from 'electron-store'
import { app } from 'electron'
import log from 'electron-log'

interface Settings {
  autoStart: boolean
  reminderTime: string  // HH:mm format, default "10:00"
  wechatBound: boolean   // Whether WeChat is bound
  wechatUserId?: string  // The bound WeChat user ID
}

const store = new Store<Settings>({
  defaults: {
    autoStart: false,
    reminderTime: '10:00',
    wechatBound: false
  }
})

export const getSettings = (): Settings => {
  return {
    autoStart: store.get('autoStart'),
    reminderTime: store.get('reminderTime'),
    wechatBound: store.get('wechatBound'),
    wechatUserId: store.get('wechatUserId')
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

export const setWeChatBound = (bound: boolean, userId?: string) => {
  store.set('wechatBound', bound)
  if (bound && userId) {
    store.set('wechatUserId', userId)
  } else {
    store.delete('wechatUserId')
  }
  log.info(`WeChat binding ${bound ? 'enabled' : 'disabled'}`)
}

export default store
