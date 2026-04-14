/**
 * WeChat Robot Module
 * Implements QR code login and message sending using iLink Bot API
 */

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import log from 'electron-log'

// API Types (from @tencent-weixin/openclaw-weixin)
interface QRCodeResponse {
  qrcode: string
  qrcode_img_content: string
}

interface QRCodeStatusResponse {
  status: 'wait' | 'scaned' | 'expired' | 'confirmed' | 'scaned_but_redirect' | string
  bot_token?: string
  ilink_bot_id?: string
  ilink_user_id?: string
  baseurl?: string
  redirect_host?: string
}

interface GetUpdatesReq {
  get_updates_buf?: string
}

interface GetUpdatesResp {
  ret: number
  msgs?: WeixinMessage[]
  get_updates_buf?: string
}

interface WeixinMessage {
  from_user_id?: string
  to_user_id?: string
  client_id?: string
  message_type?: number
  message_state?: number
  item_list?: MessageItem[]
  context_token?: string
}

interface MessageItem {
  type?: number
  text_item?: { text?: string }
  image_item?: ImageItem
}

interface ImageItem {
  url?: string
}

interface SendMessageReq {
  msg?: WeixinMessage
}

// Constants
const BASE_URL = 'https://ilinkai.weixin.qq.com'
const BOT_TYPE = '3'
const ILINK_APP_ID = 'bot'

// Credentials interface
export interface WeChatCredentials {
  token: string
  baseUrl: string
  accountId: string
  userId: string
}

// State
let credentials: WeChatCredentials | null = null
let getUpdatesBuf = ''

// Helper: Generate random WeChat UIN (random uint32 -> base64)
function randomWechatUin(): string {
  const buf = Buffer.alloc(4)
  crypto.randomFillSync(buf)
  return buf.toString('base64')
}

// Helper: Build common headers for GET requests (QR code, status polling)
function buildGetHeaders(): Record<string, string> {
  return {
    'AuthorizationType': 'ilink_bot_token',
    'X-WECHAT-UIN': randomWechatUin(),
    'iLink-App-Id': ILINK_APP_ID,
    'iLink-App-ClientVersion': '65547' // 1.0.11 encoded
  }
}

// Helper: Build common headers for POST requests
function buildPostHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'AuthorizationType': 'ilink_bot_token',
    'X-WECHAT-UIN': randomWechatUin(),
    'iLink-App-Id': ILINK_APP_ID,
    'iLink-App-ClientVersion': '65547'
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

// Helper: GET request to iLink API
async function apiGet<T>(endpoint: string, timeoutMs = 30000): Promise<T> {
  const url = `${BASE_URL}/ilink/bot/${endpoint}`
  const response = await fetch(url, {
    method: 'GET',
    headers: buildGetHeaders(),
    signal: AbortSignal.timeout(timeoutMs)
  })
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`)
  }
  
  const text = await response.text()
  return JSON.parse(text) as T
}

// Helper: POST request to iLink API
async function apiPost<T>(endpoint: string, body: object, token?: string, timeoutMs = 30000): Promise<T> {
  const url = `${BASE_URL}/ilink/bot/${endpoint}`
  const response = await fetch(url, {
    method: 'POST',
    headers: buildPostHeaders(token),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs)
  })
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`)
  }
  
  return response.json() as Promise<T>
}

// Get QR code for login
async function fetchQRCode(): Promise<QRCodeResponse> {
  log.info('[WeChat] Fetching QR code...')
  
  const url = `${BASE_URL}/ilink/bot/get_bot_qrcode?bot_type=${encodeURIComponent(BOT_TYPE)}`
  
  const response = await fetch(url, {
    method: 'GET',
    headers: buildGetHeaders()
  })
  
  log.info('[WeChat] QR code response status:', response.status)
  
  // The API returns JSON but with content-type: application/octet-stream
  const text = await response.text()
  
  if (!response.ok) {
    log.error('[WeChat] QR code error:', text)
    throw new Error(`Failed to get QR code: ${response.status}`)
  }
  
  try {
    return JSON.parse(text) as QRCodeResponse
  } catch (e) {
    log.error('[WeChat] JSON parse error:', e)
    throw new Error('Failed to parse QR code response')
  }
}

