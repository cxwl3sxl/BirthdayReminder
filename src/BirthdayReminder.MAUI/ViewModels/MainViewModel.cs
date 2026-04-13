using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Runtime.CompilerServices;
using System.Windows.Input;
using BirthdayReminder.MAUI.Models;
using BirthdayReminder.MAUI.Services;
using Microsoft.Maui.Controls;

namespace BirthdayReminder.MAUI.ViewModels;

/// <summary>
/// 主视图模型
/// </summary>
public class MainViewModel : INotifyPropertyChanged
{
    private readonly DatabaseService _databaseService;
    private readonly ExcelService _excelService;
    private readonly NotificationService _notificationService;

    public ObservableCollection<BirthdayEntry> BirthdayEntries { get; } = new();
    public ObservableCollection<BirthdayEntry> UpcomingBirthdays { get; } = new();
    public ObservableCollection<BirthdayEntry> FilteredEntries { get; } = new();

    private List<BirthdayEntry> _allEntries = new();

    private bool _isLoading;
    private string _statusMessage = "准备就绪";
    private int _totalCount;
    private int _todayCount;
    private int _upcomingCount;
    private string _searchText = string.Empty;

    public bool IsLoading
    {
        get => _isLoading;
        set => SetProperty(ref _isLoading, value);
    }

    public string StatusMessage
    {
        get => _statusMessage;
        set => SetProperty(ref _statusMessage, value);
    }

    public int TotalCount
    {
        get => _totalCount;
        set => SetProperty(ref _totalCount, value);
    }

    public int TodayCount
    {
        get => _todayCount;
        set => SetProperty(ref _todayCount, value);
    }

    public int UpcomingCount
    {
        get => _upcomingCount;
        set => SetProperty(ref _upcomingCount, value);
    }

    public string SearchText
    {
        get => _searchText;
        set
        {
            if (SetProperty(ref _searchText, value))
                ApplyFilter();
        }
    }

    public ICommand ImportCommand { get; }
    public ICommand RefreshCommand { get; }
    public ICommand DeleteCommand { get; }
    public ICommand EditCommand { get; }
    public ICommand AddCommand { get; }
    public ICommand ExportCommand { get; }
    public ICommand SendTestNotificationCommand { get; }
    public ICommand CheckTodayCommand { get; }
    public ICommand ClearSearchCommand { get; }

    public MainViewModel()
    {
        _databaseService = new DatabaseService();
        _excelService = new ExcelService();
        _notificationService = new NotificationService(_databaseService);

        ImportCommand = new Command(async () => await ImportExcelAsync());
        RefreshCommand = new Command(async () => await RefreshDataAsync());
        DeleteCommand = new Command<BirthdayEntry>(async (entry) => await DeleteEntryAsync(entry));
        EditCommand = new Command<BirthdayEntry>(async (entry) => await EditEntryAsync(entry));
        AddCommand = new Command(async () => await AddEntryAsync());
        ExportCommand = new Command(async () => await ExportExcelAsync());
        SendTestNotificationCommand = new Command(async () => await SendTestNotificationAsync());
        CheckTodayCommand = new Command(async () => await CheckTodayBirthdaysAsync());
        ClearSearchCommand = new Command(() => SearchText = string.Empty);

        // 初始化
        _ = InitializeAsync();
    }

    private async Task InitializeAsync()
    {
        try
        {
            IsLoading = true;
            StatusMessage = "正在初始化...";

            await _notificationService.InitializeAsync();
            await RefreshDataAsync();

            StatusMessage = "初始化完成";
        }
        catch (Exception ex)
        {
            StatusMessage = $"初始化失败: {ex.Message}";
        }
        finally
        {
            IsLoading = false;
        }
    }

    public async Task RefreshDataAsync()
    {
        try
        {
            IsLoading = true;
            StatusMessage = "正在刷新...";

            _allEntries = await _databaseService.GetAllAsync();
            var upcoming = await _databaseService.GetUpcomingBirthdaysAsync(7);
            var today = await _databaseService.GetTodayBirthdaysAsync();

            BirthdayEntries.Clear();
            foreach (var entry in _allEntries)
                BirthdayEntries.Add(entry);

            ApplyFilter();

            UpcomingBirthdays.Clear();
            foreach (var entry in upcoming)
                UpcomingBirthdays.Add(entry);

            TotalCount = _allEntries.Count;
            TodayCount = today.Count;
            UpcomingCount = upcoming.Count;

            StatusMessage = $"共 {TotalCount} 条记录，今日 {TodayCount} 位寿星";
        }
        catch (Exception ex)
        {
            StatusMessage = $"刷新失败: {ex.Message}";
        }
        finally
        {
            IsLoading = false;
        }
    }

