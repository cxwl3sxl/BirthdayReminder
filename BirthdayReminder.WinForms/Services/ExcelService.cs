using OfficeOpenXml;

namespace BirthdayReminder.Services;

/// <summary>
/// Excel 服务
/// </summary>
public class ExcelService
{
    public ExcelService()
    {
        ExcelPackage.LicenseContext = LicenseContext.NonCommercial;
    }
    
    /// <summary>
    /// 导入 Excel 文件
    /// </summary>
    public List<BirthdayEntry> ImportFromExcel(string filePath)
    {
        var entries = new List<BirthdayEntry>();
        
        using var package = new ExcelPackage(new FileInfo(filePath));
        var worksheet = package.Workbook.Worksheets[0];
        
        var rowCount = worksheet.Dimension?.Rows ?? 0;
        
        for (int row = 2; row <= rowCount; row++) // 跳过表头
        {
            try
            {
                var name = worksheet.Cells[row, 1].Value?.ToString()?.Trim();
                if (string.IsNullOrEmpty(name)) continue;
                
                var phone = worksheet.Cells[row, 2].Value?.ToString()?.Trim();
                var birthdayStr = worksheet.Cells[row, 3].Value?.ToString()?.Trim();
                var remarks = worksheet.Cells[row, 4].Value?.ToString()?.Trim();
                
                var birthday = ParseBirthday(birthdayStr);
                if (birthday == null) continue;
                
                entries.Add(new BirthdayEntry
                {
                    Name = name,
                    PhoneNumber = string.IsNullOrEmpty(phone) ? null : phone,
                    Birthday = birthday.Value,
                    Remarks = string.IsNullOrEmpty(remarks) ? null : remarks,
                    CreatedAt = DateTime.Now
                });
            }
            catch
            {
                // 跳过无效行
            }
        }
        
        return entries;
    }
    
    /// <summary>
    /// 导出到 Excel 文件
    /// </summary>
    public void ExportToExcel(string filePath, List<BirthdayEntry> entries)
    {
        using var package = new ExcelPackage();
        var worksheet = package.Workbook.Worksheets.Add("联系人");
        
        // 表头
        worksheet.Cells[1, 1].Value = "姓名";
        worksheet.Cells[1, 2].Value = "手机号";
        worksheet.Cells[1, 3].Value = "生日";
        worksheet.Cells[1, 4].Value = "备注";
        
        // 数据
        for (int i = 0; i < entries.Count; i++)
        {
            var entry = entries[i];
            var row = i + 2;
            
            worksheet.Cells[row, 1].Value = entry.Name;
            worksheet.Cells[row, 2].Value = entry.PhoneNumber;
            worksheet.Cells[row, 3].Value = entry.Birthday.ToString("yyyy-MM-dd");
            worksheet.Cells[row, 4].Value = entry.Remarks;
        }
        
        // 自动列宽
        worksheet.Cells.AutoFitColumns();
        
        package.SaveAs(new FileInfo(filePath));
    }
    
    /// <summary>
    /// 解析生日日期
    /// </summary>
    private DateTime? ParseBirthday(string? birthdayStr)
    {
        if (string.IsNullOrEmpty(birthdayStr)) return null;
        
        birthdayStr = birthdayStr.Trim();
        
        // 尝试多种格式
        string[] formats = { "yyyy-MM-dd", "yyyy/MM/dd", "yyyy.MM.dd", "yyyy/M/d", "yyyy-M-d", "M-d", "M/d", "M-d", "MM-dd", "MM/dd" };
        
        foreach (var format in formats)
        {
            try
            {
                if (DateTime.TryParseExact(birthdayStr, format, null, System.Globalization.DateTimeStyles.None, out var result))
                {
                    // 如果没有年份，设置为 2000 年
                    if (result.Year == 1) result = new DateTime(2000, result.Month, result.Day);
                    return result;
                }
            }
            catch { }
        }
        
        return null;
    }
}