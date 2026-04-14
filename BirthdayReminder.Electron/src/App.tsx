import { useState, useEffect } from 'react'
import { Table, Button, Space, Modal, Form, Input, DatePicker, message, Dropdown, Popconfirm, Switch, TimePicker, Spin, Divider } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import pinyin from 'pinyin'
import {
  PlusOutlined,
  DownloadOutlined,
  UploadOutlined,
  UserOutlined,
  CalendarOutlined,
  SearchOutlined,
  WechatOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons'

// Windows 10 Style Icons (SVG)
const Win10Icons = {
  Minimize: () => (
    <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
      <rect width="10" height="1" />
    </svg>
  ),
  Maximize: () => (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
      <rect x="0.5" y="0.5" width="9" height="9" />
    </svg>
  ),
  Restore: () => (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
      <rect x="2.5" y="0.5" width="7" height="7" />
      <path d="M0.5 2.5H7.5V9.5H0.5V2.5Z" fill="var(--titlebar-bg)" stroke="currentColor" />
    </svg>
  ),
  Close: () => (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
      <path d="M1 0L0 1L4 5L0 9L1 10L5 6L9 10L10 9L6 5L10 1L9 0L5 4L1 0Z" />
    </svg>
  )
}

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
    padding: '28px 32px',
    marginBottom: 20,
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--color-border)',
    flexShrink: 0
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  headerTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: 12
  },
  headerSubtitle: {
    color: 'var(--color-text-secondary)',
    fontSize: 12,
    marginTop: 4,
    fontWeight: 400
  },
  headerActions: {
    display: 'flex',
    gap: 12
  },
  primaryButton: {
    height: 42,
    paddingInline: 20,
    borderRadius: 'var(--radius-md)',
    fontWeight: 500,
    background: 'var(--color-primary)',
    border: 'none',
    boxShadow: '0 4px 12px rgba(224, 122, 95, 0.35)'
  },
  defaultButton: {
    height: 42,
    paddingInline: 20,
    borderRadius: 'var(--radius-md)',
    fontWeight: 500,
    background: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)'
  },
  tableCard: {
    flex: 1,
    background: 'var(--color-bg-card)',
    borderRadius: 'var(--radius-lg)',
    padding: 24,
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--color-border)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0
  },
  statsRow: {
    display: 'flex',
    gap: 16,
    marginBottom: 24
  },
  statCard: {
    flex: 1,
    background: 'linear-gradient(135deg, var(--color-bg-secondary) 0%, #FFF5EB 100%)',
    borderRadius: 'var(--radius-md)',
    padding: '16px 20px',
    border: '1px solid var(--color-border)'
  },
  statValue: {
    fontFamily: 'var(--font-display)',
    fontSize: 32,
    fontWeight: 700,
    color: 'var(--color-primary)'
  },
  statLabel: {
    fontSize: 13,
    color: 'var(--color-text-secondary)',
    marginTop: 4
  }
} as const

