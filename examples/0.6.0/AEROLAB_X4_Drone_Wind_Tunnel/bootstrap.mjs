import { ParameterStore } from './kits/authoring/parameter-store.mjs';
import { HistoryStore } from './kits/authoring/history-store.mjs';
import { MeasurementSeries } from './kits/analysis/measurement-series.mjs';
import { WindField } from './kits/compute/wind-field.mjs';
import { DronePhysics } from './kits/compute/drone-physics.mjs';
import { ComputeTaskRunner } from './kits/compute/task-runner.mjs';
import { SharedField } from './kits/systems/shared-field.mjs';
import { createFrameLoop } from './kits/runtime/frame-loop.mjs';
import { createLifecycle } from './kits/runtime/lifecycle.mjs';
import { createPointerLook } from './kits/input/pointer-look.mjs';
import { LODBands } from './kits/three/lod-bands.mjs';
import { SceneRenderer } from './kits/three/scene-renderer.mjs';
import { PickingGizmo } from './kits/three/picking-gizmo.mjs';
import { FieldRenderer } from './kits/canvas/field-renderer.mjs';
import { TelemetryRenderer } from './kits/canvas/telemetry-renderer.mjs';
import { HUD } from './kits/ui/hud.mjs';

const app=document.getElementById('app');
const viewport=document.querySelector('.viewport-shell');
const glCanvas=document.getElementById('glCanvas');
const fieldCanvas=document.getElementById('fieldCanvas');

function showFatal(error){
  console.error(error);
  const overlay=document.createElement('div');overlay.className='error-overlay';
  overlay.innerHTML=`<div><h1>SIMULATION INITIALIZATION FAILED</h1><p>${String(error?.message||error)}</p><p>WebGL2 and a current desktop browser are required. Serve this folder over local HTTP rather than opening index.html directly.</p></div>`;
  viewport.append(overlay);
}

