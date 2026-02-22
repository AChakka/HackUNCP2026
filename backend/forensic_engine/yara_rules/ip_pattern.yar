rule Contains_IP_Address
{
    meta:
        description = "Detects IPv4 address patterns"
        severity = "low"

    strings:
        $ip = /[0-9]{1,3}(\.[0-9]{1,3}){3}/

    condition:
        $ip
}