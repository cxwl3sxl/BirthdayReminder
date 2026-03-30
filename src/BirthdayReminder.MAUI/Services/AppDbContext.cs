using Microsoft.EntityFrameworkCore;
using BirthdayReminder.MAUI.Models;

namespace BirthdayReminder.MAUI.Services;

/// <summary>
/// 数据库上下文
/// </summary>
public class AppDbContext : DbContext
{
    public DbSet<BirthdayEntry> BirthdayEntries { get; set; }

    private readonly string _dbPath;

    public AppDbContext()
    {
        // 数据库文件放在应用数据目录下
        var appData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        var folder = Path.Combine(appData, "BirthdayReminder");

        if (!Directory.Exists(folder))
            Directory.CreateDirectory(folder);

        _dbPath = Path.Combine(folder, "birthday.db");
    }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        optionsBuilder.UseSqlite($"Data Source={_dbPath}");
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<BirthdayEntry>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.PhoneNumber).HasMaxLength(20);
            entity.HasIndex(e => new { e.BirthdayMonth, e.BirthdayDay });
        });
    }
}
