import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePreferences } from '../src/visuals/preferences';
import { defaultVisualConfig } from '../src/visuals/contracts';
import { adjacentPreset,randomPreset,PresetCycle } from '../src/visuals/milkdrop/cycle';
import { milkdropPresets } from '../src/visuals/milkdrop/catalog';
import { MilkAudioInput } from '../src/visuals/milkdrop/audio';
import { driveMilkClock } from '../src/visuals/milkdrop/clock';
import type { MilkRenderer,MilkFactory } from '../src/visuals/milkdrop/types';
import { GLResources } from '../src/visuals/milkdrop/resources';
import { MilkDropEngine } from '../src/visuals/milkdrop/engine';
import { presets } from '../src/visuals/milkdrop/presets.generated';

test('MilkDrop preferences validate presets, cycling and bounded seconds without autoplay',()=>{
 const value=validatePreferences({mode:'milkdrop',milkdropPreset:'liquid',milkdropCycle:true,milkdropInterval:30,milkdropTransition:4,playing:true});
 assert.equal(value.mode,'milkdrop');assert.equal(value.milkdropPreset,'liquid');assert.equal(value.milkdropCycle,true);assert.equal(value.milkdropInterval,30);assert.equal(value.milkdropTransition,4);assert.equal('playing' in value,false);
 const bad=validatePreferences({milkdropPreset:'../evil',milkdropCycle:'true',milkdropInterval:Infinity,milkdropTransition:0});
 for(const key of ['milkdropPreset','milkdropCycle','milkdropInterval','milkdropTransition'] as const)assert.equal(bad[key],defaultVisualConfig[key]);
});
test('preset navigation wraps and random selection excludes the current preset',()=>{
 assert.equal(adjacentPreset('aurora',-1),'crystal');assert.equal(adjacentPreset('crystal',1),'aurora');
 for(const preset of milkdropPresets)for(const n of [0,.25,.99,1,NaN])assert.notEqual(randomPreset(preset.id,()=>n),preset.id);
});
test('cycling uses eligible elapsed seconds, pauses when hidden/silent and resets on selection/interval changes',()=>{
 for(const hz of [30,60,144]){const cycle=new PresetCycle();cycle.configure('aurora',true,15);let result=null;
 for(let i=0;i<hz*15;i++)result=cycle.update(1/hz,true)??result;assert.equal(result,'galaxy');}
 const cycle=new PresetCycle();cycle.configure('aurora',true,15);cycle.update(14,true);assert.equal(cycle.update(100,false),null);assert.equal(cycle.update(1,true),'galaxy');
 cycle.configure('crystal',true,30);assert.equal(cycle.update(29,true),null);assert.equal(cycle.update(1,true),'aurora');cycle.configure('aurora',false,30);assert.equal(cycle.update(300,true),null);
});
test('preset transitions finish in host seconds independently of FPS and motion speed',()=>{
 for(const hz of [30,60,144])for(const speed of [.05,1]){const renderer={time:0,fps:0,blending:true,blendProgress:0,blendDuration:3} as MilkRenderer;
 driveMilkClock(renderer,()=>speed);for(let i=0;i<hz*3;i++)renderer.calcTimeAndFPS(1/hz);
 assert.ok(Math.abs(renderer.blendProgress-1)<1e-10);assert.ok(Math.abs(renderer.time-3*speed)<1e-9);assert.equal(renderer.fps,hz);}
});
test('PCM input preserves frequency at 44.1/48 kHz, reuses buffers and centers silence without NaNs',()=>{
 for(const rate of [44100,48000]){
 const pcm=Float32Array.from({length:4096},(_,i)=>.3*Math.sin(2*Math.PI*1000*i/rate));const input=new MilkAudioInput();
 for(let i=0;i<120;i++)input.update(pcm,rate,true,1,.5,1/60);
 let maxError=0;for(let i=0;i<1024;i++){const position=4095-(1023-i)*rate/44100;const expected=128+127*.3*Math.sin(2*Math.PI*1000*position/rate);maxError=Math.max(maxError,Math.abs(input.bytes[i]-expected));}
 assert.ok(maxError<1);assert.equal(input.levels.timeByteArrayL,input.bytes);assert.equal(input.levels.timeByteArrayR,input.bytes);
 const levels=input.update(new Float32Array(4096),rate,false,1,.5,1/60);assert.equal(levels,input.levels);assert.ok(input.bytes.every(n=>n===128));input.reset();assert.ok(input.bytes.every(n=>n===128));
 }
 const bad=new MilkAudioInput();bad.update(new Float32Array(4096).fill(NaN),48000,true,1,0,1);assert.ok(bad.bytes.every(n=>n===128));
});
test('vendored preset equations are functions, no runtime string compilation or remote textures',()=>{
 for(const preset of Object.values(presets)){assert.equal(typeof preset.init_eqs,'function');assert.equal(typeof preset.frame_eqs,'function');assert.ok(!JSON.stringify(preset).includes('https://'));for(const part of [...preset.shapes,...preset.waves])if(part.baseVals.enabled)assert.equal(typeof part.frame_eqs,'function');}
});
test('exclusive GL tracking reclaims abandoned resources, retains live ones and releases once',()=>{
 const deleted:object[]=[],objects:object[]=[];let lost=0;
 const native={createTexture(){const handle={};objects.push(handle);return handle;},deleteTexture(handle:object){deleted.push(handle);},getExtension(){return {loseContext(){lost++;}};}} as unknown as WebGL2RenderingContext;
 const resources=new GLResources(native),first=resources.gl.createTexture(),second=resources.gl.createTexture();assert.equal(resources.count,2);
 resources.sweep({texture:second});assert.deepEqual(deleted,[first]);assert.equal(resources.count,1);resources.dispose();resources.dispose();assert.deepEqual(deleted,[first,second]);assert.equal(lost,1);
});
test('late module resolution after engine disposal cannot allocate a renderer or resurrect its canvas',async()=>{
 let resolve!:(factory:MilkFactory)=>void,calls=0,removed=0;
 const canvas={setAttribute(){},addEventListener(){},removeEventListener(){},remove(){removed++;}};
 const previous=globalThis.document;Object.defineProperty(globalThis,'document',{value:{createElement:()=>canvas},configurable:true});
 try{const engine=new MilkDropEngine(()=>new Promise(done=>{resolve=done;}));engine.initialize({container:{appendChild(){}} as unknown as HTMLElement,reportFailure(){assert.fail('stale callback');}});engine.dispose();engine.dispose();resolve((()=>{calls++;}) as unknown as MilkFactory);await Promise.resolve();await Promise.resolve();assert.equal(calls,0);assert.equal(removed,2);}finally{Object.defineProperty(globalThis,'document',{value:previous,configurable:true});}
});
import { EngineRegistry } from '../src/visuals/engine';
import { EngineSession } from '../src/visuals/session';
import { resolveRenderSize } from '../src/visuals/sizing';
test('reduced/zero motion bypasses MilkDrop allocation and restores it without changing the selected mode',()=>{
 let allocated=0,disposed=0;const registry=new EngineRegistry();
 for(const id of ['milkdrop','waveform'])registry.register({id,name:id,selectable:true,capabilities:{backend:id==='milkdrop'?'webgl2':'canvas2d',spectrum:false,waveform:true,reducedMotion:id==='waveform',layouts:[]},create:()=>{if(id==='milkdrop')allocated++;return {initialize(){},configure(){},resize(){},activate(){},deactivate(){},render(){},dispose(){if(id==='milkdrop')disposed++;}};}});
 const config={...defaultVisualConfig,mode:'milkdrop' as const,reducedMotion:true},session=new EngineSession(registry,{} as HTMLElement,config,resolveRenderSize(800,600,1,'balanced'));
 session.select('milkdrop');assert.equal(allocated,0);assert.equal(session.info?.id,'waveform');assert.equal(session.selected,'milkdrop');session.configure({...config,reducedMotion:false});assert.equal(allocated,1);assert.equal(session.info?.id,'milkdrop');session.configure({...config,reducedMotion:false,motion:0});assert.equal(disposed,1);assert.equal(session.info?.id,'waveform');session.dispose();
});
test('shader link failure is contained and partially allocated GL resources remain disposable',()=>{
 let disposed=0,lost=0;
 const native={LINK_STATUS:1,createProgram(){return {};},linkProgram(){},getProgramParameter(){return false;},getProgramInfoLog(){return 'fixture shader error';},deleteProgram(){disposed++;},getExtension(){return {loseContext(){lost++;}};}} as unknown as WebGL2RenderingContext;
 const resources=new GLResources(native),program=resources.gl.createProgram()!;assert.throws(()=>resources.gl.linkProgram(program),/fixture shader error/);resources.dispose();assert.equal(disposed,1);assert.equal(lost,1);
});
