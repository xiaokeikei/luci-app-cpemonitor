# luci-app-cpemonitor v1.0.0

首个稳定版本，针对 Hiveton H5000M / ImmortalWrt 24.10 实机适配并验证。

## 主要功能

- 每日零点结算 WAN 上行、下行和总流量
- 最近 10 分钟滚动预览及自定义历史时间段查询
- CPU、内存、磁盘、负载、CPU/Wi-Fi/模组温度
- 实时上行和下行速度
- 阿里云、腾讯云延迟及丢包率
- 5G RSRP、RSRQ、SINR
- 折线图虚线网格和鼠标悬浮精确值
- 全部采样、模组查询、持久化和保留周期均可配置
- RAM 缓冲及默认每 6 小时批量持久化，降低闪存写放大

## 安装

```sh
opkg install ./luci-app-cpemonitor_1.0.0-1_all.ipk
```

也可以运行自解压安装包：

```sh
chmod +x luci-app-cpemonitor-1.0.0-1.run
./luci-app-cpemonitor-1.0.0-1.run
```

安装后进入 `状态 → CPE 监控`。

## 实机验证

- Hiveton H5000M
- ImmortalWrt 24.10-SNAPSHOT
- Linux 6.6.94 / aarch64_cortex-a53
- Fibocom FM160-CN

