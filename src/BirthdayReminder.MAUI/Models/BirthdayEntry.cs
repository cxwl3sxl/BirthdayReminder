namespace BirthdayReminder.MAUI.Models;

/// <summary>
/// 生日记录数据模型
/// </summary>
public class BirthdayEntry
{
    public int Id { get; set; }

    /// <summary>姓名</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>手机号</summary>
    public string PhoneNumber { get; set; } = string.Empty;

    /// <summary>生日（月日）</summary>
    public int BirthdayMonth { get; set; }
    public int BirthdayDay { get; set; }

    /// <summary>完整生日日期（用于排序）</summary>
    public DateTime? BirthdayDate { get; set; }

    /// <summary>最后通知日期（防止重复通知）</summary>
    public DateTime? LastNotifiedDate { get; set; }

    /// <summary>创建时间</summary>
    public DateTime CreatedAt { get; set; } = DateTime.Now;

    /// <summary>备注</summary>
    public string? Remarks { get; set; }

    /// <summary>
    /// 格式化生日显示
    /// </summary>
    public string FormattedBirthday => $"{BirthdayMonth:D2}/{BirthdayDay:D2}";

    /// <summary>
    /// 距离下次生日的天数
    /// </summary>
    public int DaysUntilBirthday
    {
        get
        {
            var today = DateTime.Today;
            var thisYear = new DateTime(today.Year, BirthdayMonth, BirthdayDay);
            var days = (thisYear - today).Days;
            if (days < 0)
            {
                var nextYear = new DateTime(today.Year + 1, BirthdayMonth, BirthdayDay);
                days = (nextYear - today).Days;
            }
            return days;
        }
    }

    /// <summary>
    /// 倒计时显示文本
    /// </summary>
    public string CountdownText
    {
        get
        {
            var days = DaysUntilBirthday;
            return days == 0 ? "🎉 今天！" : $"还有 {days} 天";
        }
    }

    /// <summary>
    /// 倒计时颜色（今天红色，7天内橙色，其他灰色）
    /// </summary>
    public string CountdownColor
    {
        get
        {
            var days = DaysUntilBirthday;
            if (days == 0) return "#F44336";
            if (days <= 7) return "#FF9800";
            return "#9E9E9E";
        }
    }

    /// <summary>
    /// 判断今天是否是生日
    /// </summary>
    public bool IsBirthdayToday()
    {
        var today = DateTime.Today;
        return BirthdayMonth == today.Month && BirthdayDay == today.Day;
    }
}
