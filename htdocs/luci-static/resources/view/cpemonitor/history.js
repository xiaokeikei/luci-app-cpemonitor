'use strict';
'require view';
'require rpc';
'require ui';
'require cpemonitor.bands as bands';

var callHistory = rpc.declare({ object:'cpemonitor', method:'history', params:['start','end','limit'], expect:{ rows:[] } });
var callBands = rpc.declare({ object:'cpemonitor', method:'band_history', params:['start','end','limit'], expect:{} });

function localValue(d) {
	var p=function(v){return String(v).padStart(2,'0');};
	return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes());
}
function draw(canvas, rows, series) {
	var dpr=window.devicePixelRatio||1,w=canvas.clientWidth,h=280;
	canvas.width=w*dpr;canvas.height=h*dpr;var c=canvas.getContext('2d');c.scale(dpr,dpr);c.clearRect(0,0,w,h);
	c.save();c.strokeStyle='rgba(160,160,160,.38)';c.setLineDash([5,5]);for(var y=20;y<h-25;y+=55){c.beginPath();c.moveTo(46,y);c.lineTo(w-8,y);c.stroke();}c.restore();
	if(!rows.length){c.fillStyle='#999';c.font='14px sans-serif';c.fillText(_('No data for the selected period'),Math.max(50,w/2-70),h/2);return;}
	var vals=[];series.forEach(function(s){rows.forEach(function(r){var v=Number(r[s.i]);if(isFinite(v)&&v>=s.min)vals.push(s.map?s.map(v):v);});});
	var max=Math.max.apply(null,vals.concat([1])),min=Math.min.apply(null,vals.concat([0]));if(max===min)max=min+1;
	series.forEach(function(s){c.setLineDash([]);c.strokeStyle=s.color;c.lineWidth=2;c.beginPath();var begun=false;rows.forEach(function(r,i){var raw=Number(r[s.i]);if(!isFinite(raw)||raw<s.min)return;var v=s.map?s.map(raw):raw,x=46+i*(w-56)/Math.max(1,rows.length-1),y=20+(max-v)*(h-50)/(max-min);if(!begun){c.moveTo(x,y);begun=true}else c.lineTo(x,y)});c.stroke();});
	c.fillStyle='#888';c.font='11px sans-serif';c.fillText(max.toFixed(1),2,24);c.fillText(min.toFixed(1),2,h-28);
	var first=new Date(Number(rows[0][0])*1000),last=new Date(Number(rows[rows.length-1][0])*1000);
	c.fillText(first.toLocaleString(),46,h-7);var label=last.toLocaleString(),tw=c.measureText(label).width;c.fillText(label,w-tw-8,h-7);
}
function tooltip(canvas,getRows,series) {
	var tip=E('div',{style:'display:none;position:fixed;z-index:10000;pointer-events:none;background:rgba(20,20,20,.94);color:#eee;border:1px solid #666;border-radius:5px;padding:7px 9px;font-size:12px;line-height:1.55;box-shadow:0 2px 8px rgba(0,0,0,.35)'});document.body.appendChild(tip);
	canvas.addEventListener('mousemove',function(ev){var rows=getRows(),rect=canvas.getBoundingClientRect();if(!rows.length||rect.width<60)return;var ratio=Math.max(0,Math.min(1,(ev.clientX-rect.left-46)/(rect.width-56))),i=Math.round(ratio*(rows.length-1)),r=rows[i];if(!r)return;var lines=[new Date(Number(r[0])*1000).toLocaleString()];series.forEach(function(s){var v=Number(r[s.i]);if(v>=s.min)lines.push('<span style="color:'+s.color+'">●</span> '+s.name+': '+s.fmt(v));});tip.innerHTML=lines.join('<br>');tip.style.display='block';var x=ev.clientX+14,y=ev.clientY+14;if(x+tip.offsetWidth>window.innerWidth-8)x=ev.clientX-tip.offsetWidth-14;if(y+tip.offsetHeight>window.innerHeight-8)y=ev.clientY-tip.offsetHeight-14;tip.style.left=x+'px';tip.style.top=y+'px';});
	canvas.addEventListener('mouseleave',function(){tip.style.display='none';});
}
function panel(title,legend){var canvas=E('canvas',{style:'width:100%;height:280px'});return {canvas:canvas,node:E('div',{class:'cbi-section'},[E('h3',{},title),E('div',{style:'color:#888;margin-bottom:5px'},legend),canvas])};}

