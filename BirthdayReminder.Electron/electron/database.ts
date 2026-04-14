import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'
import log from 'electron-log'

let db: Database.Database | null = null

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

const getDbPath = () => path.join(app.getPath('userData'), 'birthdays.db')

export const initDatabase = async () => {
  const dbPath = getDbPath()
  log.info(`Initializing database at: ${dbPath}`)
  db = new Database(dbPath)
  db.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phoneNumber TEXT,
      birthday TEXT NOT NULL,
      remarks TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)
  log.info('Database initialized')
}

export const getContacts = async (): Promise<Contact[]> => {
  if (!db) throw new Error('Database not initialized')
  const rows = db.prepare('SELECT * FROM contacts ORDER BY birthday').all() as any[]
  const today = new Date()
  const currentYear = today.getFullYear()
  
  return rows.map(row => {
    const birthday = new Date(row.birthday)
    const month = birthday.getMonth()
    const day = birthday.getDate()
    let thisYearBirthday = new Date(currentYear, month, day)
    if (thisYearBirthday < today) thisYearBirthday = new Date(currentYear + 1, month, day)
    const diffDays = Math.ceil((thisYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    const isBirthdayToday = month === today.getMonth() && day === today.getDate()
    return {
      ...row,
      formattedBirthday: `${month + 1}月${day}日`,
      daysUntil: diffDays,
      countdownText: isBirthdayToday ? '🎂 今天生日!' : `${diffDays}天后`,
      isBirthdayToday
    }
  })
}

export const getTodayBirthdays = async (): Promise<Contact[]> => {
  const contacts = await getContacts()
  return contacts.filter(c => c.isBirthdayToday)
}

export const getContactsInDays = async (days: number): Promise<Contact[]> => {
  const contacts = await getContacts()
  return contacts.filter(c => c.daysUntil !== undefined && c.daysUntil > 0 && c.daysUntil <= days)
}

export const addContact = async (contact: Contact): Promise<number> => {
  if (!db) throw new Error('Database not initialized')
  const result = db.prepare('INSERT INTO contacts (name, phoneNumber, birthday, remarks) VALUES (@name, @phoneNumber, @birthday, @remarks)').run({
    name: contact.name,
    phoneNumber: contact.phoneNumber || null,
    birthday: contact.birthday,
    remarks: contact.remarks || null
  })
  return result.lastInsertRowid as number
}

export const updateContact = async (contact: Contact): Promise<void> => {
  if (!db || !contact.id) throw new Error('Database not initialized or missing ID')
  db.prepare('UPDATE contacts SET name = @name, phoneNumber = @phoneNumber, birthday = @birthday, remarks = @remarks, updatedAt = CURRENT_TIMESTAMP WHERE id = @id').run({
    id: contact.id,
    name: contact.name,
    phoneNumber: contact.phoneNumber || null,
    birthday: contact.birthday,
    remarks: contact.remarks || null
  })
}

export const deleteContact = async (id: number): Promise<void> => {
  if (!db) throw new Error('Database not initialized')
  db.prepare('DELETE FROM contacts WHERE id = ?').run(id)
}