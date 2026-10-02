const fs=require('fs'),assert=require('assert');
const nodes=[],labels=[];
const ctx=new Proxy({}, {get:(o,k)=>k==='measureText'?s=>({width:s.length*6}):k==='fillText'?s=>labels.push(s):()=>{}});
function E(tag,attrs={},children=[]){const n={tag,...attrs,children,clientWidth:700,value:attrs.value,addEventListener(){},getContext:()=>ctx,replaceChildren(...v){this.children=v;}};nodes.push(n);return n;}
const api=new Function('baseclass','E','window',fs.readFileSync('root/www/luci-static/resources/cpemonitor/traffic.js','utf8'))({extend:x=>x},E,{devicePixelRatio:1,addEventListener(){},setTimeout:f=>f()});
assert.equal(api.monthStart(new Date(2026,2,31)),'2026-02-28');
assert.equal(api.monthStart(new Date(2024,2,31)),'2024-02-29');
const rows=[['2026-10-02',20,10,30],['2026-09-30',10,5,15],['2026-10-01',15,7,22]];
assert.deepEqual(api.select(rows,'2026-10-01','2026-10-02').map(r=>r[0]),['2026-10-01','2026-10-02']);
assert.equal(rows[0][0],'2026-10-02');
const chart=api.create(rows),inputs=nodes.filter(n=>n.type==='date'),query=nodes.find(n=>n.tag==='button'&&n.children==='查询');
inputs[0].value='2026-09-30';inputs[1].value='2026-10-02';query.click();
assert(labels.includes('2026-09-30')&&labels.includes('2026-10-02')&&labels.includes('流量（GB）'));
inputs[0].value='2026-10-03';query.click();assert(nodes.some(n=>n.textContent==='开始日期不能晚于结束日期'));
inputs[0].value='2026-10-02';query.click();chart.update([rows[0]]);
inputs[0].value='2025-01-01';inputs[1].value='2025-01-01';query.click();assert(nodes.some(n=>(n.textContent||'').includes('暂无记录')));
console.log('PASS: calendar-month defaults, inclusive date selection, sorting, axes, single-day and empty ranges, invalid range validation.');
