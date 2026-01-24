# PowerShell script for Windows users
# Colors for output
$GREEN = "`e[32m"
$YELLOW = "`e[33m"
$RED = "`e[31m"
$NC = "`e[0m"

Write-Host "${YELLOW}🚀 Starting E-Commerce Application...${NC}" -ForegroundColor Yellow
Write-Host ""

# Function to kill process on a port
function Kill-Port {
    param($Port)
    
    $processes = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | 
                 Select-Object -ExpandProperty OwningProcess -Unique
    
    if ($processes) {
        Write-Host "${YELLOW}Clearing port $Port...${NC}" -ForegroundColor Yellow
        foreach ($pid in $processes) {
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        }
        Start-Sleep -Seconds 1
        Write-Host "${GREEN}✓ Port $Port cleared${NC}" -ForegroundColor Green
    } else {
        Write-Host "${GREEN}✓ Port $Port is already free${NC}" -ForegroundColor Green
    }
}

# Clear ports
Write-Host "${YELLOW}Checking ports...${NC}" -ForegroundColor Yellow
Kill-Port 3000  # Frontend port
Kill-Port 3001  # Backend port

Write-Host ""

# Check if node_modules exist
if (-not (Test-Path "backend\node_modules")) {
    Write-Host "${YELLOW}⚠ Backend node_modules not found. Installing dependencies...${NC}" -ForegroundColor Yellow
    Push-Location backend
    npm install
    Pop-Location
}

if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "${YELLOW}⚠ Frontend node_modules not found. Installing dependencies...${NC}" -ForegroundColor Yellow
    Push-Location frontend
    npm install
    Pop-Location
}

Write-Host ""

# Start backend
Write-Host "${GREEN}Starting backend server on port 3001...${NC}" -ForegroundColor Green
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD\backend
    npm run dev *> ..\backend.log
}
Write-Host "Backend job started (ID: $($backendJob.Id))" -ForegroundColor Green

# Wait a moment for backend to start
Start-Sleep -Seconds 2

# Start frontend
Write-Host "${GREEN}Starting frontend server on port 3000...${NC}" -ForegroundColor Green
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD\frontend
    npm run dev *> ..\frontend.log
}
Write-Host "Frontend job started (ID: $($frontendJob.Id))" -ForegroundColor Green

Write-Host ""
Write-Host "${GREEN}════════════════════════════════════════${NC}" -ForegroundColor Green
Write-Host "${GREEN}   🎉 Application is running!${NC}" -ForegroundColor Green
Write-Host "${GREEN}════════════════════════════════════════${NC}" -ForegroundColor Green
Write-Host ""
Write-Host "Frontend: ${GREEN}http://localhost:3000${NC}" -ForegroundColor Cyan
Write-Host "Backend:  ${GREEN}http://localhost:3001${NC}" -ForegroundColor Cyan
Write-Host ""
Write-Host "${YELLOW}Logs:${NC}" -ForegroundColor Yellow
Write-Host "  Backend:  ${YELLOW}Get-Content backend.log -Wait${NC}" -ForegroundColor Yellow
Write-Host "  Frontend: ${YELLOW}Get-Content frontend.log -Wait${NC}" -ForegroundColor Yellow
Write-Host ""
Write-Host "${YELLOW}Press Ctrl+C to stop both servers${NC}" -ForegroundColor Yellow
Write-Host ""

# Wait for Ctrl+C
try {
    while ($true) {
        Start-Sleep -Seconds 1
        if (-not (Get-Job -Id $backendJob.Id, $frontendJob.Id -ErrorAction SilentlyContinue)) {
            break
        }
    }
} finally {
    Write-Host ""
    Write-Host "${YELLOW}Stopping servers...${NC}" -ForegroundColor Yellow
    Stop-Job -Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Remove-Job -Job $backendJob, $frontendJob -Force -ErrorAction SilentlyContinue
    Kill-Port 3000
    Kill-Port 3001
    Write-Host "${GREEN}✓ Servers stopped${NC}" -ForegroundColor Green
}
