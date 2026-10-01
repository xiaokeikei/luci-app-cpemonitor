import { readfile, open } from 'fs';

function text(v) { return (type(v) == 'string' || type(v) == 'int' || type(v) == 'double') ? substr('' + v, 0, 160) : ''; }
function rat(context) {
    context = uc(text(context));
    if (match(context, /NR|5G/)) return 'NR';
    if (match(context, /LTE|4G/)) return 'LTE';
    if (match(context, /WCDMA|UMTS|3G/)) return 'WCDMA';
    return '';
}
function normalize_band(value, context) {
    let s = text(value), m;
    if ((m = match(s, /^[nN]([0-9]+)$/))) return +m[1] > 0 ? 'n' + (+m[1]) : null;
    if ((m = match(s, /^[bB]([0-9]+)$/))) return +m[1] > 0 ? (rat(context) == 'WCDMA' ? 'W' : 'B') + (+m[1]) : null;
    if ((m = match(s, /^[wW]([0-9]+)$/))) return +m[1] > 0 ? 'W' + (+m[1]) : null;
    if ((m = match(s, /^([0-9]+)$/))) {
        let r = rat(context);
        if (+m[1] <= 0) return null;
        return r == 'NR' ? 'n' + (+m[1]) : r == 'LTE' ? 'B' + (+m[1]) : r == 'WCDMA' ? 'W' + (+m[1]) : null;
    }
    return null;
}
function parse_modem(item, position, source) {
    let data = item.data ?? item;
    if (type(data) != 'object') data = {};
    let fields = data.modem_info;
    let mode = text(data.network_mode ?? data.mode ?? data.rat), port = '', model = text(data.model);
    let carriers = [], bands = [], connected = null;
    if (type(fields) == 'array') {
        for (let f in fields) {
            let key = lc(text(f.key));
            if (key == 'network_mode' || key == 'network mode') mode = text(f.value);
            if (!mode && (key == 'network type' || key == 'network_type')) mode = text(f.value);
            if (key == 'at_port') port = text(f.value);
            if (key == 'name') model = text(f.value);
            if (key == 'connect_status') connected = lc(text(f.value)) == 'yes';
        }
        for (let f in fields) {
            let key = lc(text(f.key)), context = text(f.extra_info), group = text(f.class_origin ?? f.class);
            // Supported/locked bands and neighbour cells are capabilities, not serving carriers.
            if (match(lc(context + ' ' + group), /neighbor|neighbour|supported|available|lock/)) continue;
            if (!match(key, /^(band|band \(ca\)|lte band|nr band|wcdma band)$/)) continue;
            let c = context || (key == 'lte band' ? 'LTE' : key == 'nr band' ? 'NR' : key == 'wcdma band' ? 'WCDMA' : match(uc(mode), /NSA/) ? '' : mode);
            let b = normalize_band(f.value, c);
            if (!b) continue;
            push(carriers, { band: b, rat: rat(c), role: match(uc(context + key), /CA/) ? 'secondary' : 'serving' });
        }
    }
    // Explicit unified serving-carrier schema for other managers/adapters.
    if (type(data.carriers) == 'array') {
        carriers = [];
        for (let c in data.carriers) {
            if (c.connected == false || c.serving == false || match(lc(text(c.role)), /neighbor|neighbour|supported|available/)) continue;
            let r = text(c.rat ?? mode), b = normalize_band(c.band, r);
            if (b) push(carriers, { band: b, rat: rat(r), role: text(c.role) || 'reported' });
        }
    }
    if (!length(carriers) && data.band != null && data.connected != false && data.serving != false) {
        let b = normalize_band(data.band, text(data.rat ?? data.network_mode));
        if (b) push(carriers, { band: b, rat: rat(data.rat ?? data.network_mode), role: 'reported' });
    }
    for (let c in carriers) if (index(bands, c.band) < 0) push(bands, c.band);
    sort(bands);
    let id = text(item.id ?? item.config_section ?? data.id) || port || sprintf('modem-%d', position + 1);
    return { id: id, model: model, mode: mode || '未知', bands: bands, carriers: carriers,
        status: length(bands) ? 'known' : connected == false ? 'unavailable' : 'unknown',
        source: source, completeness: 'reported-only' };
}

if (ARGV[0] == 'normalize') {
    let data;
    try { data = json(readfile('/dev/stdin')); } catch (e) { data = {}; }
    let items = type(data) == 'array' ? data : type(data.info) == 'array' ? data.info : type(data.modems) == 'array' ? data.modems : [data];
    let modems = [];
    for (let i = 0; i < length(items); i++) push(modems, parse_modem(items[i], i, ARGV[2] || 'unknown'));
    print(sprintf('%J\n', { timestamp: +ARGV[1], interval: +ARGV[3], modems: modems }));
}
else if (ARGV[0] == 'history') {
    let start = +ARGV[1], end = +ARGV[2], limit = +ARGV[3], file = open('/dev/stdin', 'r');
    let ring = [], count = 0, line;
    while ((line = file.read('line')) != null && line != '') {
        let row;
        try { row = json(line); } catch (e) { continue; }
        if (row.timestamp < start || row.timestamp > end || type(row.modems) != 'array') continue;
        ring[count % limit] = row;
        count++;
    }
    sort(ring, (a, b) => a.timestamp - b.timestamp);
    let rows = [], prev = -1;
    for (let row in ring) { if (row.timestamp == prev) continue; push(rows, row); prev = row.timestamp; }
    print(sprintf('%J\n', { rows: rows, truncated: count > limit, observations: count }));
}
