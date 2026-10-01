#!/bin/sh
set -eu
. "$1"
quota_period 2026-01-01 15
[ "$PERIOD_START:$PERIOD_END" = 2025-12-15:2026-01-15 ]
quota_period 2026-03-01 28
[ "$PERIOD_START:$PERIOD_END" = 2026-02-28:2026-03-28 ]
quota_period 2028-02-29 1
[ "$PERIOD_START:$PERIOD_END" = 2028-02-01:2028-03-01 ]
quota_period 2026-10-15 15
[ "$PERIOD_START:$PERIOD_END" = 2026-10-15:2026-11-15 ]
Q_ENABLED=1; Q_OVERRIDE=''; Q_LIMIT=100000000000; Q_PERCENT=80
Q_TOTAL=79999999999; quota_decide; [ "$Q_TARGET" = normal ]
Q_TOTAL=80000000000; quota_decide; [ "$Q_TARGET" = limited ]
Q_TOTAL=100000000000; quota_decide; [ "$Q_TARGET" = blocked ]
Q_OVERRIDE=$PERIOD_START; quota_decide; [ "$Q_TARGET" = override ]
quota_period 2026-11-15 15; quota_decide; [ "$Q_TARGET" = blocked ]
Q_ENABLED=0; quota_decide; [ "$Q_TARGET" = disabled ]
work=$(mktemp -d /tmp/cpemonitor-unit.XXXXXX)
trap 'rm -rf "$work"' EXIT
DATA_DIR=$work/data; RAM_DIR=$work/ram
mkdir -p "$DATA_DIR" "$RAM_DIR"
printf '2026-09-30,999,999,1998\n2026-10-01,10,20,30\n2026-10-02,30,40,70\n' > "$DATA_DIR/daily.csv"
printf '2026-10-02,30,40,70\n2026-10-03,50,60,110\n' > "$RAM_DIR/daily.csv"
quota_period 2026-10-04 1; Q_DAY=2026-10-04; Q_RX=70; Q_TX=80
[ "$(quota_sum)" = '160 200' ]
echo 'PASS: calendar boundaries, threshold boundaries, override expiry, disabled mode and daily aggregation/deduplication'
