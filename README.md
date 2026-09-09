# CPE Monitor for ImmortalWrt

面向 Hiveton H5000M / ImmortalWrt 24.10 的轻量监控插件。

## 指标

- WAN 每日上行、下行及总流量（零点结算）
- 实时上行/下行速度
- CPU、内存、根分区使用率与系统负载
- CPU、Wi-Fi、FM160 模组温度
- 阿里云/腾讯云延迟和丢包
- 5G RSRP、RSRQ、SINR、网络制式及频段

原始样本先写入 `/tmp/cpemonitor`，默认每 6 小时批量同步到持久存储，减少闪存写放大。每日流量状态也在同步时建立检查点。

## 安装

上传并解压后，在插件目录执行：

```sh
chmod +x install.sh
./install.sh
```

LuCI 菜单：`状态 → CPE 监控`。

- `CPE 监控`：滚动显示最近 10 分钟
- `历史查询`：按日期和起止时间查询，长时间段自动抽样

## 默认设置

- 基础采样：10 秒
- 模组采样：60 秒（AT/ubus 查询较重）
- 持久化：6 小时
- 保留：365 天
- WAN 接口：`wwan0`
- 持久目录：`/overlay/cpemonitor`

所有周期、接口、探测地址和保留天数均可在 LuCI 设置页修改。