// Generate QR code image from text code using a public API
async function generateQRCodeImage(textCode: string): Promise<string> {
  log.info('[WeChat] Generating QR code from text:', textCode)
  
  // Use a public QR code generation API
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(textCode)}`
  
  try {
    const response = await fetch(qrApiUrl)
    if (!response.ok) {
      throw new Error(`QR API error: ${response.status}`)
    }
    
    const imageBuffer = await response.arrayBuffer()
    const base64 = Buffer.from(imageBuffer).toString('base64')
    log.info('[WeChat] QR code generated, length:', base64.length)
    
    return `data:image/png;base64,${base64}`
  } catch (error) {
    log.error('[WeChat] QR generation error:', error)
    throw error
  }
}

// Initialize WeChat login and return QR code data URL and text code
export async function initWeChatLogin(): Promise<{ qrcode: string; textCode: string }> {
  log.info('[WeChat] Initializing login...')
  
  try {
    const qrData = await fetchQRCode()
    log.info('[WeChat] QR data:', JSON.stringify(qrData))
    
    // Save the original text code for polling
    const textCode = qrData.qrcode
    
    // Use the qrcode field (text code) to generate QR code
    if (qrData.qrcode) {
      const qrImage = await generateQRCodeImage(qrData.qrcode)
      return { qrcode: qrImage, textCode }
    }
    
    throw new Error('No QR code data returned')
  } catch (error) {
    log.error('[WeChat] initWeChatLogin error:', error)
    throw error
  }
}

// Poll QR code status until confirmed (with long poll support and abort signal)
async function pollQRCodeStatus(qrcode: string, signal?: AbortSignal): Promise<WeChatCredentials> {
  log.info('[WeChat] Polling QR code status with qrcode:', qrcode)
  
  let retries = 0
  const maxRetries = 90 // 90 * 2 seconds = 3 minutes
  const longPollTimeout = 35000 // 35 seconds
  
  // Create a combined signal that checks both external abort and internal
  const checkAbort = () => {
    if (signal?.aborted) {
      throw new Error('取消扫码')
    }
  }
  
  while (retries < maxRetries) {
    // Check abort before each poll
    checkAbort()
    
    try {
      const status = await apiGet<QRCodeStatusResponse>(
        `get_qrcode_status?qrcode=${encodeURIComponent(qrcode)}`,
        longPollTimeout
      )
      
      // Check abort after each response
      checkAbort()
      
      log.info('[WeChat] QR status response:', JSON.stringify(status))
      
      // Check for confirmed status (also check for bot_token which indicates success)
      if (status.status === 'confirmed' || status.bot_token) {
        if (!status.bot_token || !status.ilink_bot_id) {
          throw new Error('登录确认但未返回 token 或 bot_id')
        }
        
        const creds: WeChatCredentials = {
          token: status.bot_token,
          baseUrl: status.baseurl || BASE_URL,
          accountId: status.ilink_bot_id,
          userId: status.ilink_user_id || ''
        }
        
        log.info(`[WeChat] Login successful! accountId=${creds.accountId}`)
        return creds
      }
      
      // Check for expired
      if (status.status === 'expired') {
        log.warn('[WeChat] QR code expired')
        throw new Error('二维码已过期，请重新扫码')
      }
      
      // Log current status
      if (status.status === 'wait') {
        log.info('[WeChat] Waiting for scan...')
      } else if (status.status === 'scaned') {
        log.info('[WeChat] QR code scanned, waiting for confirmation...')
      } else {
        log.info('[WeChat] Status:', status.status)
      }
      
    } catch (err) {
      // Check abort on error
      checkAbort()
      
      // Timeout is normal for long poll
      if (err instanceof Error && err.name === 'TimeoutError') {
        log.debug('[WeChat] Long poll timeout, continuing...')
      } else if (err instanceof Error && err.message === '取消扫码') {
        throw err
      } else {
        log.warn('[WeChat] Poll error:', err)
      }
    }
    
    retries++
    // Brief pause between polls
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  
  throw new Error('扫码超时，请重新扫码')
}

// Complete login after QR scan - returns detailed status
export async function completeWeChatLogin(qrcode: string, signal?: AbortSignal): Promise<{ success: boolean; userId?: string; error?: string; expired?: boolean }> {
  try {
    const creds = await pollQRCodeStatus(qrcode, signal)
    credentials = creds
    saveCredentials(creds)
    return { success: true, userId: creds.userId }
  } catch (error) {
    // If aborted, don't return error - just return cancelled
    if (error instanceof Error && error.name === 'AbortError') {
      return { success: false, error: '已取消', expired: false }
    }
    const errorMsg = (error as Error).message || ''
    const isExpired = errorMsg.includes('过期')
    return { 
      success: false, 
      error: errorMsg || '登录失败',
      expired: isExpired
    }
  }
}

// Export a version with abort support for the main process
export async function completeWeChatLoginWithAbort(qrcode: string, abortSignal?: AbortSignal): Promise<{ success: boolean; userId?: string; error?: string; expired?: boolean }> {
  return completeWeChatLogin(qrcode, abortSignal)
}

// GetUpdates - long poll for new messages
export async function getUpdates(): Promise<GetUpdatesResp> {
  if (!credentials) {
    throw new Error('WeChat not logged in')
  }
  
  try {
    const result = await apiPost<GetUpdatesResp>(
      'getupdates',
      { get_updates_buf: getUpdatesBuf },
      credentials.token,
      35000 // 35 second long poll
    )
    
    if (result.get_updates_buf) {
      getUpdatesBuf = result.get_updates_buf
    }
    
    return result
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      // Long poll timeout is normal, return empty response
      return { ret: 0, msgs: [], get_updates_buf: getUpdatesBuf }
    }
    throw err
  }
}

// Send text message to user
export async function sendTextMessage(toUserId: string, text: string, contextToken?: string): Promise<void> {
  if (!credentials) {
    throw new Error('WeChat not logged in')
  }
  
  const message: WeixinMessage = {
    from_user_id: '',
    to_user_id: toUserId,
    client_id: '',
    message_type: 2, // BOT
    message_state: 2, // FINISH
    item_list: [{ type: 1, text_item: { text } }], // TEXT
    context_token: contextToken
  }
  
  await apiPost(
    'sendmessage',
    { msg: message },
    credentials.token
  )
  
  log.info(`[WeChat] Message sent to ${toUserId}`)
}

// Get credentials file path
function getCredentialsPath(): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'wechat-credentials.json')
}

// Save credentials to file
function saveCredentials(creds: WeChatCredentials): void {
  try {
    const credPath = getCredentialsPath()
    fs.writeFileSync(credPath, JSON.stringify(creds, null, 2), { mode: 0o600 })
    log.info('[WeChat] Credentials saved')
  } catch (err) {
    log.error('[WeChat] Failed to save credentials:', err)
  }
}

// Load credentials from file
export function loadCredentials(): WeChatCredentials | null {
  try {
    const credPath = getCredentialsPath()
    if (fs.existsSync(credPath)) {
      const data = fs.readFileSync(credPath, 'utf-8')
      credentials = JSON.parse(data) as WeChatCredentials
      log.info('[WeChat] Credentials loaded')
      return credentials
    }
  } catch (err) {
    log.error('[WeChat] Failed to load credentials:', err)
  }
  return null
}

// Check if logged in
export function isLoggedIn(): boolean {
  return credentials !== null
}

// Get current credentials
export function getCredentials(): WeChatCredentials | null {
  return credentials
}

// Clear credentials (logout)
export function clearCredentials(): void {
  credentials = null
  getUpdatesBuf = ''
  
  try {
    const credPath = getCredentialsPath()
    if (fs.existsSync(credPath)) {
      fs.unlinkSync(credPath)
    }
  } catch (err) {
    log.error('[WeChat] Failed to clear credentials:', err)
  }
  
  log.info('[WeChat] Credentials cleared')
}

// Initialize on module load
export function initWeChat(): void {
  loadCredentials()
}

export default {
  initWeChatLogin,
  completeWeChatLogin,
  sendTextMessage,
  loadCredentials,
  isLoggedIn,
  getCredentials,
  clearCredentials,
  initWeChat
}