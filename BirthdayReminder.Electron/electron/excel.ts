import ExcelJS from 'exceljs'
import { Contact } from './database'
import { getContacts } from './database'
import log from 'electron-log'

// Helper to convert Excel serial date number to Date
const excelSerialToDate = (serial: number): Date | null => {
  // Excel serial date: days since 1899-12-30
  // But there's an offset issue, typical formula: new Date(Math.round((serial - 25569) * 86400 * 1000))
  try {
    const utc_days = Math.floor(serial - 25569)
    const utc_value = utc_days * 86400
    const date_info = new Date(utc_value * 1000)
    return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate())
  } catch (e) {
    log.error('Error converting serial date:', e)
    return null
  }
}

// Helper to parse birthday value from various formats
const parseBirthday = (value: any): string | null => {
  if (!value) return null
  
  // Date object
  if (value instanceof Date) {
    return value.toISOString().split('T')[0]
  }
  
  // Excel serial date (number)
  if (typeof value === 'number') {
    const date = excelSerialToDate(value)
    if (date) return date.toISOString().split('T')[0]
    return null
  }
  
  // String format
  if (typeof value === 'string') {
    // Try YYYY-MM-DD or YYYY/MM/DD
    const match = value.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
    if (match) {
      return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
    }
    // Try MM/DD/YYYY
    const match2 = value.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
    if (match2) {
      return `${match2[3]}-${match2[1].padStart(2, '0')}-${match2[2].padStart(2, '0')}`
    }
  }
  
  return null
}

export const importExcel = async (filePath: string): Promise<Contact[] | null> => {
  log.info(`Importing Excel from: ${filePath}`)
  try {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(filePath)
    const worksheet = workbook.getWorksheet(1)
    if (!worksheet) {
      log.error('No worksheet found')
      return null
    }
    
    log.info(`Worksheet: ${worksheet.name}, rows: ${worksheet.rowCount}`)
    
    const contacts: Contact[] = []
    
    // Get header row to check column mapping
    const headerRow = worksheet.getRow(1)
    log.info(`Header: ${JSON.stringify(headerRow.values)}`)
    
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return // Skip header
      
      const values = row.values as any[]
      log.info(`Row ${rowNumber} values: ${JSON.stringify(values)}`)
      
      // Flexible column mapping - find columns by position or header
      const name = values[1] as string
      const phoneNumber = values[2] as string
      const birthdayValue = values[3]
      const remarks = values[4] as string
      
      if (!name || !birthdayValue) {
        log.warn(`Row ${rowNumber} skipped: name="${name}", birthday="${birthdayValue}"`)
        return
      }
      
      const birthday = parseBirthday(birthdayValue)
      if (!birthday) {
        log.warn(`Row ${rowNumber} skipped: invalid birthday value "${birthdayValue}" (type: ${typeof birthdayValue})`)
        return
      }
      
      contacts.push({
        name: name.trim(),
        phoneNumber: phoneNumber?.trim() || undefined,
        birthday,
        remarks: remarks?.trim() || undefined
      })
      log.info(`Added: ${name}, ${birthday}`)
    })
    
    log.info(`Import complete: ${contacts.length} contacts`)
    return contacts
  } catch (error) {
    log.error('Error importing Excel:', error)
    return null
  }
}

export const exportExcel = async (filePath: string): Promise<string | null> => {
  log.info(`Exporting Excel to: ${filePath}`)
  try {
    const contacts = await getContacts()
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('生日列表')
    worksheet.addRow(['姓名', '手机号', '生日', '备注'])
    worksheet.getRow(1).font = { bold: true }
    contacts.forEach(c => worksheet.addRow([c.name, c.phoneNumber || '', c.birthday, c.remarks || '']))
    await workbook.xlsx.writeFile(filePath)
    log.info(`Exported ${contacts.length} contacts`)
    return filePath
  } catch (error) {
    log.error('Error exporting Excel:', error)
    return null
  }
}