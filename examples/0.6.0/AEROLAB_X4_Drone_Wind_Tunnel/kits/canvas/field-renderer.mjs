import { V3 } from '../math/vec3.mjs';

const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const hash=i=>{const x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x);};

export class FieldRenderer {
  constructor({canvas,windField,sceneRenderer,lod,parameters}){
    this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:true});this.windField=windField;this.sceneRenderer=sceneRenderer;this.lod=lod;this.parameters=parameters;
    this.particles=[];this.width=2;this.height=2;this.dpr=1;this.time=0;this.targetCount=0;this.vectorGrid=[];this.gridTimer=0;
    this.setCount(lod.current.particleCount);
  }
  resize(width,height,dpr=1){
    this.width=Math.max(2,Math.round(width*dpr));this.height=Math.max(2,Math.round(height*dpr));this.dpr=dpr;
    if(this.canvas.width!==this.width)this.canvas.width=this.width;if(this.canvas.height!==this.height)this.canvas.height=this.height;
    this.canvas.style.width=`${width}px`;this.canvas.style.height=`${height}px`;
  }
  setCount(count){
    this.targetCount=count|0;
    while(this.particles.length<this.targetCount)this.particles.push(this.#spawn(this.particles.length));
    if(this.particles.length>this.targetCount)this.particles.length=this.targetCount;
  }
  #spawn(i,atInlet=false){
    return {position:V3.create(atInlet?-7.05:-7.1+hash(i*3.1)*14.2,.16+hash(i*5.7)*4.55,-2.82+hash(i*7.3)*5.64),age:hash(i*11.1)*4.5,life:2.7+hash(i*13.2)*4.8,seed:i+Math.floor(this.time*1000),trail:[]};
  }
  #reset(p,i){const n=this.#spawn(i,true);p.position=n.position;p.age=0;p.life=n.life;p.trail.length=0;}
  update(dt,time){
    this.time=time;this.setCount(this.lod.current.particleCount);
    const speed=Math.max(.5,this.parameters.get('wind.speed'));
    for(let i=0;i<this.particles.length;i++){
      const p=this.particles[i],sample=this.windField.sample(p.position,time,{});p.age+=dt;
      const step=Math.min(.06,dt)*(speed<1?1.8:1);
      V3.madd(p.position,p.position,sample.velocity,step);
      if(i%3===0&&p.trail.length<4)p.trail.push(V3.clone(p.position));else if(i%3===0){p.trail.shift();p.trail.push(V3.clone(p.position));}
      if(p.age>p.life||Math.abs(p.position[0])>7.3||p.position[1]<.05||p.position[1]>4.95||Math.abs(p.position[2])>2.95)this.#reset(p,i);
    }
    this.gridTimer-=dt;if(this.gridTimer<=0&&this.parameters.get('visual.vectorGrid')){this.vectorGrid=this.windField.buildVectorGrid({divisions:[10,5,5],time});this.gridTimer=.3;}
  }
  render(){
    const ctx=this.ctx;ctx.setTransform(this.dpr,0,0,this.dpr,0,0);const cssW=this.width/this.dpr,cssH=this.height/this.dpr;ctx.clearRect(0,0,cssW,cssH);
    if(!this.parameters.get('visual.flowVisible'))return;
    ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
    const maxSpeed=Math.max(5,this.parameters.get('wind.speed')*1.4);
    const droneScreen=this.sceneRenderer.project(this.sceneRenderer.physics.state.position,cssW,cssH);
    for(let i=0;i<this.particles.length;i++){
      const p=this.particles[i],sample=this.windField.sample(p.position,this.time,{}),s=this.sceneRenderer.project(p.position,cssW,cssH);
      if(!s.visible||s.x<0||s.x>cssW||s.y<0||s.y>cssH)continue;
      const ahead=V3.madd(V3.create(),p.position,sample.velocity,.035),e=this.sceneRenderer.project(ahead,cssW,cssH);
      const t=clamp(sample.speed/maxSpeed,0,1),hue=215-(215-2)*Math.pow(t,.88);
      const focusFade=clamp((Math.hypot(s.x-droneScreen.x,s.y-droneScreen.y)-72)/165,0,1);
      const alpha=(.025+.105*(1-Math.abs(s.depth)*.55))*focusFade;
      ctx.strokeStyle=`hsla(${hue},95%,${58+18*t}%,${alpha})`;ctx.lineWidth=.35+.72*t;
      ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(e.x,e.y);ctx.stroke();
      if(i%8===0){ctx.fillStyle=`hsla(${hue},100%,72%,${alpha*.9})`;ctx.beginPath();ctx.arc(s.x,s.y,.45+1.1*t,0,Math.PI*2);ctx.fill();}
    }
    if(this.parameters.get('visual.vectorGrid'))this.#drawGrid(ctx,cssW,cssH,maxSpeed);
    ctx.globalCompositeOperation='source-over';
  }
  #drawGrid(ctx,w,h,maxSpeed){
    for(const cell of this.vectorGrid){
      const s=this.sceneRenderer.project(cell.position,w,h);if(!s.visible)continue;
      const end=V3.madd(V3.create(),cell.position,cell.velocity,.055),e=this.sceneRenderer.project(end,w,h),t=clamp(cell.speed/maxSpeed,0,1),hue=205-200*t;
      ctx.strokeStyle=`hsla(${hue},95%,65%,.32)`;ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(e.x,e.y);ctx.stroke();
      const a=Math.atan2(e.y-s.y,e.x-s.x);ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.x-Math.cos(a-.5)*3,e.y-Math.sin(a-.5)*3);ctx.moveTo(e.x,e.y);ctx.lineTo(e.x-Math.cos(a+.5)*3,e.y-Math.sin(a+.5)*3);ctx.stroke();
    }
  }
  destroy(){this.particles.length=0;this.vectorGrid.length=0;}
}
