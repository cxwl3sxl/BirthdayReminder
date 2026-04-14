import ExcelJS from 'exceljs'
import { Contact } from './database'
import { getContacts } from './database'
import log from 'electron-log'

export const importExcel = async (filePath: string): Promise<Contact[] | null> => {
  log.info(`Importing Excel from: ${filePath}`)
  try {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(filePath)
    const worksheet = workbook.getWorksheet(1)
    if (!worksheet) return null
    
    const contacts: Contact[] = []
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return
      const name = row.getCell(1).value as string
      const phoneNumber = row.getCell(2).value as string
      const birthdayValue = row.getCell(3).value
      const remarks = row.getCell(4).value as string
      if (!name || !birthdayValue) return
      
      let birthday: string
      if (birthdayValue instanceof Date) {
        birthday = birthdayValue.toISOString().split('T')[0]
      } else if (typeof birthdayValue === 'string') {
        const match = birthdayValue.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
        if (match) birthday = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
        else return
      } else return
      
      contacts.push({ name, phoneNumber: phoneNumber || undefined, birthday, remarks: remarks || undefined })
    })
    log.info(`Imported ${contacts.length} contacts`)
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