using Microsoft.Data.Sqlite;

namespace BirthdayReminder.Services;

/// <summary>
/// 数据库服务
/// </summary>
public class DatabaseService
{
    private readonly string _connectionString;
    private readonly string _dbPath;
    
    public DatabaseService()
    {
        var appDataPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "BirthdayReminder");
        
        Directory.CreateDirectory(appDataPath);
        _dbPath = Path.Combine(appDataPath, "birthday.db");
        _connectionString = $"Data Source={_dbPath}";
        
        InitDatabase();
    }
    
    private void InitDatabase()
    {
        using var connection = new SqliteConnection(_connectionString);
        connection.Open();
        
        var command = connection.CreateCommand();
        command.CommandText = @"
            CREATE TABLE IF NOT EXISTS Contacts (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                Name TEXT NOT NULL,
                PhoneNumber TEXT,
                Birthday TEXT NOT NULL,
                Remarks TEXT,
                CreatedAt TEXT NOT NULL
            );
            
            CREATE TABLE IF NOT EXISTS Settings (
                Key TEXT PRIMARY KEY,
                Value TEXT NOT NULL
            );
        ";
        command.ExecuteNonQuery();
    }
    
    /// <summary>
    /// 获取所有联系人
    /// </summary>
    public List<BirthdayEntry> GetAllContacts()
    {
        var contacts = new List<BirthdayEntry>();
        
        using var connection = new SqliteConnection(_connectionString);
        connection.Open();
        
        var command = connection.CreateCommand();
        command.CommandText = "SELECT * FROM Contacts ORDER BY Birthday";
        
        using var reader = command.ExecuteReader();
        while (reader.Read())
        {
            contacts.Add(new BirthdayEntry
            {
                Id = reader.GetInt32(0),
                Name = reader.GetString(1),
                PhoneNumber = reader.IsDBNull(2) ? null : reader.GetString(2),
                Birthday = DateTime.Parse(reader.GetString(3)),
                Remarks = reader.IsDBNull(4) ? null : reader.GetString(4),
                CreatedAt = DateTime.Parse(reader.GetString(5))
            });
        }
        
        return contacts;
    }
    
    /// <summary>
    /// 添加联系人
    /// </summary>
    public int AddContact(BirthdayEntry entry)
    {
        using var connection = new SqliteConnection(_connectionString);
        connection.Open();
        
        var command = connection.CreateCommand();
        command.CommandText = @"
            INSERT INTO Contacts (Name, PhoneNumber, Birthday, Remarks, CreatedAt)
            VALUES (@name, @phone, @birthday, @remarks, @created);
            SELECT last_insert_rowid();
        ";
        
        command.Parameters.AddWithValue("@name", entry.Name);
        command.Parameters.AddWithValue("@phone", entry.PhoneNumber ?? (object)DBNull.Value);
        command.Parameters.AddWithValue("@birthday", entry.Birthday.ToString("yyyy-MM-dd"));
        command.Parameters.AddWithValue("@remarks", entry.Remarks ?? (object)DBNull.Value);
        command.Parameters.AddWithValue("@created", entry.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss"));
        
        return Convert.ToInt32(command.ExecuteScalar());
    }
    
    /// <summary>
    /// 更新联系人
    /// </summary>
    public void UpdateContact(BirthdayEntry entry)
    {
        using var connection = new SqliteConnection(_connectionString);
        connection.Open();
        
        var command = connection.CreateCommand();
        command.CommandText = @"
            UPDATE Contacts 
            SET Name = @name, PhoneNumber = @phone, Birthday = @birthday, Remarks = @remarks
            WHERE Id = @id
        ";
        
        command.Parameters.AddWithValue("@id", entry.Id);
        command.Parameters.AddWithValue("@name", entry.Name);
        command.Parameters.AddWithValue("@phone", entry.PhoneNumber ?? (object)DBNull.Value);
        command.Parameters.AddWithValue("@birthday", entry.Birthday.ToString("yyyy-MM-dd"));
        command.Parameters.AddWithValue("@remarks", entry.Remarks ?? (object)DBNull.Value);
        
        command.ExecuteNonQuery();
    }
    
    /// <summary>
    /// 删除联系人
    /// </summary>
    public void DeleteContact(int id)
    {
        using var connection = new SqliteConnection(_connectionString);
        connection.Open();
        
        var command = connection.CreateCommand();
        command.CommandText = "DELETE FROM Contacts WHERE Id = @id";
        command.Parameters.AddWithValue("@id", id);
        
        command.ExecuteNonQuery();
    }
    
    /// <summary>
    /// 批量导入联系人
    /// </summary>
    public int ImportContacts(List<BirthdayEntry> entries)
    {
        int count = 0;
        using var connection = new SqliteConnection(_connectionString);
        connection.Open();
        
        using var transaction = connection.BeginTransaction();
        
        try
        {
            foreach (var entry in entries)
            {
                var command = connection.CreateCommand();
                command.Transaction = transaction;
                command.CommandText = @"
                    INSERT INTO Contacts (Name, PhoneNumber, Birthday, Remarks, CreatedAt)
                    VALUES (@name, @phone, @birthday, @remarks, @created)
                ";
                
                command.Parameters.AddWithValue("@name", entry.Name);
                command.Parameters.AddWithValue("@phone", entry.PhoneNumber ?? (object)DBNull.Value);
                command.Parameters.AddWithValue("@birthday", entry.Birthday.ToString("yyyy-MM-dd"));
                command.Parameters.AddWithValue("@remarks", entry.Remarks ?? (object)DBNull.Value);
                command.Parameters.AddWithValue("@created", DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"));
                
                command.ExecuteNonQuery();
                count++;
            }
            
            transaction.Commit();
        }
        catch
        {
            transaction.Rollback();
            throw;
        }
        
        return count;
    }
    
    /// <summary>
    /// 获取设置值
    /// </summary>
    public string? GetSetting(string key)
    {
        using var connection = new SqliteConnection(_connectionString);
        connection.Open();
        
        var command = connection.CreateCommand();
        command.CommandText = "SELECT Value FROM Settings WHERE Key = @key";
        command.Parameters.AddWithValue("@key", key);
        
        var result = command.ExecuteScalar();
        return result?.ToString();
    }
    
    /// <summary>
    /// 设置值
    /// </summary>
    public void SetSetting(string key, string value)
    {
        using var connection = new SqliteConnection(_connectionString);
        connection.Open();
        
        var command = connection.CreateCommand();
        command.CommandText = @"
            INSERT INTO Settings (Key, Value) VALUES (@key, @value)
            ON CONFLICT(Key) DO UPDATE SET Value = @value
        ";
        
        command.Parameters.AddWithValue("@key", key);
        command.Parameters.AddWithValue("@value", value);
        
        command.ExecuteNonQuery();
    }
    
    /// <summary>
    /// 获取今日生日的人
    /// </summary>
    public List<BirthdayEntry> GetTodayBirthdays()
    {
        var today = DateTime.Today;
        var month = today.Month;
        var day = today.Day;
        
        var contacts = new List<BirthdayEntry>();
        
        using var connection = new SqliteConnection(_connectionString);
        connection.Open();
        
        var command = connection.CreateCommand();
        command.CommandText = "SELECT * FROM Contacts";
        
        using var reader = command.ExecuteReader();
        while (reader.Read())
        {
            var birthday = DateTime.Parse(reader.GetString(3));
            if (birthday.Month == month && birthday.Day == day)
            {
                contacts.Add(new BirthdayEntry
                {
                    Id = reader.GetInt32(0),
                    Name = reader.GetString(1),
                    PhoneNumber = reader.IsDBNull(2) ? null : reader.GetString(2),
                    Birthday = birthday,
                    Remarks = reader.IsDBNull(4) ? null : reader.GetString(4),
                    CreatedAt = DateTime.Parse(reader.GetString(5))
                });
            }
        }
        
        return contacts;
    }
}