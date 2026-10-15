#!/bin/sh
set -e
BASE="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
if [ -x /etc/init.d/cpemonitor ]; then
    /etc/init.d/cpemonitor stop
    tries=0
    while /etc/init.d/cpemonitor status >/dev/null 2>&1; do
        tries=$((tries + 1)); [ "$tries" -lt 30 ] || exit 1
        sleep 1
    done
fi
find "$BASE/root" -type f | while IFS= read -r file; do
    dest="${file#"$BASE/root"}"
    [ "$dest" = /etc/config/cpemonitor ] && [ -f "$dest" ] && continue
    mkdir -p "$(dirname "$dest")"
    cp "$file" "$dest"
done
find "$BASE/htdocs" -type f | while IFS= read -r file; do
    dest="/www${file#"$BASE/htdocs"}"
    mkdir -p "$(dirname "$dest")"
    cp "$file" "$dest"
done
chmod 755 /usr/sbin/cpemonitord /usr/sbin/cpemonitor-quota /etc/init.d/cpemonitor /usr/libexec/rpcd/cpemonitor
rm -f /tmp/luci-indexcache /tmp/luci-indexcache.* /tmp/luci-modulecache/* 2>/dev/null || true
/etc/init.d/rpcd restart
/etc/init.d/cpemonitor enable
/etc/init.d/cpemonitor restart
/etc/init.d/uhttpd restart
echo "CPE Monitor installed. Open LuCI: Status -> CPE Monitor"
