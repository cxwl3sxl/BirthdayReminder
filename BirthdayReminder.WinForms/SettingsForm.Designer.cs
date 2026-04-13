using System.Drawing;
using System.Windows.Forms;

namespace BirthdayReminder;

public partial class SettingsForm
{
    private System.ComponentModel.IContainer components = null;
    
    private TabControl tabControl;
    private TabPage tabGeneral;
    private TabPage tabNotification;
    private TabPage tabAbout;
    
    private CheckBox chkAutoStart;
    private Label lblAutoStart;
    private Label lblAutoStartDesc;
    
    private Label lblRemindTime;
    private DateTimePicker dtpRemindTime;
    private Label lblRemindTimeDesc;
    
    private Label lblAbout;
    private Label lblVersion;
    
    private Button btnSave;
    private Button btnCancel;
    
    private void InitializeComponent()
    {
        this.tabControl = new TabControl();
        this.tabGeneral = new TabPage("常规设置");
        this.tabNotification = new TabPage("通知设置");
        this.tabAbout = new TabPage("关于");
        
        this.chkAutoStart = new CheckBox();
        this.chkAutoStart.AutoSize = true;
        this.chkAutoStart.Location = new Point(20, 20);
        this.chkAutoStart.Font = new Font("Microsoft YaHei", 10F);
        this.chkAutoStart.TabIndex = 0;
        
        this.lblAutoStart = new Label();
        this.lblAutoStart.AutoSize = true;
        this.lblAutoStart.Location = new Point(40, 20);
        this.lblAutoStart.Font = new Font("Microsoft YaHei", 10F, FontStyle.Bold);
        this.lblAutoStart.Text = "开机自动启动";
        
        this.lblAutoStartDesc = new Label();
        this.lblAutoStartDesc.AutoSize = true;
        this.lblAutoStartDesc.Location = new Point(40, 45);
        this.lblAutoStartDesc.Font = new Font("Microsoft YaHei", 9F);
        this.lblAutoStartDesc.ForeColor = Color.Gray;
        this.lblAutoStartDesc.Text = "程序将在 Windows 启动时自动运行";
        
        this.lblRemindTime = new Label();
        this.lblRemindTime.AutoSize = true;
        this.lblRemindTime.Location = new Point(20, 90);
        this.lblRemindTime.Font = new Font("Microsoft YaHei", 10F, FontStyle.Bold);
        this.lblRemindTime.Text = "每日提醒时间";
        
        this.dtpRemindTime = new DateTimePicker();
        this.dtpRemindTime.Format = DateTimePickerFormat.Time;
        this.dtpRemindTime.Location = new Point(40, 115);
        this.dtpRemindTime.ShowUpDown = true;
        this.dtpRemindTime.Size = new Size(120, 25);
        this.dtpRemindTime.TabIndex = 1;
        
        this.lblRemindTimeDesc = new Label();
        this.lblRemindTimeDesc.AutoSize = true;
        this.lblRemindTimeDesc.Location = new Point(170, 120);
        this.lblRemindTimeDesc.Font = new Font("Microsoft YaHei", 9F);
        this.lblRemindTimeDesc.ForeColor = Color.Gray;
        this.lblRemindTimeDesc.Text = "每天提醒检查生日的时间";
        
        this.lblAbout = new Label();
        this.lblAbout.AutoSize = false;
        this.lblAbout.Location = new Point(20, 20);
        this.lblAbout.Size = new Size(350, 80);
        this.lblAbout.Font = new Font("Microsoft YaHei", 10F);
        this.lblAbout.Text = "生日提醒 - 一款简洁的桌面应用程序，用于管理和提醒联系人生日。";
        
        this.lblVersion = new Label();
        this.lblVersion.AutoSize = true;
        this.lblVersion.Location = new Point(20, 110);
        this.lblVersion.Font = new Font("Microsoft YaHei", 9F);
        this.lblVersion.ForeColor = Color.Gray;
        this.lblVersion.Text = "版本 1.0.0";
        
        this.btnSave = new Button();
        this.btnSave.Location = new Point(150, 320);
        this.btnSave.Size = new Size(100, 35);
        this.btnSave.Text = "保存设置";
        this.btnSave.Font = new Font("Microsoft YaHei", 10F);
        this.btnSave.BackColor = Color.FromArgb(66, 133, 244);
        this.btnSave.ForeColor = Color.White;
        this.btnSave.FlatStyle = FlatStyle.Flat;
        this.btnSave.TabIndex = 10;
        this.btnSave.Click += new System.EventHandler(this.btnSave_Click);
        
        this.btnCancel = new Button();
        this.btnCancel.Location = new Point(260, 320);
        this.btnCancel.Size = new Size(100, 35);
        this.btnCancel.Text = "取消";
        this.btnCancel.Font = new Font("Microsoft YaHei", 10F);
        this.btnCancel.TabIndex = 11;
        this.btnCancel.Click += new System.EventHandler(this.btnCancel_Click);
        
        this.tabGeneral.Controls.Add(this.chkAutoStart);
        this.tabGeneral.Controls.Add(this.lblAutoStart);
        this.tabGeneral.Controls.Add(this.lblAutoStartDesc);
        
        this.tabNotification.Controls.Add(this.lblRemindTime);
        this.tabNotification.Controls.Add(this.dtpRemindTime);
        this.tabNotification.Controls.Add(this.lblRemindTimeDesc);
        
        this.tabAbout.Controls.Add(this.lblAbout);
        this.tabAbout.Controls.Add(this.lblVersion);
        
        this.tabControl.Location = new Point(10, 10);
        this.tabControl.Size = new Size(420, 290);
        this.tabControl.TabPages.Add(this.tabGeneral);
        this.tabControl.TabPages.Add(this.tabNotification);
        this.tabControl.TabPages.Add(this.tabAbout);
        
        this.ClientSize = new Size(440, 380);
        this.Controls.Add(this.tabControl);
        this.Controls.Add(this.btnSave);
        this.Controls.Add(this.btnCancel);
        this.FormBorderStyle = FormBorderStyle.FixedDialog;
        this.MaximizeBox = false;
        this.MinimizeBox = false;
        this.StartPosition = FormStartPosition.CenterParent;
        this.Text = "设置";
        this.BackColor = Color.FromArgb(240, 240, 240);
    }
}