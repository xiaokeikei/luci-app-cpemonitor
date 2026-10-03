#!/bin/sh
set -e
/etc/init.d/cpemonitor stop 2>/dev/null || true
tries=0
while /etc/init.d/cpemonitor status >/dev/null 2>&1; do
    tries=$((tries + 1)); [ "$tries" -lt 30 ] || exit 1
    sleep 1
done
/etc/init.d/cpemonitor disable 2>/dev/null || true
rm -f /usr/sbin/cpemonitord /usr/sbin/cpemonitor-quota /usr/lib/cpemonitor/quota.sh /etc/init.d/cpemonitor /usr/libexec/rpcd/cpemonitor
rm -f /usr/lib/cpemonitor/bands.uc
rm -f /usr/share/luci/menu.d/luci-app-cpemonitor.json /usr/share/luci/menu.d/luci-app-cpemonitor-settings.json /usr/share/luci/menu.d/luci-app-cpemonitor-history.json
rm -f /usr/share/rpcd/acl.d/luci-app-cpemonitor.json
rm -rf /www/luci-static/resources/view/cpemonitor /www/luci-static/resources/cpemonitor
rm -f /tmp/luci-indexcache
/etc/init.d/rpcd restart
/etc/init.d/uhttpd restart
echo "CPE Monitor removed. Configuration and monitoring data were kept."
