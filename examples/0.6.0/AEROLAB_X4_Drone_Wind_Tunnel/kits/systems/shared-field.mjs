export class SharedField {
  constructor(windField) { this.windField=windField; this.consumers=new Map(); this.time=0; }
  register(name,consumer){this.consumers.set(name,consumer);return()=>this.consumers.delete(name);}
  sample(position,time=this.time,out={}){return this.windField.sample(position,time,out);}
  update(time){this.time=time;for(const consumer of this.consumers.values())consumer?.(this,time);}
}
