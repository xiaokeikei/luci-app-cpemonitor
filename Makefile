# SPDX-License-Identifier: GPL-2.0-only
# Copyright (C) 2026 xiaokeikei

include $(TOPDIR)/rules.mk

LUCI_TITLE:=CPE traffic, system and 5G monitor for LuCI
LUCI_DESCRIPTION:=Lightweight CPE monitoring with daily WAN traffic accounting, rolling and historical charts, system temperatures, cellular signal and dual latency probes.
LUCI_DEPENDS:=+luci-base +rpcd +jsonfilter +tc-tiny +kmod-ifb +kmod-sched-core +nftables-json +ucode +ucode-mod-fs
LUCI_PKGARCH:=all
LUCI_MAINTAINER:=xiaokeikei

PKG_VERSION:=1.6.1
PKG_RELEASE:=1
PKG_LICENSE:=GPL-2.0-only
PKG_LICENSE_FILES:=LICENSE

define Package/luci-app-cpemonitor/conffiles
/etc/config/cpemonitor
endef

define Package/luci-app-cpemonitor/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || {
	/etc/init.d/cpemonitor enable
	/etc/init.d/cpemonitor restart
	rm -f /tmp/luci-indexcache /tmp/luci-indexcache.* /tmp/luci-modulecache/* 2>/dev/null
	/etc/init.d/rpcd restart
	/etc/init.d/uhttpd reload
}
exit 0
endef

define Package/luci-app-cpemonitor/prerm
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || {
	/etc/init.d/cpemonitor stop
	tries=0
	while /etc/init.d/cpemonitor status >/dev/null 2>&1; do
		tries=$$((tries + 1)); [ "$$tries" -lt 30 ] || exit 1
		sleep 1
	done
}
exit 0
endef

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
