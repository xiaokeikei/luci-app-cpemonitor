# luci-app-cpemonitor v1.2.0

## 新增与修复

- 实时速率支持 `Kbps`、`Mbps`、`KB/s`、`MB/s` 四种单位。
- 实时页面可直接切换单位，并可在设置页面保存默认单位。
- 补回最近 10 分钟实时页面的“设备温度与风扇”折线图。
- 温度图同时显示 CPU、Wi-Fi、模组温度和风扇 PWM 百分比。

## 安装

```sh
opkg install ./luci-app-cpemonitor_1.2.0-1_all.ipk
```

