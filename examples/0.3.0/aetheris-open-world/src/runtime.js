(() => {
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,t)=>a+(b-a)*t;

  function createFrameLoop({update,render,fixedStep=1/60,maxDelta=.1,maxSteps=4}={}){
    if(typeof update!=='function'||typeof render!=='function')throw new TypeError('update and render callbacks are required');
    let raf=0,running=false,suspended=false,previous=0,accumulator=0,time=0;
    const tick=now=>{if(!running)return;raf=requestAnimationFrame(tick);if(suspended){previous=now;return}const delta=previous?Math.min(maxDelta,(now-previous)/1000):fixedStep;previous=now;accumulator+=delta;let steps=0;while(accumulator>=fixedStep&&steps<maxSteps){update(fixedStep,time);time+=fixedStep;accumulator-=fixedStep;steps++}if(steps===maxSteps)accumulator=0;render(accumulator/fixedStep,time,delta)};
    return{start(){if(!running){running=true;previous=0;raf=requestAnimationFrame(tick)}},suspend(){suspended=true},resume(){suspended=false;previous=0},stop(){running=false;cancelAnimationFrame(raf);raf=0},reset(){accumulator=0;previous=0;time=0},get running(){return running},get suspended(){return suspended},get time(){return time}};
  }

  class SharedField2D{
    constructor({width=64,height=64,channels=4,bounds=[-1,-1,1,1],ArrayType=Float32Array}={}){this.width=width|0;this.height=height|0;this.channels=channels|0;this.bounds=[...bounds];this.data=new ArrayType(this.width*this.height*this.channels);this.version=0}
    index(x,y,c=0){return((y*this.width+x)*this.channels)+c}
    write(x,y,values){const px=clamp(x|0,0,this.width-1),py=clamp(y|0,0,this.height-1),base=this.index(px,py);for(let c=0;c<this.channels;c++)this.data[base+c]=Number(values[c]??0)}
    fill(fn){const[x0,y0,x1,y1]=this.bounds,out=new Array(this.channels).fill(0);for(let y=0;y<this.height;y++){const wy=lerp(y0,y1,y/Math.max(1,this.height-1));for(let x=0;x<this.width;x++){const wx=lerp(x0,x1,x/Math.max(1,this.width-1));this.write(x,y,fn(wx,wy,out)||out)}}this.version++;return this}
    sample(wx,wy,out=new Float32Array(this.channels)){const[x0,y0,x1,y1]=this.bounds,fx=clamp((wx-x0)/Math.max(1e-9,x1-x0)*(this.width-1),0,this.width-1.001),fy=clamp((wy-y0)/Math.max(1e-9,y1-y0)*(this.height-1),0,this.height-1.001),ix=fx|0,iy=fy|0,tx=fx-ix,ty=fy-iy;for(let c=0;c<this.channels;c++){const a=this.data[this.index(ix,iy,c)],b=this.data[this.index(ix+1,iy,c)],d=this.data[this.index(ix,iy+1,c)],e=this.data[this.index(ix+1,iy+1,c)];out[c]=lerp(lerp(a,b,tx),lerp(d,e,tx),ty)}return out}
  }

  function createWorldDirector({seed=1,events=[],minGap=18,maxGap=34}={}){let state=seed>>>0,active=null,elapsed=0,nextAt=minGap,enabled=true;const listeners=new Set();const random=()=>{state|=0;state=state+0x6D2B79F5|0;let t=Math.imul(state^state>>>15,1|state);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};const emit=(type,payload)=>listeners.forEach(fn=>fn({type,payload}));const schedule=()=>{nextAt=elapsed+minGap+random()*Math.max(0,maxGap-minGap)};function choose(context){const available=events.filter(e=>!e.when||e.when(context));if(!available.length)return null;let cursor=random()*available.reduce((s,e)=>s+Number(e.weight??1),0);for(const e of available){cursor-=Number(e.weight??1);if(cursor<=0)return e}return available.at(-1)}function start(event,context={}){if(!event)return;if(active)active.event.end?.(context);active={event,age:0,duration:Number(event.duration??8),phase:'anticipation',context};event.start?.(context);emit('start',active)}function update(dt,context={}){elapsed+=dt;if(!enabled)return null;if(!active&&elapsed>=nextAt){start(choose(context),context);schedule()}if(!active)return null;active.age+=dt;const t=Math.min(1,active.age/Math.max(1e-6,active.duration)),anticipation=Number(active.event.anticipation??.18),recovery=Number(active.event.recovery??.25);active.phase=t<anticipation?'anticipation':t>1-recovery?'recovery':'impact';active.event.update?.({...active,t},context);if(t>=1){active.event.end?.(context);emit('end',active);active=null}return active}schedule();return{update,trigger(name,context={}){start(events.find(e=>e.name===name),context)},cancel(context={}){if(active)active.event.end?.(context);active=null;schedule()},setEnabled(v){enabled=!!v},on(fn){listeners.add(fn);return()=>listeners.delete(fn)},get active(){return active}}}

  window.AetherRuntime={createFrameLoop,SharedField2D,createWorldDirector,clamp,lerp};
})();
