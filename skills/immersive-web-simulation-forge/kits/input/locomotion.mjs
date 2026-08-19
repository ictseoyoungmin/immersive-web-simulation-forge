const finite=v=>Number.isFinite(Number(v));
const vec=(v={})=>({x:Number(v.x)||0,y:Number(v.y)||0,z:Number(v.z)||0});
const len=v=>Math.hypot(v.x,v.y,v.z);
const norm=v=>{const l=len(v);return l>1e-12?{x:v.x/l,y:v.y/l,z:v.z/l}:{x:0,y:0,z:0};};
const cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});

export function planarBasisFromForward(forward, up={x:0,y:1,z:0}) {
  const u=norm(vec(up));
  const f0=vec(forward);
  const projection={x:f0.x-u.x*(f0.x*u.x+f0.y*u.y+f0.z*u.z),y:f0.y-u.y*(f0.x*u.x+f0.y*u.y+f0.z*u.z),z:f0.z-u.z*(f0.x*u.x+f0.y*u.y+f0.z*u.z)};
  const f=norm(projection);
  if(len(f)<1e-9) return {ok:false,reason:'forward-parallel-to-up',forward:f,right:{x:0,y:0,z:0},up:u};
  const right=norm(cross(f,u));
  return {ok:true,forward:f,right,up:u};
}

export function movementIntent({forward=0,backward=0,left=0,right=0}={}, {normalizeDiagonal=true}={}) {
  let x=Number(right)-Number(left), z=Number(forward)-Number(backward);
  if(normalizeDiagonal){const l=Math.hypot(x,z);if(l>1){x/=l;z/=l;}}
  return {right:x,forward:z};
}

export function movementVector({intent, forward, right, speed=1}={}) {
  const i=intent||{right:0,forward:0};
  const f=vec(forward), r=vec(right), s=Number(speed);
  return {x:(f.x*i.forward+r.x*i.right)*s,y:(f.y*i.forward+r.y*i.right)*s,z:(f.z*i.forward+r.z*i.right)*s};
}

export function createKeyboardLocomotion(options={}) {
  if(typeof options.getForward!=='function') throw new TypeError('getForward() required');
  if(typeof options.onMove!=='function') throw new TypeError('onMove(vector,meta) required');
  const target=options.target||window, keys=new Set(), up=options.up||{x:0,y:1,z:0};
  const map={forward:options.forwardKey||'KeyW',backward:options.backwardKey||'KeyS',left:options.leftKey||'KeyA',right:options.rightKey||'KeyD'};
  const down=e=>{if(Object.values(map).includes(e.code)) keys.add(e.code);};
  const upKey=e=>keys.delete(e.code);
  target.addEventListener('keydown',down); target.addEventListener('keyup',upKey);
  const sample=(dt=1)=>{
    const basis=planarBasisFromForward(options.getForward(),up);
    if(!basis.ok) return {ok:false,...basis};
    const intent=movementIntent({forward:keys.has(map.forward),backward:keys.has(map.backward),left:keys.has(map.left),right:keys.has(map.right)},{normalizeDiagonal:options.normalizeDiagonal!==false});
    const speed=Number(typeof options.getSpeed==='function'?options.getSpeed():options.speed??1);
    const vector=movementVector({intent,forward:basis.forward,right:basis.right,speed:speed*Number(dt)});
    if(len(vector)>0) options.onMove(vector,{intent,basis,dt,speed});
    return {ok:true,vector,intent,basis};
  };
  const clear=()=>keys.clear();
  const destroy=()=>{target.removeEventListener('keydown',down);target.removeEventListener('keyup',upKey);clear();};
  return {keys,map,sample,clear,destroy};
}

export function dotDisplacement(delta,basis){return {forward:delta.x*basis.forward.x+delta.y*basis.forward.y+delta.z*basis.forward.z,right:delta.x*basis.right.x+delta.y*basis.right.y+delta.z*basis.right.z};}
