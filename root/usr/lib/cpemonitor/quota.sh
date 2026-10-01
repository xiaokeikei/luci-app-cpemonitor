#!/bin/sh
# Shared calendar/accounting helpers; traffic units are decimal GB and Mbit/s.
quota_period() {
    local today="$1" bill="$2" y m d
    y=${today%%-*}; m=${today#*-}; d=${m#*-}; m=${m%%-*}
    m=${m#0}; d=${d#0}
    if [ "$d" -lt "$bill" ]; then m=$((m - 1)); fi
    if [ "$m" -eq 0 ]; then m=12; y=$((y - 1)); fi
    PERIOD_START=$(printf '%04d-%02d-%02d' "$y" "$m" "$bill")
    m=$((m + 1)); if [ "$m" -eq 13 ]; then m=1; y=$((y + 1)); fi
    PERIOD_END=$(printf '%04d-%02d-%02d' "$y" "$m" "$bill")
}
quota_sum() {
    # Latest row wins if an old daily checkpoint was repeated; today's live
    # counters are added once, never reconstructed from sampled speed graphs.
    { cat "$DATA_DIR/daily.csv" "$RAM_DIR/daily.csv" 2>/dev/null; } |
        awk -F, -v start="$PERIOD_START" -v today="$Q_DAY" -v rx="$Q_RX" -v tx="$Q_TX" '
        $1 ~ /^[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]$/ && $1 >= start && $1 < today { down[$1]=$2; up[$1]=$3 }
        END { for (d in down) { rx+=down[d]; tx+=up[d] } printf "%.0f %.0f\n",rx,tx }'
}
quota_decide() {
    if [ "$Q_ENABLED" != 1 ]; then Q_TARGET=disabled
    elif [ "$Q_OVERRIDE" = "$PERIOD_START" ]; then Q_TARGET=override
    elif [ "$Q_TOTAL" -ge "$Q_LIMIT" ]; then Q_TARGET=blocked
    elif [ "$Q_TOTAL" -ge "$((Q_LIMIT * Q_PERCENT / 100))" ]; then Q_TARGET=limited
    else Q_TARGET=normal; fi
}
