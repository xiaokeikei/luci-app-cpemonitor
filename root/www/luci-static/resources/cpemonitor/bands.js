'use strict';
'require baseclass';

function label(modem) {
	if(!modem||modem.status!=='known')return modem&&modem.status==='unavailable'?'未连接 / 无法读取':'未知 / 接口未报告';
	var carriers=modem.carriers||[],names=carriers.length?carriers.map(function(c){return c.band;}):(modem.bands||[]);
	return names.slice().sort().join(' + ')+' · '+(modem.mode||'未知制式');
}
function color(value){var hash=0;for(var i=0;i<value.length;i++)hash=(hash*31+value.charCodeAt(i))>>>0;return 'hsl('+(hash%360)+',55%,42%)';}
function time(t){return new Date(Number(t)*1000).toLocaleString();}
function segments(rows,start,end){
	var ids=Object.create(null),result=Object.create(null);
	rows.forEach(function(row){(row.modems||[]).forEach(function(m){ids[m.id]=true;});});
	Object.keys(ids).sort().forEach(function(id){
		var points=[];rows.forEach(function(row){var m=(row.modems||[]).filter(function(m){return m.id===id;})[0];points.push({t:Number(row.timestamp),interval:Number(row.interval)||60,m:m});});
		var list=[],events=[];
		function add(a,b,name,known){a=Math.max(start,a);b=Math.min(end,b);if(b<=a)return;var last=list[list.length-1];if(last&&last.label===name&&last.end===a){last.end=b;return;}list.push({start:a,end:b,label:name,known:known});}
		var cursor=start,previous=null;
		points.forEach(function(p,i){
			if((!p.m||p.m.status!=='known')&&previous&&previous.m&&previous.m.status==='known')p.m=previous.m;
			if(p.t>cursor)add(cursor,p.t,'未采样',false);
			var next=points[i+1],until=Math.min(end,next?next.t:end,p.t+p.interval*2.5),known=p.m&&p.m.status==='known',name=label(p.m);
			add(p.t,until,name,known);cursor=Math.max(cursor,until);
			if(previous&&known&&previous.m&&previous.m.status==='known'&&p.t-previous.t<=Math.max(p.interval,previous.interval)*2.5&&label(previous.m)!==name)events.push({t:p.t,from:label(previous.m),to:name});
			previous=p;
		});
		add(cursor,end,'未采样',false);result[id]={segments:list,events:events};
	});return result;
}
return baseclass.extend({
	currentLabel:function(data){return (data&&data.modems||[]).map(function(m){return ((data.modems||[]).length>1?m.id+': ':'')+label(m);}).join('；')||'未知 / 接口未报告';},
	segments:segments,
	render:function(data,start,end){
		var rows=(data&&data.rows||[]).slice().sort(function(a,b){return a.timestamp-b.timestamp;}),tracks=segments(rows,start,end),nodes=[],events=[];
		Object.keys(tracks).forEach(function(id){var track=tracks[id];nodes.push(E('div',{style:'margin:10px 0'},[
			E('div',{style:'font-size:12px;margin-bottom:4px'},id),E('div',{style:'display:flex;width:100%;height:30px;border-radius:4px;overflow:hidden'},track.segments.map(function(s){return E('div',{title:time(s.start)+' 至 '+time(s.end)+'：'+s.label,style:'flex:0 0 '+((s.end-s.start)*100/Math.max(1,end-start))+'%;background:'+(s.known?color(s.label):'#555')+';color:white;overflow:hidden;white-space:nowrap;font-size:11px;line-height:30px;text-align:center'},s.label);})),
			E('div',{style:'display:flex;justify-content:space-between;font-size:11px;color:#888'},[E('span',{},time(start)),E('span',{},time(end))])
		]));track.events.forEach(function(e){events.push({id:id,t:e.t,from:e.from,to:e.to});});});
		if(!rows.length)nodes.push(E('p',{},'所选时间段暂无频段记录；更新前的数据无法补算。'));
		if(data&&data.truncated)nodes.push(E('p',{},'记录较多，仅展示最近 5000 次观察；请缩短查询范围。'));
		events.sort(function(a,b){return b.t-a.t;});
		nodes.push(E('h4',{},'频段 / 网络模式变化记录'));
		if(!events.length)nodes.push(E('p',{},'此范围内没有观察到连续有效采样之间的变化。'));
		else nodes.push(E('div',{style:'max-height:280px;overflow:auto'},events.slice(0,100).map(function(e){return E('div',{style:'padding:7px;border-bottom:1px solid rgba(128,128,128,.2);font-size:12px'},time(e.t)+' · '+e.id+' · '+e.from+' → '+e.to);}))); 
		nodes.push(E('p',{style:'font-size:12px;color:#888'},'仅记录接口报告的在用载波，不代表模组全部支持频段或完整聚合组合。读取失败时沿用上次有效频段；灰色为尚无有效信息或未采样。切换时间为采样发现时间，短暂切换可能漏记。最多显示最近 100 条变化。'));
		return E('div',{class:'cbi-section',style:'padding:12px'},[E('h3',{},'在用频段历史')].concat(nodes));
	}
});
