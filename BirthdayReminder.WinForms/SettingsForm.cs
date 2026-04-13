using System.Windows.Forms;

namespace BirthdayReminder;

public partial class SettingsForm : Form
{
    private readonly Services.AutoStartService _autoStartService;
    private readonly Services.NotifyService _notifyService;
    
    public SettingsForm(Services.AutoStartService autoStartService, Services.NotifyService notifyService)
    {
        InitializeComponent();
        _autoStartService = autoStartService;
        _notifyService = notifyService;
        
        LoadSettings();
    }
    
    private void LoadSettings()
    {
        chkAutoStart.Checked = _autoStartService.IsAutoStartEnabled();
        dtpRemindTime.Value = DateTime.Today.Add(_notifyService.GetRemindTime());
    }
    
    private void btnSave_Click(object sender, EventArgs e)
    {
        // 保存自动启动
        if (chkAutoStart.Checked)
        {
            _autoStartService.EnableAutoStart();
        }
        else
        {
            _autoStartService.DisableAutoStart();
        }
        
        // 保存提醒时间
        _notifyService.SetRemindTime(dtpRemindTime.Value.TimeOfDay);
        
        MessageBox.Show("设置已保存", "成功", MessageBoxButtons.OK, MessageBoxIcon.Information);
        this.DialogResult = DialogResult.OK;
        this.Close();
    }
    
    private void btnCancel_Click(object sender, EventArgs e)
    {
        this.DialogResult = DialogResult.Cancel;
        this.Close();
    }
}