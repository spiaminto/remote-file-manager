<#
.SYNOPSIS
Installs the pinned FileBrowser Quantum release and its config into the install directory.

.DESCRIPTION
Downloads filebrowser.exe for the pinned release into a new empty temporary directory,
checks its SHA-256 against the digest GitHub publishes for the release asset, and only then
copies it into the install directory. Creates the data, cache and sandbox directories and
copies config.yaml from this folder (the repository copy is the source of truth).
It does not register a Windows service and does not start FileBrowser.

This file is kept ASCII-only: Windows PowerShell 5.1 reads BOM-less scripts in the ANSI code page.

.PARAMETER InstallDir
Install directory. Defaults to C:\_Utility\filebrowser-quantum.

.EXAMPLE
powershell -NoProfile -ExecutionPolicy Bypass -File deploy\fbq\install.ps1
#>
[CmdletBinding()]
param(
    [string]$InstallDir = 'C:\_Utility\filebrowser-quantum'
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

# Pinned release. To upgrade, change all three values together and take the digest from
# `gh api repos/gtsteffaniak/filebrowser/releases/tags/<tag> --jq '.assets[] | select(.name=="filebrowser.exe") | .digest'`.
$Version        = 'v2.1.0-stable'
$AssetName      = 'filebrowser.exe'
$ExpectedSha256 = '653637B683BE14633D1FA8FB3E79D066A0D048F2FD17A5D8989649B68C57E2B4'
$DownloadUrl    = "https://github.com/gtsteffaniak/filebrowser/releases/download/$Version/$AssetName"

$ConfigSource = Join-Path $PSScriptRoot 'config.yaml'
$ExePath      = Join-Path $InstallDir $AssetName
$ConfigPath   = Join-Path $InstallDir 'config.yaml'

function Get-Sha256 {
    param([string]$Path)
    (Get-FileHash -Path $Path -Algorithm SHA256).Hash.ToUpperInvariant()
}

if (-not (Test-Path $ConfigSource)) {
    throw "config.yaml not found next to this script: $ConfigSource"
}

# A running instance locks the exe and would keep the old config in memory.
$running = Get-Process -Name 'filebrowser' -ErrorAction SilentlyContinue |
    Where-Object { $_.Path -and ($_.Path -ieq $ExePath) }
if ($running) {
    throw "FileBrowser is running from $ExePath (PID $($running.Id -join ', ')). Stop it first."
}

foreach ($dir in @($InstallDir, (Join-Path $InstallDir 'data'), (Join-Path $InstallDir 'cache'), (Join-Path $InstallDir 'sandbox'))) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

if ((Test-Path $ExePath) -and ((Get-Sha256 $ExePath) -eq $ExpectedSha256)) {
    Write-Host "$AssetName $Version already installed and verified: $ExePath"
} else {
    # Download into a fresh empty directory and treat the file as untrusted until the hash matches.
    $tmp = Join-Path ([IO.Path]::GetTempPath()) ("fbq-download-" + [Guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $tmp | Out-Null
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
        $tmpExe = Join-Path $tmp $AssetName
        Write-Host "Downloading $DownloadUrl"
        Invoke-WebRequest -Uri $DownloadUrl -OutFile $tmpExe -UseBasicParsing
        $actual = Get-Sha256 $tmpExe
        if ($actual -ne $ExpectedSha256) {
            throw "SHA-256 mismatch for $AssetName. expected $ExpectedSha256, got $actual. Nothing was installed."
        }
        Write-Host "SHA-256 verified: $actual"
        Copy-Item -Path $tmpExe -Destination $ExePath -Force
    } finally {
        Remove-Item -Recurse -Force -Path $tmp -ErrorAction SilentlyContinue
    }
}

Copy-Item -Path $ConfigSource -Destination $ConfigPath -Force
Write-Host "Config copied: $ConfigPath"
Write-Host "Done. Start for testing with: & '$ExePath' -c '$ConfigPath'"
