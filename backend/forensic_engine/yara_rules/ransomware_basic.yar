rule Basic_Ransomware_Indicators
{
    meta:
        description = "Detects common ransomware extension patterns and ransom notes"
        severity = "high"

    strings:
        $ext1 = ".locked"
        $ext2 = ".encrypted"
        $note1 = "YOUR FILES HAVE BEEN ENCRYPTED"
        $note2 = "ransom"
        $note3 = "decrypt your files"

    condition:
        any of ($ext*)
        or any of ($note*)
}