'use strict';
'require baseclass';

function modeName(mode){return mode&&mode!=='unknown'?mode:_('Unknown');}
function label(modem) {
	if(!modem||modem.status!=='known')return modem&&modem.status==='unavailable'?_('Not connected / unreadable'):_('Unknown / not reported');
	var carriers=modem.carriers||[],names=carriers.length?carriers.map(function(c){return c.band;}):(modem.bands||[]);
	return names.slice().sort().join(' + ')+' · '+modeName(modem.mode);
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
			if(p.t>cursor)add(cursor,p.t,_('No sample'),false);
			var next=points[i+1],until=Math.min(end,next?next.t:end,p.t+p.interval*2.5),known=p.m&&p.m.status==='known',name=label(p.m);
			add(p.t,until,name,known);cursor=Math.max(cursor,until);
			if(previous&&known&&previous.m&&previous.m.status==='known'&&p.t-previous.t<=Math.max(p.interval,previous.interval)*2.5&&label(previous.m)!==name)events.push({t:p.t,from:label(previous.m),to:name});
			previous=p;
		});
		add(cursor,end,_('No sample'),false);result[id]={segments:list,events:events};
	});return result;
}
return baseclass.extend({
	currentLabel:function(data){return (data&&data.modems||[]).map(function(m){return ((data.modems||[]).length>1?m.id+': ':'')+label(m);}).join('; ')||_('Unknown / not reported');},
	segments:segments,
	render:function(data,start,end){
		var rows=(data&&data.rows||[]).slice().sort(function(a,b){return a.timestamp-b.timestamp;}),tracks=segments(rows,start,end),nodes=[],events=[];
		Object.keys(tracks).forEach(function(id){var track=tracks[id];nodes.push(E('div',{style:'margin:10px 0'},[
			E('div',{style:'font-size:12px;margin-bottom:4px'},id),E('div',{style:'display:flex;width:100%;height:30px;border-radius:4px;overflow:hidden'},track.segments.map(function(s){return E('div',{title:time(s.start)+' - '+time(s.end)+': '+s.label,style:'flex:0 0 '+((s.end-s.start)*100/Math.max(1,end-start))+'%;background:'+(s.known?color(s.label):'#555')+';color:white;overflow:hidden;white-space:nowrap;font-size:11px;line-height:30px;text-align:center'},s.label);})),
			E('div',{style:'display:flex;justify-content:space-between;font-size:11px;color:#888'},[E('span',{},time(start)),E('span',{},time(end))])
		]));track.events.forEach(function(e){events.push({id:id,t:e.t,from:e.from,to:e.to});});});
		if(!rows.length)nodes.push(E('p',{},_('No band records in the selected period; data from before the update cannot be reconstructed.')));
		if(data&&data.truncated)nodes.push(E('p',{},_('Too many records; only the last 5000 observations are shown. Narrow the query range.')));
		nodes.push(E('h4',{},_('Band / network mode changes')));
		if(!events.length)nodes.push(E('p',{},_('No changes between consecutive valid samples observed in this range.')));
		else nodes.push(E('div',{style:'max-height:280px;overflow:auto'},events.slice(0,100).map(function(e){return E('div',{style:'padding:7px;border-bottom:1px solid rgba(128,128,128,.2);font-size:12px'},time(e.t)+' · '+e.id+' · '+e.from+' → '+e.to);}))); 
		nodes.push(E('p',{style:'font-size:12px;color:#888'},_('Only serving carriers reported by the interface are recorded; this does not represent all bands supported by the modem or the full aggregation set. The last valid bands are kept when reading fails; grey means no valid information or no sample. Switch times are detection times, so brief switches may be missed. At most the latest 100 changes are shown.')));
		return E('div',{class:'cbi-section',style:'padding:12px'},[E('h3',{},_('Bands in use history'))].concat(nodes));
	}
});
