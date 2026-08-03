export function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile failed: ${log}`);
  }
  return shader;
}

export function createProgram(gl, vertexSource, fragmentSource) {
  const program = gl.createProgram();
  gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program link failed: ${log}`);
  }
  return program;
}

export function createMesh(gl, geometry) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const position = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, position);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry.positions), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  const normal = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normal);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry.normals), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
  let index = null;
  if (geometry.indices) {
    index = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(geometry.indices), gl.STATIC_DRAW);
  }
  gl.bindVertexArray(null);
  return { vao, position, normal, index, count: geometry.indices?.length ?? geometry.positions.length / 3, mode: geometry.mode ?? gl.TRIANGLES, indexed: !!geometry.indices };
}

export function drawMesh(gl, mesh) {
  gl.bindVertexArray(mesh.vao);
  if (mesh.indexed) gl.drawElements(mesh.mode, mesh.count, gl.UNSIGNED_INT, 0);
  else gl.drawArrays(mesh.mode, 0, mesh.count);
}

export function disposeMesh(gl, mesh) {
  gl.deleteBuffer(mesh.position); gl.deleteBuffer(mesh.normal); if (mesh.index) gl.deleteBuffer(mesh.index); gl.deleteVertexArray(mesh.vao);
}

export function boxGeometry() {
  const p = [
    -1,-1, 1, 1,-1, 1, 1, 1, 1,-1, 1, 1,
     1,-1,-1,-1,-1,-1,-1, 1,-1, 1, 1,-1,
    -1, 1, 1, 1, 1, 1, 1, 1,-1,-1, 1,-1,
    -1,-1,-1, 1,-1,-1, 1,-1, 1,-1,-1, 1,
     1,-1, 1, 1,-1,-1, 1, 1,-1, 1, 1, 1,
    -1,-1,-1,-1,-1, 1,-1, 1, 1,-1, 1,-1
  ];
  const n = [
    0,0,1,0,0,1,0,0,1,0,0,1, 0,0,-1,0,0,-1,0,0,-1,0,0,-1,
    0,1,0,0,1,0,0,1,0,0,1,0, 0,-1,0,0,-1,0,0,-1,0,0,-1,0,
    1,0,0,1,0,0,1,0,0,1,0,0, -1,0,0,-1,0,0,-1,0,0,-1,0,0
  ];
  const i=[]; for(let f=0;f<6;f++){const o=f*4;i.push(o,o+1,o+2,o,o+2,o+3);} return {positions:p,normals:n,indices:i};
}

export function planeGeometry() {
  return { positions:[-1,0,-1, 1,0,-1, 1,0,1, -1,0,1], normals:[0,1,0,0,1,0,0,1,0,0,1,0], indices:[0,1,2,0,2,3] };
}

export function cylinderGeometry(segments = 24, capped = true) {
  const positions=[], normals=[], indices=[];
  for(let i=0;i<=segments;i++){
    const a=i/segments*Math.PI*2,c=Math.cos(a),s=Math.sin(a);
    positions.push(c,-1,s,c,1,s); normals.push(c,0,s,c,0,s);
  }
  for(let i=0;i<segments;i++){const o=i*2;indices.push(o,o+1,o+3,o,o+3,o+2);}
  if(capped){
    const bottom=positions.length/3;positions.push(0,-1,0);normals.push(0,-1,0);
    const top=positions.length/3;positions.push(0,1,0);normals.push(0,1,0);
    for(let i=0;i<segments;i++){
      const a=i/segments*Math.PI*2,b=(i+1)/segments*Math.PI*2;
      const bi=positions.length/3;positions.push(Math.cos(a),-1,Math.sin(a),Math.cos(b),-1,Math.sin(b));normals.push(0,-1,0,0,-1,0);indices.push(bottom,bi+1,bi);
      const ti=positions.length/3;positions.push(Math.cos(a),1,Math.sin(a),Math.cos(b),1,Math.sin(b));normals.push(0,1,0,0,1,0);indices.push(top,ti,ti+1);
    }
  }
  return {positions,normals,indices};
}

export function sphereGeometry(segments = 20, rings = 12) {
  const positions=[],normals=[],indices=[];
  for(let y=0;y<=rings;y++){
    const v=y/rings,phi=v*Math.PI;
    for(let x=0;x<=segments;x++){
      const u=x/segments,theta=u*Math.PI*2;
      const sx=Math.sin(phi)*Math.cos(theta),sy=Math.cos(phi),sz=Math.sin(phi)*Math.sin(theta);
      positions.push(sx,sy,sz);normals.push(sx,sy,sz);
    }
  }
  for(let y=0;y<rings;y++)for(let x=0;x<segments;x++){const a=y*(segments+1)+x,b=a+segments+1;indices.push(a,b,a+1,b,b+1,a+1);}
  return {positions,normals,indices};
}
