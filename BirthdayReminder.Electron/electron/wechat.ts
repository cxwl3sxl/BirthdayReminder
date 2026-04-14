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
  status: 'wait' | 'scaned' | 'expired' | 'confirmed'
  bot_token?: string
  ilink_bot_id?: string
  ilink_user_id?: string
  baseurl?: string
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
const BOT_TYPE = 3

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

// Helper: Build common headers
function buildHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'AuthorizationType': 'ilink_bot_token',
    'X-WECHAT-UIN': randomWechatUin()
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

// Helper: POST request to iLink API
async function apiPost<T>(endpoint: string, body: object, token?: string, timeoutMs = 30000): Promise<T> {
  const url = `${BASE_URL}/ilink/bot/${endpoint}`
  const response = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(token),
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
  const url = `${BASE_URL}/ilink/bot/get_bot_qrcode?bot_type=${BOT_TYPE}`
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error(`Failed to get QR code: ${response.status}`)
  }
  
  return response.json() as Promise<QRCodeResponse>
}

// Poll QR code status until confirmed
export async function pollQRCodeStatus(qrcode: string): Promise<WeChatCredentials> {
  log.info('[WeChat] Polling QR code status...')
  
  let retries = 0
  const maxRetries = 90 // 90 * 2 seconds = 3 minutes
  
  while (retries < maxRetries) {
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const url = `${BASE_URL}/ilink/bot/get_qrcode_status?qrcode=${encodeURIComponent(qrcode)}`
    const response = await fetch(url)
    
    if (!response.ok) {
      retries++
      continue
    }
    
    const status = await response.json() as QRCodeStatusResponse
    
    switch (status.status) {
      case 'wait':
        log.info('[WeChat] Waiting for scan...')
        break
        
      case 'scaned':
        log.info('[WeChat] QR code scanned, waiting for confirmation...')
        break
        
      case 'expired':
        log.warn('[WeChat] QR code expired')
        throw new Error('二维码已过期，请重新扫码')
        
      case 'confirmed':
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
        
      default:
        log.warn('[WeChat] Unknown status:', status.status)
    }
    
    retries++
  }
  
  throw new Error('扫码超时，请重新扫码')
}

// Initialize WeChat login and return QR code data URL
export async function initWeChatLogin(): Promise<string> {
  log.info('[WeChat] Initializing login...')
  
  const qrData = await fetchQRCode()
  
  // Return the QR code image data URL
  if (qrData.qrcode_img_content) {
    return `data:image/png;base64,${qrData.qrcode_img_content}`
  }
  
  // If no image, return the text code for external QR generators
  return qrData.qrcode
}

// Complete login after QR scan
export async function completeWeChatLogin(qrcode: string): Promise<WeChatCredentials> {
  const creds = await pollQRCodeStatus(qrcode)
  credentials = creds
  saveCredentials(creds)
  return creds
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