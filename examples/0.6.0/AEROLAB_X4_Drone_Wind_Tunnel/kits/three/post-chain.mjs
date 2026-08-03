import { createProgram } from './gl-utils.mjs';

const VS = `#version 300 es
precision highp float;
out vec2 vUv;
void main(){
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uColor;
uniform sampler2D uDepth;
uniform vec2 uTexel;
uniform float uBloom;
uniform float uAO;
uniform float uTime;
uniform int uSamples;
float lum(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
void main(){
  vec2 uv=vUv;
  vec3 base=texture(uColor,uv).rgb;
  float d=texture(uDepth,uv).r;
  float occ=0.0;
  vec2 dirs[8]=vec2[8](vec2(1,0),vec2(-1,0),vec2(0,1),vec2(0,-1),vec2(1,1),vec2(-1,1),vec2(1,-1),vec2(-1,-1));
  vec3 bloom=vec3(0.0); float bw=0.0;
  for(int i=0;i<8;i++){
    if(i>=uSamples) break;
    vec2 o=dirs[i]*uTexel*(2.0+float(i%3)*1.8);
    float nd=texture(uDepth,uv+o).r;
    occ += smoothstep(.0004,.012,d-nd);
    vec3 c=texture(uColor,uv+o*1.7).rgb;
    float w=smoothstep(.58,.94,lum(c)); bloom+=c*w; bw+=w;
  }
  occ = 1.0 - (occ/max(1.0,float(uSamples)))*.56*uAO;
  bloom = bw>0.0 ? bloom/bw : vec3(0.0);
  vec3 color = base*occ + bloom*uBloom*.42;
  float vignette=1.0-smoothstep(.25,.78,distance(uv,vec2(.5)))*.25;
  float grain=(fract(sin(dot(uv*vec2(1733.0,919.0)+uTime,vec2(12.9898,78.233)))*43758.5453)-.5)*.012;
  color = color*vignette + grain;
  color = color/(color+vec3(1.0));
  color = pow(color,vec3(.88));
  outColor=vec4(color,1.0);
}`;

export class PostChain {
  constructor(gl) {
    this.gl=gl; this.program=createProgram(gl,VS,FS); this.framebuffer=gl.createFramebuffer(); this.color=gl.createTexture(); this.depth=gl.createTexture();
    this.width=1;this.height=1;this.samples=6;this.enabled=true;
    this.uniforms={}; for(const name of ['uColor','uDepth','uTexel','uBloom','uAO','uTime','uSamples'])this.uniforms[name]=gl.getUniformLocation(this.program,name);
    this.resize(2,2);
  }
  resize(width,height){
    const gl=this.gl;this.width=Math.max(2,width|0);this.height=Math.max(2,height|0);
    gl.bindTexture(gl.TEXTURE_2D,this.color);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,this.width,this.height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
    gl.bindTexture(gl.TEXTURE_2D,this.depth);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,this.width,this.height,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);
    gl.bindFramebuffer(gl.FRAMEBUFFER,this.framebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,this.color,0);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,this.depth,0);
    const status=gl.checkFramebufferStatus(gl.FRAMEBUFFER);if(status!==gl.FRAMEBUFFER_COMPLETE)throw new Error(`Post framebuffer incomplete: ${status}`);gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  }
  begin(){const gl=this.gl;gl.bindFramebuffer(gl.FRAMEBUFFER,this.enabled?this.framebuffer:null);gl.viewport(0,0,this.width,this.height);}
  end(time=0){
    if(!this.enabled)return;
    const gl=this.gl;gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,gl.canvas.width,gl.canvas.height);gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.useProgram(this.program);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.color);gl.uniform1i(this.uniforms.uColor,0);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.depth);gl.uniform1i(this.uniforms.uDepth,1);
    gl.uniform2f(this.uniforms.uTexel,1/this.width,1/this.height);gl.uniform1f(this.uniforms.uBloom,1);gl.uniform1f(this.uniforms.uAO,1);gl.uniform1f(this.uniforms.uTime,time);gl.uniform1i(this.uniforms.uSamples,this.samples);gl.drawArrays(gl.TRIANGLES,0,3);gl.enable(gl.DEPTH_TEST);
  }
  destroy(){const gl=this.gl;gl.deleteProgram(this.program);gl.deleteFramebuffer(this.framebuffer);gl.deleteTexture(this.color);gl.deleteTexture(this.depth);}
}
