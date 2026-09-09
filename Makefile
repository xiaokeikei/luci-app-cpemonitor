# SPDX-License-Identifier: GPL-2.0-only
# Copyright (C) 2026 xiaokeikei

include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-cpemonitor
PKG_VERSION:=1.0.0
PKG_RELEASE:=1
PKG_MAINTAINER:=xiaokeikei
PKG_LICENSE:=GPL-2.0-only
PKG_LICENSE_FILES:=LICENSE

include $(INCLUDE_DIR)/package.mk

define Package/luci-app-cpemonitor
  SECTION:=luci
  CATEGORY:=LuCI
  SUBMENU:=3. Applications
  TITLE:=CPE traffic, system and 5G monitor for LuCI
  PKGARCH:=all
  DEPENDS:=+luci-base +rpcd +jsonfilter
endef

define Package/luci-app-cpemonitor/description
 Lightweight CPE monitoring with daily WAN traffic accounting, rolling and
 historical charts, system temperatures, cellular signal and dual latency probes.
endef

define Package/luci-app-cpemonitor/conffiles
/etc/config/cpemonitor
endef

define Build/Compile
endef

define Package/luci-app-cpemonitor/install
	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) ./root/etc/config/cpemonitor $(1)/etc/config/cpemonitor
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./root/etc/init.d/cpemonitor $(1)/etc/init.d/cpemonitor
	$(INSTALL_DIR) $(1)/usr/sbin
	$(INSTALL_BIN) ./root/usr/sbin/cpemonitord $(1)/usr/sbin/cpemonitord
	$(INSTALL_DIR) $(1)/usr/libexec/rpcd
	$(INSTALL_BIN) ./root/usr/libexec/rpcd/cpemonitor $(1)/usr/libexec/rpcd/cpemonitor
	$(INSTALL_DIR) $(1)/usr/share/luci/menu.d
	$(INSTALL_DATA) ./root/usr/share/luci/menu.d/luci-app-cpemonitor.json $(1)/usr/share/luci/menu.d/luci-app-cpemonitor.json
	$(INSTALL_DATA) ./root/usr/share/luci/menu.d/luci-app-cpemonitor-history.json $(1)/usr/share/luci/menu.d/luci-app-cpemonitor-history.json
	$(INSTALL_DATA) ./root/usr/share/luci/menu.d/luci-app-cpemonitor-settings.json $(1)/usr/share/luci/menu.d/luci-app-cpemonitor-settings.json
	$(INSTALL_DIR) $(1)/usr/share/rpcd/acl.d
	$(INSTALL_DATA) ./root/usr/share/rpcd/acl.d/luci-app-cpemonitor.json $(1)/usr/share/rpcd/acl.d/luci-app-cpemonitor.json
	$(INSTALL_DIR) $(1)/www/luci-static/resources/view/cpemonitor
	$(INSTALL_DATA) ./root/www/luci-static/resources/view/cpemonitor/overview.js $(1)/www/luci-static/resources/view/cpemonitor/overview.js
	$(INSTALL_DATA) ./root/www/luci-static/resources/view/cpemonitor/history.js $(1)/www/luci-static/resources/view/cpemonitor/history.js
	$(INSTALL_DATA) ./root/www/luci-static/resources/view/cpemonitor/settings.js $(1)/www/luci-static/resources/view/cpemonitor/settings.js
endef

define Package/luci-app-cpemonitor/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || {
	/etc/init.d/cpemonitor enable
	/etc/init.d/cpemonitor restart
	rm -f /tmp/luci-indexcache /tmp/luci-modulecache/* 2>/dev/null
	/etc/init.d/rpcd restart
	/etc/init.d/uhttpd reload
}
exit 0
endef

define Package/luci-app-cpemonitor/prerm
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || /etc/init.d/cpemonitor stop
exit 0
endef

$(eval $(call BuildPackage,luci-app-cpemonitor))

