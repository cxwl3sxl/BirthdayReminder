import ExcelJS from 'exceljs'
import { Contact } from './database'
import { getContacts } from './database'
import log from 'electron-log'

// Helper to parse birthday value - only supports MM/DD and YYYY/MM/DD formats
const parseBirthday = (value: any, defaultYear: number = new Date().getFullYear()): string | null => {
  if (!value) return null
  
  // Date object
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString().split('T')[0]
  }
  
  // Excel serial date (number) - days since 1899-12-30
  if (typeof value === 'number') {
    try {
      const utc_days = Math.floor(value - 25569)
      const utc_value = utc_days * 86400
      const date_info = new Date(utc_value * 1000)
      if (!isNaN(date_info.getTime())) {
        return date_info.toISOString().split('T')[0]
      }
    } catch (e) {
      log.error('Error converting serial date:', e)
    }
    return null
  }
  
  // String format - only MM/DD and YYYY/MM/DD
  if (typeof value === 'string') {
    const trimmed = value.trim()
    
    // Try YYYY/MM/DD or YYYY-MM-DD
    const matchFull = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)
    if (matchFull) {
      const year = parseInt(matchFull[1])
      const month = parseInt(matchFull[2])
      const day = parseInt(matchFull[3])
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
      }
    }
    
    // Try MM/DD (use current year)
    const matchMonthDay = trimmed.match(/^(\d{1,2})[-/](\d{1,2})$/)
    if (matchMonthDay) {
      const month = parseInt(matchMonthDay[1])
      const day = parseInt(matchMonthDay[2])
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return `${defaultYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
      }
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