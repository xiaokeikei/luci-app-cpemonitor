const fs = require('fs'), assert = require('assert');
const api = new Function('baseclass', fs.readFileSync('root/www/luci-static/resources/cpemonitor/bands.js', 'utf8'))({ extend: x => x });
function row(t, band, status = 'known') {
    return { timestamp: t, interval: 60, modems: [{ id: 'm1', mode: 'NR-SA', bands: [band], status }] };
}
let result = api.segments([row(60, 'n41'), row(120, 'n28'), row(180, '', 'unknown'), row(240, 'n41')], 0, 400).m1;
assert.equal(result.events.length, 1);
assert(result.events[0].from.includes('n41') && result.events[0].to.includes('n28'));
assert.equal(result.segments[0].label, '未采样');
assert(result.segments.some(x => x.label.includes('未知')));
result = api.segments([row(0, 'n41'), row(600, 'n28')], 0, 800).m1;
assert.equal(result.events.length, 0);
assert(result.segments.some(x => x.label === '未采样' && x.start === 150));
assert.equal(api.currentLabel({ timestamp: 1, interval: 60, modems: [] }).startsWith('读取已过期'), true);
assert.equal(api.currentLabel({ modems: [] }), '未知 / 接口未报告');
console.log('PASS: changes, unknown/gap handling, no invented switches across gaps, expired and unsupported readings.');
