param(
  [string]$BaseUrl = "http://localhost:3000/api",
  [string]$XlsxPath = "..\frontend\public\exam-template.xlsx",
  [string]$StaffEmail = "admin@example.com",
  [string]$StaffPassword = "admin123",
  [string]$StudentRegimentalNumber = "STU001",
  [string]$StudentPassword = "student123",
  [string]$ExamTitle = "E2E XLSX Exam",
  [int]$DurationMinutes = 10
)

$ErrorActionPreference = "Stop"

function Write-Step($message) {
  Write-Host ""
  Write-Host "==> $message" -ForegroundColor Cyan
}

function Invoke-ApiJson {
  param(
    [string]$Method,
    [string]$Uri,
    [hashtable]$Headers = @{},
    [object]$Body = $null
  )

  if ($null -eq $Body) {
    return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $Headers
  }

  return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $Headers -ContentType "application/json" -Body ($Body | ConvertTo-Json -Depth 10)
}

try {
  $resolvedXlsx = Resolve-Path $XlsxPath
} catch {
  Write-Host "XLSX file not found: $XlsxPath" -ForegroundColor Red
  Write-Host "Tip: run script from backend folder or pass -XlsxPath explicitly." -ForegroundColor Yellow
  exit 1
}

try {
  Write-Step "1) Staff login"
  $staff = Invoke-ApiJson -Method "Post" -Uri "$BaseUrl/auth/login/staff" -Body @{
    email    = $StaffEmail
    password = $StaffPassword
  }
  $staffToken = $staff.token
  if (-not $staffToken) { throw "Staff token missing in login response." }
  Write-Host "Staff login OK"

  Write-Step "2) Create exam from XLSX"
  $uploadRaw = curl.exe -s -X POST "$BaseUrl/exams/create-from-excel" `
    -H "Authorization: Bearer $staffToken" `
    -F "title=$ExamTitle" `
    -F "duration=$DurationMinutes" `
    -F "file=@$resolvedXlsx"

  $upload = $uploadRaw | ConvertFrom-Json
  if (-not $upload.exam.id) {
    throw "Exam creation failed. Response: $uploadRaw"
  }
  $examId = [int]$upload.exam.id
  Write-Host "Exam created. examId=$examId"

  Write-Step "3) Publish exam"
  $null = Invoke-ApiJson -Method "Patch" -Uri "$BaseUrl/exams/$examId/publish" -Headers @{
    Authorization = "Bearer $staffToken"
  }
  Write-Host "Exam published"

  Write-Step "4) Student login"
  $student = Invoke-ApiJson -Method "Post" -Uri "$BaseUrl/auth/login" -Body @{
    regimentalNumber = $StudentRegimentalNumber
    password         = $StudentPassword
  }
  $studentToken = $student.token
  if (-not $studentToken) { throw "Student token missing in login response." }
  Write-Host "Student login OK"

  Write-Step "5) Start attempt"
  $start = Invoke-ApiJson -Method "Post" -Uri "$BaseUrl/attempt/start" -Headers @{
    Authorization = "Bearer $studentToken"
  } -Body @{
    examId = $examId
  }
  if (-not $start.exam.questions) { throw "Attempt start failed: exam questions missing." }
  Write-Host "Attempt started. attemptId=$($start.attemptId)"

  Write-Step "6) Submit attempt (option A for every question)"
  $answers = @()
  foreach ($q in $start.exam.questions) {
    $answers += @{
      questionId     = $q.id
      selectedAnswer = $q.options[0]
    }
  }

  $submit = Invoke-ApiJson -Method "Post" -Uri "$BaseUrl/attempt/submit" -Headers @{
    Authorization = "Bearer $studentToken"
  } -Body @{
    examId  = $examId
    answers = $answers
  }
  Write-Host "Submit OK -> score=$($submit.score)% correct=$($submit.correct)/$($submit.total)"

  Write-Step "7) Fetch student results"
  $results = Invoke-ApiJson -Method "Get" -Uri "$BaseUrl/results/student" -Headers @{
    Authorization = "Bearer $studentToken"
  }

  if ($results.results.Count -eq 0) {
    Write-Host "No results returned." -ForegroundColor Yellow
  } else {
    $results.results | Select-Object -First 5 id, examId, examTitle, score | Format-Table
  }

  Write-Host ""
  Write-Host "E2E flow completed successfully." -ForegroundColor Green
}
catch {
  Write-Host ""
  Write-Host "E2E flow failed: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
