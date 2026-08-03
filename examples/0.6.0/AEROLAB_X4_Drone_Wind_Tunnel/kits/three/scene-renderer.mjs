import { M4 } from '../math/mat4.mjs';
import { Q4 } from '../math/quat.mjs';
import { V3 } from '../math/vec3.mjs';
import { ROTOR_LAYOUT, evaluateRotor } from '../compute/rotor-model.mjs';
import { PAYLOAD_MOUNTS } from '../compute/drone-physics.mjs';
import { createProgram, createMesh, drawMesh, disposeMesh, boxGeometry, planeGeometry, cylinderGeometry, sphereGeometry } from './gl-utils.mjs';
import { PostChain } from './post-chain.mjs';

const VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;
layout(location=1) in vec3 aNormal;
uniform mat4 uModel;
uniform mat4 uViewProj;
out vec3 vWorld;
out vec3 vNormal;
void main(){
  vec4 w=uModel*vec4(aPosition,1.0);
  vWorld=w.xyz;
  vNormal=normalize(mat3(uModel)*aNormal);
  gl_Position=uViewProj*w;
}`;

const FS = `#version 300 es
precision highp float;
in vec3 vWorld;
in vec3 vNormal;
out vec4 outColor;
uniform vec3 uColor;
uniform vec3 uEmissive;
uniform vec3 uCamera;
uniform vec3 uWind;
uniform float uOpacity;
uniform float uMetal;
uniform float uGrid;
uniform float uTime;
uniform float uStress;
float lineGrid(vec2 p,float scale){
  vec2 g=abs(fract(p/scale-.5)-.5)/fwidth(p/scale);
  return 1.0-min(min(g.x,g.y),1.0);
}
void main(){
  vec3 N=normalize(vNormal);
  vec3 V=normalize(uCamera-vWorld);
  vec3 L=normalize(vec3(-.42,.78,-.36));
  float ndl=max(dot(N,L),0.0);
  float rim=pow(1.0-max(dot(N,V),0.0),2.6);
  float spec=pow(max(dot(reflect(-L,N),V),0.0),mix(18.0,70.0,uMetal));
  vec3 color=uColor*(.15+ndl*.72)+spec*mix(.12,.52,uMetal)+rim*uColor*.26;
  if(uGrid>.5){
    float major=lineGrid(vWorld.xz,1.0);
    float minor=lineGrid(vWorld.xz,.25)*.18;
    float sweep=pow(max(0.0,1.0-abs(fract((vWorld.x-uTime*max(1.0,length(uWind))*.18)*.12)-.5)*2.0),18.0);
    color += vec3(.08,.52,.66)*(major*.42+minor+sweep*.22);
  }
  color += uEmissive*(1.0+uStress*1.8);
  float fog=smoothstep(8.0,19.0,distance(vWorld,uCamera));
  color=mix(color,vec3(.012,.031,.041),fog*.72);
  outColor=vec4(color,uOpacity);
}`;

const COLORS = {
  graphite:[.055,.075,.083], carbon:[.085,.105,.112], metal:[.19,.25,.28], cyan:[.13,.68,.88], cyanBright:[.35,.91,1], amber:[1,.38,.08], red:[1,.12,.055], glass:[.10,.28,.36], floor:[.018,.042,.052], white:[.65,.78,.82]
};

const qAxis = (axis, angle) => {
  const s=Math.sin(angle/2),c=Math.cos(angle/2);
  return Q4.create(axis[0]*s,axis[1]*s,axis[2]*s,c);
};

function transformLocalPoint(out, parent, local) {
  return M4.transformPoint(out,parent,local);
}

function segmentMatrix(out, a, b, radius=.02) {
  const mid=[(a[0]+b[0])*.5,(a[1]+b[1])*.5,(a[2]+b[2])*.5];
  const dy=V3.sub(V3.create(),b,a); const len=V3.length(dy)||1; V3.scale(dy,dy,1/len);
  const ref=Math.abs(dy[1])>.92?V3.create(0,0,1):V3.create(0,1,0);
  const x=V3.normalize(V3.create(),V3.cross(V3.create(),ref,dy));
  const z=V3.normalize(V3.create(),V3.cross(V3.create(),dy,x));
  out.set([x[0]*radius,x[1]*radius,x[2]*radius,0, dy[0]*len*.5,dy[1]*len*.5,dy[2]*len*.5,0, z[0]*radius,z[1]*radius,z[2]*radius,0, mid[0],mid[1],mid[2],1]);
  return out;
}

export class SceneRenderer {
  constructor({ canvas, parameters, physics, lod }) {
    this.canvas=canvas;this.parameters=parameters;this.physics=physics;this.lod=lod;
    const gl=canvas.getContext('webgl2',{antialias:true,alpha:false,powerPreference:'high-performance',premultipliedAlpha:false});
    if(!gl)throw new Error('WebGL2 is required for AEROLAB X4');
    this.gl=gl;this.program=createProgram(gl,VS,FS);this.post=new PostChain(gl);
    this.meshes={box:createMesh(gl,boxGeometry()),plane:createMesh(gl,planeGeometry()),cylinder:createMesh(gl,cylinderGeometry(28)),sphere:createMesh(gl,sphereGeometry(22,14))};
    this.uniform={}; for(const n of ['uModel','uViewProj','uColor','uEmissive','uCamera','uWind','uOpacity','uMetal','uGrid','uTime','uStress'])this.uniform[n]=gl.getUniformLocation(this.program,n);
    this.camera={yaw:-.52,pitch:.18,distance:4.75,target:[0,2.08,0],position:V3.create()};
    this.projection=M4.create();this.view=M4.create();this.viewProj=M4.create();this.inverseViewProj=M4.create();
    this.width=2;this.height=2;this.dpr=1;this.time=0;this.mountWorld=new Map();this.droneMatrix=M4.create();
    this.drawQueue=[];
    gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  }

  setCamera(state){Object.assign(this.camera,state);if(state.target)this.camera.target=[...state.target];}
  resize(cssWidth,cssHeight,dpr=1){
    const band=this.lod.current; const renderDpr=Math.min(dpr,band.dprCap)*band.sceneScale;
    const width=Math.max(2,Math.round(cssWidth*renderDpr)),height=Math.max(2,Math.round(cssHeight*renderDpr));
    if(width===this.width&&height===this.height)return;
    this.width=width;this.height=height;this.dpr=renderDpr;this.canvas.width=width;this.canvas.height=height;this.post.resize(width,height);
  }

  #updateCamera(){
    const c=this.camera,cp=Math.cos(c.pitch);
    c.position[0]=c.target[0]+c.distance*cp*Math.cos(c.yaw);
    c.position[1]=c.target[1]+c.distance*Math.sin(c.pitch);
    c.position[2]=c.target[2]+c.distance*cp*Math.sin(c.yaw);
    M4.perspective(this.projection,52*Math.PI/180,this.width/this.height,.08,45);
    M4.lookAt(this.view,c.position,c.target,[0,1,0]);M4.multiply(this.viewProj,this.projection,this.view);M4.invert(this.inverseViewProj,this.viewProj);
  }

  #queue(mesh,model,material={}){
    this.drawQueue.push({mesh,model:new Float32Array(model),material:{color:COLORS.graphite,emissive:[0,0,0],opacity:1,metal:.25,grid:0,stress:0,...material}});
  }
  #trs(mesh,p,q,s,material){const m=M4.create();M4.fromTRS(m,p,q,s);this.#queue(mesh,m,material);return m;}
  #child(mesh,parent,p,q,s,material){const local=M4.create(),world=M4.create();M4.fromTRS(local,p,q,s);M4.multiply(world,parent,local);this.#queue(mesh,world,material);return world;}
  #segment(a,b,r,material){const m=M4.create();segmentMatrix(m,a,b,r);this.#queue(this.meshes.box,m,material);}

  #buildTunnel(wind){
    const id=Q4.create();
    this.#trs(this.meshes.plane,[0,0,0],id,[7.25,1,3.05],{color:COLORS.floor,metal:.18,grid:1});
    // Soft translucent enclosure planes.
    this.#trs(this.meshes.plane,[0,5.0,0],qAxis([1,0,0],Math.PI),[7.25,1,3.05],{color:[.035,.12,.16],opacity:.11,metal:.4});
    this.#trs(this.meshes.plane,[0,2.5,-3.02],qAxis([1,0,0],Math.PI/2),[7.25,1,2.5],{color:COLORS.glass,opacity:.10,metal:.65});
    this.#trs(this.meshes.plane,[0,2.5,3.02],qAxis([1,0,0],-Math.PI/2),[7.25,1,2.5],{color:COLORS.glass,opacity:.10,metal:.65});
    const beam={color:[.075,.15,.18],emissive:[.005,.025,.033],metal:.72};
    for(const y of [.05,4.96])for(const z of [-2.98,2.98])this.#segment([-7.2,y,z],[7.2,y,z],.035,beam);
    for(let x=-7.2;x<=7.21;x+=2.4){
      for(const z of [-2.98,2.98])this.#segment([x,.05,z],[x,4.96,z],.028,beam);
      this.#segment([x,4.96,-2.98],[x,4.96,2.98],.028,beam);
    }
    // Inlet fan assembly at negative X.
    const qToX=qAxis([0,0,1],-Math.PI/2);
    this.#trs(this.meshes.cylinder,[-6.92,2.5,0],qToX,[.10,.08,1.18],{color:[.09,.17,.20],metal:.75});
    this.#trs(this.meshes.cylinder,[-6.82,2.5,0],qToX,[.18,.16,.18],{color:COLORS.metal,metal:.82});
    const fanAngle=this.time*(1.5+wind.speed*.22);
    for(let i=0;i<10;i++){
      const a=i*Math.PI*2/10+fanAngle, y=2.5+Math.cos(a)*.72,z=Math.sin(a)*.72;
      const q=qAxis([1,0,0],a);
      this.#trs(this.meshes.box,[-6.78,y,z],q,[.035,.42,.065],{color:[.10,.28,.34],emissive:[.005,.05,.065],metal:.65,opacity:.82});
    }
    // Ceiling luminaires that respond to wind intensity.
    const glow=.06+Math.min(.24,wind.speed/120);
    for(let x=-5.5;x<=5.6;x+=2.2)this.#trs(this.meshes.box,[x,4.86,-2.72],id,[.7,.018,.025],{color:COLORS.cyan,emissive:[.08+glow,.28+glow,.38+glow],opacity:.9});
  }

  #buildDrone(interpolated,telemetry){
    const p=interpolated.position,q=interpolated.orientation;
    M4.fromTRS(this.droneMatrix,p,q,[1,1,1]);
    const body=this.droneMatrix;
    this.#trs(this.meshes.cylinder,[p[0],.035,p[2]],Q4.create(),[.56,.006,.56],{color:[.04,.35,.44],emissive:[.012,.09,.12],opacity:.08,metal:.1});
    this.#child(this.meshes.box,body,[0,.015,0],Q4.create(),[.31,.105,.23],{color:[.23,.29,.31],emissive:[.018,.048,.058],metal:.82});
    this.#child(this.meshes.box,body,[-.07,-.095,0],Q4.create(),[.24,.055,.17],{color:[.055,.072,.078],emissive:[.006,.012,.014],metal:.66});
    this.#child(this.meshes.sphere,body,[.035,.11,0],Q4.create(),[.29,.10,.19],{color:[.18,.34,.38],emissive:[.018,.11,.14],metal:.72});
    this.#child(this.meshes.box,body,[.20,.105,0],Q4.create(),[.08,.028,.16],{color:[.06,.28,.34],emissive:[.01,.11,.15],metal:.5});
    this.#child(this.meshes.sphere,body,[.31,.055,0],qAxis([0,0,1],Math.PI/2),[.09,.075,.075],{color:[.04,.09,.11],emissive:[.03,.10,.13],metal:.72});
    // Landing skids, battery rails, and a compact telemetry mast make close inspection structurally informative.
    for(const z of [-.19,.19]){
      this.#child(this.meshes.box,body,[-.015,-.19,z],Q4.create(),[.36,.014,.014],{color:[.16,.20,.21],emissive:[.004,.010,.012],metal:.88});
      for(const x of [-.22,.22])this.#child(this.meshes.box,body,[x,-.135,z],qAxis([0,0,1],x<0?-.18:.18),[.014,.07,.014],{color:[.13,.17,.18],metal:.82});
    }
    this.#child(this.meshes.box,body,[-.16,.12,0],Q4.create(),[.055,.065,.035],{color:[.07,.20,.23],emissive:[.02,.16,.20],metal:.58});
    this.#child(this.meshes.cylinder,body,[-.16,.205,0],Q4.create(),[.018,.045,.018],{color:[.18,.30,.32],emissive:[.04,.15,.17],metal:.75});
    const armScale=this.parameters.get('drone.armLength')/.46;
    const maxRotor=evaluateRotor(this.parameters.get('drone.maxRPM'),this.parameters.get('drone.bladeRadius'),this.parameters.get('environment.airDensity')).thrust;
    for(let i=0;i<4;i++){
      const layout=ROTOR_LAYOUT[i],rx=layout.position[0]*armScale,rz=layout.position[2]*armScale;
      const len=Math.hypot(rx,rz),angle=Math.atan2(-rz,rx);
      this.#child(this.meshes.box,body,[rx*.5,.018,rz*.5],qAxis([0,1,0],angle),[len*.5,.028,.04],{color:[.105,.125,.132],emissive:[.004,.015,.019],metal:.88});
      this.#child(this.meshes.box,body,[rx*.67,.049,rz*.67],qAxis([0,1,0],angle),[len*.13,.007,.012],{color:COLORS.cyanBright,emissive:[.04,.28,.36],metal:.32,opacity:.92});
      const thrust=telemetry.rotorThrusts[i]||0,stress=Math.min(1.25,thrust/Math.max(.01,maxRotor));
      this.#child(this.meshes.cylinder,body,[rx,.075,rz],Q4.create(),[.105,.055,.105],{color:[.20,.24,.25],emissive:[stress*.52,stress*.12,.015],metal:.82,stress});
      const rotorAngle=interpolated.rotorAngles[i]||0;
      for(let blade=0;blade<2;blade++){
        const a=rotorAngle+blade*Math.PI;
        const bladeRadius=this.parameters.get('drone.bladeRadius');
        this.#child(this.meshes.box,body,[rx,.145,rz],qAxis([0,1,0],a),[bladeRadius*1.55,.012,.032],{color:[.23,.31,.33],emissive:[stress*.10,stress*.045,.007],metal:.74,opacity:.74,stress});
        const tipX=rx+Math.cos(a)*bladeRadius*1.39,tipZ=rz-Math.sin(a)*bladeRadius*1.39;
        this.#child(this.meshes.box,body,[tipX,.149,tipZ],qAxis([0,1,0],a),[.024,.014,.038],{color:COLORS.amber,emissive:[.30+.30*stress,.075,.006],metal:.4,opacity:.9,stress});
      }
      this.#child(this.meshes.cylinder,body,[rx,.139,rz],Q4.create(),[this.parameters.get('drone.bladeRadius')*1.62,.005,this.parameters.get('drone.bladeRadius')*1.62],{color:[.12,.48,.58],emissive:[.02,.08,.10],opacity:.07+stress*.05,metal:.2});
    }
    this.mountWorld.clear();
    for(const mount of PAYLOAD_MOUNTS){
      const world=V3.create();transformLocalPoint(world,body,mount.bodyPosition);this.mountWorld.set(mount.id,world);
      const attached=this.physics.state.payloads.has(mount.id);
      this.#child(this.meshes.sphere,body,mount.bodyPosition,Q4.create(),[.032,.032,.032],{color:attached?COLORS.amber:[.42,.25,.08],emissive:attached?[.62,.18,.01]:[.24,.09,.005],metal:.55,opacity:.95,stress:attached?1:.25});
      if(attached){
        const mass=this.physics.state.payloads.get(mount.id),drop=[mount.bodyPosition[0],mount.bodyPosition[1]-.10,mount.bodyPosition[2]];
        this.#child(this.meshes.cylinder,body,drop,Q4.create(),[.075,.075+.055*mass,.075],{color:[.18,.13,.07],emissive:[.08,.025,0],metal:.75});
      }
    }
    if(this.parameters.get('visual.forceVectors')){
      const origin=Array.from(p);
      const thrustEnd=[p[0]+telemetry.netForce[0]*.018,p[1]+Math.max(0,telemetry.totalThrust)*.022,p[2]+telemetry.netForce[2]*.018];
      const dragEnd=[p[0]+telemetry.dragForce[0]*.028,p[1]+telemetry.dragForce[1]*.028,p[2]+telemetry.dragForce[2]*.028];
      this.#segment(origin,thrustEnd,.012,{color:COLORS.cyanBright,emissive:[.06,.34,.48],metal:.2,opacity:.85});
      this.#segment(origin,dragEnd,.012,{color:COLORS.red,emissive:[.34,.03,.01],metal:.2,opacity:.8});
    }
  }

  render({interpolated,telemetry,time}){
    this.time=time;this.#updateCamera();this.drawQueue.length=0;
    const wind={speed:telemetry.windSpeed,vector:telemetry.windVector};
    this.#buildTunnel(wind);this.#buildDrone(interpolated,telemetry);
    const gl=this.gl;this.post.enabled=this.parameters.get('visual.postFX');this.post.samples=this.lod.current.postSamples;this.post.begin();
    gl.clearColor(.008,.018,.024,1);gl.clearDepth(1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);
    gl.uniformMatrix4fv(this.uniform.uViewProj,false,this.viewProj);gl.uniform3fv(this.uniform.uCamera,this.camera.position);gl.uniform3fv(this.uniform.uWind,wind.vector);gl.uniform1f(this.uniform.uTime,time);
    const opaque=this.drawQueue.filter(x=>x.material.opacity>=.995),transparent=this.drawQueue.filter(x=>x.material.opacity<.995);
    gl.depthMask(true);for(const item of opaque)this.#draw(item);
    gl.depthMask(false);transparent.sort((a,b)=>this.#distanceToModel(b.model)-this.#distanceToModel(a.model));for(const item of transparent)this.#draw(item);gl.depthMask(true);
    this.post.end(time);
  }

  #distanceToModel(m){return Math.hypot(m[12]-this.camera.position[0],m[13]-this.camera.position[1],m[14]-this.camera.position[2]);}
  #draw({mesh,model,material}){
    const gl=this.gl;gl.uniformMatrix4fv(this.uniform.uModel,false,model);gl.uniform3fv(this.uniform.uColor,material.color);gl.uniform3fv(this.uniform.uEmissive,material.emissive);gl.uniform1f(this.uniform.uOpacity,material.opacity);gl.uniform1f(this.uniform.uMetal,material.metal);gl.uniform1f(this.uniform.uGrid,material.grid);gl.uniform1f(this.uniform.uStress,material.stress);drawMesh(gl,mesh);
  }

  project(world,cssWidth=this.canvas.clientWidth,cssHeight=this.canvas.clientHeight){
    const clip=new Float32Array(3);M4.transformPoint(clip,this.viewProj,world);
    return {x:(clip[0]*.5+.5)*cssWidth,y:(1-(clip[1]*.5+.5))*cssHeight,depth:clip[2],visible:clip[2]>-1&&clip[2]<1};
  }

  screenRay(clientX,clientY,rect=this.canvas.getBoundingClientRect()){
    const x=(clientX-rect.left)/rect.width*2-1,y=1-(clientY-rect.top)/rect.height*2;
    const near=V3.create(),far=V3.create();M4.transformPoint(near,this.inverseViewProj,[x,y,-1]);M4.transformPoint(far,this.inverseViewProj,[x,y,1]);
    const direction=V3.normalize(V3.create(),V3.sub(V3.create(),far,near));return{origin:near,direction};
  }
  getMountWorldPositions(){return new Map([...this.mountWorld].map(([k,v])=>[k,V3.clone(v)]));}
  get cameraData(){return{position:V3.clone(this.camera.position),viewProj:new Float32Array(this.viewProj),inverseViewProj:new Float32Array(this.inverseViewProj),width:this.canvas.clientWidth,height:this.canvas.clientHeight};}
  destroy(){const gl=this.gl;this.post.destroy();gl.deleteProgram(this.program);Object.values(this.meshes).forEach(m=>disposeMesh(gl,m));}
}
