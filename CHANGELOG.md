# Changelog

## 1.5.1 - 2026-10-01

- Fix missing monthly quota settings by using one UCI named section with separate collection and quota tabs.
- Update settings instructions and add the verified settings screenshot.

## 1.5.0 - 2026-10-01

- Add a current-status navigation tab and label daily traffic columns as date, upload, download and total.

- Add monthly/billing-cycle traffic totals with decimal-GB quotas and configurable billing days.
- Add configurable threshold-based download/upload shaping and WAN blocking at 100%.
- Add persistent cycle exemptions and immediate unlock/resume controls.
- Require an explicit measurement-discrepancy acknowledgement before enabling restrictions.
- Save accounting every minute while quota control is enabled, preserve same-boot counter deltas, and restore owned network rules/offload state on shutdown.
- Add accounting and boundary tests; quota control is disabled by default.

## 1.4.0 - 2026-10-01

- Add dashboard buttons for the last 10/30 minutes, 1/2/5/12 hours and today.
- Switch all five monitoring charts together and retain the selected range during polling.
- Ignore stale history responses when switching ranges quickly.
- Show loading, empty-data and error feedback; wrap buttons on narrow screens.
- Add a portable release builder, preserve existing configuration in the standalone installer, and clear LuCI JSON menu caches on upgrade.

## 1.3.0 - 2026-09-09

- Replace the free-form WAN device field with a dynamically populated device selector.
- Filter loopback, LAN bridge, hardware-NAT and access-point-only devices.

## 1.2.0 - 2026-09-09

- Add selectable Kbps, Mbps, KB/s and MB/s units to the rolling speed chart.
- Add a persistent default speed-unit setting.
- Add the temperature and fan chart to the ten-minute live dashboard.

## 1.1.0 - 2026-09-09

- Add fan PWM speed percentage to live status and historical charts.
- Detect the PWM path and maximum value from the existing fancontrol configuration.

## 1.0.0 - 2026-09-09

- Initial release.
- Daily WAN upload, download and total traffic accounting.
- Ten-minute rolling dashboard and selectable historical time ranges.
- CPU, memory, disk, load and temperature monitoring.
- Modem temperature and 5G RSRP, RSRQ and SINR monitoring.
- Aliyun and Tencent latency and packet-loss probes.
- Mouse hover values on all charts.
- Configurable collection, modem polling, persistence and retention intervals.
- RAM buffering with six-hour persistent checkpoints by default.
