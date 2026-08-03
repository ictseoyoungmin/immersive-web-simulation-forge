export const M4 = {
  create: () => new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]),
  identity: out => { out.set([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]); return out; },
  multiply: (out, a, b) => {
    for (let c=0;c<4;c++) for (let r=0;r<4;r++) out[c*4+r] = a[r]*b[c*4] + a[4+r]*b[c*4+1] + a[8+r]*b[c*4+2] + a[12+r]*b[c*4+3];
    return out;
  },
  perspective: (out, fovy, aspect, near, far) => {
    const f = 1/Math.tan(fovy/2), nf = 1/(near-far);
    out.set([f/aspect,0,0,0, 0,f,0,0, 0,0,(far+near)*nf,-1, 0,0,2*far*near*nf,0]);
    return out;
  },
  lookAt: (out, eye, target, up) => {
    let zx=eye[0]-target[0], zy=eye[1]-target[1], zz=eye[2]-target[2];
    let l=Math.hypot(zx,zy,zz)||1; zx/=l;zy/=l;zz/=l;
    let xx=up[1]*zz-up[2]*zy, xy=up[2]*zx-up[0]*zz, xz=up[0]*zy-up[1]*zx;
    l=Math.hypot(xx,xy,xz)||1;xx/=l;xy/=l;xz/=l;
    const yx=zy*xz-zz*xy, yy=zz*xx-zx*xz, yz=zx*xy-zy*xx;
    out.set([xx,yx,zx,0, xy,yy,zy,0, xz,yz,zz,0, -(xx*eye[0]+xy*eye[1]+xz*eye[2]),-(yx*eye[0]+yy*eye[1]+yz*eye[2]),-(zx*eye[0]+zy*eye[1]+zz*eye[2]),1]);
    return out;
  },
  fromTRS: (out, p, q, s=[1,1,1]) => {
    const x=q[0],y=q[1],z=q[2],w=q[3], x2=x+x,y2=y+y,z2=z+z;
    const xx=x*x2,xy=x*y2,xz=x*z2, yy=y*y2,yz=y*z2,zz=z*z2, wx=w*x2,wy=w*y2,wz=w*z2;
    out.set([(1-(yy+zz))*s[0],(xy+wz)*s[0],(xz-wy)*s[0],0,
      (xy-wz)*s[1],(1-(xx+zz))*s[1],(yz+wx)*s[1],0,
      (xz+wy)*s[2],(yz-wx)*s[2],(1-(xx+yy))*s[2],0,
      p[0],p[1],p[2],1]);
    return out;
  },
  translateScale: (out,p,s) => { out.set([s[0],0,0,0, 0,s[1],0,0, 0,0,s[2],0, p[0],p[1],p[2],1]); return out; },
  transformPoint: (out,m,p) => {
    const x=p[0],y=p[1],z=p[2],w=m[3]*x+m[7]*y+m[11]*z+m[15]||1;
    out[0]=(m[0]*x+m[4]*y+m[8]*z+m[12])/w;out[1]=(m[1]*x+m[5]*y+m[9]*z+m[13])/w;out[2]=(m[2]*x+m[6]*y+m[10]*z+m[14])/w;return out;
  },
  invert: (out,a) => {
    const m=a; const b00=m[0]*m[5]-m[1]*m[4], b01=m[0]*m[6]-m[2]*m[4], b02=m[0]*m[7]-m[3]*m[4], b03=m[1]*m[6]-m[2]*m[5], b04=m[1]*m[7]-m[3]*m[5], b05=m[2]*m[7]-m[3]*m[6], b06=m[8]*m[13]-m[9]*m[12], b07=m[8]*m[14]-m[10]*m[12], b08=m[8]*m[15]-m[11]*m[12], b09=m[9]*m[14]-m[10]*m[13], b10=m[9]*m[15]-m[11]*m[13], b11=m[10]*m[15]-m[11]*m[14];
    let det=b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06; if(!det)return null; det=1/det;
    out[0]=(m[5]*b11-m[6]*b10+m[7]*b09)*det;out[1]=(-m[1]*b11+m[2]*b10-m[3]*b09)*det;out[2]=(m[13]*b05-m[14]*b04+m[15]*b03)*det;out[3]=(-m[9]*b05+m[10]*b04-m[11]*b03)*det;
    out[4]=(-m[4]*b11+m[6]*b08-m[7]*b07)*det;out[5]=(m[0]*b11-m[2]*b08+m[3]*b07)*det;out[6]=(-m[12]*b05+m[14]*b02-m[15]*b01)*det;out[7]=(m[8]*b05-m[10]*b02+m[11]*b01)*det;
    out[8]=(m[4]*b10-m[5]*b08+m[7]*b06)*det;out[9]=(-m[0]*b10+m[1]*b08-m[3]*b06)*det;out[10]=(m[12]*b04-m[13]*b02+m[15]*b00)*det;out[11]=(-m[8]*b04+m[9]*b02-m[11]*b00)*det;
    out[12]=(-m[4]*b09+m[5]*b07-m[6]*b06)*det;out[13]=(m[0]*b09-m[1]*b07+m[2]*b06)*det;out[14]=(-m[12]*b03+m[13]*b01-m[14]*b00)*det;out[15]=(m[8]*b03-m[9]*b01+m[10]*b00)*det;return out;
  }
};
