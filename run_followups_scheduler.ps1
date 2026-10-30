
Set-Location "C:\Users\91626\Desktop\AILeadSalesAgent"

$Python = "C:\Users\91626\Desktop\AILeadSalesAgent\.venv\Scripts\python.exe"
$Manage = ".\backend\manage.py"
$LogDir = ".\logs"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

& $Python $Manage process_followups --dry-run *>> "$LogDir\followups.log"

if ($LASTEXITCODE -ne 0) {
    Add-Content "$LogDir\followups.log" "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Scheduler failed with exit code $LASTEXITCODE"
}
