# OpenWrt APK 安装包

面向 OpenWrt 25.12.5 / APK v3；MU300 / U30 Air 目标架构为 `aarch64_generic`。这不是安卓应用。保留原有 IPK 供 opkg 系统使用。

```sh
apk update
apk add --allow-untrusted ./luci-app-cpemonitor-*.apk
```

本包未签名，仅在核对本发布页 SHA256SUMS 后安装。保留 `/etc/config` 中已有配置。

构建：Linux 上安装 fakeroot，设置 `APK` 为 OpenWrt 25.12.5 SDK 中的 `staging_dir/host/bin/apk`，运行 `python3 tools/build_apk.py`。也可手动运行 GitHub Actions 的 Build OpenWrt APK。源文件只从 Git 跟踪清单读取，排除截图、缓存和历史安装包；源码包不含 Git 历史或本机路径。

验证覆盖原生 APK v3 打包与解包、逐文件内容校验及已有自动测试；未声称已在实体 U30 Air 上完成安装或联网验证。

MU300 使用现有 modem manager 缓存读取信号与频段，不发送额外 AT 指令，不保存 SIM 身份字段。CPU 温度按 thermal 类型读取；无法读取模组温度时显示未知。APK 不依赖官方源的 kmod 包：定制内核必须使用随固件提供的同版本 IFB、sch_tbf、cls_matchall、act_mirred 模块。限速启用时尝试加载这些模块，缺失时报错，不自动安装其他内核的模块。限速效果仍需实机验证。
