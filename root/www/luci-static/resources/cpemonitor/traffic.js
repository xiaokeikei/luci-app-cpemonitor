'use strict';
'require baseclass';

var series=[{i:2,name:'上传',color:'#fb8c00'},{i:1,name:'下载',color:'#1e88e5'},{i:3,name:'总流量',color:'#43a047'}];
function dateValue(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function day(value){return Date.parse(value+'T00:00:00Z')/86400000;}
function select(rows,start,end){return rows.filter(function(r){return r[0]>=start&&r[0]<=end;}).slice().sort(function(a,b){return a[0].localeCompare(b[0]);});}
function monthStart(now){var d=new Date(now.getFullYear(),now.getMonth(),now.getDate()),n=d.getDate();d.setDate(1);d.setMonth(d.getMonth()-1);d.setDate(Math.min(n,new Date(d.getFullYear(),d.getMonth()+1,0).getDate()));return dateValue(d);}

return baseclass.extend({
	select:select,monthStart:monthStart,
	create:function(initial){
		var rows=initial||[],shown=[],now=new Date(),start=monthStart(now),end=dateValue(now);
		var from=E('input',{type:'date',class:'cbi-input-text',value:start,'aria-label':'流量开始日期'}),to=E('input',{type:'date',class:'cbi-input-text',value:end,'aria-label':'流量结束日期'});
		var status=E('div',{'aria-live':'polite',style:'font-size:12px;color:#888;margin:8px 0'}),canvas=E('canvas',{'aria-label':'每日上传、下载及总流量折线图',style:'width:100%;height:300px;display:block'});
		var tip=E('div',{style:'min-height:24px;font-size:12px;text-align:center'},'移动鼠标或轻触图表查看每日流量');
		function draw(){
			shown=select(rows,start,end);
			var w=canvas.clientWidth,h=300,dpr=window.devicePixelRatio||1;if(!w)return;
			canvas.width=w*dpr;canvas.height=h*dpr;var c=canvas.getContext('2d');c.scale(dpr,dpr);
			var left=62,right=w-18,top=26,bottom=258,a=day(start),b=day(end),max=1;
			shown.forEach(function(r){series.forEach(function(s){max=Math.max(max,Number(r[s.i])/1073741824||0);});});max=Math.ceil(max*1.1);
			c.font='11px sans-serif';c.fillStyle='#888';c.fillText('流量（GB）',4,14);
			for(var i=0;i<=4;i++){var y=bottom-i*(bottom-top)/4;c.strokeStyle='rgba(160,160,160,.3)';c.beginPath();c.moveTo(left,y);c.lineTo(right,y);c.stroke();c.fillText((max*i/4).toFixed(1),4,y+4);}
			function x(r){return b===a?(left+right)/2:left+(day(r[0])-a)*(right-left)/(b-a);}
			series.forEach(function(s){c.strokeStyle=s.color;c.fillStyle=s.color;c.lineWidth=2;c.beginPath();var prev=null;shown.forEach(function(r){var y=bottom-Number(r[s.i])/1073741824*(bottom-top)/max;if(prev===null||day(r[0])-prev>1)c.moveTo(x(r),y);else c.lineTo(x(r),y);prev=day(r[0]);});c.stroke();shown.forEach(function(r){c.beginPath();c.arc(x(r),bottom-Number(r[s.i])/1073741824*(bottom-top)/max,2.5,0,Math.PI*2);c.fill();});});
			var ticks=Math.min(Math.max(1,b-a),Math.max(1,Math.floor((right-left)/100)));c.fillStyle='#888';
			for(var i=0;i<=ticks;i++){if(a===b&&i)break;var t=a+Math.round((b-a)*i/ticks),label=new Date(t*86400000).toISOString().slice(0,10),px=a===b?(left+right)/2:left+(t-a)*(right-left)/Math.max(1,b-a);c.fillText(label,Math.max(0,Math.min(w-c.measureText(label).width,px-c.measureText(label).width/2)),278);}
			c.fillText('日期',Math.max(left,w/2-12),297);
			status.textContent=start+' 至 '+end+' · '+(shown.length?'显示 '+shown.length+' 天记录（今天为截至当前的累计量）':'此时间范围暂无记录');
		}
		function query(){if(!from.value||!to.value||!isFinite(day(from.value))||!isFinite(day(to.value))){status.textContent='请选择有效日期';return;}if(from.value>to.value){status.textContent='开始日期不能晚于结束日期';return;}start=from.value;end=to.value;tip.textContent='移动鼠标或轻触图表查看每日流量';draw();}
		function inspect(ev){if(!shown.length)return;var rect=canvas.getBoundingClientRect(),p=ev.touches?ev.touches[0]:ev,target=day(start)+Math.max(0,Math.min(1,(p.clientX-rect.left-62)/(rect.width-80)))*(day(end)-day(start)),r=shown.reduce(function(best,r){return Math.abs(day(r[0])-target)<Math.abs(day(best[0])-target)?r:best;});tip.replaceChildren(E('span',{},r[0]+'　'),...series.map(function(s){return E('span',{style:'color:'+s.color+';margin-right:12px'},s.name+' '+(Number(r[s.i])/1073741824).toFixed(2)+' GB');}));}
		canvas.addEventListener('mousemove',inspect);canvas.addEventListener('touchstart',inspect,{passive:true});canvas.addEventListener('touchmove',inspect,{passive:true});
		var node=E('div',{},[E('div',{style:'display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:10px 0'},[E('label',{},['开始 ',from]),E('label',{},['结束 ',to]),E('button',{type:'button',class:'cbi-button cbi-button-action',click:query},'查询'),E('button',{type:'button',class:'cbi-button',click:function(){var n=new Date();from.value=monthStart(n);to.value=dateValue(n);query();}},'最近一个月')]),E('div',{style:'display:flex;flex-wrap:wrap;gap:16px;font-size:12px'},series.map(function(s){return E('span',{style:'color:'+s.color},'● '+s.name);})),status,canvas,tip]);
		window.addEventListener('resize',draw);window.setTimeout(draw,0);
		return {node:node,update:function(value){rows=value||[];draw();}};
	}
});