function App() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [isMaximized, setIsMaximized] = useState(false)
  const [settingsVisible, setSettingsVisible] = useState(false)
  const [settings, setSettings] = useState({ autoStart: false, reminderTime: '10:00', wechatBound: false })
  const [searchText, setSearchText] = useState('')
  const [form] = Form.useForm()
  // WeChat state
  const [wechatModalVisible, setWechatModalVisible] = useState(false)
  const [wechatQRCode, setWechatQRCode] = useState<string | null>(null)
  const [wechatLoginComplete, setWechatLoginComplete] = useState(false)
  const [wechatUserId, setWechatUserId] = useState<string | null>(null)
  const [wechatStatus, setWechatStatus] = useState<{ bound: boolean; userId?: string }>({ bound: false, userId: undefined })

  // Get pinyin from Chinese text
  const getPinyin = (text: string): string => {
    try {
      const result = pinyin(text, { style: pinyin.STYLE_NORMAL })
      return result.flat().join(' ')
    } catch {
      return text
    }
  }

  // Filter contacts based on search text (including pinyin)
  const filteredContacts = contacts.filter(contact => {
    if (!searchText) return true
    const search = searchText.toLowerCase().trim()
    if (!search) return true
    
    const name = contact.name || ''
    const phoneNumber = contact.phoneNumber || ''
    const birthday = contact.birthday || ''
    const formattedBirthday = contact.formattedBirthday || ''
    const remarks = contact.remarks || ''
    const namePinyin = getPinyin(name).toLowerCase()
    
    return (
      name.toLowerCase().includes(search) ||
      namePinyin.includes(search) ||
      phoneNumber.toLowerCase().includes(search) ||
      birthday.toLowerCase().includes(search) ||
      formattedBirthday.toLowerCase().includes(search) ||
      remarks.toLowerCase().includes(search)
    )
  })

  // Handle search with toast notification
  const handleSearch = (value: string) => {
    setSearchText(value)
    if (value.trim()) {
      const count = filteredContacts.length
      message.info(`找到 ${count} 条匹配结果`)
    }
  }

  useEffect(() => {
    loadContacts()
    checkMaximized()
    loadSettings()
    
    // Listen for notification click to show today's birthdays
    const cleanup = window.electronAPI.onShowTodayBirthdays(() => {
      loadContacts()
      message.info('今日生日联系人已加载')
    })
    
    // Listen for contacts updated from tray
    const cleanupUpdated = window.electronAPI.onContactsUpdated(() => {
      loadContacts()
      message.success('联系人已更新')
    })
    
    // Listen for open settings from tray
    const cleanupSettings = window.electronAPI.onOpenSettings(() => {
      setSettingsVisible(true)
    })
    
    return () => {
      cleanup()
      cleanupUpdated()
      cleanupSettings()
    }
  }, [])

  const loadSettings = async () => {
    try {
      const s = await window.electronAPI.getSettings()
      setSettings(s)
      // Check WeChat status
      const status = await window.electronAPI.wechatGetStatus()
      setWechatStatus(status)
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  const checkMaximized = async () => {
    const maximized = await window.electronAPI.windowIsMaximized()
    setIsMaximized(maximized)
  }

  // Start WeChat login flow
  const startWeChatLogin = async () => {
    setWechatQRCode(null)
    setWechatLoginComplete(false)
    setWechatUserId(null)
    
    try {
      const result = await window.electronAPI.wechatInitLogin()
      if (result.success && result.qrcode) {
        setWechatQRCode(result.qrcode)
        
        // Call wechatCompleteLogin to start polling QR status in background
        // This will poll until confirmed or timeout
        const loginResult = await window.electronAPI.wechatCompleteLogin(result.qrcode)
        
        if (loginResult.success) {
          setWechatLoginComplete(true)
          setWechatUserId(loginResult.userId || null)
          message.success('微信绑定成功')
        } else {
          message.error(loginResult.error || '登录失败')
        }
      } else {
        message.error(result.error || '获取二维码失败')
      }
    } catch (error) {
      message.error('微信登录初始化失败')
    }
  }
  
  // Update the button click handler
  useEffect(() => {
    if (wechatModalVisible && !wechatQRCode) {
      startWeChatLogin()
    }
  }, [wechatModalVisible])

  const handleMinimize = async () => {
    await window.electronAPI.windowMinimize()
  }

  const handleMaximize = async () => {
    await window.electronAPI.windowMaximize()
    checkMaximized()
  }

  const handleClose = async () => {
    await window.electronAPI.windowClose()
  }

  const loadContacts = async () => {
    setLoading(true)
    try {
      const data = await window.electronAPI.getContacts()
      setContacts(data)
    } catch (error) {
      message.error('加载联系人失败')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingContact(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (record: Contact) => {
    setEditingContact(record)
    form.setFieldsValue({
      name: record.name,
      phoneNumber: record.phoneNumber,
      birthday: record.birthday ? dayjs(record.birthday) : null,
      remarks: record.remarks
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await window.electronAPI.deleteContact(id)
      message.success('删除成功')
      loadContacts()
    } catch (error) {
      message.error('删除失败')
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const contact = { ...values, birthday: values.birthday.format('YYYY-MM-DD') }
      if (editingContact?.id) {
        await window.electronAPI.updateContact({ ...contact, id: editingContact.id })
        message.success('更新成功')
      } else {
        await window.electronAPI.addContact(contact)
        message.success('添加成功')
      }
      setModalVisible(false)
      loadContacts()
    } catch (error) {
      message.error('操作失败')
    }
  }

  const handleImport = async () => {
    try {
      const imported = await window.electronAPI.importExcel()
      if (imported && imported.length > 0) {
        for (const contact of imported) {
          await window.electronAPI.addContact(contact)
        }
        message.success(`成功导入 ${imported.length} 条记录`)
        loadContacts()
      }
    } catch (error) {
      message.error('导入失败')
    }
  }

  const handleExport = async () => {
    try {
      const filePath = await window.electronAPI.exportExcel()
      if (filePath) message.success('导出成功')
    } catch (error) {
      message.error('导出失败')
    }
  }

  const menuItems = [
    { key: 'import', label: '导入Excel', icon: <DownloadOutlined />, onClick: handleImport },
    { key: 'export', label: '导出Excel', icon: <UploadOutlined />, onClick: handleExport },
    { type: 'divider' as const },
    { key: 'settings', label: '设置', onClick: () => setSettingsVisible(true) }
  ]

  const todayCount = contacts.filter(c => c.isBirthdayToday).length
  const upcomingCount = contacts.filter(c => c.daysUntil !== undefined && c.daysUntil > 0 && c.daysUntil <= 30).length

  const columns: ColumnsType<Contact> = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      ellipsis: true,
      render: (text: string) => (
        <span style={{ fontWeight: 500, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
          <UserOutlined style={{ marginRight: 8, color: 'var(--color-primary)' }} />
          {text}
        </span>
      )
    },
    {
      title: '手机号',
      dataIndex: 'phoneNumber',
      key: 'phoneNumber',
      width: 130,
      ellipsis: true
    },
    {
      title: '生日',
      dataIndex: 'formattedBirthday',
      key: 'birthday',
      width: 130,
      ellipsis: true,
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
      width: 130,
      ellipsis: true,
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
    {
      title: '备注',
      dataIndex: 'remarks',
      key: 'remarks',
      ellipsis: true
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Space size={8}>
          <Button
            type="link"
            size="small"
            onClick={() => handleEdit(record)}
            style={{ color: 'var(--color-primary)' }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除?"
            onConfirm={() => record.id && handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger size="small">
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div style={styles.app}>
      {/* Custom Title Bar */}
      <div style={styles.titleBar}>
        <div style={styles.titleBarLeft}>
          <div style={styles.appIcon}>🎂</div>
          <span style={styles.appTitle}>生日提醒</span>
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
            <Win10Icons.Minimize />
          </button>
          <button
            style={styles.controlButton}
            onClick={handleMaximize}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.15)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            {isMaximized ? <Win10Icons.Restore /> : <Win10Icons.Maximize />}
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
            <Win10Icons.Close />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Header Card */}
        <div style={styles.headerCard} className="fade-in-up">
          <div style={styles.headerTop}>
            <div>
              <h1 style={styles.headerTitle}>
                <span>🎉 联系人列表</span>
              </h1>
              <p style={styles.headerSubtitle}>管理您的朋友和家人的生日</p>
            </div>
            <div style={styles.headerActions}>
              <Button
                icon={<PlusOutlined />}
                style={styles.primaryButton}
                onClick={handleAdd}
              >
                新增联系人
              </Button>
              <Dropdown menu={{ items: menuItems }} placement="bottomRight">
                <Button style={styles.defaultButton}>菜单</Button>
              </Dropdown>
            </div>
          </div>

          {/* Stats Row */}
          <div style={styles.statsRow}>
            <div style={styles.statCard}>
              <div style={styles.statValue}>{contacts.length}</div>
              <div style={styles.statLabel}>总联系人</div>
            </div>
            <div style={{...styles.statCard, cursor: 'pointer'}} onClick={() => window.electronAPI.showTodayBirthdays()}>
              <div style={{...styles.statValue, color: todayCount > 0 ? 'var(--color-primary)' : undefined}}>
                {todayCount}
              </div>
              <div style={styles.statLabel}>今日生日</div>
            </div>
            <div style={{...styles.statCard, cursor: 'pointer'}} onClick={() => window.electronAPI.showUpcomingBirthdays()}>
              <div style={styles.statValue}>{upcomingCount}</div>
              <div style={styles.statLabel}>30天内</div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="搜索姓名、手机号、生日、备注（支持拼音）..."
            prefix={<SearchOutlined style={{ color: '#999' }} />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={handleSearch}
            allowClear
            style={{ width: '100%' }}
          />
        </div>

        {/* Table Card */}
        <div style={styles.tableCard} className="fade-in-up stagger-1">
          <Table
            columns={columns}
            dataSource={filteredContacts}
            rowKey="id"
            loading={loading}
            size="small"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条记录`,
              position: ['bottomCenter']
            }}
            scroll={{ y: 'calc(100vh - 550px)' }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          />
        </div>

        {/* Modal */}
        <Modal
          title={editingContact ? '编辑联系人' : '新增联系人'}
          open={modalVisible}
          onOk={handleSubmit}
          onCancel={() => setModalVisible(false)}
          okText="保存"
          cancelText="取消"
          centered
        >
          <Form form={form} layout="vertical" style={{ marginTop: 20 }}>
            <Form.Item
              name="name"
              label="姓名"
              rules={[{ required: true, message: '请输入姓名' }]}
            >
              <Input placeholder="请输入姓名" prefix={<UserOutlined />} />
            </Form.Item>
            <Form.Item name="phoneNumber" label="手机号">
              <Input placeholder="请输入手机号" />
            </Form.Item>
            <Form.Item
              name="birthday"
              label="生日"
              rules={[{ required: true, message: '请选择生日' }]}
            >
              <DatePicker
                style={{ width: '100%' }}
                placeholder="选择生日"
                format="YYYY-MM-DD"
              />
            </Form.Item>
            <Form.Item name="remarks" label="备注">
              <Input.TextArea rows={3} placeholder="备注信息" />
            </Form.Item>
          </Form>
        </Modal>

        {/* Settings Modal */}
        <Modal
          title="设置"
          open={settingsVisible}
          onCancel={() => setSettingsVisible(false)}
          footer={null}
          centered
          width={500}
        >
          <div style={{ padding: '20px 0' }}>
            {/* WeChat Binding Section */}
            <div style={{ marginBottom: 24, padding: '16px', background: 'var(--color-bg-secondary)', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <WechatOutlined style={{ fontSize: 20, color: '#07C160' }} />
                <span style={{ fontWeight: 600, fontSize: 15 }}>微信推送</span>
                {wechatStatus.bound ? (
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                ) : (
                  <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                )}
              </div>
              
              {!wechatStatus.bound ? (
                <div>
                  <div style={{ color: '#666', fontSize: 13, marginBottom: 12 }}>
                    绑定微信后，每天定时推送生日联系人清单
                  </div>
                  <Button 
                    type="primary" 
                    icon={<WechatOutlined />}
                    onClick={() => setWechatModalVisible(true)}
                  >
                    扫码绑定微信
                  </Button>
                </div>
              ) : (
                <div>
                  <div style={{ color: '#666', fontSize: 13, marginBottom: 12 }}>
                    已绑定微信，每天 {settings.reminderTime} 推送生日提醒
                  </div>
                  <Space>
                    <Button 
                      size="small"
                      onClick={async () => {
                        const result = await window.electronAPI.wechatTestSend()
                        if (result.success) {
                          message.success(result.message || '测试消息已发送')
                        } else {
                          message.error(result.error || '发送失败')
                        }
                      }}
                    >
                      测试推送
                    </Button>
                    <Button 
                      size="small" 
                      danger
                      onClick={async () => {
                        await window.electronAPI.wechatUnbind()
                        setWechatStatus({ bound: false, userId: undefined })
                        message.success('已解除绑定')
                      }}
                    >
                      解除绑定
                    </Button>
                  </Space>
                </div>
              )}
            </div>
            
            <Divider style={{ margin: '16px 0' }} />
            
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontWeight: 500, marginBottom: 8 }}>开机启动</div>
              <Switch
                checked={settings.autoStart}
                onChange={async (checked) => {
                  await window.electronAPI.setAutoStart(checked)
                  setSettings({ ...settings, autoStart: checked })
                  message.success(checked ? '已开启开机启动' : '已关闭开机启动')
                }}
              />
              <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                开机自动启动生日提醒应用
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 500, marginBottom: 8 }}>每日提醒时间</div>
              <TimePicker
                format="HH:mm"
                value={dayjs(settings.reminderTime, 'HH:mm')}
                onChange={async (time) => {
                  if (time) {
                    const timeStr = time.format('HH:mm')
                    await window.electronAPI.setReminderTime(timeStr)
                    setSettings({ ...settings, reminderTime: timeStr })
                    message.success(`提醒时间已设置为 ${timeStr}`)
                  }
                }}
                style={{ width: 120 }}
              />
              <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                每天定时提醒当日生日联系人（同时也是微信推送时间）
              </div>
            </div>
          </div>
        </Modal>
        
        {/* WeChat QR Code Modal */}
        <Modal
          title="微信扫码绑定"
          open={wechatModalVisible}
          onCancel={() => setWechatModalVisible(false)}
          footer={null}
          centered
          width={400}
        >
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            {!wechatQRCode ? (
              <div>
                <Spin />
                <div style={{ marginTop: 16, color: '#666' }}>正在获取二维码...</div>
              </div>
            ) : !wechatLoginComplete ? (
              <div>
                <img 
                  src={wechatQRCode} 
                  alt="微信扫码二维码" 
                  style={{ width: 250, height: 250, border: '1px solid #eee' }}
                />
                <div style={{ marginTop: 16, color: '#666' }}>
                  请使用微信扫描二维码并在手机上确认授权
                </div>
                <div style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
                  二维码有效期3分钟，请尽快完成
                </div>
              </div>
            ) : (
              <div style={{ padding: '40px 0' }}>
                <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a' }} />
                <div style={{ marginTop: 16, fontSize: 16, fontWeight: 500 }}>
                  绑定成功！
                </div>
                <Button 
                  type="primary" 
                  style={{ marginTop: 24 }}
                  onClick={() => {
                    setWechatModalVisible(false)
                    setWechatStatus({ bound: true, userId: wechatUserId || '' })
                    message.success('微信绑定成功')
                  }}
                >
                  完成
                </Button>
              </div>
            )}
          </div>
        </Modal>
      </div>
    </div>
  )
}

export default App
