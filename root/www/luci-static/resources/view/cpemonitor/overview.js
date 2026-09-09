'use strict';
'require view';
'require rpc';
'require poll';
'require form';
'require uci';

var callCurrent = rpc.declare({ object: 'cpemonitor', method: 'current', expect: {} });
var callHistory = rpc.declare({ object: 'cpemonitor', method: 'history', params: [ 'start', 'end', 'limit' ], expect: { rows: [] } });
var callDaily = rpc.declare({ object: 'cpemonitor', method: 'daily', expect: { rows: [] } });

function bytes(v) {
	var u = [ 'B', 'KB', 'MB', 'GB', 'TB' ], n = Number(v || 0), i = 0;
	while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
	return n.toFixed(i > 1 ? 2 : 1) + ' ' + u[i];
}
function rate(v) { return bytes(Number(v || 0) / 8) + '/s'; }
function card(id, title) { return E('div', { class: 'cbi-section', style: 'min-width:170px;flex:1;margin:4px;padding:12px' }, [ E('div', { style:'color:#777' }, title), E('div', { id:id, style:'font-size:1.55em;margin-top:6px' }, '--') ]); }
function draw(canvas, rows, series) {
	var dpr = window.devicePixelRatio || 1, w = canvas.clientWidth, h = 260;
	canvas.width = w*dpr; canvas.height = h*dpr; var c=canvas.getContext('2d'); c.scale(dpr,dpr); c.clearRect(0,0,w,h);
	c.save(); c.strokeStyle='rgba(160,160,160,.38)'; c.lineWidth=1; c.setLineDash([5,5]); for(var y=20;y<h;y+=55){c.beginPath();c.moveTo(42,y);c.lineTo(w-8,y);c.stroke();} c.restore();
	if(!rows.length) return;
	var vals=[]; series.forEach(function(s){ rows.forEach(function(r){ var v=Number(r[s.i]); if(v>=s.min) vals.push(v); }); });
	var max=Math.max.apply(null,vals.concat([1])), min=Math.min.apply(null,vals.concat([0])); if(max===min) max=min+1;
	series.forEach(function(s){c.setLineDash([]);c.strokeStyle=s.color;c.lineWidth=2;c.beginPath();var started=false;rows.forEach(function(r,i){var v=Number(r[s.i]);if(v<s.min)return;var x=42+i*(w-52)/Math.max(1,rows.length-1),y=20+(max-v)*(h-40)/(max-min);if(!started){c.moveTo(x,y);started=true}else c.lineTo(x,y)});c.stroke();});
	c.fillStyle='#666';c.font='11px sans-serif';c.fillText(max.toFixed(1),2,24);c.fillText(min.toFixed(1),2,h-18);
}
function tooltip(canvas,getRows,series) {
	var tip=E('div',{style:'display:none;position:fixed;z-index:10000;pointer-events:none;background:rgba(20,20,20,.94);color:#eee;border:1px solid #666;border-radius:5px;padding:7px 9px;font-size:12px;line-height:1.55;box-shadow:0 2px 8px rgba(0,0,0,.35)'});document.body.appendChild(tip);
	canvas.addEventListener('mousemove',function(ev){var rows=getRows(),rect=canvas.getBoundingClientRect();if(!rows.length||rect.width<60)return;var ratio=Math.max(0,Math.min(1,(ev.clientX-rect.left-42)/(rect.width-52))),i=Math.round(ratio*(rows.length-1)),r=rows[i];if(!r)return;var lines=[new Date(Number(r[0])*1000).toLocaleString()];series.forEach(function(s){var v=Number(r[s.i]);if(v>=s.min)lines.push('<span style="color:'+s.color+'">●</span> '+s.name+': '+s.fmt(v));});tip.innerHTML=lines.join('<br>');tip.style.display='block';var x=ev.clientX+14,y=ev.clientY+14;if(x+tip.offsetWidth>window.innerWidth-8)x=ev.clientX-tip.offsetWidth-14;if(y+tip.offsetHeight>window.innerHeight-8)y=ev.clientY-tip.offsetHeight-14;tip.style.left=x+'px';tip.style.top=y+'px';});
	canvas.addEventListener('mouseleave',function(){tip.style.display='none';});
}

