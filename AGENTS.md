# AGENTS.md - Agent Coding Guidelines for BirthdayReminder

## Project Overview

BirthdayReminder is a .NET MAUI cross-platform application for managing and tracking birthdays. It supports Windows, Android, and iOS with local SQLite database storage and Excel import/export functionality.

- **Language**: C# (.NET 9 + MAUI)
- **Database**: SQLite via Entity Framework Core
- **Excel Processing**: EPPlus 7.5.2
- **Target Framework**: `net9.0-windows10.0.19041.0`
- **Min Windows Version**: Windows 10 (17763)

---

## Build & Test Commands

### Prerequisites
- Visual Studio 2022 with MAUI workload
- .NET 9 SDK
- Windows App SDK

### Build (Recommended - Uses VS MSBuild)
```powershell
# Using provided build script
.\build.ps1

# Self-contained mode
.\build.ps1 -SelfContained
```

### Manual Build
```powershell
$msbuild = "${env:ProgramFiles}\Microsoft Visual Studio\2022\Enterprise\MSBuild\Current\Bin\MSBuild.exe"
& $msbuild src\BirthdayReminder.MAUI\BirthdayReminder.MAUI.csproj `
    /p:Configuration=Release `
    /p:TargetFramework=net9.0-windows10.0.19041.0 `
    /p:RuntimeIdentifier=win-x64 `
    /p:WindowsAppSDKSelfContained=true `
    /p:WindowsPackageType=None `
    /restore
```

### Build for Android (CLI-friendly)
```powershell
dotnet build src/BirthdayReminder.MAUI/BirthdayReminder.MAUI.csproj -c Release -f net9.0-android --no-restore
dotnet publish src/BirthdayReminder.MAUI/BirthdayReminder.MAUI.csproj -c Release -f net9.0-android -p:AndroidPackageFormat=apk --self-contained -o ./publish/android
```

### Important Notes
- **Windows builds require Visual Studio/MSBuild** - `dotnet build` alone cannot generate the WinUI `App.g.cs` entry point (causes CS5001 error)
- Output location: `publish/BirthdayReminder.MAUI.exe`

---

## Code Style Guidelines

### File Organization
- Use **file-scoped namespaces**: `namespace BirthdayReminder.MAUI.Services;`
- One public class per file, matching filename
- Order: using statements → namespace → class definition → fields → properties → constructors → methods

### Naming Conventions
| Element | Convention | Example |
|---------|------------|---------|
| Classes | PascalCase | `DatabaseService` |
| Methods | PascalCase | `GetAllAsync()` |
| Properties | PascalCase | `BirthdayEntries` |
| Private fields | `_camelCase` | `_databaseService` |
| Parameters | camelCase | `entry` |
| Constants | PascalCase | `MaxNameLength` |

### Imports & Using Statements
- Place `System.*` namespaces first, then third-party, then project-specific
- Use implicit usings (enabled in csproj)
- Avoid fully qualified names except when necessary to disambiguate
- Use type aliases for conflicts: `using SDColor = System.Drawing.Color;`

### XML Documentation
Use `/// <summary>` for all public classes and methods:
```csharp
/// <summary>
/// Database service for birthday entry persistence
/// </summary>
public class DatabaseService
{
    /// <summary>
    /// Retrieves all birthday entries ordered by date
    /// </summary>
    /// <returns>List of birthday entries</returns>
    public async Task<List<BirthdayEntry>> GetAllAsync()
```

### Types & Nullable
- **Enable nullable reference types** (project-wide `<Nullable>enable</Nullable>`)
- Use `string?` for potentially null strings
- Use `null` for uninitialized reference types
- Avoid `string.Empty` when `""` suffices for local variables
- Default collection types: `List<T>`, `ObservableCollection<T>`

### Error Handling
- Wrap async operations in try-catch-finally
- Log errors to `StatusMessage` (ViewModel) or `System.Diagnostics.Debug.WriteLine`
- Never swallow exceptions silently
- Provide user-friendly error messages in Chinese

```csharp
try
{
    IsLoading = true;
    StatusMessage = "正在刷新...";
    _allEntries = await _databaseService.GetAllAsync();
}
catch (Exception ex)
{
    StatusMessage = $"刷新失败: {ex.Message}";
}
finally
{
    IsLoading = false;
}
```

### Async/Await Patterns
- Name async methods with `Async` suffix: `RefreshDataAsync()`
- Use `await` for all async operations
- Never use `.Result` or `.Wait()` on tasks
- Use `Task.Run()` for CPU-bound work (Excel processing)

### Dependency Injection
- Services are instantiated directly in ViewModels (no DI container yet)
- Keep services as constructor parameters for future DI compatibility

### MAUI-Specific Guidelines
- Use `Application.Current?.Windows` for cross-platform page access
- Platform-specific code in `Platforms/` folder
- Use `DevicePlatform` enum for platform detection
- XAML files use MVVM bindings with `{Binding}` syntax

### Database (EF Core)
- Use `using var context = new AppDbContext()` pattern
- Always dispose context via `using`
- Use async methods for all database operations
- Store database in app data directory (handled by `AppDbContext`)

### Excel (EPPlus)
- Set `ExcelPackage.LicenseContext = LicenseContext.NonCommercial` in constructor
- Parse in `Task.Run()` to avoid UI blocking
- Support multiple date formats in import

---

## UI Text Language
All user-facing text is in **Chinese**:
- Status messages: "正在加载...", "保存成功"
- Dialogs: "确认删除", "取消"
- Error messages: "导入失败: {ex.Message}"

---

## Common Patterns

### INotifyPropertyChanged Implementation
```csharp
public event PropertyChangedEventHandler? PropertyChanged;

protected bool SetProperty<T>(ref T field, T value, [CallerMemberName] string? propertyName = null)
{
    if (EqualityComparer<T>.Default.Equals(field, value))
        return false;
    field = value;
    PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    return true;
}
```

### Command Pattern (MAUI)
```csharp
public ICommand ImportCommand { get; }
ImportCommand = new Command(async () => await ImportExcelAsync());
```

### Observable Collection Update
```csharp
BirthdayEntries.Clear();
foreach (var entry in _allEntries)
    BirthdayEntries.Add(entry);
```

---

## Project Structure
```
src/BirthdayReminder.MAUI/
├── App.xaml(.cs)           # App entry point
├── ViewModels/             # MVVM ViewModels
├── Views/                  # XAML pages
├── Services/               # Business logic
│   ├── DatabaseService.cs  # SQLite operations
│   ├── ExcelService.cs     # Excel import/export
│   └── NotificationService.cs
├── Models/                 # Data models
├── Platforms/             # Platform-specific code
└── Resources/              # Assets, icons, fonts
```

---

## Testing
- No dedicated test project currently exists
- For development, test manually via VS debugger
- Build verification via `.github/workflows/build.yml` (Android only)

---

## Version Information
- **.NET SDK**: 9.0.203 (see `global.json`)
- **MAUI Version**: Set via MSBuild properties (typically 9.x)
- **EF Core**: 9.0.0
- **EPPlus**: 7.5.2
