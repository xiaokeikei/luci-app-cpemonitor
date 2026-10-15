const fs = require('fs'), assert = require('assert');
const api = new Function('baseclass', '_', fs.readFileSync('htdocs/luci-static/resources/cpemonitor/bands.js', 'utf8'))({ extend: x => x }, s => s);
function row(t, band, status = 'known') {
    return { timestamp: t, interval: 60, modems: [{ id: 'm1', mode: 'NR-SA', bands: [band], status }] };
}
let result = api.segments([row(60, 'n41'), row(120, 'n28'), row(180, '', 'unknown'), row(240, 'n41')], 0, 400).m1;
assert.equal(result.events.length, 2);
assert(result.events[0].from.includes('n41') && result.events[0].to.includes('n28'));
assert.equal(result.segments[0].label, 'No sample');
assert(!result.segments.some(x => x.label.includes('Unknown')));
assert(result.events[1].from.includes('n28') && result.events[1].to.includes('n41'));
result = api.segments([row(0, '', 'unknown'), row(60, 'n41'), row(120, '', 'unavailable'), row(180, 'n28')], 0, 240).m1;
assert(result.segments[0].label.includes('Unknown'));
assert(result.segments.some(x => x.start === 60 && x.end === 180 && x.label.includes('n41')));
assert.equal(result.events.length, 1);
result = api.segments([row(0, 'n41'), row(600, 'n28')], 0, 800).m1;
assert.equal(result.events.length, 0);
assert(result.segments.some(x => x.label === 'No sample' && x.start === 150));
assert(api.currentLabel(row(1, 'n41')).includes('n41'));
assert.equal(api.currentLabel({ modems: [] }), 'Unknown / not reported');
console.log('PASS: retained bands, recovery switches, initial unknown readings and sampling gaps.');