try {
  const parameters=new ParameterStore();
  const history=new HistoryStore();
  const unbindHistory=history.bind(parameters);
  const measurements=new MeasurementSeries({capacity:900});
  const windField=new WindField(parameters);
  const sharedField=new SharedField(windField);
  const physics=new DronePhysics({parameters,windField});
  const taskRunner=new ComputeTaskRunner({physics,measurements,telemetryHz:30});
  const lod=new LODBands(parameters.get('visual.quality'));
  const scene=new SceneRenderer({canvas:glCanvas,parameters,physics,lod});
  const field=new FieldRenderer({canvas:fieldCanvas,windField,sceneRenderer:scene,lod,parameters});
  const telemetryView=new TelemetryRenderer({attitudeCanvas:document.getElementById('attitudeChart'),powerCanvas:document.getElementById('powerChart'),measurements});
  let paused=false;
  let lastTelemetry=physics.telemetry(0);
  let stats={fps:60,particleCount:lod.current.particleCount,quality:lod.tier,warnings:[],frameSamples:[]};

  const hud=new HUD({parameters,history,physics,measurements,actions:{
    reset(){taskRunner.reset();lastTelemetry=taskRunner.latest;loop.reset();hud.updateTelemetry(lastTelemetry);},
    pause(){setPaused(!paused);}
  }});

  const gizmo=new PickingGizmo({renderer:scene,physics,payloadMass:.15});
  const onGizmoChange=event=>{
    const d=event.detail;hud.log(`${d.id} PAYLOAD ${d.attached?'ATTACHED':'REMOVED'} · ${d.totalPayloadMass.toFixed(2)} KG`);hud.toast('PAYLOAD',`${d.id} ${d.attached?'attached':'removed'} · total ${d.totalPayloadMass.toFixed(2)} kg`);
    document.getElementById('gizmoHint').classList.add('visible');setTimeout(()=>document.getElementById('gizmoHint').classList.remove('visible'),1800);
  };
  gizmo.addEventListener('change',onGizmoChange);

  const pointer=createPointerLook({element:glCanvas,onChange:state=>scene.setCamera(state),onClick:event=>gizmo.activate(event.clientX,event.clientY)});

  function setPaused(value){
    paused=!!value;parameters.set('simulation.paused',paused,{transient:true});hud.setPaused(paused);
  }

  const onTelemetry=event=>{lastTelemetry=event.detail;hud.updateTelemetry(lastTelemetry);};
  const onParameterChange=event=>{
    const {path,value}=event.detail;
    if(path==='visual.quality'){lod.setTier(value,{manual:true});stats.quality=value;resizeFromDOM();hud.log(`QUALITY BAND → ${String(value).toUpperCase()}`);}
    if(path==='drone.mass'||path==='drone.bladeRadius'||path==='environment.airDensity')hud.log(`${path.toUpperCase()} UPDATED`);
  };
  const onLODChange=event=>{parameters.set('visual.quality',event.detail.tier,{transient:true});field.setCount(event.detail.particleCount);resizeFromDOM();hud.toast('LOD',`Quality adapted to ${event.detail.label}`,'warn');};
  taskRunner.addEventListener('telemetry',onTelemetry);
  parameters.addEventListener('change',onParameterChange);
  lod.addEventListener('change',onLODChange);

  const loop=createFrameLoop({fixedStep:1/120,maxDelta:.1,maxSteps:12,
    update(dt,time){if(paused)return;lastTelemetry=taskRunner.step(dt,time);sharedField.update(time);},
    render(alpha,time,delta){
      if(!paused)field.update(delta,time);
      scene.render({interpolated:physics.interpolated(alpha),telemetry:lastTelemetry,time});
      field.render();telemetryView.render();
    },
    onFrameStats(frameStats){
      lod.sampleFPS(frameStats.fps,frameStats.elapsed);stats.fps=frameStats.fps;stats.particleCount=lod.current.particleCount;stats.quality=lod.tier;stats.frameSamples.push(frameStats.fps);if(stats.frameSamples.length>30)stats.frameSamples.shift();
      if(frameStats.fps<45){const warning=`FPS below 45: ${frameStats.fps.toFixed(1)}`;if(!stats.warnings.includes(warning))stats.warnings.push(warning);}
      hud.updateFPS({fps:frameStats.fps,particleCount:lod.current.particleCount,quality:lod.current.label});
    }});

  function resizeFromDOM(){const rect=viewport.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,lod.current.dprCap);scene.resize(rect.width,rect.height,dpr);field.resize(rect.width,rect.height,dpr);}

  const lifecycle=createLifecycle(viewport,{
    onResize:({width,height,dpr})=>{scene.resize(width,height,dpr);field.resize(width,height,Math.min(dpr,lod.current.dprCap));},
    onSuspend:()=>loop.suspend(),onResume:()=>loop.resume(),
    onDestroy:()=>{loop.stop();pointer.destroy();field.destroy();scene.destroy();hud.destroy();unbindHistory();}
  });
  lifecycle.mount();

  const visibility=()=>document.hidden?lifecycle.suspend('document-hidden'):lifecycle.resume();
  document.addEventListener('visibilitychange',visibility);
  lifecycle.addDisposer(()=>document.removeEventListener('visibilitychange',visibility));

  const onKeyDown=event=>{
    if(event.target instanceof HTMLInputElement)return;
    const key=event.key.toLowerCase();
    if(key===' '){event.preventDefault();setPaused(!paused);}
    if(key==='r'){taskRunner.reset();loop.reset();hud.log('VEHICLE STATE RESET');}
    if(key==='z'&&!event.shiftKey){history.undo(parameters);}
    if((key==='z'&&event.shiftKey)||key==='y'){history.redo(parameters);}
    if(key==='1')hud.setMode('hover');if(key==='2')hud.setMode('manual');if(key==='3')hud.setMode('reaction');
  };
  const updateGizmoHint=()=>document.getElementById('gizmoHint').classList.toggle('visible',scene.camera.distance<5.0);
  lifecycle.listen(window,'keydown',onKeyDown);
  lifecycle.listen(glCanvas,'pointermove',updateGizmoHint,{passive:true});
  lifecycle.addDisposer(()=>taskRunner.removeEventListener('telemetry',onTelemetry));
  lifecycle.addDisposer(()=>parameters.removeEventListener('change',onParameterChange));
  lifecycle.addDisposer(()=>lod.removeEventListener('change',onLODChange));
  lifecycle.addDisposer(()=>gizmo.removeEventListener('change',onGizmoChange));

  // Public verification and host-integration surface.
  window.__DRONE_FORGE__={
    ready:true,
    version:'1.0.0',
    mount:()=>lifecycle.mount(),
    resize:(w,h,dpr=1)=>lifecycle.resize(w,h,dpr),
    suspend:reason=>lifecycle.suspend(reason),
    resume:()=>lifecycle.resume(),
    destroy:()=>lifecycle.destroy(),
    update:next=>parameters.patch(next,{external:true}),
    setParameter:(path,value)=>parameters.set(path,value,{external:true}),
    getParameter:path=>parameters.get(path),
    getTelemetry:()=>({...lastTelemetry}),
    getStats:()=>({...stats,frameSamples:[...stats.frameSamples],averageFPS:stats.frameSamples.length?stats.frameSamples.reduce((a,b)=>a+b,0)/stats.frameSamples.length:0}),
    getSnapshots:()=>history.snapshots.map(item=>({...item})),
    reset:()=>{taskRunner.reset();loop.reset();},
    runHeadlessStability({seconds=8,windSpeed=30,turbulence=1}={}){
      const saved=parameters.snapshot();const wasPaused=paused;setPaused(true);
      parameters.patch({'wind.speed':windSpeed,'wind.turbulence':turbulence,'wind.flowMode':'turbulent','simulation.flightMode':'hover'},{verification:true,transient:true});
      physics.reset({preservePayloads:false});
      let maxSpeed=0,maxTilt=0,maxPosition=0,stable=true,telemetry=null;
      const steps=Math.round(seconds*120);
      for(let i=0;i<steps;i++){
        telemetry=physics.step(1/120,i/120);maxSpeed=Math.max(maxSpeed,telemetry.speed);maxTilt=Math.max(maxTilt,telemetry.tiltDeg);maxPosition=Math.max(maxPosition,Math.hypot(...telemetry.position));stable&&=telemetry.solverStable&&telemetry.position.every(Number.isFinite)&&telemetry.velocity.every(Number.isFinite);
      }
      const result={stable,maxSpeed,maxTilt,maxPosition,finalPosition:telemetry.position,finalVelocity:telemetry.velocity,solverStable:telemetry.solverStable,steps,windSpeed,turbulence};
      parameters.restore(saved,{verification:true,transient:true});physics.reset({preservePayloads:true});lastTelemetry=physics.telemetry(loop.time);setPaused(wasPaused);return result;
    }
  };

  loop.start();hud.updateTelemetry(lastTelemetry);hud.updateFPS({fps:60,particleCount:lod.current.particleCount,quality:lod.current.label});
  setTimeout(()=>document.getElementById('gizmoHint').classList.add('visible'),800);setTimeout(()=>document.getElementById('gizmoHint').classList.remove('visible'),4300);
  console.info('AEROLAB X4 ready',window.__DRONE_FORGE__);
} catch(error){showFatal(error);}
