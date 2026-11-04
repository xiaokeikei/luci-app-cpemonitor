#!/bin/sh
set -eu
parser=$1
# Keep expected outside positional args: the returned map is the fourth field.
verify() {
    local actual
    actual=$(printf '%b' "$3" | awk -v previous="$1" -v active="$2" -f "$parser" | cut -d' ' -f1-3)
    [ "$actual" = "$4" ] || { echo "Expected $4, got $actual" >&2; exit 1; }
}
verify 'sipa_eth0:1000:100,sipa_eth8:5000:500' sipa_eth0 'sipa_eth0 1100 120\nsipa_eth8 5000 500\n' '100 20 0'
verify 'sipa_eth0:1100:120,sipa_eth8:5000:500' sipa_eth8 'sipa_eth0 1110 125\nsipa_eth8 5300 530\n' '310 35 1'
verify 'sipa_eth0:1110:125,sipa_eth8:5300:530' sipa_eth0 'sipa_eth0 1200 130\nsipa_eth8 5300 530\n' '90 5 0'
verify 'sipa_eth0:1110:125,sipa_eth8:5300:530' sipa_eth8 'sipa_eth0 1110 125\nsipa_eth8 10 2\n' '10 2 0'
verify '' sipa_eth0 'sipa_eth0 1200 130\nsipa_eth8 5300 530\n' '0 0 0'
printf 'PASS traffic baseline, switch, switch-back, inactive-port drain and reset\n'
