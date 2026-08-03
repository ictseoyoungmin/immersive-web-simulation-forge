import { icon } from './icon-system.mjs';

const $=id=>document.getElementById(id);
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const fmt=(v,d=1)=>Number(v).toFixed(d);

const TABS=[
  {id:'flight',icon:'drone',label:'Flight'},
  {id:'wind',icon:'wind',label:'Wind'},
  {id:'airframe',icon:'cube',label:'Airframe'},
  {id:'controller',icon:'tune',label:'PID'}
];

function slider({path,label,min,max,step,value,unit='',digits=1}){
  const fill=(value-min)/(max-min)*100;
  return `<div class="control-row"><div class="control-label"><label>${label}</label><output data-output="${path}">${Number(value).toFixed(digits)} <em>${unit}</em></output></div><div class="range-wrap"><input type="range" data-path="${path}" min="${min}" max="${max}" step="${step}" value="${value}" style="--fill:${fill}%"><div class="range-mini">${Math.round(fill)}</div></div></div>`;
}

export class HUD extends EventTarget {
  constructor({parameters,history,physics,measurements,actions={}}){
    super();this.parameters=parameters;this.history=history;this.physics=physics;this.measurements=measurements;this.actions=actions;this.activeTab='flight';this.lastEvent='SYSTEM INITIALIZED';this.fps=60;this.paused=false;this.aborter=new AbortController();
    this.toastStack=document.createElement('div');this.toastStack.className='toast-stack';document.body.append(this.toastStack);
    this.#buildTopActions();this.#buildTabs();this.#renderPanel();this.#buildMetrics();this.#buildRotorBars();this.#bind();
  }
  #buildTopActions(){
    $('topActions').innerHTML=`
      <button class="icon-button" data-action="undo" title="Undo (Z)">${icon('undo')}</button>
      <button class="icon-button" data-action="redo" title="Redo (Shift+Z)">${icon('redo')}</button>
      <button class="icon-button active" data-action="flow" title="Toggle flow particles">${icon('wind')}</button>
      <button class="icon-button active" data-action="post" title="Toggle bloom and ambient occlusion">${icon('layers')}</button>
      <button class="icon-button" data-action="pause" title="Pause (Space)">${icon('pause')}</button>
      <button class="icon-button" data-action="reset" title="Reset vehicle (R)">${icon('reset')}</button>`;
  }
  #buildTabs(){
    $('controlTabs').innerHTML=TABS.map(tab=>`<button class="tab-button${tab.id===this.activeTab?' active':''}" data-tab="${tab.id}" title="${tab.label}" aria-label="${tab.label}">${icon(tab.icon)}</button>`).join('');
  }
  #renderPanel(){
    const p=this.parameters,panel=$('controlPanel');
    if(this.activeTab==='flight')panel.innerHTML=this.#flightPanel();
    if(this.activeTab==='wind')panel.innerHTML=this.#windPanel();
    if(this.activeTab==='airframe')panel.innerHTML=this.#airframePanel();
    if(this.activeTab==='controller')panel.innerHTML=this.#controllerPanel();
    panel.querySelectorAll('input[type="range"]').forEach(input=>this.#setFill(input));
  }
  #flightPanel(){
    const mode=this.parameters.get('simulation.flightMode');
    return `<div class="panel-section"><div class="section-heading"><span>FLIGHT MODE</span><small>120 HZ CONTROL LOOP</small></div><div class="mode-selector">
      ${this.#mode('hover','gauge','HOVERING','Position + attitude PID','1',mode)}
      ${this.#mode('manual','drone','MANUAL THRUST','Direct collective throttle','2',mode)}
      ${this.#mode('reaction','wind','WIND REACTION TEST','Open-loop wind response','3',mode)}
    </div></div>
    <div class="panel-section"><div class="section-heading"><span>COLLECTIVE</span><small>${mode==='manual'?'ACTIVE':'STANDBY'}</small></div>
      ${slider({path:'drone.manualThrottle',label:'Manual throttle',min:0,max:1,step:.005,value:this.parameters.get('drone.manualThrottle'),unit:'%',digits:3})}
      <div class="control-row"><div class="control-label"><label>Force overlays</label><output>${this.parameters.get('visual.forceVectors')?'VISIBLE':'HIDDEN'}</output></div><div class="segmented"><button data-toggle="visual.forceVectors" data-value="true" class="${this.parameters.get('visual.forceVectors')?'active':''}">ON</button><button data-toggle="visual.forceVectors" data-value="false" class="${!this.parameters.get('visual.forceVectors')?'active':''}">OFF</button></div></div>
    </div>
    <div class="panel-section"><div class="section-heading"><span>VEHICLE ACTIONS</span><small>STATE SAFE</small></div><div class="action-row"><button class="action-button primary" data-action="reset">RESET VEHICLE</button><button class="action-button" data-action="snapshot">SAVE SNAPSHOT</button></div></div>`;
  }
  #mode(id,ico,title,desc,key,current){return `<button class="mode-option${current===id?' active':''}" data-mode="${id}"><span class="mode-icon">${icon(ico)}</span><span><b>${title}</b><small>${desc}</small></span><span class="key">${key}</span></button>`;}
  #windPanel(){
    const flow=this.parameters.get('wind.flowMode');
    return `<div class="panel-section"><div class="section-heading"><span>WIND VECTOR</span><small>3D FIELD</small></div>
      ${slider({path:'wind.speed',label:'Speed',min:0,max:30,step:.1,value:this.parameters.get('wind.speed'),unit:'m/s'})}
      ${slider({path:'wind.yaw',label:'Yaw',min:-180,max:180,step:1,value:this.parameters.get('wind.yaw'),unit:'°',digits:0})}
      ${slider({path:'wind.pitch',label:'Pitch',min:-30,max:30,step:.5,value:this.parameters.get('wind.pitch'),unit:'°'})}
    </div><div class="panel-section"><div class="section-heading"><span>FLOW REGIME</span><small>${flow.toUpperCase()}</small></div><div class="segmented"><button data-param="wind.flowMode" data-value="laminar" class="${flow==='laminar'?'active':''}">LAMINAR</button><button data-param="wind.flowMode" data-value="turbulent" class="${flow==='turbulent'?'active':''}">TURBULENT</button></div>
      ${slider({path:'wind.turbulence',label:'Turbulence intensity',min:0,max:1,step:.01,value:this.parameters.get('wind.turbulence'),unit:'I',digits:2})}
    </div><div class="panel-section"><div class="section-heading"><span>FIELD DIAGNOSTICS</span><small>CANVAS LAYER</small></div>
      <div class="control-row"><div class="control-label"><label>Vector grid</label><output>${this.parameters.get('visual.vectorGrid')?'ON':'OFF'}</output></div><div class="segmented"><button data-toggle="visual.vectorGrid" data-value="true" class="${this.parameters.get('visual.vectorGrid')?'active':''}">ON</button><button data-toggle="visual.vectorGrid" data-value="false" class="${!this.parameters.get('visual.vectorGrid')?'active':''}">OFF</button></div></div>
    </div>`;
  }
  #airframePanel(){
    return `<div class="panel-section"><div class="section-heading"><span>AIRFRAME</span><small>QUAD-X</small></div>
      ${slider({path:'drone.mass',label:'Dry mass',min:.45,max:5,step:.01,value:this.parameters.get('drone.mass'),unit:'kg',digits:2})}
      ${slider({path:'drone.bladeRadius',label:'Blade radius',min:.07,max:.22,step:.001,value:this.parameters.get('drone.bladeRadius'),unit:'m',digits:3})}
      ${slider({path:'drone.maxRPM',label:'Maximum RPM',min:4000,max:22000,step:100,value:this.parameters.get('drone.maxRPM'),unit:'rpm',digits:0})}
    </div><div class="panel-section"><div class="section-heading"><span>AERODYNAMICS</span><small>LUMPED MODEL</small></div>
      ${slider({path:'drone.dragCoefficient',label:'Drag coefficient Cᴅ',min:.15,max:1.8,step:.01,value:this.parameters.get('drone.dragCoefficient'),unit:'',digits:2})}
      ${slider({path:'drone.frontalArea',label:'Frontal area',min:.015,max:.18,step:.001,value:this.parameters.get('drone.frontalArea'),unit:'m²',digits:3})}
      ${slider({path:'drone.liftCoefficient',label:'Lift coefficient Cₗ',min:0,max:1.2,step:.01,value:this.parameters.get('drone.liftCoefficient'),unit:'',digits:2})}
      ${slider({path:'environment.airDensity',label:'Air density ρ',min:.8,max:1.4,step:.005,value:this.parameters.get('environment.airDensity'),unit:'kg/m³',digits:3})}
    </div><div class="panel-section"><div class="section-heading"><span>PAYLOAD HARDPOINTS</span><small>CLICK IN VIEW</small></div><p style="font-size:9px;line-height:1.6;color:var(--muted);margin:0">Four amber underside hardpoints alter total mass and inertia tensor. Attached payloads are propagated into hover thrust, angular response, power and validation.</p></div>`;
  }
  #controllerPanel(){
    return `<div class="panel-section"><div class="section-heading"><span>ATTITUDE PID</span><small>BODY TORQUE</small></div>${this.#pidRow('ROLL','pid.roll')}${this.#pidRow('PITCH','pid.pitch')}${this.#pidRow('YAW','pid.yaw')}</div>
    <div class="panel-section"><div class="section-heading"><span>HISTORY</span><small>PARAMETER STORE</small></div><div class="action-row"><button class="action-button" data-action="undo">UNDO</button><button class="action-button" data-action="redo">REDO</button></div></div>
    <div class="panel-section"><div class="section-heading"><span>RENDER QUALITY</span><small>LOD BANDS</small></div><div class="segmented" style="grid-template-columns:repeat(4,1fr)">${['low','balanced','high','ultra'].map(q=>`<button data-param="visual.quality" data-value="${q}" class="${this.parameters.get('visual.quality')===q?'active':''}">${q.slice(0,3).toUpperCase()}</button>`).join('')}</div></div>`;
  }
  #pidRow(label,path){
    const v=this.parameters.get(path);
    return `<div class="control-row"><div class="control-label"><label>${label}</label><output>τ controller</output></div><div class="inline-pids">${['p','i','d'].map(k=>`<label class="pid-box"><span>${k.toUpperCase()}</span><input type="number" data-pid="${path}" data-key="${k}" value="${v[k]}" min="0" max="20" step=".01"></label>`).join('')}</div></div>`;
  }
  #buildMetrics(){
    const defs=[['tilt','TILT ANGLE','0.0','deg','ATTITUDE','#63dcff'],['airspeed','REL. AIRSPEED','0.0','m/s','FLOW','#72f0ba'],['power','POWER DRAW','0','W','MOTORS','#ffb14a'],['load','LOAD FACTOR','1.00','g','NET FORCE','#ff7067']];
    $('metricGrid').innerHTML=defs.map(([id,label,value,unit,sub,color])=>`<div class="metric" style="--metric-color:${color}"><span>${label}</span><strong id="metric-${id}">${value} <small>${unit}</small></strong><em>${sub}</em></div>`).join('');
  }
  #buildRotorBars(){
    $('rotorBars').innerHTML=['FL','FR','RR','RL'].map((id,i)=>`<div class="rotor-row"><span>${id}</span><div class="rotor-track"><div class="rotor-fill" id="rotor-fill-${i}"></div></div><b id="rotor-value-${i}">0.0 N</b></div>`).join('');
  }
  #bind(){
    document.addEventListener('click',event=>{
      const tab=event.target.closest('[data-tab]');if(tab){this.activeTab=tab.dataset.tab;this.#buildTabs();this.#renderPanel();return;}
      const mode=event.target.closest('[data-mode]');if(mode){this.setMode(mode.dataset.mode);return;}
      const action=event.target.closest('[data-action]');if(action){this.#action(action.dataset.action);return;}
      const toggle=event.target.closest('[data-toggle]');if(toggle){this.parameters.set(toggle.dataset.toggle,toggle.dataset.value==='true');this.#renderPanel();return;}
      const param=event.target.closest('[data-param]');if(param){this.parameters.set(param.dataset.param,param.dataset.value);this.#renderPanel();return;}
    },{signal:this.aborter.signal});
    $('controlPanel').addEventListener('input',event=>{
      const input=event.target;
      if(input.matches('input[type="range"][data-path]')){const path=input.dataset.path;this.parameters.set(path,Number(input.value));this.#syncSlider(input);}
      if(input.matches('[data-pid]')){const value=this.parameters.get(input.dataset.pid);value[input.dataset.key]=Number(input.value);this.parameters.set(input.dataset.pid,value);}
    },{signal:this.aborter.signal});
    $('snapshotButton').innerHTML=icon('save');$('snapshotButton').addEventListener('click',()=>this.#action('snapshot'),{signal:this.aborter.signal});
    this.parameterListener=event=>{const path=event.detail.path;if(path==='simulation.flightMode'||path==='visual.quality')this.#renderPanel();};
    this.historyListener=event=>{document.querySelectorAll('[data-action="undo"]').forEach(b=>b.disabled=!event.detail.canUndo);document.querySelectorAll('[data-action="redo"]').forEach(b=>b.disabled=!event.detail.canRedo);};
    this.parameters.addEventListener('change',this.parameterListener);
    this.history.addEventListener('state',this.historyListener);
  }
  #action(name){
    if(name==='undo'){if(this.history.undo(this.parameters))this.toast('HISTORY','Parameter change undone');}
    if(name==='redo'){if(this.history.redo(this.parameters))this.toast('HISTORY','Parameter change restored');}
    if(name==='reset'){this.actions.reset?.();this.log('VEHICLE STATE RESET');this.toast('RESET','Rigid body and telemetry reset');}
    if(name==='pause'){this.actions.pause?.();}
    if(name==='snapshot'){const snap=this.history.saveTelemetrySnapshot({parameters:this.parameters.snapshot(),telemetry:this.physics.lastTelemetry,series:this.measurements.snapshot()});this.log(`${snap.label.toUpperCase()} SAVED`);this.toast('SNAPSHOT',`${snap.label} saved in session history`);}
    if(name==='flow'){this.parameters.set('visual.flowVisible',!this.parameters.get('visual.flowVisible'));document.querySelector('[data-action="flow"]')?.classList.toggle('active',this.parameters.get('visual.flowVisible'));}
    if(name==='post'){this.parameters.set('visual.postFX',!this.parameters.get('visual.postFX'));document.querySelector('[data-action="post"]')?.classList.toggle('active',this.parameters.get('visual.postFX'));}
  }
  setMode(mode){this.parameters.set('simulation.flightMode',mode);this.log(`FLIGHT MODE → ${mode.toUpperCase()}`);this.toast('MODE',mode==='hover'?'PID stabilization engaged':mode==='manual'?'Manual collective enabled':'Open-loop reaction test engaged');this.#renderPanel();}
  setPaused(paused){this.paused=paused;$('runLabel').textContent=paused?'SIMULATION PAUSED':'SIMULATION LIVE';document.querySelector('[data-action="pause"]').innerHTML=icon(paused?'play':'pause');document.querySelector('[data-action="pause"]').classList.toggle('active',paused);document.querySelector('.live-dot').style.background=paused?'var(--amber)':'var(--green)';}
  #syncSlider(input){this.#setFill(input);const output=document.querySelector(`[data-output="${input.dataset.path}"]`);if(output){const unit=output.querySelector('em')?.textContent||'';const step=String(input.step);const digits=step.includes('.')?step.split('.')[1].length:0;output.innerHTML=`${Number(input.value).toFixed(digits)} <em>${unit}</em>`;}input.nextElementSibling.textContent=Math.round((input.value-input.min)/(input.max-input.min)*100);}
  #setFill(input){input.style.setProperty('--fill',`${clamp((input.value-input.min)/(input.max-input.min)*100,0,100)}%`);}
  updateTelemetry(t){
    const modeNames={hover:'HOVER PID',manual:'MANUAL THRUST',reaction:'WIND REACTION TEST'};$('modeBadge').textContent=modeNames[t.flightMode];
    const yaw=((this.parameters.get('wind.yaw')%360)+360)%360;$('windVectorReadout').textContent=`${fmt(t.windSpeed,1)} m/s · ${String(Math.round(yaw)).padStart(3,'0')}°`;
    $('probeSpeed').textContent=`${fmt(t.windSpeed,2)} m/s`;$('probePressure').textContent=`ΔP ${fmt(t.dynamicPressure,0)} Pa · ${this.parameters.get('wind.flowMode').toUpperCase()}`;
    const sec=Math.floor(t.time),ms=Math.floor((t.time-sec)*1000);$('telemetryClock').textContent=`T+${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}.${String(ms).padStart(3,'0')}`;
    $('metric-tilt').innerHTML=`${fmt(t.tiltDeg,1)} <small>deg</small>`;$('metric-airspeed').innerHTML=`${fmt(t.windSpeed,1)} <small>m/s</small>`;$('metric-power').innerHTML=`${fmt(t.powerWatts,0)} <small>W</small>`;
    const load=Math.hypot(...t.netForce)/(t.totalMass*9.80665);$('metric-load').innerHTML=`${fmt(load,2)} <small>g</small>`;
    const max=Math.max(1,...t.rotorThrusts);t.rotorThrusts.forEach((v,i)=>{$(`rotor-fill-${i}`).style.width=`${clamp(v/max*100,0,100)}%`;$(`rotor-value-${i}`).textContent=`${fmt(v,1)} N`;});$('thrustTotal').textContent=`Σ ${fmt(t.totalThrust,1)} N`;
    $('payloadMass').textContent=`${fmt(t.payloadMass,2)} kg`;$('solverStatus').textContent=t.solverStable?'STABLE':'RECOVERING';$('solverStatus').style.color=t.solverStable?'var(--green)':'var(--red)';
  }
  updateFPS({fps,particleCount,quality}){this.fps=fps;$('fpsValue').textContent=fmt(fps,0);$('fpsValue').style.color=fps<45?'var(--red)':fps<55?'var(--amber)':'var(--green)';$('particleCount').textContent=particleCount.toLocaleString();$('qualityLabel').textContent=quality.toUpperCase();}
  log(message){this.lastEvent=message;$('eventLog').textContent=message;}
  toast(title,message,type=''){const el=document.createElement('div');el.className=`toast ${type}`;el.innerHTML=`<b>${title}</b>${message}`;this.toastStack.append(el);setTimeout(()=>el.remove(),2800);}
  destroy(){this.aborter.abort();this.parameters.removeEventListener('change',this.parameterListener);this.history.removeEventListener('state',this.historyListener);this.toastStack.remove();}
}
