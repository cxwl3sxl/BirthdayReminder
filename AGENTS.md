# AGENTS.md - Agent Coding Guidelines for BirthdayReminder

## Project Overview

BirthdayReminder is a **multi-platform desktop application** for managing and tracking birthdays. Supports Windows, Android, iOS via multiple implementations:

| Project | Framework | Language | Target | Build Command |
|---------|----------|---------|--------|-------------|
| `BirthdayReminder.MAUI` | .NET MAUI | C# | .NET 9 | `.\build.ps1` or VS |
| `BirthdayReminder.Electron` | Electron | TypeScript/React | Node 18+ | `npm run build` |
| `BirthdayReminder.WinForms` | .NET WinForms | C# | .NET 9 | `dotnet build` |

### Shared Features
- Excel import/export (.xlsx)
- Local SQLite database storage
- Birthday notifications
- Chinese UI text

### Dependencies
- **Excel**: EPPlus 7.5.2
- **Database**: SQLite (EF Core 9.0.0 for MAUI, Microsoft.Data.Sqlite for WinForms, better-sqlite3 for Electron)

---

## Build Commands

### Windows MAUI (`BirthdayReminder.MAUI`)
```powershell
# Recommended - uses VS MSBuild
.\build.ps1

# Or manually
$msbuild = "${env:ProgramFiles}\Microsoft Visual Studio\2022\Enterprise\MSBuild\Current\Bin\MSBuild.exe"
& $msbuild src\BirthdayReminder.MAUI\BirthdayReminder.MAUI.csproj /p:Configuration=Release /restore
```

**CRITICAL**: Windows MAUI build requires Visual Studio/MSBuild. `dotnet build` fails with CS5001 (cannot generate WinUI `App.g.cs` entry point).

### Android MAUI (CLI-friendly)
```powershell
dotnet build src/BirthdayReminder.MAUI/BirthdayReminder.MAUI.csproj -c Release -f net9.0-android --no-restore
dotnet publish src/BirthdayReminder.MAUI/BirthdayReminder.MAUI.csproj -c Release -f net9.0-android -p:AndroidPackageFormat=apk --self-contained -o ./publish/android
```

### Electron (`BirthdayReminder.Electron`)
```powershell
cd BirthdayReminder.Electron
npm install
npm run build:win
# Output: release/*.exe
```

### WinForms (`BirthdayReminder.WinForms`)
```powershell
dotnet build BirthdayReminder.WinForms/BirthdayReminder.csproj -c Release
```

---

## Project Structure

```
BirthdayReminder/
├── AGENTS.md                    # This file
├── BUILD.md                     # Build docs (Chinese)
├── QWEN.md                      # Context docs
├── build.ps1                    # MAUI build script
├── global.json                  # .NET SDK 9.0.203
├── src/BirthdayReminder.MAUI/   # MAUI cross-platform
│   ├── App.xaml(.cs)            # App entry, timer
│   ├── MauiProgram.cs           # MAUI builder
│   ├── Models/BirthdayEntry.cs
│   ├── Services/               # EF Core, Excel, Notification
│   ├── ViewModels/             # MVVM
│   └── Views/                  # XAML
├── BirthdayReminder.Electron/   # Electron + React
│   ├── electron/               # Main/renderer
│   ├── src/                  # React components
│   └── package.json
└── BirthdayReminder.WinForms/     # WinForms
    ├── MainForm.cs
    ├── ContactForm.cs
    ├── Services/
    └── Models/
```

---

## Code Style Guidelines

### C# (.NET projects)
- **File-scoped namespaces**: `namespace BirthdayReminder.MAUI.Services;`
- **Nullable**: Enabled (`<Nullable>enable</Nullable>`)
- **Naming**: PascalCase (public), `_camelCase` (private fields)
- **Async**: Use `async Task<T>`, suffix methods with `Async`
- **Error handling**: Try-catch-finally, Chinese error messages

```csharp
try {
    StatusMessage = "正在加载...";
    _data = await _service.GetAllAsync();
} catch (Exception ex) {
    StatusMessage = $"加载失败: {ex.Message}";
}
```

### TypeScript/React (Electron)
- Use React 18 functional components
- State via `useState`, side effects via `useEffect`
- Chinese UI text

---

## Key Conventions

### Database Location
- MAUI: `{LocalApplicationData}/BirthdayReminder/birthday.db`
- Electron: `{userData}/birthday.db`
- WinForms: Application directory

### Notification Logic
- Check `LastNotifiedDate` to prevent duplicates
- Platform-specific: Windows Toast, Android, iOS

### Excel Import
- Auto-detect columns (name, phone, date, remarks)
- Support multiple date formats
- Parse in background thread (`Task.Run` for MAUI)

---

## CI/CD

GitHub Actions (`.github/workflows/build.yml`):
- **Android build**: MAUI Android via `dotnet build -f net9.0-android`
- **Code quality**: Android-only build check
- .NET 10.x SDK (workflow uses 10.x, repo uses 9.x - works via rollForward)

---

## Important Notes

1. **Windows vs CLI**: MAUI Windows requires VS/MSBuild. Android builds work with `dotnet build`.
2. **SDK version**: `global.json` specifies 9.0.203 but CI workflow uses 10.0.x (compatible via rollForward).
3. **NuGet restore order**: MAUI requires `dotnet workload restore` before NuGet restore.
4. **Electron dependencies**: Needs `electron-builder` for packaging.
5. **Testing**: No dedicated test project; verify manually via debugger.

---

## Version Information

- **.NET SDK**: 9.0.203 (global.json)
- **EF Core**: 9.0.0
- **EPPlus**: 7.5.2
- **Node.js**: 18+ (Electron)