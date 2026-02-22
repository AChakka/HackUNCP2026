rule PowerShell_Abuse
{
    meta:
        description = "Detects malicious PowerShell usage patterns"
        severity = "medium"

    strings:
        $ps1 = "New-Object Net.WebClient"
        $ps2 = "Invoke-Expression"
        $ps3 = "FromBase64String"
        $ps4 = "DownloadString"
        $ps5 = "Add-MpPreference"
        $ps6 = "Set-MpPreference"

    condition:
        any of ($ps*)
}