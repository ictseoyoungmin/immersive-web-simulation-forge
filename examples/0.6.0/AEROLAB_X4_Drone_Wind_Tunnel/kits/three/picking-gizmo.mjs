import { V3 } from '../math/vec3.mjs';

function raySphere(origin, direction, center, radius) {
  const oc=V3.sub(V3.create(),origin,center);
  const b=V3.dot(oc,direction),c=V3.dot(oc,oc)-radius*radius;
  const h=b*b-c;if(h<0)return Infinity;
  const t=-b-Math.sqrt(h);return t>=0?t:Infinity;
}

export class PickingGizmo extends EventTarget {
  constructor({ renderer, physics, payloadMass = .15 }) {
    super();this.renderer=renderer;this.physics=physics;this.payloadMass=payloadMass;this.hovered=null;
  }
  pick(clientX,clientY) {
    const ray=this.renderer.screenRay(clientX,clientY);
    let best=null,bestT=Infinity;
    for(const [id,position] of this.renderer.getMountWorldPositions()){
      const t=raySphere(ray.origin,ray.direction,position,.12);
      if(t<bestT){bestT=t;best=id;}
    }
    return best;
  }
  activate(clientX,clientY) {
    const id=this.pick(clientX,clientY);if(!id)return null;
    const attached=this.physics.attachPayload(id,this.payloadMass);
    const detail={id,attached,mass:attached?this.physics.state.payloads.get(id):0,totalPayloadMass:this.physics.state.totalPayloadMass};
    this.dispatchEvent(new CustomEvent('change',{detail}));return detail;
  }
}
