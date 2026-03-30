using OfficeOpenXml;
using OfficeOpenXml.Style;
using BirthdayReminder.MAUI.Models;
using System.Globalization;
using SDColor = System.Drawing.Color;

namespace BirthdayReminder.MAUI.Services;

/// <summary>
/// Excel 导入/导出服务
/// </summary>
public class ExcelService
{
    public ExcelService()
    {
        // 设置 EPPlus 许可（非商业用途免费）
        ExcelPackage.LicenseContext = LicenseContext.NonCommercial;
    }

    /// <summary>
    /// 从 Excel 文件导入生日数据
    /// </summary>
    public async Task<List<BirthdayEntry>> ImportFromExcelAsync(string filePath)
    {
        var entries = new List<BirthdayEntry>();

        if (!File.Exists(filePath))
            throw new FileNotFoundException("Excel 文件不存在", filePath);

        await Task.Run(() =>
        {
            using var package = new ExcelPackage(new FileInfo(filePath));
            var worksheet = package.Workbook.Worksheets.FirstOrDefault();

            if (worksheet == null)
                throw new InvalidOperationException("Excel 文件中没有工作表");

            var rowCount = worksheet.Dimension?.Rows ?? 0;

            if (rowCount < 2)
                throw new InvalidOperationException("Excel 文件数据为空或格式不正确");

            var headerRow = 1;
            var nameCol = -1;
            var phoneCol = -1;
            var birthdayCol = -1;
            var remarksCol = -1;

            // 读取表头
            for (int col = 1; col <= worksheet.Dimension?.Columns; col++)
            {
                var header = worksheet.Cells[headerRow, col].Text?.Trim().ToLower() ?? "";

                if (header.Contains("姓名") || header.Contains("名字") || header.Contains("name"))
                    nameCol = col;
                else if (header.Contains("手机") || header.Contains("电话") || header.Contains("phone") || header.Contains("tel"))
                    phoneCol = col;
                else if (header.Contains("生日") || header.Contains("出生") || header.Contains("birthday") || header.Contains("birth"))
                    birthdayCol = col;
                else if (header.Contains("备注") || header.Contains("remark") || header.Contains("note"))
                    remarksCol = col;
            }

            // 如果没找到表头，使用默认列顺序（姓名、手机、生日）
            if (nameCol == -1 || phoneCol == -1 || birthdayCol == -1)
            {
                nameCol = 1;
                phoneCol = 2;
                birthdayCol = 3;
                if (worksheet.Dimension?.Columns >= 4)
                    remarksCol = 4;
            }

            // 读取数据行
            for (int row = 2; row <= rowCount; row++)
            {
                try
                {
                    var name = worksheet.Cells[row, nameCol].Text?.Trim() ?? "";
                    var phone = worksheet.Cells[row, phoneCol].Text?.Trim() ?? "";
                    var birthdayText = worksheet.Cells[row, birthdayCol].Text?.Trim() ?? "";
                    var remarks = remarksCol > 0 ? worksheet.Cells[row, remarksCol].Text?.Trim() : null;

                    if (string.IsNullOrWhiteSpace(name))
                        continue;

                    var (month, day) = ParseBirthday(birthdayText);

                    entries.Add(new BirthdayEntry
                    {
                        Name = name,
                        PhoneNumber = phone,
                        BirthdayMonth = month,
                        BirthdayDay = day,
                        BirthdayDate = new DateTime(2000, month, day),
                        Remarks = string.IsNullOrWhiteSpace(remarks) ? null : remarks,
                        CreatedAt = DateTime.Now
                    });
                }
                catch (Exception ex)
                {
                    System.Diagnostics.Debug.WriteLine($"解析第 {row} 行失败: {ex.Message}");
                }
            }
        });

        return entries;
    }

    /// <summary>
    /// 导出生日数据到 Excel 文件
    /// </summary>
    public async Task<string> ExportToExcelAsync(List<BirthdayEntry> entries)
    {
        var exportDir = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
        var fileName = $"生日提醒_{DateTime.Now:yyyyMMdd_HHmmss}.xlsx";
        var filePath = Path.Combine(exportDir, fileName);

        await Task.Run(() =>
        {
            using var package = new ExcelPackage();
            var ws = package.Workbook.Worksheets.Add("生日列表");

            // 表头
            ws.Cells[1, 1].Value = "姓名";
            ws.Cells[1, 2].Value = "手机号";
            ws.Cells[1, 3].Value = "生日";
            ws.Cells[1, 4].Value = "备注";
            ws.Cells[1, 5].Value = "创建时间";

            // 表头样式
            using (var range = ws.Cells[1, 1, 1, 5])
            {
                range.Style.Font.Bold = true;
                range.Style.Fill.PatternType = ExcelFillStyle.Solid;
                range.Style.Fill.BackgroundColor.SetColor(SDColor.FromArgb(233, 30, 99));
                range.Style.Font.Color.SetColor(SDColor.White);
                range.Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
            }

            // 数据行
            for (int i = 0; i < entries.Count; i++)
            {
                var entry = entries[i];
                var row = i + 2;

                ws.Cells[row, 1].Value = entry.Name;
                ws.Cells[row, 2].Value = entry.PhoneNumber;
                ws.Cells[row, 3].Value = $"{entry.BirthdayMonth}/{entry.BirthdayDay}";
                ws.Cells[row, 4].Value = entry.Remarks ?? "";
                ws.Cells[row, 5].Value = entry.CreatedAt.ToString("yyyy-MM-dd");

                // 交替行颜色
                if (i % 2 == 0)
                {
                    using var range = ws.Cells[row, 1, row, 5];
                    range.Style.Fill.PatternType = ExcelFillStyle.Solid;
                    range.Style.Fill.BackgroundColor.SetColor(SDColor.FromArgb(252, 228, 236));
                }
            }

            // 自动列宽
            ws.Cells[ws.Dimension.Address].AutoFitColumns();

            package.SaveAs(new FileInfo(filePath));
        });

        return filePath;
    }

    /// <summary>
    /// 解析生日文本
    /// </summary>
    private (int month, int day) ParseBirthday(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
            throw new FormatException("生日不能为空");

        text = text.Trim();

        string[] formats = {
            "M/d", "M/d/yyyy", "M/d/yy",
            "MM/dd", "MM/dd/yyyy", "MM/dd/yy",
            "yyyy/M/d", "yyyy-MM-dd",
            "d/M", "d/M/yyyy",
            "yyyyMMdd"
        };

        if (DateTime.TryParseExact(text, formats, CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
        {
            return (date.Month, date.Day);
        }

        // 尝试直接提取月日
        var separators = new[] { '-', '/', '.', '年', '月' };
        foreach (var sep in separators)
        {
            var parts = text.Split(sep);
            if (parts.Length >= 2)
            {
                var monthPart = parts[0].TrimEnd('日');
                var dayPart = parts[1].TrimEnd('日');

                if (int.TryParse(monthPart, out var month) && int.TryParse(dayPart, out var day))
                {
                    if (month >= 1 && month <= 12 && day >= 1 && day <= 31)
                        return (month, day);
                }
            }
        }

        throw new FormatException($"无法解析生日日期: {text}");
    }
}
