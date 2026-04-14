import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getContacts: () => ipcRenderer.invoke('get-contacts'),
  addContact: (contact: any) => ipcRenderer.invoke('add-contact', contact),
  updateContact: (contact: any) => ipcRenderer.invoke('update-contact', contact),
  deleteContact: (id: number) => ipcRenderer.invoke('delete-contact', id),
  getTodayBirthdays: () => ipcRenderer.invoke('get-today-birthdays'),
  getUpcomingBirthdays: () => ipcRenderer.invoke('get-upcoming-birthdays'),
  showTodayBirthdays: () => ipcRenderer.invoke('show-today-birthdays'),
  showUpcomingBirthdays: () => ipcRenderer.invoke('show-upcoming-birthdays'),
  closeListWindow: () => ipcRenderer.invoke('close-list-window'),
  importExcel: () => ipcRenderer.invoke('import-excel'),
  exportExcel: () => ipcRenderer.invoke('export-excel'),
  // Window controls
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  // List window controls
  listWindowMinimize: () => ipcRenderer.invoke('list-window-minimize'),
  listWindowClose: () => ipcRenderer.invoke('list-window-close'),
  // Event listeners
  onShowTodayBirthdays: (callback: () => void) => {
    ipcRenderer.on('show-today-birthdays', callback)
    return () => ipcRenderer.removeListener('show-today-birthdays', callback)
  },
  onLoadBirthdayList: (callback: (type: string) => void) => {
    ipcRenderer.on('load-birthday-list', (_, type) => callback(type))
    return () => ipcRenderer.removeAllListeners('load-birthday-list')
  },
  onContactsUpdated: (callback: () => void) => {
    ipcRenderer.on('contacts-updated', callback)
    return () => ipcRenderer.removeListener('contacts-updated', callback)
  },
  onOpenSettings: (callback: () => void) => {
    ipcRenderer.on('open-settings', callback)
    return () => ipcRenderer.removeListener('open-settings', callback)
  }
})