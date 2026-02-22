rule Suspicious_Strings
{
    meta:
        description = "Detects suspicious PowerShell or encoded command strings"
        severity = "medium"

    strings:
        $ps1 = "Invoke-WebRequest"
        $ps2 = "IEX("
        $enc = "Base64"
        $cmd = "cmd.exe /c"

    condition:
        any of ($ps*)
        or $enc
        or $cmd
}