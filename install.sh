#!/bin/sh
set -e
BASE="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
cp -R "$BASE/root/"* /
chmod 755 /usr/sbin/cpemonitord /etc/init.d/cpemonitor /usr/libexec/rpcd/cpemonitor
rm -f /tmp/luci-indexcache /tmp/luci-modulecache/* 2>/dev/null || true
/etc/init.d/rpcd restart
/etc/init.d/cpemonitor enable
/etc/init.d/cpemonitor restart
/etc/init.d/uhttpd restart
echo "CPE Monitor installed. Open LuCI: Status -> CPE Monitor"

