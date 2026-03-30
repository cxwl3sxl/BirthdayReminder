using BirthdayReminder.MAUI.Models;
using Microsoft.EntityFrameworkCore;

namespace BirthdayReminder.MAUI.Services;

/// <summary>
/// 数据库服务
/// </summary>
public class DatabaseService
{
    /// <summary>
    /// 初始化数据库
    /// </summary>
    public async Task InitDatabaseAsync()
    {
        using var context = new AppDbContext();
        await context.Database.EnsureCreatedAsync();
    }

    /// <summary>
    /// 获取所有生日记录
    /// </summary>
    public async Task<List<BirthdayEntry>> GetAllAsync()
    {
        using var context = new AppDbContext();
        return await context.BirthdayEntries
            .OrderBy(e => e.BirthdayMonth)
            .ThenBy(e => e.BirthdayDay)
            .ToListAsync();
    }

    /// <summary>
    /// 添加单条记录
    /// </summary>
    public async Task<BirthdayEntry> AddAsync(BirthdayEntry entry)
    {
        using var context = new AppDbContext();
        context.BirthdayEntries.Add(entry);
        await context.SaveChangesAsync();
        return entry;
    }

    /// <summary>
    /// 批量添加记录
    /// </summary>
    public async Task<int> AddRangeAsync(IEnumerable<BirthdayEntry> entries)
    {
        using var context = new AppDbContext();
        var list = entries.ToList();
        context.BirthdayEntries.AddRange(list);
        await context.SaveChangesAsync();
        return list.Count;
    }

    /// <summary>
    /// 更新记录
    /// </summary>
    public async Task UpdateAsync(BirthdayEntry entry)
    {
        using var context = new AppDbContext();
        context.BirthdayEntries.Update(entry);
        await context.SaveChangesAsync();
    }

    /// <summary>
    /// 删除记录
    /// </summary>
    public async Task DeleteAsync(int id)
    {
        using var context = new AppDbContext();
        var entry = await context.BirthdayEntries.FindAsync(id);
        if (entry != null)
        {
            context.BirthdayEntries.Remove(entry);
            await context.SaveChangesAsync();
        }
    }

    /// <summary>
    /// 获取今天过生日的人
    /// </summary>
    public async Task<List<BirthdayEntry>> GetTodayBirthdaysAsync()
    {
        var today = DateTime.Today;
        using var context = new AppDbContext();
        return await context.BirthdayEntries
            .Where(e => e.BirthdayMonth == today.Month && e.BirthdayDay == today.Day)
            .ToListAsync();
    }

    /// <summary>
    /// 获取即将过生日的人（未来7天）
    /// </summary>
    public async Task<List<BirthdayEntry>> GetUpcomingBirthdaysAsync(int days = 7)
    {
        var today = DateTime.Today;
        using var context = new AppDbContext();
        var all = await context.BirthdayEntries.ToListAsync();

        return all.Where(e =>
        {
            var thisYearBirthday = new DateTime(today.Year, e.BirthdayMonth, e.BirthdayDay);
            var daysUntil = (thisYearBirthday - today).Days;
            if (daysUntil < 0) daysUntil += 365;
            return daysUntil >= 0 && daysUntil <= days;
        }).OrderBy(e =>
        {
            var thisYearBirthday = new DateTime(today.Year, e.BirthdayMonth, e.BirthdayDay);
            var daysUntil = (thisYearBirthday - today).Days;
            return daysUntil < 0 ? daysUntil + 365 : daysUntil;
        }).ToList();
    }

    /// <summary>
    /// 获取记录总数
    /// </summary>
    public async Task<int> GetCountAsync()
    {
        using var context = new AppDbContext();
        return await context.BirthdayEntries.CountAsync();
    }

    /// <summary>
    /// 清空所有记录
    /// </summary>
    public async Task ClearAllAsync()
    {
        using var context = new AppDbContext();
        context.BirthdayEntries.RemoveRange(context.BirthdayEntries);
        await context.SaveChangesAsync();
    }
}
