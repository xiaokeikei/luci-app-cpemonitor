# Changelog

## 1.6.1-5 - 2026-11-01

- Load the aligned status grid from a new dashboard module URL to bypass cached overview code.
- Give packaged files a current build timestamp so HTTP Last-Modified changes on upgrades instead of staying at the Unix epoch.

## 1.6.1-4 - 2026-11-01

- Use one five-column grid for all ten status cards and remove theme section styling that changes card widths and alignment.
- Unify card height, padding and numeric baselines; wrap long band labels and use two/one columns on smaller screens.

## 1.6.1-3 - 2026-11-01

- Add today's download and upload totals to the live status cards, refreshed with the current statistics every 10 seconds.
- Arrange speed and daily traffic in the first responsive grid, and device/network status in the second, with equal-width cards and wrapping on small screens.

## 1.6.1-2

- Add selected-range total traffic and average daily total for days with records below the daily traffic chart.
- Include the traffic chart module in the OpenWrt package manifest.

## 1.6.1 - 2026-10-02

- Retain the last valid serving-band and modem-temperature readings when collection fails; refresh on successful readings.
- Add daily upload, download and total traffic curves with a calendar-month default and custom inclusive date ranges.
- Include today's live traffic and unflushed daily records, deduplicate dates and expose all retained daily history.
- Hide the monthly quota panel when quota control is disabled.
- Order dashboard sections as speed, latency, system usage, temperature, signal, bands, traffic trends and daily details.
- Replace README previews with four current screenshots and refresh installation and feature descriptions.

## 1.6.0 - 2026-10-01

- Record serving bands and network modes through generic modem_ctrl/QModem data interfaces without a model/band allowlist.
- Preserve reported serving/secondary carriers, distinguish NR/LTE/WCDMA and explicitly mark unknown readings.
- Add a current-band card, per-modem frequency timeline and observed band/mode changes in dashboard and history queries.
- Buffer radio snapshots in RAM and persist with existing checkpoints; historical numeric CSV remains compatible.
- Exclude supported-band lists and neighbours, avoid guessing ambiguous NSA bands and cap radio history responses at 5000 observations.

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
