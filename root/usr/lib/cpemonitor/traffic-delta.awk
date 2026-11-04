# Track each interface independently, including inactive SIM data ports.
# previous is a comma-separated name:rx:tx map saved atomically with day totals.
BEGIN {
    n=split(previous, items, ",")
    for(i=1;i<=n;i++) { split(items[i], p, ":"); if(length(p[1])) { rx[p[1]]=p[2]+0; tx[p[1]]=p[3]+0; seen[p[1]]=1 } }
}
NF==3 && $1 ~ /^[a-zA-Z0-9_.-]+$/ && $2 ~ /^[0-9]+$/ && $3 ~ /^[0-9]+$/ {
    if(seen[$1]) {
        down=($2>=rx[$1] ? $2-rx[$1] : $2)
        up=($3>=tx[$1] ? $3-tx[$1] : $3)
        totalrx+=down; totaltx+=up
        if($1!=active && (down>0 || up>0)) mixed=1
    }
    map=map (length(map) ? "," : "") $1 ":" $2 ":" $3
}
END { printf "%.0f %.0f %d %s\n",totalrx,totaltx,mixed,map }
