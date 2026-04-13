using Microsoft.Win32;

namespace BirthdayReminder.Services;

/// <summary>
/// 自动启动服务
/// </summary>
public class AutoStartService
{
    private const string AppName = "BirthdayReminder";
    private const string RegistryKey = @"SOFTWARE\Microsoft\Windows\CurrentVersion\Run";
    
    /// <summary>
    /// 检查是否已设置开机自启动
    /// </summary>
    public bool IsAutoStartEnabled()
    {
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(RegistryKey, false);
            return key?.GetValue(AppName) != null;
        }
        catch
        {
            return false;
        }
    }
    
    /// <summary>
    /// 启用开机自启动
    /// </summary>
    public bool EnableAutoStart()
    {
        try
        {
            var exePath = Environment.ProcessPath;
            if (string.IsNullOrEmpty(exePath)) return false;
            
            using var key = Registry.CurrentUser.OpenSubKey(RegistryKey, true);
            key?.SetValue(AppName, $"\"{exePath}\"");
            return true;
        }
        catch
        {
            return false;
        }
    }
    
    /// <summary>
    /// 禁用开机自启动
    /// </summary>
    public bool DisableAutoStart()
    {
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(RegistryKey, true);
            key?.DeleteValue(AppName, false);
            return true;
        }
        catch
        {
            return false;
        }
    }
    
    /// <summary>
    /// 切换开机自启动状态
    /// </summary>
    public bool ToggleAutoStart()
    {
        if (IsAutoStartEnabled())
            return DisableAutoStart();
        else
            return EnableAutoStart();
    }
}