'use strict';
'require view';
'require form';
'require uci';
'require network';

return view.extend({
	load: function() { return Promise.all([uci.load('cpemonitor'), network.getDevices()]); },
	render: function(data) {
		var devices=data[1]||[];
		var m=new form.Map('cpemonitor','CPE 监控设置','保存并应用后，采集服务会自动重启。');
		var s=m.section(form.NamedSection,'main','cpemonitor','采集设置'); s.anonymous=true;
		function opt(type,name,title,def){var o=s.option(type,name,title);o.default=def;return o;}
		opt(form.Flag,'enabled','启用','1');
		var iface=opt(form.ListValue,'interface','WAN 设备','wwan0');
		devices.map(function(d){return d.getName();}).filter(function(n){return n&&n!=='lo'&&n!=='br-lan'&&n!=='hnat'&&!/^ra(i)?[0-9]+$/.test(n)&&!/^apcli/.test(n);}).sort().forEach(function(n){var d=devices.filter(function(x){return x.getName()===n;})[0],label=n,type=d&&d.getType?d.getType():'';iface.value(n,type?n+' ('+type+')':n);});
		iface.description='从当前系统网络设备中选择，避免手工输入错误。';
		var o=opt(form.Value,'sample_interval','基础采样间隔（秒）','10');o.datatype='uinteger';
		o=opt(form.Value,'modem_interval','模组采样间隔（秒）','60');o.datatype='uinteger';
		o=opt(form.Value,'persist_interval','持久化间隔（秒）','21600');o.datatype='uinteger';
		o=opt(form.Value,'retention_days','保留天数','365');o.datatype='uinteger';
		opt(form.Value,'data_dir','持久数据目录','/overlay/cpemonitor');
		opt(form.Value,'aliyun_host','阿里云探测地址','223.5.5.5'); opt(form.Value,'tencent_host','腾讯云探测地址','119.29.29.29');
		o=opt(form.Value,'ping_count','每次 Ping 包数','1');o.datatype='range(1,5)';
		o=opt(form.Value,'ping_timeout','Ping 超时（秒）','2');o.datatype='range(1,10)';
		o=opt(form.ListValue,'speed_unit','实时速率显示单位','Mbps');o.value('Kbps','Kbps');o.value('Mbps','Mbps');o.value('KB/s','KB/s');o.value('MB/s','MB/s');
		return m.render();
	}
});
