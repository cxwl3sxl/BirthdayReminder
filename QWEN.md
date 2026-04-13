# BirthdayReminder - QWEN Context

## Project Overview

**BirthdayReminder** is a cross-platform desktop/mobile application built with **.NET MAUI** (.NET 10) that helps users manage and track birthdays. The app allows importing birthday data from Excel files, storing them in a local SQLite database, and automatically sending system notifications when someone's birthday arrives.

### Key Features
- **Excel Import/Export**: Import birthday data from `.xlsx` files with automatic column detection
- **Local Database**: SQLite storage using Entity Framework Core
- **Birthday Notifications**: Cross-platform notifications (Windows Toast, Android, iOS)
- **Auto-check Timer**: Checks birthdays every hour and on app resume
- **Search & Filter**: Search contacts by name, phone, or remarks
- **CRUD Operations**: Add, edit, delete birthday entries
- **Countdown Display**: Shows days until next birthday with color coding

### Tech Stack
- **Framework**: .NET MAUI (.NET 10)
- **Database**: SQLite + Entity Framework Core (`Microsoft.EntityFrameworkCore.Sqlite` 10.0.0)
- **Excel Processing**: EPPlus 7.5.2
- **Logging**: Microsoft.Extensions.Logging.Debug
- **Target Platforms**: Windows 10+, Android 21+, iOS 15+, Mac Catalyst 15+

## Project Structure

```
BirthdayReminder/
├── BUILD.md                          # Build instructions (Chinese)
├── build.ps1                         # PowerShell build script
├── BirthdayReminder.slnx             # Solution file
├── QWEN.md                           # This file
└── src/
    └── BirthdayReminder.MAUI/
        ├── App.xaml / App.xaml.cs           # App entry, lifecycle, birthday check timer
        ├── MauiProgram.cs                   # MAUI app builder & configuration
        ├── BirthdayReminder.MAUI.csproj     # Project file
        ├── Models/
        │   └── BirthdayEntry.cs             # Data model for birthday records
        ├── Services/
        │   ├── AppDbContext.cs              # EF Core database context
        │   ├── DatabaseService.cs           # CRUD operations for birthdays
        │   ├── ExcelService.cs              # Excel import/export logic
        │   └── NotificationService.cs       # Cross-platform notification system
        ├── ViewModels/
        │   ├── MainViewModel.cs             # Main page VM with all business logic
        │   └── StringNotEmptyConverter.cs   # Value converter for UI
        ├── Views/
        │   └── MainPage.xaml / .xaml.cs     # Main TabbedPage UI
        ├── Platforms/                       # Platform-specific code (Android, iOS, Windows)
        └── Resources/                       # App icons, fonts, images, splash screen
```

## Building and Running

### Requirements
- **Visual Studio 2022** (recommended) or VS 2022 Preview
- **.NET 10 SDK**
- **MAUI workload** installed
- **Windows App SDK** (for Windows builds)

### Method 1: Visual Studio (Recommended)
1. Open `BirthdayReminder.slnx` or `src/BirthdayReminder.MAUI/BirthdayReminder.MAUI.csproj`
2. Select target framework: `net10.0-windows10.0.19041.0`
3. Press `F5` to run or `Ctrl+Shift+B` to build
4. Output: `bin/Release/net10.0-windows10.0.19041.0/win-x64/`

### Method 2: PowerShell Build Script
```powershell
.\build.ps1              # Standard build
.\build.ps1 -SelfContained  # Self-contained mode
```

### Method 3: Manual MSBuild
```powershell
$msbuild = "${env:ProgramFiles}\Microsoft Visual Studio\2022\Enterprise\MSBuild\Current\Bin\MSBuild.exe"
& $msbuild src\BirthdayReminder.MAUI\BirthdayReminder.MAUI.csproj `
    /p:Configuration=Release `
    /p:TargetFramework=net10.0-windows10.0.19041.0 `
    /p:RuntimeIdentifier=win-x64 `
    /p:WindowsAppSDKSelfContained=true `
    /p:WindowsPackageType=None `
    /restore
```

### Known Limitation
**`dotnet build` CLI limitation**: MAUI Windows projects use platform-specific entrypoint generation (`App.g.cs` via WinUI), which `dotnet build` cannot generate automatically, resulting in `CS5001` errors. **Solution**: Must use Visual Studio or VS MSBuild.

### Output Location
After successful build, executables are in:
```
publish/
├── BirthdayReminder.MAUI.exe    # Main executable
├── *.dll                         # Dependencies
├── BirthdayReminder.MAUI.dll    # Application DLL
└── resources.pri                 # Resource file
```

## Architecture Notes

### Data Flow
1. **User imports Excel** → `ExcelService.ImportFromExcelAsync()` → parses file → returns `List<BirthdayEntry>`
2. **Save to DB** → `DatabaseService.AddRangeAsync()` → EF Core SQLite
3. **Display** → `MainViewModel.RefreshDataAsync()` → populates `ObservableCollection`
4. **Birthday check** → `App.OnStart()` starts 1-hour timer → `NotificationService.CheckAndNotifyTodayBirthdaysAsync()`
5. **Notification** → Platform-specific (Windows Toast, Android Notification, iOS UNNotification)

### Database Schema
- Table: `BirthdayEntries`
- Fields: `Id`, `Name`, `PhoneNumber`, `BirthdayMonth`, `BirthdayDay`, `BirthdayDate`, `LastNotifiedDate`, `CreatedAt`, `Remarks`
- Index: `(BirthdayMonth, BirthdayDay)` for efficient daily lookups
- Location: `{LocalApplicationData}/BirthdayReminder/birthday.db`

### MVVM Pattern
- **Views**: `MainPage.xaml` (TabbedPage)
- **ViewModels**: `MainViewModel` implements `INotifyPropertyChanged`, uses `ObservableCollection`
- **Commands**: `ICommand` properties for all user actions
- **Data Binding**: XAML bindings to ViewModel properties

### Notification Logic
- Checks if `LastNotifiedDate` matches today to prevent duplicate notifications
- Falls back to `DisplayAlertAsync` if platform notification fails
- Requests notification permissions on Android/iOS at startup

## Development Conventions

- **Language**: C# with nullable reference types enabled
- **Naming**: PascalCase for public members, camelCase for private fields (underscore prefix for private fields in VMs)
- **Async**: All I/O operations are async; UI commands use `async void` with try-catch
- **Error Handling**: Debug logging via `System.Diagnostics.Debug.WriteLine`, user-facing errors via `StatusMessage`
- **XML Docs**: Chinese XML doc comments on public APIs and models
- **Resource Management**: `using var` for DbContext instances (short-lived pattern)
