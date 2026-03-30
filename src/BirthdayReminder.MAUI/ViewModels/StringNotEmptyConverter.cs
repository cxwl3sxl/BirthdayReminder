using System.Globalization;

namespace BirthdayReminder.MAUI.ViewModels;

/// <summary>
/// 字符串非空转换器（用于控制控件的 IsVisible）
/// </summary>
public class StringNotEmptyConverter : IValueConverter
{
    public static readonly StringNotEmptyConverter Instance = new();

    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        return value is string str && !string.IsNullOrWhiteSpace(str);
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
        => throw new NotImplementedException();
}
