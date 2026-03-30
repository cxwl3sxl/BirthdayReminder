# BirthdayReminder 构建脚本
# 需要 Visual Studio 2022 或 Windows App SDK

param(
    [string]$Configuration = "Release",
    [string]$OutputPath = "",
    [switch]$SelfContained = $false
)

$ErrorActionPreference = "Stop"

# 查找 MSBuild
$vsPath = "${env:ProgramFiles}\Microsoft Visual Studio\2022"
$msbuild = Get-ChildItem "$vsPath\*\MSBuild\Current\Bin\MSBuild.exe" -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName

if (-not $msbuild) {
    # 尝试使用 dotnet msbuild
    $msbuild = "dotnet"
    Write-Host "未找到 Visual Studio MSBuild，将使用 dotnet msbuild（可能无法生成 Windows 可执行文件）" -ForegroundColor Yellow
} else {
    Write-Host "找到 MSBuild: $msbuild" -ForegroundColor Green
}

$projectPath = "$PSScriptRoot\src\BirthdayReminder.MAUI\BirthdayReminder.MAUI.csproj"

if (-not $OutputPath) {
    $OutputPath = "$PSScriptRoot\publish"
}

Write-Host "构建配置: $Configuration" -ForegroundColor Cyan
Write-Host "输出目录: $OutputPath" -ForegroundColor Cyan
Write-Host "自包含: $SelfContained" -ForegroundColor Cyan

# 清理输出目录
if (Test-Path $OutputPath) {
    Remove-Item $OutputPath -Recurse -Force
}
New-Item $OutputPath -ItemType Directory -Force | Out-Null

# 构建参数
$buildArgs = @(
    $projectPath
    "/p:Configuration=$Configuration"
    "/p:TargetFramework=net10.0-windows10.0.19041.0"
    "/p:RuntimeIdentifier=win-x64"
    "/p:Platform=x64"
    "/p:WindowsAppSDKSelfContained=$SelfContained"
    "/p:WindowsPackageType=None"
    "/p:OutputPath=$OutputPath"
    "/restore"
    "/verbosity:minimal"
)

Write-Host "开始构建..." -ForegroundColor Green
& $msbuild @buildArgs

if ($LASTEXITCODE -eq 0) {
    Write-Host "构建成功！" -ForegroundColor Green
    Write-Host "可执行文件位置: $OutputPath\BirthdayReminder.MAUI.exe" -ForegroundColor Cyan
} else {
    Write-Host "构建失败，退出码: $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}
