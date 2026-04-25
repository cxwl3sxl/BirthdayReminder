/**
 * Notification Scheduler
 * 
 * 启动流程：
 * 1. 停止已有计时器
 * 2. 检查当前时间：如果已过通知时间，立即执行一次检查
 * 3. 启动下次检查计时器（已过则为明天，否则为今天同名时刻）
 * 4. 执行检查：查询今日生日 → 发送通知 → 更新 lastNotifiedDate → 调度明天
 */

import log from 'electron-log'
import { getSettings } from './settings'
import { Contact } from './notification-channel'
import { notificationRegistry } from './notification-channel'

// Callback types
export type GetBirthdayContactsFunc = () => Promise<Contact[]>
export type UpdateNotifiedDateFunc = (id: number, date: string) => Promise<void>

export class NotificationScheduler {
  private timer: NodeJS.Timeout | null = null
  private getBirthdayContacts: GetBirthdayContactsFunc
  private updateNotifiedDate: UpdateNotifiedDateFunc
  
  constructor(
    getBirthdayContacts: GetBirthdayContactsFunc,
    updateNotifiedDate: UpdateNotifiedDateFunc
  ) {
    this.getBirthdayContacts = getBirthdayContacts
    this.updateNotifiedDate = updateNotifiedDate
  }
  
  /**
   * 主启动函数 - 完整流程
   */
  start(): void {
    // 1. 停止已有计时器
    this.stop()
    
    const settings = getSettings()
    const [targetHour, targetMinute] = settings.reminderTime.split(':').map(Number)
    const now = new Date()
    
    // 2. 检查是否已过通知时间
    const isTimePassed = now.getHours() > targetHour || 
                    (now.getHours() === targetHour && now.getMinutes() >= targetMinute)
    
    log.info(`[Scheduler] Current: ${now.toLocaleTimeString()}, Target: ${targetHour}:${targetMinute}, Passed: ${isTimePassed}`)
    
    if (isTimePassed) {
      // 已过时间：立即执行一次检查
      log.info('[Scheduler] Time passed, executing check now')
      this.executeCheck()
      // 调度明天
      this.scheduleNext(targetHour, targetMinute)
    } else {
      // 未过时间：调度今天同名时刻
      this.scheduleAt(targetHour, targetMinute, false)
    }
  }
  
  /**
   * 停止计时器
   */
  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }
  
  /**
   * 重启 - 用户修改通知时间后调用
   */
  restart(): void {
    log.info('[Scheduler] Restarting due to setting change...')
    this.start()
  }
  
  /**
   * 在指定时间调度下一次检查
   */
  private scheduleAt(hour: number, minute: number, fromTomorrow: boolean): void {
    const now = new Date()
    let target = new Date(now)
    target.setHours(hour, minute, 0, 0)
    
    // 如果需要从明天开始或目标时间已过
    if (fromTomorrow || target <= now) {
      target.setDate(target.getDate() + 1)
    }
    
    const delay = target.getTime() - now.getTime()
    log.info(`[Scheduler] Next check at ${target.toLocaleString()}, in ${Math.round(delay / 1000 / 60)} minutes`)
    
    this.timer = setTimeout(() => {
      this.executeCheck()
      // 执行完后调度明天
      this.scheduleAt(hour, minute, true)
    }, delay)
  }
  
  /**
   * 调度明天同名时刻
   */
  private scheduleNext(hour: number, minute: number): void {
    this.scheduleAt(hour, minute, true)
  }
  
  /**
   * 执行检查 - 查询一次今日生日并通知
   */
  private async executeCheck(): Promise<void> {
    const today = new Date().toISOString().split('T')[0]
    
    try {
      // 获取今日生日
      const contacts = await this.getBirthdayContacts()
      
      if (contacts.length === 0) {
        log.info('[Scheduler] No birthdays today')
        return
      }
      
      log.info(`[Scheduler] Found birthdays: ${contacts.map(c => c.name).join(', ')}`)
      
      // 发送到所有渠道
      const results = await notificationRegistry.notifyAll(
        '生日提醒',
        contacts,
        this.updateNotifiedDate,
        today
      )
      
      // 记录结果
      for (const result of results) {
        if (result.success) {
          log.info(`[Scheduler] ${result.channel}: sent`)
        } else {
          log.error(`[Scheduler] ${result.channel}: failed - ${result.error}`)
        }
      }
    } catch (error) {
      log.error('[Scheduler] Error:', error)
    }
  }
}