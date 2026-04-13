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
        ConsoleLogger.Log($"[Toast] {message}");
#if WINDOWS
        ShowWindowsToast(message);
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
            var cleanMessage = CleanEmoji(message);
            ConsoleLogger.Log($"[Toast] 尝试显示: {cleanMessage}");
            
            // 使用 Windows 原生 Toast API
            var toastXml = $@"
<toast duration='long'>
    <visual>
        <binding template='ToastGeneric'>
            <text>BirthdayReminder</text>
            <text>{EscapeXmlText(cleanMessage)}</text>
        </binding>
    </visual>
</toast>";

            var xmlDoc = new Windows.Data.Xml.Dom.XmlDocument();
            xmlDoc.LoadXml(toastXml);

            var toast = new Windows.UI.Notifications.ToastNotification(xmlDoc);
            
            // 使用 ToastNotificationManager，传入进程名作为 AUMID
            var appId = System.Diagnostics.Process.GetCurrentProcess().ProcessName;
            ConsoleLogger.Log($"[Toast] 使用 AUMID: {appId}");
            
            var notifier = Windows.UI.Notifications.ToastNotificationManager.CreateToastNotifier(appId);
            notifier.Show(toast);
            
            ConsoleLogger.Log($"[Toast] 发送成功");
        }
        catch (Exception ex)
        {
            ConsoleLogger.LogError($"[Toast] 发送失败", ex);
        }
    }

    /// <summary>
    /// 转义 XML 特殊字符
    /// </summary>
    private static string EscapeXmlText(string text) =>
        text.Replace("&", "&amp;")
            .Replace("<", "&lt;")
            .Replace(">", "&gt;")
            .Replace("\"", "&quot;")
            .Replace("'", "&apos;");

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
