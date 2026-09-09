'use strict';
'require view';
'require rpc';
'require ui';

var callHistory = rpc.declare({ object:'cpemonitor', method:'history', params:['start','end','limit'], expect:{ rows:[] } });

function localValue(d) {
	var p=function(v){return String(v).padStart(2,'0');};
	return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes());
}
function draw(canvas, rows, series) {
	var dpr=window.devicePixelRatio||1,w=canvas.clientWidth,h=280;
	canvas.width=w*dpr;canvas.height=h*dpr;var c=canvas.getContext('2d');c.scale(dpr,dpr);c.clearRect(0,0,w,h);
	c.save();c.strokeStyle='rgba(160,160,160,.38)';c.setLineDash([5,5]);for(var y=20;y<h-25;y+=55){c.beginPath();c.moveTo(46,y);c.lineTo(w-8,y);c.stroke();}c.restore();
	if(!rows.length){c.fillStyle='#999';c.font='14px sans-serif';c.fillText('所选时间段暂无数据',Math.max(50,w/2-70),h/2);return;}
	var vals=[];series.forEach(function(s){rows.forEach(function(r){var v=Number(r[s.i]);if(isFinite(v)&&v>=s.min)vals.push(s.map?s.map(v):v);});});
	var max=Math.max.apply(null,vals.concat([1])),min=Math.min.apply(null,vals.concat([0]));if(max===min)max=min+1;
	series.forEach(function(s){c.setLineDash([]);c.strokeStyle=s.color;c.lineWidth=2;c.beginPath();var begun=false;rows.forEach(function(r,i){var raw=Number(r[s.i]);if(!isFinite(raw)||raw<s.min)return;var v=s.map?s.map(raw):raw,x=46+i*(w-56)/Math.max(1,rows.length-1),y=20+(max-v)*(h-50)/(max-min);if(!begun){c.moveTo(x,y);begun=true}else c.lineTo(x,y)});c.stroke();});
	c.fillStyle='#888';c.font='11px sans-serif';c.fillText(max.toFixed(1),2,24);c.fillText(min.toFixed(1),2,h-28);
	var first=new Date(Number(rows[0][0])*1000),last=new Date(Number(rows[rows.length-1][0])*1000);
	c.fillText(first.toLocaleString(),46,h-7);var label=last.toLocaleString(),tw=c.measureText(label).width;c.fillText(label,w-tw-8,h-7);
}
function tooltip(canvas,getRows,series) {
	var tip=E('div',{style:'display:none;position:fixed;z-index:10000;pointer-events:none;background:rgba(20,20,20,.94);color:#eee;border:1px solid #666;border-radius:5px;padding:7px 9px;font-size:12px;line-height:1.55;box-shadow:0 2px 8px rgba(0,0,0,.35)'});document.body.appendChild(tip);
	canvas.addEventListener('mousemove',function(ev){var rows=getRows(),rect=canvas.getBoundingClientRect();if(!rows.length||rect.width<60)return;var ratio=Math.max(0,Math.min(1,(ev.clientX-rect.left-46)/(rect.width-56))),i=Math.round(ratio*(rows.length-1)),r=rows[i];if(!r)return;var lines=[new Date(Number(r[0])*1000).toLocaleString()];series.forEach(function(s){var v=Number(r[s.i]);if(isFinite(v)&&v>=s.min)lines.push('<span style="color:'+s.color+'">●</span> '+s.name+': '+s.fmt(v));});tip.innerHTML=lines.join('<br>');tip.style.display='block';var x=ev.clientX+14,y=ev.clientY+14;if(x+tip.offsetWidth>window.innerWidth-8)x=ev.clientX-tip.offsetWidth-14;if(y+tip.offsetHeight>window.innerHeight-8)y=ev.clientY-tip.offsetHeight-14;tip.style.left=x+'px';tip.style.top=y+'px';});
	canvas.addEventListener('mouseleave',function(){tip.style.display='none';});
}
function panel(title,legend){var canvas=E('canvas',{style:'width:100%;height:280px'});return {canvas:canvas,node:E('div',{class:'cbi-section'},[E('h3',{},title),E('div',{style:'color:#888;margin-bottom:5px'},legend),canvas])};}

