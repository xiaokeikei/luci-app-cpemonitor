'use strict';
'require view';
'require rpc';
'require poll';
'require form';
'require uci';
'require ui';
'require cpemonitor.bands as bands';
'require cpemonitor.traffic as traffic';

var callCurrent = rpc.declare({ object: 'cpemonitor', method: 'current', expect: {} });
var callHistory = rpc.declare({ object: 'cpemonitor', method: 'history', params: [ 'start', 'end', 'limit' ], expect: { rows: [] } });
var callDaily = rpc.declare({ object: 'cpemonitor', method: 'daily', expect: { rows: [] } });
var callMonthly = rpc.declare({ object: 'cpemonitor', method: 'monthly', expect: {} });
var callRadio = rpc.declare({ object:'cpemonitor', method:'radio', expect:{} });
var callBands = rpc.declare({ object:'cpemonitor', method:'band_history', params:['start','end','limit'], expect:{} });
var callQuotaAction = rpc.declare({ object: 'cpemonitor', method: 'quota_action', params: [ 'action' ], expect: {} });
var speedUnit = 'Mbps', lastCurrent = null;

function bytes(v) {
	var u = [ 'B', 'KB', 'MB', 'GB', 'TB' ], n = Number(v || 0), i = 0;
	while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
	return n.toFixed(i > 1 ? 2 : 1) + ' ' + u[i];
}
function speedValue(v) { v=Number(v||0);if(speedUnit==='Kbps')return v/1000;if(speedUnit==='Mbps')return v/1000000;if(speedUnit==='KB/s')return v/8000;return v/8000000; }
function rate(v) { return speedValue(v).toFixed(2)+' '+speedUnit; }
function ensureCurrentTab() {
	var container=document.querySelector('#tabmenu');if(!container)return;
	function insert(){var tabs=container.querySelector('ul.tabs');if(!tabs)return false;
		if(!tabs.querySelector('.tabmenu-item-current'))tabs.insertBefore(E('li',{class:'tabmenu-item-current'+(L.env.dispatchpath[3]==='current'?' active':'')},[E('a',{href:L.url('admin/status/cpemonitor/current')},'现在状态')]),tabs.firstChild);
		return true;
	}
	if(!insert()){var observer=new MutationObserver(function(){if(insert())observer.disconnect();});observer.observe(container,{childList:true,subtree:true});}
}
function dailyTable(rows) {
	var rowStyle='display:grid;grid-template-columns:repeat(4,minmax(0,1fr));align-items:center';
	function cell(text,header){return E('div',{role:header?'columnheader':'cell',style:'text-align:center;padding:12px 6px;white-space:nowrap'},text);}
	return E('div',{style:'overflow-x:auto'},[E('div',{role:'table','aria-label':'每日流量',style:'min-width:360px;width:100%;font-size:12px'},[
		E('div',{role:'row',style:rowStyle+';font-weight:bold;border-bottom:1px solid #777'},['日期','上传','下载','总流量'].map(function(label){return cell(label,true);}))
	].concat(rows.slice(-31).reverse().map(function(r,i){return E('div',{role:'row',style:rowStyle+';background:'+(i%2?'transparent':'rgba(128,128,128,.08)')},[cell(r[0]),cell(bytes(r[2])),cell(bytes(r[1])),cell(bytes(r[3]))]);}))) ]);
}
function card(id, title) { return E('div', { class: 'cbi-section', style: 'min-width:170px;flex:1;margin:4px;padding:12px' }, [ E('div', { style:'color:#777' }, title), E('div', { id:id, style:'font-size:1.55em;margin-top:6px' }, '--') ]); }
function draw(canvas, rows, series) {
	var dpr = window.devicePixelRatio || 1, w = canvas.clientWidth, h = 260;
	canvas.width = w*dpr; canvas.height = h*dpr; var c=canvas.getContext('2d'); c.scale(dpr,dpr); c.clearRect(0,0,w,h);
	c.save(); c.strokeStyle='rgba(160,160,160,.38)'; c.lineWidth=1; c.setLineDash([5,5]); for(var y=20;y<h;y+=55){c.beginPath();c.moveTo(42,y);c.lineTo(w-8,y);c.stroke();} c.restore();
	if(!rows.length) return;
	var vals=[]; series.forEach(function(s){ rows.forEach(function(r){ var v=Number(r[s.i]); if(isFinite(v)&&v>=s.min) vals.push(s.map?s.map(v):v); }); });
	var max=Math.max.apply(null,vals.concat([1])), min=Math.min.apply(null,vals.concat([0])); if(max===min) max=min+1;
	series.forEach(function(s){c.setLineDash([]);c.strokeStyle=s.color;c.lineWidth=2;c.beginPath();var started=false;rows.forEach(function(r,i){var raw=Number(r[s.i]);if(!isFinite(raw)||raw<s.min)return;var v=s.map?s.map(raw):raw,x=42+i*(w-52)/Math.max(1,rows.length-1),y=20+(max-v)*(h-40)/(max-min);if(!started){c.moveTo(x,y);started=true}else c.lineTo(x,y)});c.stroke();});
	c.fillStyle='#666';c.font='11px sans-serif';c.fillText(max.toFixed(1),2,24);c.fillText(min.toFixed(1),2,h-18);
}
function tooltip(canvas,getRows,series) {
	var tip=E('div',{style:'display:none;position:fixed;z-index:10000;pointer-events:none;background:rgba(20,20,20,.94);color:#eee;border:1px solid #666;border-radius:5px;padding:7px 9px;font-size:12px;line-height:1.55;box-shadow:0 2px 8px rgba(0,0,0,.35)'});document.body.appendChild(tip);
	canvas.addEventListener('mousemove',function(ev){var rows=getRows(),rect=canvas.getBoundingClientRect();if(!rows.length||rect.width<60)return;var ratio=Math.max(0,Math.min(1,(ev.clientX-rect.left-42)/(rect.width-52))),i=Math.round(ratio*(rows.length-1)),r=rows[i];if(!r)return;var lines=[new Date(Number(r[0])*1000).toLocaleString()];series.forEach(function(s){var v=Number(r[s.i]);if(v>=s.min)lines.push('<span style="color:'+s.color+'">●</span> '+s.name+': '+s.fmt(v));});tip.innerHTML=lines.join('<br>');tip.style.display='block';var x=ev.clientX+14,y=ev.clientY+14;if(x+tip.offsetWidth>window.innerWidth-8)x=ev.clientX-tip.offsetWidth-14;if(y+tip.offsetHeight>window.innerHeight-8)y=ev.clientY-tip.offsetHeight-14;tip.style.left=x+'px';tip.style.top=y+'px';});
	canvas.addEventListener('mouseleave',function(){tip.style.display='none';});
}

