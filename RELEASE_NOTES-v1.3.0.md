# luci-app-cpemonitor v1.3.0

## 改进

- WAN设备由手工输入改为动态下拉选择。
- 页面打开时读取本机现有网络设备。
- 自动过滤回环、LAN桥、HNAT及无线AP内部设备。
- 避免设备名拼写错误导致流量统计为零。

## 安装

```sh
opkg install ./luci-app-cpemonitor_1.3.0-1_all.ipk
```

