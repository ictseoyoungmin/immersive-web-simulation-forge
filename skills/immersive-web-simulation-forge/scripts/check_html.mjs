#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';

const target = path.resolve(process.argv[2] || '.');
const GLSL_ONLY = ['smoothstep','fract','mix','dFdx','dFdy','fwidth','textureLod','texelFetch'];

function walk(p){
  const st=fs.statSync(p);
  if(st.isFile()) return [p];
  return fs.readdirSync(p).flatMap(n=>walk(path.join(p,n)));
}

function maskStringsAndComments(src){
  const out=[...src]; let i=0, mode='code', quote='';
  while(i<src.length){
    const c=src[i], n=src[i+1];
    if(mode==='code'){
      if(c==='/'&&n==='/'){out[i]=out[i+1]=' '; i+=2; mode='line'; continue;}
      if(c==='/'&&n==='*'){out[i]=out[i+1]=' '; i+=2; mode='block'; continue;}
      if(c==='"'||c==="'"||c==='`'){quote=c; out[i]=' '; i++; mode='string'; continue;}
      i++; continue;
    }
    if(mode==='line'){ if(c==='\n'){mode='code';} else out[i]=' '; i++; continue; }
    if(mode==='block'){ out[i]=' '; if(c==='*'&&n==='/'){out[i+1]=' '; i+=2; mode='code';} else i++; continue; }
    if(mode==='string'){
      out[i]=' ';
      if(c==='\\'){ if(i+1<src.length){out[i+1]=' '; i+=2;} else i++; continue; }
      if(c===quote){mode='code'; quote='';}
      i++; continue;
    }
  }
  return out.join('');
}

function extractHtmlScripts(html){
  const scripts=[]; const re=/<script\b([^>]*)>([\s\S]*?)<\/script>/gi; let m;
  while((m=re.exec(html))){
    const attrs=m[1]||'';
    if(/\bsrc\s*=/.test(attrs)) continue;
    scripts.push({module:/\btype\s*=\s*["']module["']/i.test(attrs), code:m[2]});
  }
  return scripts;
}

function syntaxCheck(code, moduleMode=true){
  const tmp=path.join(os.tmpdir(),`iwsf-${process.pid}-${Math.random().toString(16).slice(2)}.${moduleMode?'mjs':'cjs'}`);
  fs.writeFileSync(tmp, code);
  const r=spawnSync(process.execPath,['--check',tmp],{encoding:'utf8'});
  fs.unlinkSync(tmp);
  return {ok:r.status===0, error:(r.stderr||r.stdout||'').trim()};
}

function leakageCheck(code,file){
  const masked=maskStringsAndComments(code); const findings=[];
  for(const name of GLSL_ONLY){
    const call=new RegExp(`\\b${name}\\s*\\(`,'g');
    if(!call.test(masked)) continue;
    const declared=new RegExp(`(?:function\\s+${name}\\b|(?:const|let|var)\\s+${name}\\b|import\\s*\\{[^}]*\\b${name}\\b|import\\s+${name}\\b)`).test(masked);
    if(!declared) findings.push({file,identifier:name,message:`${name}() appears in JavaScript but is not declared/imported; it may be a leaked GLSL built-in.`});
  }
  return findings;
}

if(!fs.existsSync(target)){console.error(`Target not found: ${target}`);process.exit(2);}
const files=walk(target).filter(f=>/\.(?:html?|m?js|cjs)$/i.test(f) && !/node_modules/.test(f));
const syntax=[], leakage=[];
for(const file of files){
  const src=fs.readFileSync(file,'utf8');
  if(/\.html?$/i.test(file)){
    extractHtmlScripts(src).forEach((s,i)=>{
      const r=syntaxCheck(s.code,s.module); syntax.push({file:`${file}#script-${i+1}`,...r});
      leakage.push(...leakageCheck(s.code,`${file}#script-${i+1}`));
    });
  } else {
    const r=syntaxCheck(src,/\.mjs$/i.test(file)||/\b(?:import|export)\b/.test(src)); syntax.push({file,...r});
    leakage.push(...leakageCheck(src,file));
  }
}
const failures=syntax.filter(x=>!x.ok);
const report={status:failures.length||leakage.length?'fail':'pass',files:files.length,syntax_failures:failures,glsl_js_leakage:leakage};
console.log(JSON.stringify(report,null,2));
process.exit(report.status==='pass'?0:1);