return view.extend({
	render:function(){
		var now=new Date(),start=new Date(now.getTime()-3600000);
		var from=E('input',{type:'datetime-local',class:'cbi-input-text',value:localValue(start)}),to=E('input',{type:'datetime-local',class:'cbi-input-text',value:localValue(now)});
		var speed=panel(_('Up/down throughput'),_('Download (blue) / upload (orange), in Mbps'));
		var system=panel(_('System usage'),_('CPU (red) / memory (purple), in %'));
		var temp=panel(_('Device temperature and fan'),_('CPU (red) / Wi-Fi (blue) / modem (orange), in °C; fan (green), in %'));
		var latency=panel(_('Network latency'),_('Aliyun (green) / Tencent (blue), in ms'));
		var signal=panel(_('5G signal'),_('RSRP (red) / RSRQ (orange) / SINR (green), in dB/dBm'));
		var status=E('span',{style:'margin-left:12px;color:#888'},'');
		var bandPanel=E('div',{}),queryRequest=0;
		var redraw=function(rows){draw(speed.canvas,rows,[{i:1,color:'#1e88e5',min:0,map:function(v){return v/1000000;}},{i:2,color:'#fb8c00',min:0,map:function(v){return v/1000000;}}]);draw(system.canvas,rows,[{i:3,color:'#e53935',min:0},{i:4,color:'#8e24aa',min:0}]);draw(temp.canvas,rows,[{i:5,color:'#e53935',min:0},{i:6,color:'#1e88e5',min:0},{i:7,color:'#fb8c00',min:0},{i:17,color:'#43a047',min:0}]);draw(latency.canvas,rows,[{i:8,color:'#43a047',min:0},{i:10,color:'#1e88e5',min:0}]);draw(signal.canvas,rows,[{i:14,color:'#e53935',min:-200},{i:15,color:'#fb8c00',min:-200},{i:16,color:'#43a047',min:-200}]);};
		var query=function(){var a=Math.floor(new Date(from.value).getTime()/1000),b=Math.floor(new Date(to.value).getTime()/1000);if(!isFinite(a)||!isFinite(b)){ui.addNotification(null,E('p',{},_('Please select valid start and end times.')));return;}if(a>b){var swap=a;a=b;b=swap;}var request=++queryRequest;status.textContent=_('Querying…');return Promise.all([callHistory(a,b,2000),callBands(a,b,5000)]).then(function(r){if(request!==queryRequest)return;var rows=Array.isArray(r[0])?r[0]:(r[0].rows||[]);status.textContent=_('%s samples shown').format(rows.length);redraw(rows);bandPanel.replaceChildren(bands.render(r[1],a,b));}).catch(function(err){if(request===queryRequest){status.textContent=_('Query failed');ui.addNotification(null,E('p',{},err.message),'error');}});};
		var button=E('button',{class:'btn cbi-button cbi-button-action',click:query},_('Query'));
		var lastHour=E('button',{class:'btn cbi-button',style:'margin-left:6px',click:function(){var n=new Date();from.value=localValue(new Date(n-3600000));to.value=localValue(n);query();}},_('Last hour'));
		var today=E('button',{class:'btn cbi-button',style:'margin-left:6px',click:function(){var n=new Date(),s=new Date(n.getFullYear(),n.getMonth(),n.getDate());from.value=localValue(s);to.value=localValue(n);query();}},_('Today'));
		var root=E('div',{},[E('h2',{},_('CPE Monitor · History')),E('div',{class:'cbi-section'},[E('label',{style:'margin-right:6px'},_('Start')),from,E('label',{style:'margin:0 6px 0 14px'},_('End')),to,button,lastHour,today,status]),speed.node,system.node,temp.node,latency.node,signal.node,bandPanel]);
		var rowsNow=[];var oldRedraw=redraw;redraw=function(rows){rowsNow=rows;oldRedraw(rows);};
		tooltip(speed.canvas,function(){return rowsNow},[{i:1,name:_('Download'),color:'#1e88e5',min:0,fmt:function(v){return (v/1000000).toFixed(3)+' Mbps';}},{i:2,name:_('Upload'),color:'#fb8c00',min:0,fmt:function(v){return (v/1000000).toFixed(3)+' Mbps';}}]);
		tooltip(system.canvas,function(){return rowsNow},[{i:3,name:'CPU',color:'#e53935',min:0,fmt:function(v){return v.toFixed(0)+'%';}},{i:4,name:_('Memory'),color:'#8e24aa',min:0,fmt:function(v){return v.toFixed(0)+'%';}}]);
		tooltip(temp.canvas,function(){return rowsNow},[{i:5,name:'CPU',color:'#e53935',min:0,fmt:function(v){return v.toFixed(1)+'°C';}},{i:6,name:'Wi-Fi',color:'#1e88e5',min:0,fmt:function(v){return v.toFixed(1)+'°C';}},{i:7,name:_('Modem'),color:'#fb8c00',min:0,fmt:function(v){return v.toFixed(1)+'°C';}},{i:17,name:_('Fan'),color:'#43a047',min:0,fmt:function(v){return v.toFixed(0)+'%';}}]);
		tooltip(latency.canvas,function(){return rowsNow},[{i:8,name:_('Aliyun'),color:'#43a047',min:0,fmt:function(v){return v.toFixed(3)+' ms';}},{i:10,name:_('Tencent'),color:'#1e88e5',min:0,fmt:function(v){return v.toFixed(3)+' ms';}}]);
		tooltip(signal.canvas,function(){return rowsNow},[{i:14,name:'RSRP',color:'#e53935',min:-200,fmt:function(v){return v+' dBm';}},{i:15,name:'RSRQ',color:'#fb8c00',min:-200,fmt:function(v){return v+' dB';}},{i:16,name:'SINR',color:'#43a047',min:-200,fmt:function(v){return v+' dB';}}]);
		window.setTimeout(query,0);window.addEventListener('resize',function(){query();});return root;
	},handleSaveApply:null,handleSave:null,handleReset:null
});
