using System.Windows.Forms;
using System.Runtime.InteropServices;

namespace BirthdayReminder.Services;

/// <summary>
/// 通知服务 - 右下角弹窗提醒
/// </summary>
public class NotifyService
{
    private NotifyIcon? _notifyIcon;
    private readonly DatabaseService _databaseService;
    private System.Timers.Timer? _dailyTimer;
    private System.Timers.Timer? _birthdayCheckTimer;
    private Form? _mainForm;
    private TimeSpan _remindTime = new TimeSpan(9, 0, 0); // 默认 9:00
    
    public event Action? OnShowBirthdayList; // 点击通知时显示生日清单
    
    public NotifyService(DatabaseService databaseService)
    {
        _databaseService = databaseService;
        LoadRemindTime();
    }
    
    /// <summary>
    /// 初始化通知图标
    /// </summary>
    public void Initialize(Form mainForm)
    {
        _mainForm = mainForm;
        
        _notifyIcon = new NotifyIcon
        {
            Icon = System.Drawing.SystemIcons.Information,
            Visible = true,
            Text = "生日提醒"
        };
        
        _notifyIcon.DoubleClick += (s, e) => OnShowBirthdayList?.Invoke();
        
        // 启动定时检查
        StartTimers();
    }
    
    /// <summary>
    /// 启动定时器
    /// </summary>
    private void StartTimers()
    {
        // 每天定时提醒
        _dailyTimer = new System.Timers.Timer(60000); // 每分钟检查一次
        _dailyTimer.Elapsed += (s, e) => CheckDailyReminder();
        _dailyTimer.Start();
        
        // 启动时检查今日生日
        CheckTodayBirthdays();
    }
    
    /// <summary>
    /// 检查每日提醒
    /// </summary>
    private void CheckDailyReminder()
    {
        var now = DateTime.Now;
        if (now.TimeOfDay >= _remindTime && now.TimeOfDay < _remindTime.Add(TimeSpan.FromMinutes(1)))
        {
            var todayBirthdays = _databaseService.GetTodayBirthdays();
            if (todayBirthdays.Count > 0)
            {
                ShowBirthdayNotification(todayBirthdays.Count);
            }
        }
    }
    
    /// <summary>
    /// 检查今日生日
    /// </summary>
    public void CheckTodayBirthdays()
    {
        var todayBirthdays = _databaseService.GetTodayBirthdays();
        if (todayBirthdays.Count > 0)
        {
            // 启动时显示通知
            ShowBirthdayNotification(todayBirthdays.Count);
        }
    }
    
    /// <summary>
    /// 显示生日通知
    /// </summary>
    private void ShowBirthdayNotification(int count)
    {
        if (_notifyIcon == null) return;
        
        var title = "🎂 今日生日提醒";
        var message = $"今天有 {count} 位联系人过生日！点击查看详情";
        
        _notifyIcon.BalloonTipTitle = title;
        _notifyIcon.BalloonTipText = message;
        _notifyIcon.BalloonTipIcon = ToolTipIcon.Info;
        _notifyIcon.ShowBalloonTip(5000);
        
        // 点击气泡时触发
        _notifyIcon.BalloonTipClicked += (s, e) => OnShowBirthdayList?.Invoke();
    }
    
    /// <summary>
    /// 设置提醒时间
    /// </summary>
    public void SetRemindTime(TimeSpan time)
    {
        _remindTime = time;
        _databaseService.SetSetting("RemindTime", time.ToString());
    }
    
    /// <summary>
    /// 加载提醒时间
    /// </summary>
    private void LoadRemindTime()
    {
        var timeStr = _databaseService.GetSetting("RemindTime");
        if (!string.IsNullOrEmpty(timeStr) && TimeSpan.TryParse(timeStr, out var time))
        {
            _remindTime = time;
        }
    }
    
    /// <summary>
    /// 获取提醒时间
    /// </summary>
    public TimeSpan GetRemindTime() => _remindTime;
    
    /// <summary>
    /// 清理资源
    /// </summary>
    public void Dispose()
    {
        _dailyTimer?.Stop();
        _dailyTimer?.Dispose();
        _birthdayCheckTimer?.Stop();
        _birthdayCheckTimer?.Dispose();
        _notifyIcon?.Dispose();
    }
}