return view.extend({
	load: function() { var now=Math.floor(Date.now()/1000); return Promise.all([ uci.load('cpemonitor'), callHistory(now-600,now,1200), callDaily() ]); },
	render: function(data) {
		var hist=Array.isArray(data[1]) ? data[1] : (data[1].rows||[]);
		var daily=Array.isArray(data[2]) ? data[2] : (data[2].rows||[]);
		var speed=E('canvas',{style:'width:100%;height:260px'}), system=E('canvas',{style:'width:100%;height:260px'}), latency=E('canvas',{style:'width:100%;height:260px'}), signal=E('canvas',{style:'width:100%;height:260px'});
		var cards=E('div',{style:'display:flex;flex-wrap:wrap'},[
			card('cm-down','当前下载'),card('cm-up','当前上传'),card('cm-day','今日总流量'),card('cm-cpu','CPU / 内存'),card('cm-temp','CPU / 模组温度'),card('cm-ping','阿里 / 腾讯延迟')]);
		var root=E('div',{},[E('h2',{},'CPE 监控 · 最近 10 分钟'),cards,
			E('div',{class:'cbi-section'},[E('h3',{},'实时速率（下载蓝 / 上传橙）'),speed]),
			E('div',{class:'cbi-section'},[E('h3',{},'系统使用率（CPU 红 / 内存紫）'),system]),
			E('div',{class:'cbi-section'},[E('h3',{},'网络延迟（阿里绿 / 腾讯蓝）'),latency]),
			E('div',{class:'cbi-section'},[E('h3',{},'5G 信号（RSRP 红 / RSRQ 橙 / SINR 绿）'),signal]),
			E('div',{class:'cbi-section'},[E('h3',{},'每日流量'),E('table',{class:'table'},[E('tr',{class:'tr table-titles'},[E('th',{class:'th'},'日期'),E('th',{class:'th'},'下载'),E('th',{class:'th'},'上传'),E('th',{class:'th'},'合计')])].concat(daily.slice(-31).reverse().map(function(r){return E('tr',{class:'tr'},[E('td',{class:'td'},r[0]),E('td',{class:'td'},bytes(r[1])),E('td',{class:'td'},bytes(r[2])),E('td',{class:'td'},bytes(r[3]))]);})))])]);
		tooltip(speed,function(){return hist},[{i:1,name:'下载',color:'#1e88e5',min:0,fmt:rate},{i:2,name:'上传',color:'#fb8c00',min:0,fmt:rate}]);
		tooltip(system,function(){return hist},[{i:3,name:'CPU',color:'#e53935',min:0,fmt:function(v){return v.toFixed(0)+'%';}},{i:4,name:'内存',color:'#8e24aa',min:0,fmt:function(v){return v.toFixed(0)+'%';}}]);
		tooltip(latency,function(){return hist},[{i:8,name:'阿里云',color:'#43a047',min:0,fmt:function(v){return v.toFixed(3)+' ms';}},{i:10,name:'腾讯云',color:'#1e88e5',min:0,fmt:function(v){return v.toFixed(3)+' ms';}}]);
		tooltip(signal,function(){return hist},[{i:14,name:'RSRP',color:'#e53935',min:-200,fmt:function(v){return v+' dBm';}},{i:15,name:'RSRQ',color:'#fb8c00',min:-200,fmt:function(v){return v+' dB';}},{i:16,name:'SINR',color:'#43a047',min:-200,fmt:function(v){return v+' dB';}}]);
		function charts(){draw(speed,hist,[{i:1,color:'#1e88e5',min:0},{i:2,color:'#fb8c00',min:0}]);draw(system,hist,[{i:3,color:'#e53935',min:0},{i:4,color:'#8e24aa',min:0}]);draw(latency,hist,[{i:8,color:'#43a047',min:0},{i:10,color:'#1e88e5',min:0}]);draw(signal,hist,[{i:14,color:'#e53935',min:-200},{i:15,color:'#fb8c00',min:-200},{i:16,color:'#43a047',min:-200}]);}
		window.setTimeout(charts,0); window.addEventListener('resize',charts);
		poll.add(function(){var now=Math.floor(Date.now()/1000);return Promise.all([callCurrent(),callHistory(now-600,now,1200)]).then(function(r){var x=r[0];hist=Array.isArray(r[1]) ? r[1] : (r[1].rows||[]);document.getElementById('cm-down').textContent=rate(x.down_bps);document.getElementById('cm-up').textContent=rate(x.up_bps);document.getElementById('cm-day').textContent=bytes(Number(x.day_download)+Number(x.day_upload));document.getElementById('cm-cpu').textContent=x.cpu_pct+'% / '+x.mem_pct+'%';document.getElementById('cm-temp').textContent=x.cpu_temp+'°C / '+x.modem_temp+'°C';document.getElementById('cm-ping').textContent=x.aliyun_ms+' / '+x.tencent_ms+' ms';charts();});},10);
		return root;
	},
	handleSaveApply: null, handleSave: null, handleReset: null
});
