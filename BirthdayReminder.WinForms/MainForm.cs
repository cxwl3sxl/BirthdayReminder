using System.Windows.Forms;
using BirthdayReminder.Services;

namespace BirthdayReminder;

public partial class MainForm : Form
{
    private readonly DatabaseService _databaseService;
    private readonly ExcelService _excelService;
    private readonly AutoStartService _autoStartService;
    private readonly NotifyService _notifyService;
    
    public MainForm()
    {
        InitializeComponent();
        
        _databaseService = new DatabaseService();
        _excelService = new ExcelService();
        _autoStartService = new AutoStartService();
        _notifyService = new NotifyService(_databaseService);
        
        // 初始化通知
        _notifyService.Initialize(this);
        _notifyService.OnShowBirthdayList += ShowTodayBirthdays;
        _notifyService.OnShowMainWindow += ShowMainWindow;
        _notifyService.OnShowSettings += ShowSettingsForm;
        _notifyService.OnImportExcel += ImportExcel;
        _notifyService.OnExportExcel += ExportExcel;
        _notifyService.OnExit += ExitApp;
        
        // 加载数据
        LoadContacts();
    }
    
    private void ShowMainWindow()
    {
        this.Show();
        this.WindowState = FormWindowState.Normal;
        this.Activate();
    }
    
    private void ShowSettingsForm()
    {
        var form = new SettingsForm(_autoStartService, _notifyService);
        form.ShowDialog();
    }
    
    private void ImportExcel()
    {
        var dialog = new OpenFileDialog
        {
            Filter = "Excel 文件|*.xlsx",
            Title = "选择 Excel 文件"
        };
        
        if (dialog.ShowDialog() == DialogResult.OK)
        {
            try
            {
                var entries = _excelService.ImportFromExcel(dialog.FileName);
                if (entries.Count == 0)
                {
                    MessageBox.Show("未找到有效数据", "提示", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    return;
                }
                
                var count = _databaseService.ImportContacts(entries);
                LoadContacts();
                MessageBox.Show($"成功导入 {count} 条记录", "成功", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"导入失败: {ex.Message}", "错误", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }
    
    private void ExportExcel()
    {
        var dialog = new SaveFileDialog
        {
            Filter = "Excel 文件|*.xlsx",
            Title = "导出 Excel 文件",
            FileName = $"联系人_{DateTime.Now:yyyyMMdd}.xlsx"
        };
        
        if (dialog.ShowDialog() == DialogResult.OK)
        {
            try
            {
                var contacts = _databaseService.GetAllContacts();
                _excelService.ExportToExcel(dialog.FileName, contacts);
                MessageBox.Show("导出成功", "成功", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"导出失败: {ex.Message}", "错误", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }
    
    private void ExitApp()
    {
        _notifyService.Dispose();
        Application.Exit();
    }
    
    private void MainForm_Load(object sender, EventArgs e)
    {
        // 启动时检查今日生日
        var todayBirthdays = _databaseService.GetTodayBirthdays();
        if (todayBirthdays.Count > 0)
        {
            ShowTodayBirthdays();
        }
    }
    
    private void LoadContacts()
    {
        var contacts = _databaseService.GetAllContacts();
        dataGridView1.DataSource = contacts;
        
        // 设置列标题
        if (dataGridView1.Columns.Count > 0)
        {
            dataGridView1.Columns["Id"].Visible = false;
            dataGridView1.Columns["CreatedAt"].Visible = false;
            dataGridView1.Columns["Name"].HeaderText = "姓名";
            dataGridView1.Columns["PhoneNumber"].HeaderText = "手机号";
            dataGridView1.Columns["Birthday"].HeaderText = "生日";
            dataGridView1.Columns["Remarks"].HeaderText = "备注";
            dataGridView1.Columns["FormattedBirthday"].HeaderText = "生日(MM-DD)";
            dataGridView1.Columns["DaysUntilBirthday"].HeaderText = "距生日";
            dataGridView1.Columns["CountdownText"].HeaderText = "倒计时";
            dataGridView1.Columns["IsBirthdayToday"].HeaderText = "今日";
        }
    }
    
#region 联系人操作
    
    private void btnAdd_Click(object sender, EventArgs e)
    {
        var form = new ContactForm();
        if (form.ShowDialog() == DialogResult.OK)
        {
            _databaseService.AddContact(form.Contact);
            LoadContacts();
        }
    }
    
    private void btnEdit_Click(object sender, EventArgs e)
    {
        if (dataGridView1.SelectedRows.Count == 0)
        {
            MessageBox.Show("请选择要编辑的联系人", "提示", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return;
        }
        
        var contact = (BirthdayEntry)dataGridView1.SelectedRows[0].DataBoundItem;
        var form = new ContactForm(contact);
        if (form.ShowDialog() == DialogResult.OK)
        {
            _databaseService.UpdateContact(form.Contact);
            LoadContacts();
        }
    }
    
    private void btnDelete_Click(object sender, EventArgs e)
    {
        if (dataGridView1.SelectedRows.Count == 0)
        {
            MessageBox.Show("请选择要删除的联系人", "提示", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return;
        }
        
        var contact = (BirthdayEntry)dataGridView1.SelectedRows[0].DataBoundItem;
        var result = MessageBox.Show($"确定要删除联系人 \"{contact.Name}\" 吗？", "确认删除", 
            MessageBoxButtons.YesNo, MessageBoxIcon.Question);
        
        if (result == DialogResult.Yes)
        {
            _databaseService.DeleteContact(contact.Id);
            LoadContacts();
        }
    }
    
    private void btnRefresh_Click(object sender, EventArgs e)
    {
        LoadContacts();
    }
    
    #endregion
    
    #region 今日生日
    
    private void btnTodayBirthdays_Click(object sender, EventArgs e)
    {
        ShowTodayBirthdays();
    }
    
    private void ShowTodayBirthdays()
    {
        var todayBirthdays = _databaseService.GetTodayBirthdays();
        
        var form = new TodayBirthdayForm(todayBirthdays);
        form.ShowDialog();
    }
    
    #endregion
    
    #region 设置
    
    private void btnSetRemindTime_Click(object sender, EventArgs e)
    {
        ShowSettingsForm();
    }
    
    #endregion
    
    private void MainForm_FormClosing(object sender, FormClosingEventArgs e)
    {
        // 最小化到托盘而不是退出
        if (e.CloseReason == CloseReason.UserClosing)
        {
            e.Cancel = true;
            this.Hide();
        }
    }
}