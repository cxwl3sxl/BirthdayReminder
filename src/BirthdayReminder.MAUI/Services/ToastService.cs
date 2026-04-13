namespace BirthdayReminder.MAUI.Services;

/// <summary>
/// Toast 提示服务（跨平台）
/// </summary>
public class ToastService
{
    /// <summary>
    /// 显示 Toast 提示
    /// </summary>
    public async Task ShowToastAsync(string message, ToastDuration duration = ToastDuration.Short)
    {
#if WINDOWS
        await MainThread.InvokeOnMainThreadAsync(() => ShowWindowsToast(message));
#elif ANDROID
        await ShowAndroidToast(message, duration);
#elif IOS || MACCATALYST
        await ShowiOSToast(message);
#endif
        await Task.CompletedTask;
    }

#if WINDOWS
    private void ShowWindowsToast(string message)
    {
        try
        {
            // 清理 emoji，Windows Toast 对某些 emoji 支持不好
            var cleanMessage = CleanEmoji(message);
            
            var toastXml = $@"
<toast duration='short'>
    <visual>
        <binding template='ToastGeneric'>
            <text>{EscapeXml("BirthdayReminder")}</text>
            <text>{EscapeXml(cleanMessage)}</text>
        </binding>
    </visual>
</toast>";

            System.Diagnostics.Debug.WriteLine($"[Toast] XML: {toastXml}");

            var xmlDoc = new Windows.Data.Xml.Dom.XmlDocument();
            xmlDoc.LoadXml(toastXml);

            var toast = new Windows.UI.Notifications.ToastNotification(xmlDoc);
            toast.Tag = "BirthdayReminderToast";
            toast.Group = "BirthdayReminder";

            // 使用默认 notifier（不指定 AUMID）
            var notifier = Windows.UI.Notifications.ToastNotificationManager.CreateToastNotifier();
            notifier.Show(toast);
            
            System.Diagnostics.Debug.WriteLine($"[Toast] 已发送: {cleanMessage}");
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[Toast] 显示失败: {ex.Message}");
            System.Diagnostics.Debug.WriteLine($"[Toast] 堆栈: {ex.StackTrace}");
        }
    }

    /// <summary>
    /// 清理可能导致 XML 解析问题的字符
    /// </summary>
    private static string CleanEmoji(string text)
    {
        // 替换常见 emoji 为文字
        return text
            .Replace("✅", "[成功] ")
            .Replace("❌", "[失败] ")
            .Replace("🗑️", "[删除] ")
            .Replace("🎂", "[生日] ")
            .Replace("🔔", "[通知] ")
            .Replace("🔄", "[刷新] ")
            .Replace("📁", "[导入] ")
            .Replace("📤", "[导出] ")
            .Replace("📅", "[检查] ")
            .Replace("➕", "[新增] ");
    }

    private static string EscapeXml(string text) =>
        text.Replace("&", "&amp;")
            .Replace("<", "&lt;")
            .Replace(">", "&gt;")
            .Replace("\"", "&quot;")
            .Replace("'", "&apos;");
#endif

#if ANDROID
    private async Task ShowAndroidToast(string message, ToastDuration duration)
    {
        try
        {
            var context = Android.App.Application.Context;
            var toastDuration = duration == ToastDuration.Long
                ? Android.Widget.ToastLength.Long
                : Android.Widget.ToastLength.Short;

            var toast = Android.Widget.Toast.MakeText(context, message, toastDuration);
            toast.Show();
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Android Toast 显示失败: {ex.Message}");
        }
        await Task.CompletedTask;
    }
#endif

#if IOS || MACCATALYST
    private async Task ShowiOSToast(string message)
    {
        await Task.CompletedTask;
    }
#endif
}

public enum ToastDuration
{
    Short,
    Long
}
