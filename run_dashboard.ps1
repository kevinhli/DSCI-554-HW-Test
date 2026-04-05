[CmdletBinding()]
param(
  [switch]$Production,
  [string]$FredApiKey
)

$ErrorActionPreference = 'Stop'

function Assert-Command {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name
  )

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' was not found in PATH."
  }
}

function Test-PythonModule {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name
  )

  & python -c "import importlib.util, sys; sys.exit(0 if importlib.util.find_spec('$Name') else 1)"
  return $LASTEXITCODE -eq 0
}

function Ensure-PythonModule {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [string]$Package = $Name
  )

  if (Test-PythonModule -Name $Name) {
    return
  }

  Write-Host "Installing missing Python package: $Package" -ForegroundColor Yellow
  & python -m pip install $Package
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to install Python package '$Package'."
  }
}

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$dashboardDir = Join-Path $repoRoot '.github\Monetary_Policy_Dashboard'

Assert-Command -Name 'python'
Assert-Command -Name 'npm.cmd'

Ensure-PythonModule -Name 'pandas'
Ensure-PythonModule -Name 'requests'
Ensure-PythonModule -Name 'yfinance'

if ($FredApiKey) {
  $env:FRED_API_KEY = $FredApiKey
}

if (-not $env:FRED_API_KEY) {
  throw "FRED_API_KEY is not set. Use `$env:FRED_API_KEY='your_key'` first or run .\run_dashboard.ps1 -FredApiKey 'your_key'."
}

Write-Host ''
Write-Host '== Policy Ripple Dashboard ==' -ForegroundColor Cyan
Write-Host "Repository: $repoRoot"
Write-Host ''

Push-Location $repoRoot
try {
  Write-Host '1. Building cleaned dashboard data...' -ForegroundColor Yellow
  & python data\build_dashboard_data.py
  if ($LASTEXITCODE -ne 0) {
    throw 'Data build failed.'
  }

  Push-Location $dashboardDir
  try {
    Write-Host ''
    Write-Host '2. Installing dashboard dependencies...' -ForegroundColor Yellow
    & npm.cmd install
    if ($LASTEXITCODE -ne 0) {
      throw 'npm install failed.'
    }

    Write-Host ''
    if ($Production) {
      Write-Host '3. Building production dashboard bundle...' -ForegroundColor Yellow
      & npm.cmd run build
      if ($LASTEXITCODE -ne 0) {
        throw 'Production build failed.'
      }

      Write-Host ''
      Write-Host 'Production build complete.' -ForegroundColor Green
      Write-Host "Open the output in: $dashboardDir\dist"
    }
    else {
      Write-Host '3. Starting the Vite development server...' -ForegroundColor Yellow
      Write-Host 'Press Ctrl+C when you want to stop the dashboard.' -ForegroundColor DarkGray
      Write-Host ''
      & npm.cmd run dev
      if ($LASTEXITCODE -ne 0) {
        throw 'Development server failed to start.'
      }
    }
  }
  finally {
    Pop-Location
  }
}
finally {
  Pop-Location
}
