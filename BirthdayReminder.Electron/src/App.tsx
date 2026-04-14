import { useState, useEffect } from 'react'
import { Table, Button, Space, Modal, Form, Input, DatePicker, message, Dropdown, Menu, Popconfirm } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

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
      importExcel: () => Promise<Contact[] | null>
      exportExcel: () => Promise<string | null>
    }
  }
}

function App() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    loadContacts()
  }, [])

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
    { key: 'import', label: '导入Excel', onClick: handleImport },
    { key: 'export', label: '导出Excel', onClick: handleExport },
    { type: 'divider' as const },
    { key: 'settings', label: '设置', onClick: () => message.info('设置功能开发中') }
  ]

  const columns: ColumnsType<Contact> = [
    { title: '姓名', dataIndex: 'name', key: 'name', width: 120 },
    { title: '手机号', dataIndex: 'phoneNumber', key: 'phoneNumber', width: 120 },
    { title: '生日', dataIndex: 'formattedBirthday', key: 'birthday', width: 100 },
    { title: '倒计时', dataIndex: 'countdownText', key: 'countdownText', width: 100,
      render: (text: string, record) => (
        <span style={{ color: record.isBirthdayToday ? '#ff4d4f' : undefined }}>{text}</span>
      )
    },
    { title: '备注', dataIndex: 'remarks', key: 'remarks' },
    { title: '操作', key: 'action', width: 150,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => handleEdit(record)}>编辑</Button>
          <Popconfirm title="确定删除?" onConfirm={() => record.id && handleDelete(record.id)} okText="确定" cancelText="取消">
            <Button type="link" danger size="small">删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div style={{ padding: '24px', minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, padding: '16px 24px', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <h1 style={{ margin: 0, fontSize: 24, color: '#1890ff' }}>🎂 生日提醒</h1>
        <Space>
          <Button type="primary" onClick={handleAdd}>新增</Button>
          <Dropdown menu={{ items: menuItems }}><Button>菜单</Button></Dropdown>
        </Space>
      </div>
      <div style={{ background: '#fff', padding: 24, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Table columns={columns} dataSource={contacts} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />
      </div>
      <Modal title={editingContact ? '编辑联系人' : '新增联系人'} open={modalVisible} onOk={handleSubmit} onCancel={() => setModalVisible(false)} okText="保存" cancelText="取消">
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}><Input placeholder="请输入姓名" /></Form.Item>
          <Form.Item name="phoneNumber" label="手机号"><Input placeholder="请输入手机号" /></Form.Item>
          <Form.Item name="birthday" label="生日" rules={[{ required: true, message: '请选择生日' }]}><DatePicker style={{ width: '100%' }} placeholder="选择生日" /></Form.Item>
          <Form.Item name="remarks" label="备注"><Input.TextArea rows={3} placeholder="备注信息" /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default App