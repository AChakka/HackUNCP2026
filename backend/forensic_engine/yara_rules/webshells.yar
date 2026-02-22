rule Webshell_Generic
{
    meta:
        description = "Detects common webshell keywords"
        severity = "high"

    strings:
        $php1 = "eval("
        $php2 = "base64_decode("
        $php3 = "shell_exec("
        $asp1 = "Execute("
        $asp2 = "CreateObject("
        $jsp1 = "Runtime.getRuntime().exec"

    condition:
        any of ($php*)
        or any of ($asp*)
        or $jsp1
}