return view.extend({
	load: function() { ui.menu.flushCache();var now=Math.floor(Date.now()/1000); return Promise.all([ uci.load('cpemonitor'), callHistory(now-600,now,1200), callDaily(), callMonthly(), callRadio(), callBands(now-600,now,5000) ]); },
	render: function(data) {
		speedUnit=uci.get('cpemonitor','main','speed_unit')||'Mbps';
		var hist=Array.isArray(data[1]) ? data[1] : (data[1].rows||[]);
		var daily=Array.isArray(data[2]) ? data[2] : (data[2].rows||[]);
		var trafficChart=traffic.create(daily),dailyRows=E('div',{},[dailyTable(daily)]);
		var ranges=[{seconds:600,label:'10分钟',title:'最近 10 分钟'},{seconds:1800,label:'半小时',title:'最近半小时'},{seconds:3600,label:'1小时',title:'最近 1 小时'},{seconds:7200,label:'2小时',title:'最近 2 小时'},{seconds:18000,label:'5小时',title:'最近 5 小时'},{seconds:43200,label:'12小时',title:'最近 12 小时'},{seconds:0,label:'当天',title:'当天'}];
		var selectedRange=ranges[0], historyRequest=0;
		var bandPanel=E('div',{},[bands.render(data[5],Math.floor(Date.now()/1000)-600,Math.floor(Date.now()/1000))]);
		var rangeTitle=E('span',{},'CPE 监控 · '+selectedRange.title);
		var rangeStatus=E('span',{'aria-live':'polite',style:'font-size:12px;font-weight:normal'},'');
		var rangeButtons=ranges.map(function(range){return E('button',{type:'button',class:'cbi-button','aria-pressed':range===selectedRange?'true':'false',style:'font-size:12px;padding:3px 8px;white-space:nowrap',click:function(){
			selectedRange=range;rangeTitle.textContent='CPE 监控 · '+range.title;updateRangeButtons();
			hist=[];charts();bandPanel.replaceChildren(E('p',{},'正在读取频段记录…'));refreshHistory().catch(function(err){ui.addNotification(null,E('p',{},'加载监控数据失败：'+err.message),'error');});
		}},range.label);});
		function updateRangeButtons(){rangeButtons.forEach(function(button,i){var active=ranges[i]===selectedRange;button.className='cbi-button'+(active?' cbi-button-positive':'');button.setAttribute('aria-pressed',active?'true':'false');button.style.fontWeight=active?'bold':'normal';});}
		function refreshHistory(){
			var request=++historyRequest,now=Math.floor(Date.now()/1000),start=now-selectedRange.seconds;
			if(!selectedRange.seconds){var midnight=new Date(now*1000);midnight.setHours(0,0,0,0);start=Math.floor(midnight.getTime()/1000);}
			rangeStatus.textContent='加载中…';
			return Promise.all([callHistory(start,now,1200),callBands(start,now,5000)]).then(function(r){if(request!==historyRequest)return;var rows=r[0];hist=Array.isArray(rows)?rows:(rows.rows||[]);bandPanel.replaceChildren(bands.render(r[1],start,now));rangeStatus.textContent=hist.length?'':'此时间范围暂无数据';charts();}).catch(function(err){if(request!==historyRequest)return;rangeStatus.textContent='加载失败，请重试';throw err;});
		}
		updateRangeButtons();
		var speed=E('canvas',{style:'width:100%;height:260px'}), system=E('canvas',{style:'width:100%;height:260px'}), temperature=E('canvas',{style:'width:100%;height:260px'}), latency=E('canvas',{style:'width:100%;height:260px'}), signal=E('canvas',{style:'width:100%;height:260px'});
		var unitSelect=E('select',{class:'cbi-input-select',style:'float:right',change:function(ev){speedUnit=ev.target.value;document.getElementById('cm-speed-title').firstChild.data='实时速率（下载蓝 / 上传橙，'+speedUnit+'）';if(lastCurrent){document.getElementById('cm-down').textContent=rate(lastCurrent.down_bps);document.getElementById('cm-up').textContent=rate(lastCurrent.up_bps);}charts();}},['Kbps','Mbps','KB/s','MB/s'].map(function(u){return E('option',{value:u,selected:u===speedUnit?'selected':null},u);}));
		var cards=E('div',{style:'display:flex;flex-wrap:wrap'},[
			card('cm-down','当前下载'),card('cm-up','当前上传'),card('cm-day','今日总流量'),card('cm-cpu','CPU / 内存'),card('cm-temp','CPU / 模组温度'),card('cm-fan','风扇转速'),card('cm-ping','阿里 / 腾讯延迟'),card('cm-band','当前在用频段（接口报告）')]);
		var monthStats=E('div',{}),monthStatus=E('div',{'aria-live':'polite',style:'margin:8px 0'}),monthProgress=E('progress',{max:100,value:0,style:'width:100%;height:18px'});
		var unlockButton=E('button',{type:'button',class:'cbi-button cbi-button-positive',click:function(){quotaAction('unlock');}},'解除限制至本期结束');
		var resumeButton=E('button',{type:'button',class:'cbi-button',style:'margin-left:8px',click:function(){quotaAction('resume');}},'恢复自动限制');
		function showMonthly(q){
			monthPanel.style.display=q&&Number(q.enabled)===1?'':'none';
			if(!q||!q.period_start){monthStats.textContent='月流量统计初始化中…';return;}
			var total=Number(q.total||0),limit=Number(q.limit||0),enabled=Number(q.enabled)===1;
			function gb(v){return (Number(v)/1e9).toFixed(2)+' GB';}
			monthStats.textContent='本期 '+q.period_start+' 至 '+q.period_end+'（不含结束日） · 下载 '+gb(q.download)+' / 上传 '+gb(q.upload)+' / 合计 '+gb(total)+(enabled?' · 额度 '+gb(limit)+' / 剩余 '+gb(Math.max(0,limit-total))+' / 已用 '+Number(q.percent||0).toFixed(2)+'%':'');
			monthProgress.style.display=enabled?'block':'none';monthProgress.value=Math.min(100,Number(q.percent||0));
			var labels={disabled:'未开启额度限制',normal:'正常联网；达到 '+q.threshold+'% 后限速，100% 暂停 WAN',limited:'已限速：下载 '+q.down_mbps+' Mbps / 上传 '+q.up_mbps+' Mbps',blocked:'已达到额度，WAN 联网暂停；局域网管理可用',override:'本期限制已解除，下个账单周期自动恢复',error:'规则未正常生效：'+(q.error||'未知错误')};
			monthStatus.textContent=labels[q.state]||'状态更新中';unlockButton.disabled=!enabled||q.state==='override';resumeButton.disabled=!enabled||q.state!=='override';
		}
		function quotaAction(action){
			ui.showModal(action==='unlock'?'解除本期限制':'恢复自动限制',[
				E('p',{},action==='unlock'?'立即解除限速和断网，直到本期结束。流量仍继续累计；超额可能产生运营商费用。':'立即重新按额度执行限速或断网；如果已达到 100%，WAN 将暂停联网。'),
				E('div',{class:'right'},[E('button',{type:'button',class:'cbi-button',click:ui.hideModal},'取消'),' ',E('button',{type:'button',class:'cbi-button cbi-button-positive',click:function(ev){
					ev.currentTarget.disabled=true;callQuotaAction(action).then(function(q){showMonthly(q);ui.hideModal();}).catch(function(err){ui.hideModal();ui.addNotification(null,E('p',{},'操作失败：'+err.message),'error');});
				}},'确认')])]);
		}
		var monthPanel=E('div',{class:'cbi-section',style:'padding:12px;display:none'},[E('h3',{},'月流量与额度控制'),monthStats,monthProgress,monthStatus,unlockButton,resumeButton,E('p',{style:'font-size:12px;color:#888'},'仅统计已采集流量，与运营商计费可能存在偏差；账单周期和额度可在设置页调整。')]);
		showMonthly(data[3]);
		var root=E('div',{},[E('h2',{style:'display:flex;align-items:center;flex-wrap:wrap;gap:10px'},[rangeTitle,E('span',{role:'group','aria-label':'监控时间范围',style:'display:flex;flex-wrap:wrap;gap:5px;align-items:center'},rangeButtons),rangeStatus]),cards,
			monthPanel,
			E('div',{class:'cbi-section'},[E('h3',{id:'cm-speed-title'},['实时速率（下载蓝 / 上传橙，'+speedUnit+'）',unitSelect]),speed]),
			E('div',{class:'cbi-section'},[E('h3',{},'网络延迟（阿里绿 / 腾讯蓝）'),latency]),
			E('div',{class:'cbi-section'},[E('h3',{},'系统使用率（CPU 红 / 内存紫）'),system]),
			E('div',{class:'cbi-section'},[E('h3',{},'设备温度与风扇（CPU 红 / Wi-Fi 蓝 / 模组橙 / 风扇绿）'),temperature]),
			E('div',{class:'cbi-section'},[E('h3',{},'5G 信号（RSRP 红 / RSRQ 橙 / SINR 绿）'),signal]),
			bandPanel,
			E('div',{class:'cbi-section'},[E('h3',{},'每日流量趋势'),trafficChart.node]),
			E('div',{class:'cbi-section'},[E('h3',{},'每日流量明细'),dailyRows])]);
		tooltip(speed,function(){return hist},[{i:1,name:'下载',color:'#1e88e5',min:0,fmt:rate},{i:2,name:'上传',color:'#fb8c00',min:0,fmt:rate}]);
		tooltip(system,function(){return hist},[{i:3,name:'CPU',color:'#e53935',min:0,fmt:function(v){return v.toFixed(0)+'%';}},{i:4,name:'内存',color:'#8e24aa',min:0,fmt:function(v){return v.toFixed(0)+'%';}}]);
		tooltip(temperature,function(){return hist},[{i:5,name:'CPU',color:'#e53935',min:0,fmt:function(v){return v.toFixed(1)+'°C';}},{i:6,name:'Wi-Fi',color:'#1e88e5',min:0,fmt:function(v){return v.toFixed(1)+'°C';}},{i:7,name:'模组',color:'#fb8c00',min:0,fmt:function(v){return v.toFixed(1)+'°C';}},{i:17,name:'风扇',color:'#43a047',min:0,fmt:function(v){return v.toFixed(0)+'%';}}]);
		tooltip(latency,function(){return hist},[{i:8,name:'阿里云',color:'#43a047',min:0,fmt:function(v){return v.toFixed(3)+' ms';}},{i:10,name:'腾讯云',color:'#1e88e5',min:0,fmt:function(v){return v.toFixed(3)+' ms';}}]);
		tooltip(signal,function(){return hist},[{i:14,name:'RSRP',color:'#e53935',min:-200,fmt:function(v){return v+' dBm';}},{i:15,name:'RSRQ',color:'#fb8c00',min:-200,fmt:function(v){return v+' dB';}},{i:16,name:'SINR',color:'#43a047',min:-200,fmt:function(v){return v+' dB';}}]);
		function charts(){draw(speed,hist,[{i:1,color:'#1e88e5',min:0,map:speedValue},{i:2,color:'#fb8c00',min:0,map:speedValue}]);draw(system,hist,[{i:3,color:'#e53935',min:0},{i:4,color:'#8e24aa',min:0}]);draw(temperature,hist,[{i:5,color:'#e53935',min:0},{i:6,color:'#1e88e5',min:0},{i:7,color:'#fb8c00',min:0},{i:17,color:'#43a047',min:0}]);draw(latency,hist,[{i:8,color:'#43a047',min:0},{i:10,color:'#1e88e5',min:0}]);draw(signal,hist,[{i:14,color:'#e53935',min:-200},{i:15,color:'#fb8c00',min:-200},{i:16,color:'#43a047',min:-200}]);}
		window.setTimeout(function(){charts();ensureCurrentTab();document.getElementById('cm-band').textContent=bands.currentLabel(data[4]);},0); window.addEventListener('resize',charts);
		poll.add(function(){return callDaily().then(function(r){daily=Array.isArray(r)?r:(r.rows||[]);trafficChart.update(daily);dailyRows.replaceChildren(dailyTable(daily));});},60);
		poll.add(function(){return Promise.all([callCurrent(),refreshHistory(),callMonthly(),callRadio()]).then(function(r){var x=r[0];lastCurrent=x;showMonthly(r[2]);document.getElementById('cm-band').textContent=bands.currentLabel(r[3]);document.getElementById('cm-down').textContent=rate(x.down_bps);document.getElementById('cm-up').textContent=rate(x.up_bps);document.getElementById('cm-day').textContent=bytes(Number(x.day_download)+Number(x.day_upload));document.getElementById('cm-cpu').textContent=x.cpu_pct+'% / '+x.mem_pct+'%';document.getElementById('cm-temp').textContent=x.cpu_temp+'°C / '+x.modem_temp+'°C';document.getElementById('cm-fan').textContent=(x.fan_pct == null ? '--' : x.fan_pct+'%');document.getElementById('cm-ping').textContent=x.aliyun_ms+' / '+x.tencent_ms+' ms';});},10);
		return root;
	},
	handleSaveApply: null, handleSave: null, handleReset: null
});
