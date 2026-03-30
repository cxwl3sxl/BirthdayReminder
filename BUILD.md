# BirthdayReminder 构建指南

## 环境要求

- **Visual Studio 2022**（推荐）或 **Visual Studio 2022 Preview**
- **.NET 10 SDK**
- **MAUI 工作负载**（已安装）
- **Windows App SDK**

## 构建方法

### 方法 1：Visual Studio（推荐）

1. 打开 `BirthdayReminder.slnx` 或 `src/BirthdayReminder.MAUI/BirthdayReminder.MAUI.csproj`
2. 选择目标框架：`net10.0-windows10.0.19041.0`
3. 按 `F5` 运行或 `Ctrl+Shift+B` 构建
4. 输出位置：`bin/Release/net10.0-windows10.0.19041.0/win-x64/`

### 方法 2：命令行（需要 VS MSBuild）

```powershell
# 使用提供的构建脚本
.\build.ps1

# 或自包含模式
.\build.ps1 -SelfContained
```

### 方法 3：手动 MSBuild

```powershell
# 查找 VS MSBuild
$msbuild = "${env:ProgramFiles}\Microsoft Visual Studio\2022\Enterprise\MSBuild\Current\Bin\MSBuild.exe"

# 构建
& $msbuild src\BirthdayReminder.MAUI\BirthdayReminder.MAUI.csproj `
    /p:Configuration=Release `
    /p:TargetFramework=net10.0-windows10.0.19041.0 `
    /p:RuntimeIdentifier=win-x64 `
    /p:WindowsAppSDKSelfContained=true `
    /p:WindowsPackageType=None `
    /restore
```

## 已知限制

**`dotnet build` CLI 限制**：MAUI Windows 项目使用平台特定的入口点生成机制（WinUI 的 `App.g.cs`），`dotnet build` 命令行无法自动生成该文件，会导致 `CS5001` 错误。

**解决方案**：必须使用 Visual Studio 或 VS 的 MSBuild 进行构建。

## 输出文件

构建成功后，可执行文件位于：
```
publish/
├── BirthdayReminder.MAUI.exe    # 主程序
├── *.dll                         # 依赖库
├── BirthdayReminder.MAUI.dll    # 应用 DLL
└── resources.pri                 # 资源文件
```

## 运行要求

- **框架依赖模式**：需要安装 .NET 10 Windows 运行时
- **自包含模式**：无需额外运行时，体积较大 (~150MB)
