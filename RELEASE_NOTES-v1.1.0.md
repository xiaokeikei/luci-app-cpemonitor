# luci-app-cpemonitor v1.1.0

## 新增

- 实时状态增加风扇转速百分比。
- 历史“设备温度与风扇”图增加风扇曲线及悬浮精确值。
- 从设备现有 `fancontrol` 配置自动读取 PWM 节点和最大值。
- 兼容 v1.0.0 没有风扇字段的历史采样，不影响旧曲线显示。

## 硬件说明

Hiveton H5000M 当前固件未提供有效的 tach/RPM 测速节点，因此显示的是实际 PWM 控制百分比，而不是虚构的 RPM。

## 安装

```sh
opkg install ./luci-app-cpemonitor_1.1.0-1_all.ipk
```

