#!/bin/sh
set -e
/etc/init.d/cpemonitor stop 2>/dev/null || true
/etc/init.d/cpemonitor disable 2>/dev/null || true
rm -f /usr/sbin/cpemonitord /etc/init.d/cpemonitor /usr/libexec/rpcd/cpemonitor
rm -f /usr/share/luci/menu.d/luci-app-cpemonitor.json /usr/share/luci/menu.d/luci-app-cpemonitor-settings.json
rm -f /usr/share/rpcd/acl.d/luci-app-cpemonitor.json
rm -rf /www/luci-static/resources/view/cpemonitor
rm -f /tmp/luci-indexcache
/etc/init.d/rpcd restart
/etc/init.d/uhttpd restart
echo "CPE Monitor removed. Configuration and monitoring data were kept."

