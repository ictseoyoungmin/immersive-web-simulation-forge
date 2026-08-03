/**
 * WebGL2 scene-resolution FBO plus native-resolution resolve.
 * Render expensive scene work into beginScene(), then call resolve() after
 * binding the default framebuffer. Grain/scanlines should be added here, not
 * inside the low-resolution scene shader.
 */
export function createResolvePass(gl, options = {}) {
  if (!(gl instanceof WebGL2RenderingContext)) throw new Error('WebGL2 required');
  const state = { sceneWidth:1, sceneHeight:1, outputWidth:1, outputHeight:1, sharpen:options.sharpen ?? 0.22, grain:options.grain ?? 0 };
  const texture = gl.createTexture();
  const framebuffer = gl.createFramebuffer();
  const depth = gl.createRenderbuffer();
  const vao = gl.createVertexArray();

  const vs = `#version 300 es
  precision highp float; out vec2 vUv;
  void main(){ vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2); vUv=p; gl_Position=vec4(p*2.-1.,0.,1.); }`;
  const fs = `#version 300 es
  precision highp float; in vec2 vUv; out vec4 outColor;
  uniform sampler2D uScene; uniform vec2 uTexel; uniform float uSharpen; uniform float uGrain; uniform float uTime;
  float hash12(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
  void main(){
    vec2 uv=clamp(vUv,0.,1.);
    vec3 c=texture(uScene,uv).rgb;
    vec3 n=texture(uScene,uv+vec2(0.,uTexel.y)).rgb;
    vec3 s=texture(uScene,uv-vec2(0.,uTexel.y)).rgb;
    vec3 e=texture(uScene,uv+vec2(uTexel.x,0.)).rgb;
    vec3 w=texture(uScene,uv-vec2(uTexel.x,0.)).rgb;
    vec3 blur=(n+s+e+w)*.25;
    float edge=clamp(length(c-blur)*4.,0.,1.);
    vec3 resolved=max(vec3(0.),c+(c-blur)*uSharpen*(.45+.55*edge));
    resolved+=(hash12(gl_FragCoord.xy+fract(uTime)*91.)-.5)*uGrain;
    outColor=vec4(resolved,1.);
  }`;
  function shader(type, source) {
    const sh=gl.createShader(type); gl.shaderSource(sh,source); gl.compileShader(sh);
    if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh)||'shader compile failure');
    return sh;
  }
  const program=gl.createProgram();
  gl.attachShader(program,shader(gl.VERTEX_SHADER,vs)); gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fs)); gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program)||'program link failure');
  const U={ scene:gl.getUniformLocation(program,'uScene'), texel:gl.getUniformLocation(program,'uTexel'), sharpen:gl.getUniformLocation(program,'uSharpen'), grain:gl.getUniformLocation(program,'uGrain'), time:gl.getUniformLocation(program,'uTime') };

  function resize(sceneWidth, sceneHeight, outputWidth, outputHeight) {
    Object.assign(state,{sceneWidth,sceneHeight,outputWidth,outputHeight});
    gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,sceneWidth,sceneHeight,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
    gl.bindRenderbuffer(gl.RENDERBUFFER,depth);
    gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,sceneWidth,sceneHeight);
    gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,depth);
    if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE) throw new Error('resolve framebuffer incomplete');
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  }
  function beginScene() { gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer); gl.viewport(0,0,state.sceneWidth,state.sceneHeight); }
  function resolve(time=0) {
    gl.bindFramebuffer(gl.FRAMEBUFFER,null); gl.viewport(0,0,state.outputWidth,state.outputHeight);
    gl.disable(gl.DEPTH_TEST); gl.useProgram(program); gl.bindVertexArray(vao);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,texture); gl.uniform1i(U.scene,0);
    gl.uniform2f(U.texel,1/state.sceneWidth,1/state.sceneHeight); gl.uniform1f(U.sharpen,state.sharpen); gl.uniform1f(U.grain,state.grain); gl.uniform1f(U.time,time);
    gl.drawArrays(gl.TRIANGLES,0,3);
  }
  function dispose(){ gl.deleteTexture(texture); gl.deleteFramebuffer(framebuffer); gl.deleteRenderbuffer(depth); gl.deleteVertexArray(vao); gl.deleteProgram(program); }
  return { state, texture, framebuffer, resize, beginScene, resolve, dispose };
}
