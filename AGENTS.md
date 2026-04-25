# AGENTS.md - Agent Coding Guidelines for BirthdayReminder

## Project Overview

Three-platform birthday tracking app: MAUI (primary), Electron, WinForms.

| Project | Framework | Target | Build |
|---------|-----------|--------|-------|
| `src/BirthdayReminder.MAUI` | .NET MAUI | Windows/Android/iOS | `.\build.ps1` (VS/MSBuild) |
| `BirthdayReminder.Electron` | Electron+React | Desktop | `npm run build:win` |
| `BirthdayReminder.WinForms` | .NET WinForms | Windows | `dotnet build` |

---

## Critical Build Requirements

### MAUI Windows - VS/MSBuild Required

```
dotnet build ❌  # Fails with CS5001 (cannot generate WinUI App.g.cs)
.\build.ps1      ✅  # Uses VS MSBuild
```

**Why**: MAUI Windows uses WinUI entrypoint generation that `dotnet build` cannot handle.

### MAUI Android - CLI-Friendly

```powershell
dotnet build src/BirthdayReminder.MAUI/BirthdayReminder.MAUI.csproj -c Release -f net10.0-android
dotnet publish -p:AndroidPackageFormat=apk --self-contained -o ./publish/android
```

---

## Verified Build Commands

| Platform | Command | Notes |
|----------|---------|-------|
| MAUI Windows | `.\build.ps1` | Requires VS/MSBuild |
| MAUI Android | `dotnet build -f net10.0-android` | CLI works |
| MAUI iOS | VS only | No CLI build |
| Electron | `npm run build:win` | Output: `release/*.exe` |
| WinForms | `dotnet build -c Release` | Simple CLI build |

---

## Project Structure

```
BirthdayReminder/
├── build.ps1                    # MAUI build script (VS/MSBuild wrapper)
├── global.json                   # .NET SDK 9.0.203 (rollForward: latestFeature)
├── src/BirthdayReminder.MAUI/    # Primary - .NET 9 MAUI
│   ├── App.xaml(.cs)            # Entry + birthday check timer
│   ├── MauiProgram.cs          # MAUI builder
│   ├── Models/BirthdayEntry.cs
│   ├── Services/               # EF Core, Excel, Notification
│   ├── ViewModels/MainViewModel.cs
│   └── Views/MainPage.xaml
├── BirthdayReminder.Electron/  # Node 18 + React 18
├── BirthdayReminder.WinForms/  # .NET 9 WinForms
└── .github/workflows/          # CI uses .NET 10.x (compatible)
```

---

## Key Conventions

### Database Locations
- MAUI: `{LocalApplicationData}/BirthdayReminder/birthday.db`
- Electron: `{userData}/birthday.db`
- WinForms: App directory

### Notification Logic
- Check `LastNotifiedDate` prevents duplicates
- Platform-specific: Windows Toast, Android, iOS

### Excel Import
- Auto-detect columns (name, phone, date, remarks)
- Support multiple date formats

---

## Version Matrix

| Component | Version |
|-----------|---------|
| .NET SDK | 9.0.203 (rollForward to 10.x) |
| MAUI Target | net9.0-windows10.0.19041.0 |
| EF Core | 9.0.0 |
| EPPlus | 7.5.2 |
| Node.js | 18+ |
| Electron | 34.x |

---

## CI/CD

- **Workflow**: `.github/workflows/build.yml`
- **Android build**: `dotnet build -f net10.0-android`
- Code quality only on Android (Windows needs VS)
- Uses .NET 10.x SDK (rollForward compatibility)

---

## Important Notes

1. **MAUI Windows requires VS/MSBuild** - `dotnet build` fails
2. **NuGet restore order**: `dotnet workload restore` before `dotnet restore` (MAUI)
3. **CI uses .NET 10.x**: `global.json` rollForward makes this work
4. **Testing**: No test project; verify via debugger

---

## Qwen Settings (`.qwen/settings.json`)

Permissions for VS MSBuild and dotnet commands:
```json
{
  "permissions": {
    "allow": [
      "Bash(powershell *)",
      "Bash(\"c:\\program files\\microsoft visual studio\\2022\\enterprise\\msbuild\\current\\bin\\msbuild.exe\" *)",
      "Bash(dotnet *)"
    ]
  }
}
```