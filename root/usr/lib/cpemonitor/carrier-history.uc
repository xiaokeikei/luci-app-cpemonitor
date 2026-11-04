import { open } from 'fs';
let path = ARGV[0], start = +ARGV[1], end = +ARGV[2];
let limit = max(1, min(5000, +ARGV[3] || 1200)), filter = +ARGV[4];
let groups = {}, selected = 0, line;
function row(line) {
    let parts = split(trim(line), ',');
    if (length(parts) < 18) return null;
    for (let s in parts) if (!match(s, /^-?[0-9]+(\.[0-9]+)?$/)) return null;
    let r = map(parts, (v) => +v);
    if (r[0] < start || r[0] > end) return null;
    return r;
}
function code(r) { return length(r) >= 21 && r[18] >= 0 && r[18] <= 6 ? r[18] : 0; }
let f = open(path, 'r');
if (!f) { print('{"rows":[],"carriers":[]}'); exit(0); }
let previous = -1;
while ((line = f.read('line')) != null && line != '') {
    let r = row(line);
    if (!r || r[0] == previous) continue;
    previous = r[0];
    let id = code(r), g = groups[id];
    if (!g) g = groups[id] = {id, count:0, download:0, upload:0, unaccounted:0,
        a_sum:0, a_n:0, a_fail:0, t_sum:0, t_n:0, t_fail:0};
    g.count++;
    if (length(r) >= 21) { g.download += max(0, r[19]); g.upload += max(0, r[20]); }
    else g.unaccounted++;
    if (r[8] >= 0) { g.a_sum += r[8]; g.a_n++; } else g.a_fail++;
    if (r[10] >= 0) { g.t_sum += r[10]; g.t_n++; } else g.t_fail++;
    if (filter < 0 || id == filter) selected++;
}
f.close();
let carriers = [];
for (let id = 0; id <= 6; id++) {
    let g = groups[id]; if (!g) continue;
    push(carriers, {id, count:g.count, download:g.download, upload:g.upload, unaccounted:g.unaccounted,
        aliyun_avg:g.a_n ? +sprintf('%.1f', g.a_sum/g.a_n) : null,
        tencent_avg:g.t_n ? +sprintf('%.1f', g.t_sum/g.t_n) : null,
        aliyun_loss:100*g.a_fail/g.count, tencent_loss:100*g.t_fail/g.count});
}
let rows = [], step = max(1, int((selected + limit - 1) / limit)), n = 0;
f = open(path, 'r'); previous = -1;
while ((line = f.read('line')) != null && line != '') {
    let r = row(line); if (!r || r[0] == previous) continue; previous = r[0];
    if (filter >= 0 && code(r) != filter) continue;
    if (n++ % step == 0) push(rows, r);
}
f.close();
print(sprintf('%J\n', {rows, carriers, count:selected, filter}));
