namespace BirthdayReminder;

/// <summary>
/// 联系人实体
/// </summary>
public class BirthdayEntry
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public DateTime Birthday { get; set; }
    public string? Remarks { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    
    /// <summary>
    /// 获取格式化生日（MM-dd）
    /// </summary>
    public string FormattedBirthday => $"{Birthday.Month:D2}-{Birthday.Day:D2}";
    
    /// <summary>
    /// 获取距离下次生日的天数
    /// </summary>
    public int DaysUntilBirthday
    {
        get
        {
            var today = DateTime.Today;
            var thisYearBirthday = new DateTime(today.Year, Birthday.Month, Birthday.Day);
            
            if (thisYearBirthday < today)
                thisYearBirthday = new DateTime(today.Year + 1, Birthday.Month, Birthday.Day);
            
            return (thisYearBirthday - today).Days;
        }
    }
    
    /// <summary>
    /// 获取倒计时文本
    /// </summary>
    public string CountdownText
    {
        get
        {
            var days = DaysUntilBirthday;
            if (days == 0) return "🎂 今天生日!";
            if (days == 1) return "明天生日";
            if (days <= 7) return $"{days}天后";
            if (days <= 30) return $"{days}天后";
            return "";
        }
    }
    
    /// <summary>
    /// 是否今天生日
    /// </summary>
    public bool IsBirthdayToday => Birthday.Month == DateTime.Today.Month && Birthday.Day == DateTime.Today.Day;
}