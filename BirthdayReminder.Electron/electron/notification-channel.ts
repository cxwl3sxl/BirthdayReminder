/**
 * Notification Channel Interface
 * 
 * Defines the contract for notification channels.
 * Each channel handles a specific notification delivery method (Windows, WeChat, etc.)
 */

import log from 'electron-log'

// Contact interface
export interface Contact {
  id?: number
  name: string
  phoneNumber?: string
  birthday: string
  remarks?: string
  formattedBirthday?: string
  daysUntil?: number
  countdownText?: string
  isBirthdayToday?: boolean
}

// Notification result
export interface NotificationResult {
  success: boolean
  error?: string
  channel: string
}

// Channel metadata
export interface ChannelInfo {
  id: string
  name: string
  enabled: boolean
  description?: string
}

/**
 * Notification Channel Interface
 * 
 * All notification channels must implement this interface.
 */
export interface INotificationChannel {
  readonly channelId: string
  readonly channelName: string
  isAvailable(): boolean
  sendNotification(title: string, contacts: Contact[]): Promise<NotificationResult>
  getChannelInfo(): ChannelInfo
}

/**
 * Base class for notification channels
 */
export abstract class BaseNotificationChannel implements INotificationChannel {
  abstract readonly channelId: string
  abstract readonly channelName: string
  
  abstract isAvailable(): boolean
  abstract sendNotification(title: string, contacts: Contact[]): Promise<NotificationResult>
  
  getChannelInfo(): ChannelInfo {
    return {
      id: this.channelId,
      name: this.channelName,
      enabled: this.isAvailable(),
      description: this.isAvailable() ? '可用' : '不可用'
    }
  }
  
  /** Format birthday message */
  protected formatBirthdayMessage(contacts: Contact[], title?: string): string {
    const today = new Date()
    const dateStr = `${today.getMonth() + 1}月${today.getDate()}日`
    
    const header = title 
      ? `🎂 ${title}\n\n今天是 ${dateStr}，以下朋友过生日：\n\n`
      : `🎂 生日提醒\n\n今天是 ${dateStr}，以下朋友过生日：\n\n`
    
    let message = header
    
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
}

/**
 * Notification Channel Registry
 */
export class NotificationChannelRegistry {
  private channels: Map<string, INotificationChannel> = new Map()
  
  register(channel: INotificationChannel): void {
    this.channels.set(channel.channelId, channel)
    log.info(`[Notification] Registered: ${channel.channelId}`)
  }
  
  unregister(channelId: string): boolean {
    return this.channels.delete(channelId)
  }
  
  get(channelId: string): INotificationChannel | undefined {
    return this.channels.get(channelId)
  }
  
  getAll(): INotificationChannel[] {
    return Array.from(this.channels.values())
  }
  
  getEnabled(): INotificationChannel[] {
    return this.getAll().filter(c => c.isAvailable())
  }
  
  /** Send to channels - 通知功能，不包含更新标记 */
  async notifyAll(title: string, contacts: Contact[]): Promise<NotificationResult[]> {
    const results: NotificationResult[] = []
    const enabledChannels = this.getEnabled()
    
    log.info(`[Notification] Sending to ${enabledChannels.length} channel(s)`)
    
    for (const channel of enabledChannels) {
      try {
        const result = await channel.sendNotification(title, contacts)
        results.push(result)
      } catch (error) {
        log.error(`[Notification] ${channel.channelId} failed:`, error)
        results.push({
          success: false,
          error: (error as Error).message,
          channel: channel.channelId
        })
      }
    }
    
    return results
  }
}

export const notificationRegistry = new NotificationChannelRegistry()

// =========================================
// Channel Implementations
// =========================================

import { Notification } from 'electron'
import * as wechat from './wechat'
import { getSettings } from './settings'
import { getTodayBirthdays } from './database'

/**
 * Windows Toast Channel - 仅通知
 */
export class WindowsNotificationChannel extends BaseNotificationChannel {
  readonly channelId = 'windows-toast'
  readonly channelName = 'Windows 通知'
  
  private onClick?: (type: 'today' | 'upcoming') => void
  
  constructor(onClick?: (type: 'today' | 'upcoming') => void) {
    super()
    this.onClick = onClick
  }
  
  isAvailable(): boolean {
    return Notification.isSupported()
  }
  
  async sendNotification(title: string, contacts: Contact[]): Promise<NotificationResult> {
    if (!this.isAvailable()) {
      return { success: false, error: '不可用', channel: this.channelId }
    }
    
    const names = contacts.map(c => c.name).join('、')
    
    try {
      const notification = new Notification({ title, body: names })
      notification.on('click', () => this.onClick?.('today'))
      notification.show()
      log.info(`[Windows] Shown: ${names}`)
      return { success: true, channel: this.channelId }
    } catch (error) {
      return { success: false, error: (error as Error).message, channel: this.channelId }
    }
  }
}

/**
 * WeChat Channel - 仅通知，不负责保活和消息处理
 */
export class WeChatNotificationChannel extends BaseNotificationChannel {
  readonly channelId = 'wechat'
  readonly channelName = '微信通知'
  
  isAvailable(): boolean {
    const settings = getSettings()
    return settings.wechatBound && wechat.isLoggedIn()
  }
  
  async sendNotification(title: string, contacts: Contact[]): Promise<NotificationResult> {
    if (!this.isAvailable()) {
      return { success: false, error: '未绑定', channel: this.channelId }
    }
    
    const creds = wechat.getCredentials()
    if (!creds?.userId) {
      return { success: false, error: '无凭证', channel: this.channelId }
    }
    
    const message = this.formatBirthdayMessage(contacts, title)
    
    try {
      await wechat.sendTextMessage(creds.userId, message)
      log.info(`[WeChat] Sent to ${creds.userId}`)
      return { success: true, channel: this.channelId }
    } catch (error) {
      return { success: false, error: (error as Error).message, channel: this.channelId }
    }
  }
}

// =========================================
// WeChat 消息处理和保活 - 在 main.ts 中独立管理
// =========================================

import { app } from 'electron'

let wechatPollTimer: NodeJS.Timeout | null = null

/** 启动 WeChat 消息轮询 */
export function startWeChatPoll(): void {
  stopWeChatPoll()
  
  const settings = getSettings()
  const creds = wechat.getCredentials()
  log.info(`[WeChat] Starting poll... bound: ${settings.wechatBound}, loggedIn: ${wechat.isLoggedIn()}, creds: ${!!creds}, userId: ${creds?.userId}`)
  
  if (!settings.wechatBound || !wechat.isLoggedIn() || !creds?.userId) {
    log.info('[WeChat] Skipping poll - not ready')
    return
  }
  
  log.info('[WeChat] Starting message poll (10s interval)')
  
  // 每10秒轮询一次
  const poll = async () => {
    if (!wechat.isLoggedIn()) {
      log.warn('[WeChat] Not logged in, stopping poll')
      stopWeChatPoll()
      return
    }
    try {
      log.debug('[WeChat] Poll: checking messages...')
      await wechat.handleIncomingMessages(getTodayBirthdays)
    } catch (error) {
      log.error('[WeChat] Poll error:', error)
    }
  }
  
  // 首次轮询
  poll().catch(err => {
    log.error('[WeChat] First poll failed:', err)
  })
  
  // 后续轮询
  wechatPollTimer = setInterval(poll, 10000)
}

/** 停止 WeChat 轮询 */
export function stopWeChatPoll(): void {
  if (wechatPollTimer) {
    clearInterval(wechatPollTimer)
    wechatPollTimer = null
  }
}