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
  /** Unique channel identifier */
  readonly channelId: string
  
  /** Human-readable channel name */
  readonly channelName: string
  
  /** Check if channel is available and configured */
  isAvailable(): boolean
  
  /** Send notification to all contacts */
  sendNotification(title: string, contacts: Contact[]): Promise<NotificationResult>
  
  /** Get channel metadata */
  getChannelInfo(): ChannelInfo
}

/**
 * Base class for notification channels
 * 
 * Provides common functionality for all channels.
 */
export abstract class BaseNotificationChannel implements INotificationChannel {
  abstract readonly channelId: string
  abstract readonly channelName: string
  
  protected enabled: boolean = true
  protected lastError?: string
  
  abstract isAvailable(): boolean
  
  abstract sendNotification(title: string, contacts: Contact[]): Promise<NotificationResult>
  
  getChannelInfo(): ChannelInfo {
    return {
      id: this.channelId,
      name: this.channelName,
      enabled: this.enabled,
      description: this.isAvailable() ? '可用' : this.lastError || '不可用'
    }
  }
  
  /** Format birthday message from contacts */
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
  
  /** Update last notified date for contacts */
  protected async updateLastNotifiedDate(contacts: Contact[], updateFn: (id: number) => Promise<void>): Promise<void> {
    const today = new Date().toISOString().split('T')[0]
    for (const contact of contacts) {
      if (contact.id) {
        await updateFn(contact.id)
      }
    }
    log.info(`[Notification] Updated lastNotifiedDate to ${today} for ${contacts.length} contacts`)
  }
}

/**
 * Notification Channel Registry
 * 
 * Manages all available notification channels.
 * Allows dynamic registration of new channels.
 */
export class NotificationChannelRegistry {
  private channels: Map<string, INotificationChannel> = new Map()
  
  /** Register a new channel */
  register(channel: INotificationChannel): void {
    this.channels.set(channel.channelId, channel)
    log.info(`[Notification] Registered channel: ${channel.channelId}`)
  }
  
  /** Unregister a channel */
  unregister(channelId: string): boolean {
    const result = this.channels.delete(channelId)
    if (result) {
      log.info(`[Notification] Unregistered channel: ${channelId}`)
    }
    return result
  }
  
  /** Get a channel by ID */
  get(channelId: string): INotificationChannel | undefined {
    return this.channels.get(channelId)
  }
  
  /** Get all registered channels */
  getAll(): INotificationChannel[] {
    return Array.from(this.channels.values())
  }
  
  /** Get all enabled channels */
  getEnabled(): INotificationChannel[] {
    return this.getAll().filter(c => c.isAvailable())
  }
  
  /** Send notification through all enabled channels */
  async notifyAll(title: string, contacts: Contact[], updateFn: (id: number) => Promise<void>): Promise<NotificationResult[]> {
    const results: NotificationResult[] = []
    const enabledChannels = this.getEnabled()
    
    log.info(`[Notification] Sending to ${enabledChannels.length} channel(s): ${enabledChannels.map(c => c.channelId).join(', ')}`)
    
    for (const channel of enabledChannels) {
      try {
        const result = await channel.sendNotification(title, contacts)
        results.push(result)
        
        // Update last notified date on success
        if (result.success) {
          await this.updateLastNotifiedDate(contacts, updateFn)
        }
      } catch (error) {
        log.error(`[Notification] Channel ${channel.channelId} failed:`, error)
        results.push({
          success: false,
          error: (error as Error).message,
          channel: channel.channelId
        })
      }
    }
    
    return results
  }
  
  private async updateLastNotifiedDate(contacts: Contact[], updateFn: (id: number) => Promise<void>): Promise<void> {
    const today = new Date().toISOString().split('T')[0]
    for (const contact of contacts) {
      if (contact.id) {
        await updateFn(contact.id)
      }
    }
  }
}

// Default registry instance
export const notificationRegistry = new NotificationChannelRegistry()

// =========================================
// Concrete Channel Implementations
// =========================================

import { Notification } from 'electron'
import * as wechat from './wechat'

/**
 * Windows Toast Notification Channel
 * 
 * Uses Electron's built-in Notification API.
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
      return {
        success: false,
        error: 'Windows 通知不可用',
        channel: this.channelId
      }
    }
    
    const names = contacts.map(c => c.name).join('、')
    
    try {
      const notification = new Notification({
        title,
        body: names
      })
      
      notification.on('click', () => {
        this.onClick?.('today')
      })
      
      notification.show()
      
      log.info(`[${this.channelName}] Notification shown for: ${names}`)
      
      return {
        success: true,
        channel: this.channelId
      }
    } catch (error) {
      const errMsg = (error as Error).message
      log.error(`[${this.channelName}] Failed:`, error)
      return {
        success: false,
        error: errMsg,
        channel: this.channelId
      }
    }
  }
}

/**
 * WeChat Notification Channel
 * 
 * Uses iLink Bot API for sending messages.
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
      return {
        success: false,
        error: '微信未绑定或未登录',
        channel: this.channelId
      }
    }
    
    const creds = wechat.getCredentials()
    if (!creds?.userId) {
      return {
        success: false,
        error: '无法获取微信凭证',
        channel: this.channelId
      }
    }
    
    // Format message using base class method
    const message = this.formatBirthdayMessage(contacts, title)
    
    try {
      await wechat.sendTextMessage(creds.userId, message)
      
      log.info(`[${this.channelName}] Message sent to ${creds.userId}`)
      
      return {
        success: true,
        channel: this.channelId
      }
    } catch (error) {
      const errMsg = (error as Error).message
      log.error(`[${this.channelName}] Failed:`, error)
      return {
        success: false,
        error: errMsg,
        channel: this.channelId
      }
    }
  }
}

// Settings import (inline to avoid circular dependency)
import { getSettings } from './settings'