    private void ApplyFilter()
    {
        FilteredEntries.Clear();
        var keyword = _searchText?.Trim() ?? string.Empty;

        var filtered = string.IsNullOrEmpty(keyword)
            ? _allEntries
            : _allEntries.Where(e =>
                e.Name.Contains(keyword, StringComparison.OrdinalIgnoreCase) ||
                e.PhoneNumber.Contains(keyword, StringComparison.OrdinalIgnoreCase) ||
                (e.Remarks != null && e.Remarks.Contains(keyword, StringComparison.OrdinalIgnoreCase))
            ).ToList();

        foreach (var entry in filtered)
            FilteredEntries.Add(entry);
    }

    public async Task ImportExcelAsync()
    {
        try
        {
            IsLoading = true;
            StatusMessage = "请选择 Excel 文件...";

            var result = await FilePicker.PickAsync(new PickOptions
            {
                PickerTitle = "选择生日 Excel 文件",
                FileTypes = new FilePickerFileType(
                    new Dictionary<DevicePlatform, IEnumerable<string>>
                    {
                        { DevicePlatform.WinUI, new[] { ".xlsx" } },
                        { DevicePlatform.Android, new[] { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" } },
                        { DevicePlatform.iOS, new[] { "com.microsoft.excel.xlsx" } },
                        { DevicePlatform.MacCatalyst, new[] { "com.microsoft.excel.xlsx" } },
                    })
            });

            if (result == null)
            {
                StatusMessage = "取消选择";
                return;
            }

            StatusMessage = $"正在导入: {result.FileName}";
            var entries = await _excelService.ImportFromExcelAsync(result.FullPath);

            if (entries.Count == 0)
            {
                StatusMessage = "未找到有效数据";
                return;
            }

            var count = await _databaseService.AddRangeAsync(entries);
            await RefreshDataAsync();

            StatusMessage = $"成功导入 {count} 条记录";
        }
        catch (Exception ex)
        {
            StatusMessage = $"导入失败: {ex.Message}";
        }
        finally
        {
            IsLoading = false;
        }
    }

    /// <summary>
    /// 手动新增联系人
    /// </summary>
    public async Task AddEntryAsync()
    {
        var page = GetCurrentPage();
        if (page == null) return;

        try
        {
            var name = await page.DisplayPromptAsync(
                "新增联系人", "请输入姓名：", "下一步", "取消",
                placeholder: "姓名", maxLength: 50);

            if (string.IsNullOrWhiteSpace(name)) return;

            var phone = await page.DisplayPromptAsync(
                "新增联系人", "请输入手机号（可选）：", "下一步", "跳过",
                placeholder: "手机号", maxLength: 20, keyboard: Keyboard.Telephone);

            var birthdayStr = await page.DisplayPromptAsync(
                "新增联系人", "请输入生日（格式如 3/15 或 3-15）：", "保存", "取消",
                placeholder: "月/日，如 3/15", maxLength: 10);

            if (string.IsNullOrWhiteSpace(birthdayStr)) return;

            var parts = birthdayStr.Trim().Split('/', '-', '.');
            if (parts.Length < 2 ||
                !int.TryParse(parts[0], out var month) ||
                !int.TryParse(parts[1], out var day) ||
                month < 1 || month > 12 || day < 1 || day > 31)
            {
                StatusMessage = "生日格式不正确，请使用 月/日 格式（如 3/15）";
                return;
            }

            var remarks = await page.DisplayPromptAsync(
                "新增联系人", "备注（可选）：", "保存", "跳过",
                placeholder: "备注信息", maxLength: 200);

            var entry = new BirthdayEntry
            {
                Name = name.Trim(),
                PhoneNumber = phone?.Trim() ?? string.Empty,
                BirthdayMonth = month,
                BirthdayDay = day,
                BirthdayDate = new DateTime(2000, month, day),
                Remarks = string.IsNullOrWhiteSpace(remarks) ? null : remarks.Trim(),
                CreatedAt = DateTime.Now
            };

            await _databaseService.AddAsync(entry);
            await RefreshDataAsync();
            StatusMessage = $"已新增联系人：{entry.Name}";
        }
        catch (Exception ex)
        {
            StatusMessage = $"新增失败: {ex.Message}";
        }
    }

    /// <summary>
    /// 编辑联系人
    /// </summary>
    public async Task EditEntryAsync(BirthdayEntry entry)
    {
        if (entry == null) return;
        var page = GetCurrentPage();
        if (page == null) return;

        try
        {
            var name = await page.DisplayPromptAsync(
                "编辑联系人", "姓名：", "下一步", "取消",
                initialValue: entry.Name, maxLength: 50);

            if (string.IsNullOrWhiteSpace(name)) return;

            var phone = await page.DisplayPromptAsync(
                "编辑联系人", "手机号：", "下一步", "跳过",
                initialValue: entry.PhoneNumber, maxLength: 20, keyboard: Keyboard.Telephone);

            var birthdayStr = await page.DisplayPromptAsync(
                "编辑联系人", "生日（月/日）：", "下一步", "取消",
                initialValue: $"{entry.BirthdayMonth}/{entry.BirthdayDay}", maxLength: 10);

            if (string.IsNullOrWhiteSpace(birthdayStr)) return;

            var parts = birthdayStr.Trim().Split('/', '-', '.');
            if (parts.Length < 2 ||
                !int.TryParse(parts[0], out var month) ||
                !int.TryParse(parts[1], out var day) ||
                month < 1 || month > 12 || day < 1 || day > 31)
            {
                StatusMessage = "生日格式不正确";
                return;
            }

            var remarks = await page.DisplayPromptAsync(
                "编辑联系人", "备注（可选）：", "保存", "跳过",
                initialValue: entry.Remarks ?? string.Empty, maxLength: 200);

            entry.Name = name.Trim();
            entry.PhoneNumber = phone?.Trim() ?? string.Empty;
            entry.BirthdayMonth = month;
            entry.BirthdayDay = day;
            entry.BirthdayDate = new DateTime(2000, month, day);
            entry.Remarks = string.IsNullOrWhiteSpace(remarks) ? null : remarks.Trim();

            await _databaseService.UpdateAsync(entry);
            await RefreshDataAsync();
            StatusMessage = $"已更新联系人：{entry.Name}";
        }
        catch (Exception ex)
        {
            StatusMessage = $"编辑失败: {ex.Message}";
        }
    }

    private async Task DeleteEntryAsync(BirthdayEntry entry)
    {
        if (entry == null) return;
        var page = GetCurrentPage();
        if (page == null) return;

        try
        {
            var confirm = await page.DisplayAlert(
                "确认删除", $"确定要删除 {entry.Name} 吗？", "删除", "取消");

            if (!confirm) return;

            await _databaseService.DeleteAsync(entry.Id);
            _allEntries.Remove(entry);
            BirthdayEntries.Remove(entry);
            UpcomingBirthdays.Remove(entry);
            FilteredEntries.Remove(entry);

            TotalCount--;
            if (entry.IsBirthdayToday())
                TodayCount--;

            StatusMessage = $"已删除 {entry.Name}";
        }
        catch (Exception ex)
        {
            StatusMessage = $"删除失败: {ex.Message}";
        }
    }

    /// <summary>
    /// 导出 Excel
    /// </summary>
    public async Task ExportExcelAsync()
    {
        try
        {
            IsLoading = true;
            StatusMessage = "正在导出...";

            var all = await _databaseService.GetAllAsync();
            if (all.Count == 0)
            {
                StatusMessage = "没有数据可导出";
                return;
            }

            var filePath = await _excelService.ExportToExcelAsync(all);
            StatusMessage = $"已导出 {all.Count} 条记录";

            var page = GetCurrentPage();
            if (page != null)
            {
                await page.DisplayAlert(
                    "导出成功",
                    $"文件已保存至：\n{filePath}",
                    "确认");
            }
        }
        catch (Exception ex)
        {
            StatusMessage = $"导出失败: {ex.Message}";
        }
        finally
        {
            IsLoading = false;
        }
    }

    private async Task SendTestNotificationAsync()
    {
        try
        {
            var testEntry = new BirthdayEntry
            {
                Name = "测试用户",
                PhoneNumber = "13800138000",
                BirthdayMonth = DateTime.Today.Month,
                BirthdayDay = DateTime.Today.Day,
                LastNotifiedDate = DateTime.Today.AddDays(-1)
            };

            await _notificationService.SendBirthdayNotificationAsync(testEntry);
            StatusMessage = "测试通知已发送";
        }
        catch (Exception ex)
        {
            StatusMessage = $"测试通知失败: {ex.Message}";
        }
    }

    public async Task CheckTodayBirthdaysAsync()
    {
        try
        {
            IsLoading = true;
            StatusMessage = "正在检查今日生日...";

            var count = await _notificationService.CheckAndNotifyTodayBirthdaysAsync();
            await RefreshDataAsync();

            StatusMessage = count > 0 ? $"今日有 {count} 位寿星，通知已发送！" : "今日暂无生日";
        }
        catch (Exception ex)
        {
            StatusMessage = $"检查失败: {ex.Message}";
        }
        finally
        {
            IsLoading = false;
        }
    }

    public event PropertyChangedEventHandler? PropertyChanged;

    protected bool SetProperty<T>(ref T field, T value, [CallerMemberName] string? propertyName = null)
    {
        if (EqualityComparer<T>.Default.Equals(field, value))
            return false;

        field = value;
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        return true;
    }

    private static Page? GetCurrentPage()
    {
        if (Application.Current?.Windows is { Count: > 0 } windows)
            return windows[0].Page;
        return null;
    }
}
