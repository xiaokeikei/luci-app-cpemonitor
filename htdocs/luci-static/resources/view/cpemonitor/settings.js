'use strict';
'require view';
'require form';
'require uci';
'require network';
'require ui';

return view.extend({
	load: function() { return Promise.all([uci.load('cpemonitor'), network.getDevices()]); },
	render: function(data) {
		var devices=data[1]||[];
		var m=new form.Map('cpemonitor',_('CPE Monitor Settings'),_('The collection service restarts automatically after saving and applying.'));
		var s=m.section(form.NamedSection,'main','cpemonitor',_('Monitor settings')); s.anonymous=true;
		s.tab('collection',_('Collection'));s.tab('quota',_('Monthly quota'));
		function opt(type,name,title,def){var o=s.taboption('collection',type,name,title);o.default=def;return o;}
		opt(form.Flag,'enabled',_('Enable'),'1');
		var iface=opt(form.ListValue,'interface',_('WAN device'),'wwan0');
		devices.map(function(d){return d.getName();}).filter(function(n){return n&&n!=='lo'&&n!=='br-lan'&&n!=='hnat'&&!/^ra(i)?[0-9]+$/.test(n)&&!/^apcli/.test(n);}).sort().forEach(function(n){var d=devices.filter(function(x){return x.getName()===n;})[0],label=n,type=d&&d.getType?d.getType():'';iface.value(n,type?n+' ('+type+')':n);});
		iface.description=_('Select an existing network device to avoid typing mistakes.');
		var o=opt(form.Value,'sample_interval',_('Base sampling interval (s)'),'10');o.datatype='uinteger';
		o=opt(form.Value,'modem_interval',_('Modem sampling interval (s)'),'60');o.datatype='uinteger';
		o=opt(form.Value,'persist_interval',_('Persistence interval (s)'),'21600');o.datatype='uinteger';
		o=opt(form.Value,'retention_days',_('Retention (days)'),'365');o.datatype='uinteger';
		opt(form.Value,'data_dir',_('Persistent data directory'),'/overlay/cpemonitor');
		opt(form.Value,'aliyun_host',_('Aliyun probe host'),'223.5.5.5'); opt(form.Value,'tencent_host',_('Tencent probe host'),'119.29.29.29');
		o=opt(form.Value,'ping_count',_('Ping count per probe'),'1');o.datatype='range(1,5)';
		o=opt(form.Value,'ping_timeout',_('Ping timeout (s)'),'2');o.datatype='range(1,10)';
		o=opt(form.ListValue,'speed_unit',_('Live speed unit'),'Mbps');o.value('Kbps','Kbps');o.value('Mbps','Mbps');o.value('KB/s','KB/s');o.value('MB/s','MB/s');
		var q={option:function(type,name,title){return s.taboption('quota',type,name,title);}};
		var acknowledged=uci.get('cpemonitor','main','quota_enabled')==='1';
		var enabled=q.option(form.Flag,'quota_enabled',_('Enable monthly quota limit'));enabled.default='0';enabled.rmempty=false;
		enabled.description=_('Counted as download + upload combined; throttled at the threshold, WAN paused at 100%. LAN management stays reachable.');
		enabled.onchange=function(ev,section,value){
			if(value!=='1'){acknowledged=false;return;}
			var option=this;acknowledged=false;
			ui.showModal(_('Confirm before enabling traffic limiting'),[
				E('p',{},_('Local statistics may differ from the carrier bill; sampling interval, sudden power loss, protocol overhead and previously unrecorded traffic all affect accuracy. Throttling or blocking may trigger early or late and cannot serve as billing basis.')),
				E('p',{},_('Enabling pauses HNAT hardware acceleration so rules take effect, which may lower peak performance. Download throttling cannot retract traffic already received by the modem. Please leave quota headroom; the limit can be lifted on the monitor page until the period ends.')),
				E('div',{class:'right'},[
					E('button',{type:'button',class:'cbi-button',click:function(){option.getUIElement(section).setValue('0');ui.hideModal();}},_('Cancel')),
					' ',E('button',{type:'button',class:'cbi-button cbi-button-positive',click:function(){acknowledged=true;ui.hideModal();}},_('I understand, enable anyway'))])]);
		};
		enabled.validate=function(section,value){return value==='1'&&!acknowledged?_('Please acknowledge the accuracy notice first'):true;};
		function quotaOption(name,title,def,type){var field=q.option(form.Value,name,title);field.default=def;field.rmempty=false;field.datatype='and(uinteger,'+type+')';return field;}
		o=quotaOption('quota_gb',_('Traffic quota per period (GB)'),'1000','range(1,10000000)');o.description=_('Positive integer; 1 GB = 1,000,000,000 bytes, download + upload combined.');o.depends('quota_enabled','1');
		o=quotaOption('quota_percent',_('Throttle at this percentage'),'80','range(1,99)');o.depends('quota_enabled','1');
		o=quotaOption('quota_down_mbps',_('Download speed after throttling (Mbps)'),'10','range(1,1000000)');o.depends('quota_enabled','1');
		o=quotaOption('quota_up_mbps',_('Upload speed after throttling (Mbps)'),'2','range(1,1000000)');o.depends('quota_enabled','1');
		o=quotaOption('quota_bill_day',_('Billing day of month'),'1','range(1,28)');o.description=_('Defaults to midnight on the 1st of each month, in router local time. Only traffic actually recorded by the plugin is counted; totals are re-aggregated after the billing day changes.');
		return m.render();
	}
});
