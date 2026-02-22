rule Credential_Harvester_Indicators
{
    meta:
        description = "Detects strings commonly used in credential harvesting malware"
        severity = "medium"

    strings:
        $creds1 = "password="
        $creds2 = "pwd="
        $creds3 = "login="
        $creds4 = "credential"
        $creds5 = "keylogger"
        $creds6 = "clipboard"

    condition:
        any of ($creds*)
}