namespace BirthdayReminder.MAUI.Services;

/// <summary>
/// 控制台日志服务
/// </summary>
public static class ConsoleLogger
{
    private static readonly string _logFilePath;
    private static readonly object _lock = new();
    
    static ConsoleLogger()
    {
        // 日志文件放在桌面
        var desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);
        _logFilePath = Path.Combine(desktopPath, "BirthdayReminder.log");
    }
    
    public static void Log(string message)
    {
        var timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff");
        var logMessage = $"[{timestamp}] {message}";
        
        // 输出到控制台（如果有控制台）
        Console.WriteLine(logMessage);
        
        // 写入日志文件
        WriteToFile(logMessage);
        
        // 同时输出到调试控制台
        System.Diagnostics.Debug.WriteLine(logMessage);
    }

    public static void LogError(string message, Exception? ex = null)
    {
        var errorMessage = ex != null ? $"{message}: {ex.Message}\n{ex.StackTrace}" : message;
        Log($"[ERROR] {errorMessage}");
    }

    public static void LogInfo(string message)
    {
        Log($"[INFO] {message}");
    }

    public static void LogWarning(string message)
    {
        Log($"[WARN] {message}");
    }
    
    private static void WriteToFile(string message)
    {
        try
        {
            lock (_lock)
            {
                File.AppendAllText(_logFilePath, message + Environment.NewLine);
            }
        }
        catch
        {
            // 忽略写入错误
        }
    }
    
    /// <summary>
    /// 获取日志文件路径
    /// </summary>
    public static string GetLogFilePath() => _logFilePath;
    
    /// <summary>
    /// 清空日志
    /// </summary>
    public static void ClearLog()
    {
        try
        {
            lock (_lock)
            {
                if (File.Exists(_logFilePath))
                    File.Delete(_logFilePath);
            }
        }
        catch { }
    }
}