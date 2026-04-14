import { useState, useEffect } from 'react'
import { Table, Button, Space, Modal, Form, Input, DatePicker, message, Popconfirm } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import {
  MinusOutlined,
  CloseOutlined,
  CalendarOutlined,
  UserOutlined
} from '@ant-design/icons'

// Types
interface Contact {
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

declare global {
  interface Window {
    electronAPI: {
      getContacts: () => Promise<Contact[]>
      addContact: (contact: Contact) => Promise<number>
      updateContact: (contact: Contact) => Promise<void>
      deleteContact: (id: number) => Promise<void>
      getTodayBirthdays: () => Promise<Contact[]>
      getUpcomingBirthdays: () => Promise<Contact[]>
      showTodayBirthdays: () => Promise<Contact[]>
      showUpcomingBirthdays: () => Promise<Contact[]>
      closeListWindow: () => Promise<void>
      importExcel: () => Promise<Contact[] | null>
      exportExcel: () => Promise<string | null>
      windowMinimize: () => Promise<void>
      windowMaximize: () => Promise<void>
      windowClose: () => Promise<void>
      windowIsMaximized: () => Promise<boolean>
      listWindowMinimize: () => Promise<void>
      listWindowClose: () => Promise<void>
      onShowTodayBirthdays: (callback: () => void) => () => void
      onLoadBirthdayList: (callback: (type: string) => void) => () => void
      onContactsUpdated: (callback: () => void) => () => void
      onOpenSettings: (callback: () => void) => () => void
      getSettings: () => Promise<{ autoStart: boolean; reminderTime: string; wechatBound: boolean; wechatUserId?: string }>
      setAutoStart: (enabled: boolean) => Promise<void>
      setReminderTime: (time: string) => Promise<void>
      // WeChat
      wechatInitLogin: () => Promise<{ success: boolean; qrcode?: string; error?: string }>
      wechatCompleteLogin: (qrcode: string) => Promise<{ success: boolean; userId?: string; error?: string }>
      wechatGetStatus: () => Promise<{ bound: boolean; userId?: string }>
      wechatUnbind: () => Promise<{ success: boolean }>
      wechatTestSend: () => Promise<{ success: boolean; message?: string; error?: string }>
    }
  }
}

// Styles
const styles = {
  app: {
    display: 'flex',
    flexDirection: 'column' as const,
    minHeight: '100vh',
    background: 'var(--color-bg-primary)'
  },
  titleBar: {
    height: 'var(--titlebar-height)',
    background: 'var(--titlebar-bg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    WebkitAppRegion: 'drag' as const,
    userSelect: 'none',
    boxShadow: 'var(--shadow-md)'
  },
  titleBarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12
  },
  appIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-primary) 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16
  },
  appTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    letterSpacing: 0.5
  },
  titleBarControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    WebkitAppRegion: 'no-drag' as const
  },
  controlButton: {
    width: 44,
    height: 32,
    border: 'none',
    borderRadius: 6,
    background: 'transparent',
    color: 'rgba(255,255,255,0.85)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all var(--transition-fast)',
    fontSize: 14
  },
  closeButton: {
    width: 44,
    height: 32,
    border: 'none',
    borderRadius: 6,
    background: 'transparent',
    color: 'rgba(255,255,255,0.85)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all var(--transition-fast)',
    fontSize: 14
  },
  mainContent: {
    flex: 1,
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  headerCard: {
    background: 'var(--color-bg-card)',
    borderRadius: 'var(--radius-lg)',
    padding: '20px 24px',
    marginBottom: 16,
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--color-border)',
    flexShrink: 0
  },
  headerTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 20,
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: 10
  },
  tableCard: {
    flex: 1,
    background: 'var(--color-bg-card)',
    borderRadius: 'var(--radius-lg)',
    padding: 16,
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--color-border)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0
  }
} as const

function ListPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('今日生日')
  const [type, setType] = useState<'today' | 'upcoming'>('today')

  useEffect(() => {
    const cleanup = window.electronAPI.onLoadBirthdayList((listType: string) => {
      setType(listType as 'today' | 'upcoming')
      setTitle(listType === 'today' ? '今日生日' : '30天内生日')
      loadContacts(listType)
    })
    
    return cleanup
  }, [])

  const loadContacts = async (listType?: string) => {
    setLoading(true)
    try {
      const data = listType === 'upcoming' 
        ? await window.electronAPI.getUpcomingBirthdays()
        : await window.electronAPI.getTodayBirthdays()
      setContacts(data)
    } catch (error) {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  const handleMinimize = async () => {
    await window.electronAPI.listWindowMinimize()
  }

  const handleClose = async () => {
    await window.electronAPI.listWindowClose()
  }

  const columns: ColumnsType<Contact> = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 120,
      render: (text: string) => (
        <span style={{ fontWeight: 500, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
          <UserOutlined style={{ marginRight: 8, color: 'var(--color-primary)' }} />
          {text}
        </span>
      )
    },
    {
      title: '生日',
      dataIndex: 'formattedBirthday',
      key: 'birthday',
      width: 100,
      render: (text: string) => (
        <span style={{ whiteSpace: 'nowrap' }}>
          <CalendarOutlined style={{ marginRight: 8, color: 'var(--color-accent-dark)' }} />
          {text}
        </span>
      )
    },
    {
      title: '倒计时',
      dataIndex: 'countdownText',
      key: 'countdownText',
      width: 100,
      render: (text: string, record) => (
        <span
          style={{
            color: record.isBirthdayToday ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            fontWeight: record.isBirthdayToday ? 600 : 400,
            background: record.isBirthdayToday ? 'rgba(224, 122, 95, 0.1)' : 'transparent',
            padding: '4px 10px',
            borderRadius: 'var(--radius-sm)',
            whiteSpace: 'nowrap'
          }}
        >
          {text}
        </span>
      )
    },
    { title: '手机号', dataIndex: 'phoneNumber', key: 'phoneNumber', width: 120 }
  ]

  return (
    <div style={styles.app}>
      {/* Custom Title Bar */}
      <div style={styles.titleBar}>
        <div style={styles.titleBarLeft}>
          <div style={styles.appIcon}>🎂</div>
          <span style={styles.appTitle}>{title}</span>
        </div>
        <div style={styles.titleBarControls}>
          <button
            style={styles.controlButton}
            onClick={handleMinimize}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.15)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <MinusOutlined />
          </button>
          <button
            style={styles.closeButton}
            onClick={handleClose}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#E81123'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <CloseOutlined />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        <div style={styles.headerCard}>
          <h1 style={styles.headerTitle}>
            {type === 'today' ? '🎉 今日生日' : '📅 即将到来的生日'}
            <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--color-text-secondary)', marginLeft: 12 }}>
              共 {contacts.length} 位
            </span>
          </h1>
        </div>

        <div style={styles.tableCard}>
          <Table
            columns={columns}
            dataSource={contacts}
            rowKey="id"
            loading={loading}
            size="small"
            pagination={false}
            scroll={{ y: 'calc(100vh - 260px)' }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          />
        </div>
      </div>
    </div>
  )
}

export default ListPage
