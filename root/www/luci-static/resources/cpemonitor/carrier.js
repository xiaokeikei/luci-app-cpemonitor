'use strict';
'require rpc';
'require baseclass';
// The two panels use the same append-only carrier IDs and device-scoped marking.
function createCarrierPanel(api, onFilter) {
  var names=['未标记 / 未识别','中国移动','中国联通','中国电信','中国广电','其他运营商','切换中'];
  var selected='all', busy=false, state={}, generation=0;
  function el(tag,text,attrs) {
    var n=document.createElement(tag); if(text!=null)n.textContent=text;
    Object.keys(attrs||{}).forEach(function(k){n.setAttribute(k,attrs[k]);}); return n;
  }
  function option(select,value,label){select.appendChild(el('option',label,{value:String(value)}));}
  function select(label) {var s=el('select',null,{'aria-label':label,class:'cbi-input-select btn'});s.style.cssText='width:auto;max-width:100%;min-width:130px';return s;}
  var root=el('section',null,{class:'cbi-section carrier-panel'});root.style.cssText='border:1px solid rgba(128,128,128,.25);border-radius:12px;padding:14px;margin:12px 0;background:transparent';
  root.appendChild(el('h3','运营商切换与对比'));
  var current=el('p','正在识别当前运营商…',{'aria-live':'polite'});root.appendChild(current);
  var controls=el('div');controls.style.cssText='display:flex;gap:8px;flex-wrap:wrap;align-items:center';root.appendChild(controls);
  var filter=select('历史运营商筛选');option(filter,'all','全部运营商');names.forEach(function(n,i){option(filter,i,n);});
  controls.appendChild(el('label','历史筛选'));controls.appendChild(filter);
  filter.addEventListener('change',function(){selected=filter.value;onFilter(selected);});
  var mark=select('当前 SIM 的运营商标记');option(mark,'auto','自动识别（推荐）');names.slice(0,6).forEach(function(n,i){option(mark,i,n);});
  var save=el('button','保存标记',{type:'button',class:'cbi-button btn'});
  controls.appendChild(el('label','当前卡标记'));controls.appendChild(mark);controls.appendChild(save);
  var sim=select('切换数据 SIM');option(sim,0,'SIM 1');option(sim,1,'SIM 2');
  var change=el('button','切换数据 SIM',{type:'button',class:'cbi-button cbi-button-action btn'});controls.appendChild(sim);controls.appendChild(change);
  var message=el('p','',{'aria-live':'polite'});root.appendChild(message);
  var note=el('p','筛选只影响历史曲线；总流量和原有历史继续保留。旧数据归入未标记；换卡未识别时不猜测运营商。手动标记绑定当前 SIM，不会沿用到新卡。');note.style.cssText='font-size:12px;opacity:.8;line-height:1.6';root.appendChild(note);
  var report=el('div');report.style.overflowX='auto';root.appendChild(report);
  function failure(error){var errors={invalid_carrier:'无效的运营商',sim_not_identified:'当前卡尚未识别，请等联网并自动识别完成后再标记',dual_sim_unavailable:'设备不支持双卡软件切换；可手动拔插 SIM，联网后自动归档',invalid_sim:'无效的卡槽',carrier_unavailable:'运营商服务暂不可用',storage_failed:'标记保存失败'};message.textContent='操作失败：'+(errors[error]||String(error||'未知错误'));}
  function paint(s){
    state=s||{};if(!state.ok){failure(state.error);return;}
    current.textContent='当前：'+(names[state.code]||names[0])+(state.sim>=0?' · SIM '+(Number(state.sim)+1):'')+' · '+(state.source==='manual'?'手动标记':state.source==='auto'?'自动识别':state.source==='switching'?'正在切换':'等待识别');
    if(document.activeElement!==mark)mark.value=state.mode||'auto';
    save.disabled=busy||state.sim<0||state.code===6;
    sim.disabled=change.disabled=busy||!state.switch_supported||state.code===6;
    if(!busy&&document.activeElement!==sim)sim.value=state.sim===0?'1':'0';
    change.title=state.switch_supported?'使用设备原有双 SIM 切换接口':'此设备不支持双卡软件切换；手动换卡后自动归档';
  }
  function refresh(){var id=++generation;return api('status').then(function(s){if(id===generation)paint(s);}).catch(function(e){message.textContent='识别暂不可用：'+e.message;});}
  save.addEventListener('click',function(){busy=true;save.disabled=true;api('set',mark.value).then(function(r){if(!r.ok){failure(r.error);return;}paint(r);message.textContent='标记已保存，仅用于后续记录；已有历史未改变。';onFilter(selected);}).catch(function(e){failure(e.message);}).finally(function(){busy=false;refresh();});});
  function follow(id,tries){
    return api('job',id).then(function(r){
      if(r.state==='done'){message.textContent='切换成功，等待新运营商识别；历史和累计流量继续保留。';busy=false;refresh();onFilter(selected);return;}
      if(r.state==='error'||!r.state){busy=false;failure(r.error||'无法读取切换结果，请到 SIM 管理页确认');refresh();return;}
      if(tries>=160){busy=false;message.textContent='切换结果尚未确认，请到设备 SIM 管理页查看；监控继续记录。';refresh();return;}
      window.setTimeout(function(){follow(id,tries+1);},1500);
    }).catch(function(e){busy=false;failure(e.message);refresh();});
  }
  change.addEventListener('click',function(){
    if(busy||!state.switch_supported)return;
    if(!window.confirm('切换到 SIM '+(Number(sim.value)+1)+' 会暂时断开公网连接。监控历史和总流量保留。确认切换？'))return;
    busy=true;change.disabled=sim.disabled=save.disabled=true;message.textContent='正在提交切换…';
    api('switch',sim.value).then(function(r){if(!r.ok||!r.id){busy=false;failure(r.error);refresh();return;}message.textContent='正在切换，请稍候…';follow(r.id,0);}).catch(function(e){busy=false;failure(e.message);refresh();});
  });
  function showReport(rows,targets){
    report.replaceChildren(); if(!rows||!rows.length){report.appendChild(el('p','此查询范围还没有可对比的记录。'));return;}
    var wan=rows[0].target!=null,table=el('table',null,{class:'table'});table.style.cssText='width:100%;min-width:620px;font-size:12px';
    var head=el('tr');(wan?['运营商','目标','采样数','平均延迟','最低 / 最高','丢包率']:['运营商','采样数','下载 / 上传','阿里平均 / 丢包','腾讯平均 / 丢包']).forEach(function(t){head.appendChild(el('th',t));});table.appendChild(head);
    function ms(v){return v==null?'--':Number(v).toFixed(1)+' ms';}
    function percent(v){return Number(v||0).toFixed(1)+'%';}
    function bytes(v){return (Number(v||0)/1e9).toFixed(4)+' GB';}
    rows.forEach(function(r){var id=wan?r.carrier:r.id,tr=el('tr');if(selected!=='all'&&Number(selected)!==Number(id))tr.style.opacity='.55';
      var target=(targets||[]).find(function(t){return t.id===r.target;});
      var cols=wan?[names[id],target?target.name:r.target,r.count,ms(r.avg),ms(r.min)+' / '+ms(r.max),percent(r.loss)]:[names[id],r.count,bytes(r.download)+' / '+bytes(r.upload)+(r.unaccounted?'（旧记录流量未分组）':''),ms(r.aliyun_avg)+' / '+percent(r.aliyun_loss),ms(r.tencent_avg)+' / '+percent(r.tencent_loss)];
      cols.forEach(function(v){tr.appendChild(el('td',v));});table.appendChild(tr);
    });report.appendChild(table);
    report.appendChild(el('p','对比范围与历史查询一致；仅比较各网络实际采样，不把其他运营商的时段算成丢包。切换中数据单列；分组流量从新版开始累计，旧总流量不变。'));
  }
  return {node:root,refresh:refresh,report:showReport,value:function(){return selected;}};
}

var methods={};
['status','set','switch','job'].forEach(function(mode){methods[mode]=rpc.declare({object:'cpemonitor',method:'carrier_'+mode,params:mode==='status'?[]:['value'],expect:{}});});
return baseclass.extend({create:function(onFilter){return createCarrierPanel(function(mode,value){return methods[mode](value);},onFilter);}});
