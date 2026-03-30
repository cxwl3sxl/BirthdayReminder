using BirthdayReminder.MAUI.Views;

namespace BirthdayReminder.MAUI;

public partial class App : Application
{
    private System.Timers.Timer? _birthdayCheckTimer;

    public App()
    {
        InitializeComponent();
    }

    protected override Window CreateWindow(IActivationState? activationState)
    {
        return new Window(new MainPage());
    }

    protected override async void OnStart()
    {
        base.OnStart();

        var dbService = new Services.DatabaseService();
        await dbService.InitDatabaseAsync();

        StartBirthdayCheckTimer();
    }

    protected override void OnSleep()
    {
        base.OnSleep();
        _birthdayCheckTimer?.Stop();
    }

    protected override void OnResume()
    {
        base.OnResume();
        _birthdayCheckTimer?.Start();
        CheckBirthdays();
    }

    private void StartBirthdayCheckTimer()
    {
        _birthdayCheckTimer = new System.Timers.Timer(TimeSpan.FromHours(1).TotalMilliseconds);
        _birthdayCheckTimer.Elapsed += (s, e) => CheckBirthdays();
        _birthdayCheckTimer.AutoReset = true;
        _birthdayCheckTimer.Start();
        CheckBirthdays();
    }

    private async void CheckBirthdays()
    {
        try
        {
            var dbService = new Services.DatabaseService();
            var notificationService = new Services.NotificationService(dbService);
            await notificationService.CheckAndNotifyTodayBirthdaysAsync();
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"生日检查失败: {ex.Message}");
        }
    }
}
