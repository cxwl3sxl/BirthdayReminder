/**
 * Notification Scheduler
 * 
 * Centralized scheduler for birthday notifications.
 * Manages timing, triggers notification channels, and handles configurations.
 */

import log from 'electron-log'
import { getSettings } from './settings'
import { Contact } from './notification-channel'
import { notificationRegistry, NotificationResult } from './notification-channel'

// Callback type for getting contacts to notify
export type GetBirthdayContactsFunc = () => Promise<Contact[]>

// Callback type for updating notified date
export type UpdateNotifiedDateFunc = (id: number) => Promise<void>

/**
 * Notification Scheduler
 * 
 * Handles scheduled birthday notifications through all registered channels.
 * Features:
 * - Single scheduled check per day at configured time
 * - Immediate check on startup if reminder time has passed
 * - Restart timer when reminder time configuration changes
 * 
 * Notification policy:
 * - On startup (first check): Notify ALL birthdays (ignore lastNotifiedDate)
 * - While running (subsequent checks): Only notify unnotified contacts
 */
export class NotificationScheduler {
  private timer: NodeJS.Timeout | null = null
  private getBirthdayContacts: GetBirthdayContactsFunc
  private updateNotifiedDate: UpdateNotifiedDateFunc
  private lastCheckDate: string = '' // Track which date we've already notified for
  private isFirstCheck: boolean = true // Track if this is the first check after startup
  
  constructor(
    getBirthdayContacts: GetBirthdayContactsFunc,
    updateNotifiedDate: UpdateNotifiedDateFunc
  ) {
    this.getBirthdayContacts = getBirthdayContacts
    this.updateNotifiedDate = updateNotifiedDate
  }
  
  /**
   * Start the scheduler
   * 
   * Schedules the next check at configured reminder time.
   * Also performs an immediate check if the reminder time has already passed today.
   */
  start(): void {
    this.stop() // Clear existing timer
    this.isFirstCheck = true // Reset first check flag
    
    const settings = getSettings()
    const [hours, minutes] = settings.reminderTime.split(':').map(Number)
    
    log.info(`[Scheduler] Starting with reminder time: ${settings.reminderTime}`)
    
    // Calculate delay until next check time
    const now = new Date()
    let targetTime = new Date(now)
    targetTime.setHours(hours, minutes, 0, 0)
    
    // If target time is in the past, schedule for tomorrow
    if (targetTime <= now) {
      targetTime.setDate(targetTime.getDate() + 1)
    }
    
    const delay = targetTime.getTime() - now.getTime()
    log.info(`[Scheduler] Next check scheduled in ${Math.round(delay / 1000 / 60)} minutes`)
    
    // Schedule the check
    this.timer = setTimeout(() => {
      this.executeCheck()
    }, delay)
    
    // Immediate check: if reminder time has already passed today, check immediately
    const today = now.toISOString().split('T')[0]
    if (now.getHours() > hours || (now.getHours() === hours && now.getMinutes() >= minutes)) {
      // Already past the reminder time today
      log.info('[Scheduler] Reminder time already passed, executing immediate check')
      setTimeout(() => this.executeCheck(), 2000) // Small delay to let app stabilize
    }
  }
  
  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
      log.info('[Scheduler] Stopped')
    }
  }
  
  /**
   * Restart with new settings
   * 
   * Called when reminder time changes.
   */
  restart(): void {
    log.info('[Scheduler] Restarting with new settings...')
    this.start()
  }
  
  /**
   * Execute the scheduled check
   * 
   * 1. Get today's birthdays
   * 2. Filter contacts based on check type:
   *    - First check (startup): Notify ALL (ignore lastNotifiedDate)
   *    - Subsequent checks: Only notify unnotified contacts
   * 3. Send through all enabled notification channels
   * 4. Update lastNotifiedDate
   */
  private async executeCheck(): void {
    const today = new Date().toISOString().split('T')[0]
    
    // Skip if we've already checked today (while running)
    if (!this.isFirstCheck && this.lastCheckDate === today) {
      log.info('[Scheduler] Already checked today (running), skipping')
      this.scheduleNextCheck()
      return
    }
    
    log.info(`[Scheduler] Executing check... (firstCheck: ${this.isFirstCheck})`)
    
    try {
      // Get today's birthdays
      const allContacts = await this.getBirthdayContacts()
      
      // Filter contacts based on check type
      let toNotify: Contact[]
      if (this.isFirstCheck) {
        // First check (on startup): Notify ALL birthdays
        toNotify = allContacts
        log.info(`[Scheduler] First check - notifying ALL ${toNotify.length} birthday(s)`)
        // Mark first check as done
        this.isFirstCheck = false
      } else {
        // Subsequent checks: Only notify unnotified contacts
        toNotify = allContacts.filter(c => c.lastNotifiedDate !== today)
        log.info(`[Scheduler] Subsequent check - notifying ${toNotify.length} unnotified birthday(s)`)
      }
      
      if (toNotify.length === 0) {
        log.info('[Scheduler] No birthdays to notify')
        this.lastCheckDate = today
        this.scheduleNextCheck()
        return
      }
      
      log.info(`[Scheduler] Found ${toNotify.length} birthday(s) to notify: ${toNotify.map(c => c.name).join(', ')}`)
      
      // Send through all enabled channels
      const results = await notificationRegistry.notifyAll('生日提醒', toNotify, this.updateNotifiedDate)
      
      // Log results
      for (const result of results) {
        if (result.success) {
          log.info(`[Scheduler] ${result.channel}: notification sent successfully`)
        } else {
          log.error(`[Scheduler] ${result.channel}: notification failed - ${result.error}`)
        }
      }
      
      // Mark as checked for today
      this.lastCheckDate = today
      
    } catch (error) {
      log.error('[Scheduler] Check failed:', error)
    }
    
    // Schedule next check
    this.scheduleNextCheck()
  }
  
  /**
   * Schedule the next daily check
   */
  private scheduleNextCheck(): void {
    this.start()
  }
}