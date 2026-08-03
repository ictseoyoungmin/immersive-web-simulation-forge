const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));

function setup(canvas){
  const rect=canvas.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1),w=Math.max(2,Math.round(rect.width*dpr)),h=Math.max(2,Math.round(rect.height*dpr));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);return{ctx,w:rect.width,h:rect.height};
}
function grid(ctx,w,h){
  ctx.clearRect(0,0,w,h);ctx.strokeStyle='rgba(130,180,197,.09)';ctx.lineWidth=.7;
  for(let i=1;i<4;i++){const y=h*i/4;ctx.beginPath();ctx.moveTo(0,y+.5);ctx.lineTo(w,y+.5);ctx.stroke();}
  for(let i=1;i<6;i++){const x=w*i/6;ctx.beginPath();ctx.moveTo(x+.5,0);ctx.lineTo(x+.5,h);ctx.stroke();}
}
function drawSeries(ctx,data,w,h,min,max,stroke){
  if(data.length<2)return;ctx.strokeStyle=stroke;ctx.lineWidth=1.3;ctx.beginPath();
  const t0=data[0].time,t1=data.at(-1).time||t0+1,span=Math.max(.001,t1-t0),range=Math.max(.001,max-min);
  data.forEach((p,i)=>{const x=(p.time-t0)/span*w,y=h-(p.value-min)/range*h;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();
}

export class TelemetryRenderer {
  constructor({attitudeCanvas,powerCanvas,measurements}){this.attitudeCanvas=attitudeCanvas;this.powerCanvas=powerCanvas;this.measurements=measurements;this.frame=0;}
  render(){
    if((this.frame++&1)!==0)return;
    this.#attitude();this.#power();
  }
  #attitude(){
    const {ctx,w,h}=setup(this.attitudeCanvas);grid(ctx,w,h);const roll=this.measurements.get('roll').toArray(),pitch=this.measurements.get('pitch').toArray();
    let maxAbs=8;for(const p of roll)maxAbs=Math.max(maxAbs,Math.abs(p.value));for(const p of pitch)maxAbs=Math.max(maxAbs,Math.abs(p.value));maxAbs=Math.min(90,Math.ceil(maxAbs/5)*5);
    ctx.save();ctx.translate(0,4);drawSeries(ctx,roll,w,h-8,-maxAbs,maxAbs,'rgba(99,220,255,.95)');drawSeries(ctx,pitch,w,h-8,-maxAbs,maxAbs,'rgba(255,177,74,.9)');ctx.restore();
    ctx.font='8px ui-monospace,monospace';ctx.fillStyle='rgba(114,145,156,.7)';ctx.fillText(`+${maxAbs}°`,4,10);ctx.fillText(`-${maxAbs}°`,4,h-4);
    ctx.fillStyle='rgba(99,220,255,.8)';ctx.fillRect(w-58,7,7,1.5);ctx.fillText('ROLL',w-47,10);ctx.fillStyle='rgba(255,177,74,.8)';ctx.fillRect(w-58,18,7,1.5);ctx.fillText('PITCH',w-47,21);
  }
  #power(){
    const {ctx,w,h}=setup(this.powerCanvas);grid(ctx,w,h);const power=this.measurements.get('power').toArray(),wind=this.measurements.get('wind').toArray();if(power.length<2||wind.length<2)return;
    const n=Math.min(power.length,wind.length),pts=[];let maxPower=200;
    for(let i=Math.max(0,n-360);i<n;i++){const p=power[power.length-n+i].value,x=wind[wind.length-n+i].value;maxPower=Math.max(maxPower,p);pts.push({x,y:p});}
    maxPower=Math.ceil(maxPower/250)*250;ctx.strokeStyle='rgba(114,240,186,.85)';ctx.lineWidth=1.2;ctx.beginPath();
    pts.forEach((p,i)=>{const x=clamp(p.x/30,0,1)*w,y=h-clamp(p.y/maxPower,0,1)*h;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();
    const last=pts.at(-1);if(last){const x=last.x/30*w,y=h-last.y/maxPower*h;ctx.fillStyle='rgba(114,240,186,.95)';ctx.beginPath();ctx.arc(x,y,2.2,0,Math.PI*2);ctx.fill();}
    ctx.font='8px ui-monospace,monospace';ctx.fillStyle='rgba(114,145,156,.7)';ctx.fillText(`${maxPower} W`,4,10);ctx.fillText('30 m/s',w-38,h-4);
  }
}
