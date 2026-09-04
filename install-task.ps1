# ============================================
# MACCAN RMS - Register Auto-Start Task
# Run this ONCE to install the scheduled task
# ============================================

$TaskName = "MACCAN-RMS-AutoStart"
$TaskDescription = "Automatically start MACCAN Restaurant POS (backend + frontend) on boot"
$ScriptPath = "C:\Users\soley\OneDrive\Desktop\Maccan Kitchen\maccan-rms\auto-start.bat"

# Remove existing task if it exists
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Removing existing task..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# Create action: run the batch file
$Action = New-ScheduledTaskAction `
    -Execute "cmd.exe" `
    -Argument "/c `"$ScriptPath`"" `
    -WorkingDirectory "C:\Users\soley\OneDrive\Desktop\Maccan Kitchen\maccan-rms"

# Create trigger: on system startup
$Trigger = New-ScheduledTaskTrigger -AtStartup

# Create principal: run as current user, with highest privileges
$Principal = New-ScheduledTaskPrincipal `
    -UserId "$env:USERDOMAIN\$env:USERNAME" `
    -LogonType ServiceAccount `
    -RunLevel Highest

# Create settings
$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit (New-TimeSpan -Hours 1)

# Register the task
Register-ScheduledTask `
    -TaskName $TaskName `
    -Description $TaskDescription `
    -Action $Action `
    -Trigger $Trigger `
    -Principal $Principal `
    -Settings $Settings `
    -Force

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " MACCAN RMS auto-start task installed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Task Name:    $TaskName"
Write-Host "Trigger:      On system startup"
Write-Host "Script:       $ScriptPath"
Write-Host ""
Write-Host "The app will now start automatically when you log in." -ForegroundColor Cyan
Write-Host "To remove:    Unregister-ScheduledTask -TaskName '$TaskName'" -ForegroundColor Yellow
Write-Host ""
