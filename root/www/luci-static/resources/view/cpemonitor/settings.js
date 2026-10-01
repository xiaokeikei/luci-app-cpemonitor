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
		var q=m.section(form.NamedSection,'main','cpemonitor','月流量与额度控制');q.anonymous=true;
		var acknowledged=uci.get('cpemonitor','main','quota_enabled')==='1';
		var enabled=q.option(form.Flag,'quota_enabled','开启月度额度限制');enabled.default='0';enabled.rmempty=false;
		enabled.description='按下载＋上传合计计量；达到阈值限速，100% 暂停 WAN 联网，局域网管理仍可访问。';
		enabled.onchange=function(ev,section,value){
			if(value!=='1'){acknowledged=false;return;}
			var option=this;acknowledged=false;
			ui.showModal('开启流量限制前请确认',[
				E('p',{},'本机统计与运营商账单可能存在偏差；采样间隔、突然断电、协议开销和未记录的历史流量都会影响结果。限速或断网可能提前或延后触发，不能作为运营商计费依据。'),
				E('p',{},'开启后暂停 HNAT 硬件加速以保证规则生效，峰值性能可能降低。下载限速也不能撤回已经到达模组的流量。请留出额度余量；可随时在监控页解除到本期结束。'),
				E('div',{class:'right'},[
					E('button',{type:'button',class:'cbi-button',click:function(){option.getUIElement(section).setValue('0');ui.hideModal();}},'取消'),
					' ',E('button',{type:'button',class:'cbi-button cbi-button-positive',click:function(){acknowledged=true;ui.hideModal();}},'了解偏差，继续开启')])]);
		};
		enabled.validate=function(section,value){return value==='1'&&!acknowledged?'请先确认统计偏差提示':true;};
		function quotaOption(name,title,def,type){var field=q.option(form.Value,name,title);field.default=def;field.rmempty=false;field.datatype='and(uinteger,'+type+')';return field;}
		o=quotaOption('quota_gb','每期流量额度（GB）','1000','range(1,10000000)');o.description='正整数；1 GB = 1,000,000,000 字节，下载＋上传合计。';o.depends('quota_enabled','1');
		o=quotaOption('quota_percent','达到多少百分比开始限速','80','range(1,99)');o.depends('quota_enabled','1');
		o=quotaOption('quota_down_mbps','限速后下载速度（Mbps）','10','range(1,1000000)');o.depends('quota_enabled','1');
		o=quotaOption('quota_up_mbps','限速后上传速度（Mbps）','2','range(1,1000000)');o.depends('quota_enabled','1');
		o=quotaOption('quota_bill_day','每月账单起始日','1','range(1,28)');o.description='默认每月 1 日零点；按路由器本地时间计算。仅统计插件实际记录的流量，账单周期变化后重新汇总。';
		return m.render();
	}
});
