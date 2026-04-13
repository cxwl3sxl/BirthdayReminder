using BirthdayReminder.MAUI.Models;

namespace BirthdayReminder.MAUI.Services;

/// <summary>
/// 系统通知服务（MAUI 跨平台）
/// </summary>
public class NotificationService
{
    private readonly DatabaseService _databaseService;

    public NotificationService(DatabaseService databaseService)
    {
        _databaseService = databaseService;
    }

    /// <summary>
    /// 初始化通知服务（请求权限）
    /// </summary>
    public async Task InitializeAsync()
    {
        await _databaseService.InitDatabaseAsync();

#if ANDROID || IOS
        // 移动端请求通知权限
        var permission = await Permissions.RequestAsync<Permissions.PostNotifications>();
        System.Diagnostics.Debug.WriteLine($"通知权限: {permission}");
#endif
    }

    /// <summary>
    /// 发送生日祝福通知
    /// </summary>
    public async Task SendBirthdayNotificationAsync(BirthdayEntry entry)
    {
        try
        {
            // 检查是否今天已经通知过
            var today = DateTime.Today;
            if (entry.LastNotifiedDate?.Date == today)
            {
                System.Diagnostics.Debug.WriteLine($"{entry.Name} 今天已经通知过，跳过");
                return;
            }

            var title = "🎂 生日快乐！";
            var message = string.IsNullOrWhiteSpace(entry.PhoneNumber)
                ? $"今天是 {entry.Name} 的生日！"
                : $"今天是 {entry.Name} 的生日！联系电话：{entry.PhoneNumber}";

            await SendLocalNotificationAsync(entry.Id, title, message);

            // 更新最后通知时间
            entry.LastNotifiedDate = today;
            await _databaseService.UpdateAsync(entry);

            System.Diagnostics.Debug.WriteLine($"已发送 {entry.Name} 的生日通知");
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"发送通知失败: {ex.Message}");
            throw;
        }
    }

    /// <summary>
    /// 检查并发送今日生日通知
    /// </summary>
    public async Task<int> CheckAndNotifyTodayBirthdaysAsync()
    {
        var birthdays = await _databaseService.GetTodayBirthdaysAsync();

        foreach (var entry in birthdays)
        {
            await SendBirthdayNotificationAsync(entry);
        }

        if (birthdays.Count > 0)
            System.Diagnostics.Debug.WriteLine($"今日共 {birthdays.Count} 位寿星");

        return birthdays.Count;
    }

    /// <summary>
    /// 发送本地通知（跨平台实现）
    /// </summary>
    private async Task SendLocalNotificationAsync(int id, string title, string message)
    {
#if WINDOWS
        await SendWindowsToastAsync(title, message);
#elif ANDROID
        await SendAndroidNotificationAsync(id, title, message);
#elif IOS || MACCATALYST
        await SendiOSNotificationAsync(id, title, message);
#else
        await ShowAlertFallbackAsync(title, message);
#endif
    }

#if WINDOWS
    private async Task SendWindowsToastAsync(string title, string message)
    {
        try
        {
            // 使用 WinRT Toast 通知（Windows 10/11）
            var toastXml = $@"
<toast>
    <visual>
        <binding template='ToastGeneric'>
            <text>{EscapeXml(title)}</text>
            <text>{EscapeXml(message)}</text>
        </binding>
    </visual>
    <audio src='ms-winsoundevent:Notification.Default'/>
</toast>";

            var xmlDoc = new Windows.Data.Xml.Dom.XmlDocument();
            xmlDoc.LoadXml(toastXml);

            var toast = new Windows.UI.Notifications.ToastNotification(xmlDoc);
            toast.Tag = "BirthdayReminder";
            toast.Group = "Birthday";

            var notifier = Windows.UI.Notifications.ToastNotificationManager
                .CreateToastNotifier("BirthdayReminder");
            notifier.Show(toast);

            System.Diagnostics.Debug.WriteLine($"Windows Toast 通知已发送: {title}");
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Windows Toast 失败，回退到弹窗: {ex.Message}");
            await ShowAlertFallbackAsync(title, message);
        }
        await Task.CompletedTask;
    }

    private static string EscapeXml(string text) =>
        text.Replace("&", "&amp;")
            .Replace("<", "&lt;")
            .Replace(">", "&gt;")
            .Replace("\"", "&quot;")
            .Replace("'", "&apos;");
#endif

#if ANDROID
    private async Task SendAndroidNotificationAsync(int id, string title, string message)
    {
        try
        {
            var context = Android.App.Application.Context;

            // 创建通知渠道（Android 8+）
            if (Android.OS.Build.VERSION.SdkInt >= Android.OS.BuildVersionCodes.O)
            {
                var channelId = "birthday_reminder_channel";
                var channelName = "生日提醒";
                var channel = new Android.App.NotificationChannel(
                    channelId, channelName, Android.App.NotificationImportance.High);
                channel.Description = "生日提醒通知";

                var notificationManager = (Android.App.NotificationManager?)
                    context.GetSystemService(Android.Content.Context.NotificationService);
                notificationManager?.CreateNotificationChannel(channel);

                var builder = new AndroidX.Core.App.NotificationCompat.Builder(context, channelId)
                    .SetContentTitle(title)
                    .SetContentText(message)
                    .SetSmallIcon(Android.Resource.Drawable.IcDialogInfo)
                    .SetPriority(AndroidX.Core.App.NotificationCompat.PriorityHigh)
                    .SetAutoCancel(true);

                var notifManager = AndroidX.Core.App.NotificationManagerCompat.From(context);
                notifManager.Notify(id, builder.Build());
            }
            else
            {
                await ShowAlertFallbackAsync(title, message);
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Android 通知失败: {ex.Message}");
            await ShowAlertFallbackAsync(title, message);
        }
    }
#endif

#if IOS || MACCATALYST
    private async Task SendiOSNotificationAsync(int id, string title, string message)
    {
        try
        {
            var content = new UserNotifications.UNMutableNotificationContent
            {
                Title = title,
                Body = message,
                Sound = UserNotifications.UNNotificationSound.Default
            };

            var request = UserNotifications.UNNotificationRequest.FromIdentifier(
                $"birthday_{id}_{DateTime.Now.Ticks}",
                content,
                null); // 立即触发

            var center = UserNotifications.UNUserNotificationCenter.Current;
            await center.AddNotificationRequestAsync(request);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"iOS 通知失败: {ex.Message}");
            await ShowAlertFallbackAsync(title, message);
        }
    }
#endif

    private static async Task ShowAlertFallbackAsync(string title, string message)
    {
        await MainThread.InvokeOnMainThreadAsync(async () =>
        {
            var page = GetCurrentPage();
            if (page != null)
                await page.DisplayAlert(title, message, "确认");
        });
    }

    private static Page? GetCurrentPage()
    {
        if (Application.Current?.Windows is { Count: > 0 } windows)
            return windows[0].Page;
        return null;
    }
}
