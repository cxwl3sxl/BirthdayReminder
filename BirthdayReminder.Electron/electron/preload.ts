import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getContacts: () => ipcRenderer.invoke('get-contacts'),
  addContact: (contact: any) => ipcRenderer.invoke('add-contact', contact),
  updateContact: (contact: any) => ipcRenderer.invoke('update-contact', contact),
  deleteContact: (id: number) => ipcRenderer.invoke('delete-contact', id),
  getTodayBirthdays: () => ipcRenderer.invoke('get-today-birthdays'),
  importExcel: () => ipcRenderer.invoke('import-excel'),
  exportExcel: () => ipcRenderer.invoke('export-excel'),
  // Window controls
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized')
})