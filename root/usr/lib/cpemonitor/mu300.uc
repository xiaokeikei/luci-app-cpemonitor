// Read the existing modem manager's cache; never issue AT commands or copy identity.
import { readfile } from 'fs';
let d;
try { d = json(readfile('/dev/stdin')); } catch (e) { d = {}; }
let now = +ARGV[0], stamp = +(d.ts ?? 0);
let registered = index([1, 5], +(d.reg?.stat ?? 0)) >= 0 || index([1, 5], +(d.reg5g?.stat ?? 0)) >= 0;
let valid = stamp > 0 && stamp <= now && now - stamp <= 120 && registered;
function metric(v) { return valid && (type(v) == 'int' || type(v) == 'double') ? v : -999; }
let carriers = [];
for (let kind in ['lte', 'nr']) {
    let band = d[kind]?.band;
    if (!valid || band == null) continue;
    let m = match('' + band, /^[bBnN]?([0-9]+)$/);
    if (m && +m[1] > 0) push(carriers, { band: (kind == 'nr' ? 'n' : 'B') + (+m[1]), rat: kind == 'nr' ? 'NR' : 'LTE', serving: true });
}
print(sprintf('%J\n', { rsrp: metric(d.sig?.rsrp), rsrq: metric(d.sig?.rsrq), sinr: metric(d.sig?.sinr),
    id: 'mu300', model: 'MU300', carriers: carriers, connected: valid }));