return view.extend({
	render:function(){
		var now=new Date(),start=new Date(now.getTime()-3600000);
		var from=E('input',{type:'datetime-local',class:'cbi-input-text',value:localValue(start)}),to=E('input',{type:'datetime-local',class:'cbi-input-text',value:localValue(now)});
		var speed=panel('上下行速率','下载（蓝）/ 上传（橙），单位 Mbps');
		var system=panel('系统使用率','CPU（红）/ 内存（紫），单位 %');
		var temp=panel('设备温度与风扇','CPU（红）/ Wi-Fi（蓝）/ 模组（橙），单位 °C；风扇（绿），单位 %');
		var latency=panel('网络延迟','阿里云（绿）/ 腾讯云（蓝），单位 ms');
		var signal=panel('5G 信号','RSRP（红）/ RSRQ（橙）/ SINR（绿），单位 dB/dBm');
		var status=E('span',{style:'margin-left:12px;color:#888'},'');
		var redraw=function(rows){draw(speed.canvas,rows,[{i:1,color:'#1e88e5',min:0,map:function(v){return v/1000000;}},{i:2,color:'#fb8c00',min:0,map:function(v){return v/1000000;}}]);draw(system.canvas,rows,[{i:3,color:'#e53935',min:0},{i:4,color:'#8e24aa',min:0}]);draw(temp.canvas,rows,[{i:5,color:'#e53935',min:0},{i:6,color:'#1e88e5',min:0},{i:7,color:'#fb8c00',min:0},{i:17,color:'#43a047',min:0}]);draw(latency.canvas,rows,[{i:8,color:'#43a047',min:0},{i:10,color:'#1e88e5',min:0}]);draw(signal.canvas,rows,[{i:14,color:'#e53935',min:-200},{i:15,color:'#fb8c00',min:-200},{i:16,color:'#43a047',min:-200}]);};
		var query=function(){var a=Math.floor(new Date(from.value).getTime()/1000),b=Math.floor(new Date(to.value).getTime()/1000);if(!isFinite(a)||!isFinite(b)){ui.addNotification(null,E('p',{},'请选择有效的开始和结束时间。'));return;}status.textContent='正在查询…';return callHistory(a,b,2000).then(function(r){var rows=Array.isArray(r)?r:(r.rows||[]);status.textContent='显示 '+rows.length+' 个采样点';redraw(rows);});};
		var button=E('button',{class:'btn cbi-button cbi-button-action',click:query},'查询');
		var lastHour=E('button',{class:'btn cbi-button',style:'margin-left:6px',click:function(){var n=new Date();from.value=localValue(new Date(n-3600000));to.value=localValue(n);query();}},'最近1小时');
		var today=E('button',{class:'btn cbi-button',style:'margin-left:6px',click:function(){var n=new Date(),s=new Date(n.getFullYear(),n.getMonth(),n.getDate());from.value=localValue(s);to.value=localValue(n);query();}},'今天');
		var root=E('div',{},[E('h2',{},'CPE 监控 · 历史查询'),E('div',{class:'cbi-section'},[E('label',{style:'margin-right:6px'},'开始'),from,E('label',{style:'margin:0 6px 0 14px'},'结束'),to,button,lastHour,today,status]),speed.node,system.node,temp.node,latency.node,signal.node]);
		var rowsNow=[];var oldRedraw=redraw;redraw=function(rows){rowsNow=rows;oldRedraw(rows);};
		tooltip(speed.canvas,function(){return rowsNow},[{i:1,name:'下载',color:'#1e88e5',min:0,fmt:function(v){return (v/1000000).toFixed(3)+' Mbps';}},{i:2,name:'上传',color:'#fb8c00',min:0,fmt:function(v){return (v/1000000).toFixed(3)+' Mbps';}}]);
		tooltip(system.canvas,function(){return rowsNow},[{i:3,name:'CPU',color:'#e53935',min:0,fmt:function(v){return v.toFixed(0)+'%';}},{i:4,name:'内存',color:'#8e24aa',min:0,fmt:function(v){return v.toFixed(0)+'%';}}]);
		tooltip(temp.canvas,function(){return rowsNow},[{i:5,name:'CPU',color:'#e53935',min:0,fmt:function(v){return v.toFixed(1)+'°C';}},{i:6,name:'Wi-Fi',color:'#1e88e5',min:0,fmt:function(v){return v.toFixed(1)+'°C';}},{i:7,name:'模组',color:'#fb8c00',min:0,fmt:function(v){return v.toFixed(1)+'°C';}},{i:17,name:'风扇',color:'#43a047',min:0,fmt:function(v){return v.toFixed(0)+'%';}}]);
		tooltip(latency.canvas,function(){return rowsNow},[{i:8,name:'阿里云',color:'#43a047',min:0,fmt:function(v){return v.toFixed(3)+' ms';}},{i:10,name:'腾讯云',color:'#1e88e5',min:0,fmt:function(v){return v.toFixed(3)+' ms';}}]);
		tooltip(signal.canvas,function(){return rowsNow},[{i:14,name:'RSRP',color:'#e53935',min:-200,fmt:function(v){return v+' dBm';}},{i:15,name:'RSRQ',color:'#fb8c00',min:-200,fmt:function(v){return v+' dB';}},{i:16,name:'SINR',color:'#43a047',min:-200,fmt:function(v){return v+' dB';}}]);
		window.setTimeout(query,0);window.addEventListener('resize',function(){query();});return root;
	},handleSaveApply:null,handleSave:null,handleReset:null
});
