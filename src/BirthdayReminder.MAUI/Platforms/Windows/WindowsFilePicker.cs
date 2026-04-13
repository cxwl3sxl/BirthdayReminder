using Microsoft.UI.Xaml;
using Windows.Storage.Pickers;
using WinRT.Interop;
using BirthdayReminder.MAUI.Services;

namespace BirthdayReminder.MAUI.Platforms.Windows;

/// <summary>
/// Windows 原生文件选择器服务
/// </summary>
public static class WindowsFilePicker
{
    /// <summary>
    /// 打开文件选择对话框
    /// </summary>
    public static async Task<string?> PickFileAsync(string title, params string[] fileTypes)
    {
        ConsoleLogger.Log($"[WindowsFilePicker] 开始选择文件: {title}");
        
        var openPicker = new FileOpenPicker
        {
            ViewMode = PickerViewMode.List,
            SuggestedStartLocation = PickerLocationId.DocumentsLibrary
        };

        foreach (var ext in fileTypes)
        {
            openPicker.FileTypeFilter.Add(ext);
        }

        // 获取当前活动窗口句柄
        var hwnd = GetActiveWindow();
        ConsoleLogger.Log($"[WindowsFilePicker] 窗口句柄: {hwnd}");
        if (hwnd != IntPtr.Zero)
        {
            InitializeWithWindow.Initialize(openPicker, hwnd);
        }

        var file = await openPicker.PickSingleFileAsync();
        ConsoleLogger.Log($"[WindowsFilePicker] 选择结果: {file?.Path}");
        return file?.Path;
    }

    [System.Runtime.InteropServices.DllImport("user32.dll")]
    private static extern IntPtr GetActiveWindow();
}
