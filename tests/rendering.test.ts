import test from 'node:test';
import assert from 'node:assert/strict';
import { EngineRegistry,type EngineContext,type VisualEngine,type VisualFrame } from '../src/visuals/engine';
import { EngineSession } from '../src/visuals/session';
import { RenderScheduler } from '../src/visuals/scheduler';
import { resolveRenderSize } from '../src/visuals/sizing';
import { defaultVisualConfig } from '../src/visuals/contracts';
import { validatePreferences } from '../src/visuals/preferences';
import { FrameComposer } from '../src/visuals/frame';
import { FeatureProcessor } from '../src/analysis/processor';
import { ProgressionController } from '../src/visuals/progression';
const size=resolveRenderSize(800,600,2,'balanced');
const frame={} as VisualFrame;
function rig(failure:'initialize'|'render'|null=null){
 const calls:string[]=[],contexts:EngineContext[]=[];
 let fail=failure;
 const registry=new EngineRegistry();
 for(const id of ['pearl','spectrum','waveform'])registry.register({id,name:id,selectable:id!=='waveform',capabilities:{backend:id==='waveform'?'canvas2d':'webgl2',spectrum:true,waveform:true,reducedMotion:true,layouts:[]},create:()=>{
 const engine:VisualEngine={initialize(context){contexts.push(context);calls.push(id+':init');if(id==='pearl'&&fail==='initialize')throw Error('init');},configure(){calls.push(id+':config');},resize(){calls.push(id+':size');},activate(){calls.push(id+':on');},deactivate(){calls.push(id+':off');},dispose(){calls.push(id+':dispose');},render(){calls.push(id+':render');if(id==='pearl'&&fail==='render')throw Error('render');}};return engine;
 }});
 const session=new EngineSession(registry,{} as HTMLElement,defaultVisualConfig,size);
 return {session,calls,contexts,registry,recover(){fail=null;}};
}
test('registry reports capabilities, rejects duplicate/unknown IDs without disturbing an engine',()=>{
 const {registry,session,calls}=rig();assert.equal(registry.list().length,2);assert.equal(registry.get('waveform').capabilities.backend,'canvas2d');
 assert.throws(()=>registry.register(registry.get('pearl')));session.select('pearl');const before=calls.length;
 assert.throws(()=>session.select('../bad'));assert.equal(calls.length,before);session.dispose();
});
test('session initializes once, renders only when active and releases before switching; disposal is idempotent',()=>{
 const {session,calls}=rig();session.select('pearl');session.select('pearl');session.render(frame);
 assert.deepEqual(calls,['pearl:init','pearl:config','pearl:size']);session.setActive(true);session.render(frame);session.setActive(false);session.render(frame);
 assert.equal(calls.filter(c=>c==='pearl:render').length,1);session.setActive(true);session.select('spectrum');
 assert.ok(calls.indexOf('pearl:dispose')<calls.indexOf('spectrum:init'));session.configure(defaultVisualConfig);session.resize(size);
 session.dispose();session.dispose();session.render(frame);session.select('pearl');assert.equal(calls.filter(c=>c==='spectrum:dispose').length,1);
});
test('partial initialization and render failure clean up then fall back; explicit retry recovers',()=>{
 for(const failure of ['initialize','render'] as const){
 const {session,calls,recover}=rig(failure);session.setActive(true);session.select('pearl');session.render(frame);
 assert.equal(session.info?.id,'waveform');assert.ok(session.fallbackReason);assert.ok(calls.indexOf('pearl:dispose')<calls.indexOf('waveform:init'));
 recover();session.retry();assert.equal(session.info?.id,'pearl');assert.equal(session.fallbackReason,null);session.dispose();
 }
});
test('GPU callbacks from a disposed engine cannot replace the active engine; active failure falls back',()=>{
 const {session,contexts}=rig();session.select('pearl');session.setActive(true);session.select('spectrum');
 contexts[0].reportFailure('late loss');session.render(frame);assert.equal(session.info?.id,'spectrum');
 contexts[1].reportFailure('context lost');session.render(frame);assert.equal(session.info?.id,'waveform');assert.equal(session.fallbackReason,'context lost');session.dispose();
 contexts[2].reportFailure('after disposal');session.render(frame);
});
test('scheduler has exactly one pending callback, handles zero IDs and excludes hidden time',()=>{
 let id=0;const pending=new Map<number,(ms:number)=>void>();const deltas:number[]=[];
 const clock={request(cb:(ms:number)=>void){const handle=id++;pending.set(handle,cb);return handle;},cancel(handle:number){pending.delete(handle);}};
 const scheduler=new RenderScheduler(clock,t=>deltas.push(t.delta));scheduler.start();scheduler.start();assert.equal(pending.size,1);scheduler.stop();assert.equal(pending.size,0);
 const tick=(time:number)=>{const [handle,cb]=pending.entries().next().value!;pending.delete(handle);cb(time);assert.equal(pending.size,1);};
 scheduler.start();tick(1000);tick(1020);scheduler.stop();scheduler.start();tick(90000);
 assert.deepEqual(deltas,[1/60,.02,1/60]);scheduler.dispose();scheduler.start();assert.equal(pending.size,0);
});
test('disposing inside a render cannot schedule another frame',()=>{
 let callback:(n:number)=>void=()=>{};let requests=0;
 const scheduler=new RenderScheduler({request(cb){callback=cb;return requests++;},cancel(){}},()=>scheduler.dispose());scheduler.start();callback(0);assert.equal(requests,1);
});
test('render size respects aspect, resolution, quality and DPI; 4K is opt-in and bounded',()=>{
 const high=resolveRenderSize(3840,2160,2,'high','2160p');assert.equal(high.width,3840);assert.equal(high.height,2160);
 for(const quality of ['economy','balanced','high'] as const)for(const resolution of ['auto','720p','1080p','1440p','2160p'] as const){
 const s=resolveRenderSize(7680,4320,3,quality,resolution);assert.ok(s.width*s.height<=({economy:850000,balanced:1600000,high:8294400}[quality]));
 assert.ok(s.width<=3840&&s.height<=2160);assert.ok(Math.abs(s.width/s.height-16/9)<.01);if(resolution==='720p')assert.ok(s.width<=1280&&s.height<=720);
 }
 for(const value of [0,-1,NaN,Infinity]){const s=resolveRenderSize(value,value,value,'high');assert.ok(Number.isFinite(s.width)&&s.width>=1);}
 assert.equal(resolveRenderSize(600,400,1,'high').pixelRatio,1);
 assert.equal(validatePreferences({quality:'high',resolution:'2160p'}).resolution,'2160p');assert.equal(validatePreferences({resolution:'8K'}).resolution,'auto');
});
test('frame shares measured buffers and updates timing/playback without invented intelligence',()=>{
 const composer=new FrameComposer(),features=new FeatureProcessor(48000,4096).features,raw=new Float32Array(2048);
 const progression=new ProgressionController().update(features,1/60),timing={now:1,delta:1/60,elapsed:1,frame:60};
 const playback={playing:true,paused:false,seeking:false,loading:false,ended:false,position:23,duration:120,trackId:'track'};
 const a=composer.compose(features,raw,progression,timing,playback);assert.equal(a.spectrum.decibels,raw);assert.equal(a.waveform,features.waveform);assert.equal(a.intelligence,null);
 playback.position=42;playback.seeking=true;const b=composer.compose(features,raw,progression,{...timing,frame:61},playback);
 assert.equal(a,b);assert.equal(b.playback.position,42);assert.equal(b.playback.seeking,true);assert.equal(b.timing.frame,61);
});
test('cleanup attempts disposal even if deactivation throws',()=>{
 const {session,registry}=rig();let disposed=0;
 registry.register({id:'broken-cleanup',name:'Broken cleanup',selectable:false,capabilities:registry.get('pearl').capabilities,create:()=>({initialize(){},configure(){},resize(){},activate(){},render(){},deactivate(){throw Error('cleanup');},dispose(){disposed++;}})});
 session.select('broken-cleanup');session.select('pearl');assert.equal(disposed,1);assert.match(session.cleanupWarning!,/cleanup/);session.dispose();
});
test('unavailable GPU and fallback are contained; disposal and retry remain safe',()=>{
 const registry=new EngineRegistry();const capabilities={backend:'canvas2d' as const,spectrum:false,waveform:true,reducedMotion:true,layouts:[]};
 for(const id of ['pearl','waveform'])registry.register({id,name:id,selectable:id==='pearl',capabilities,create:()=>{throw Error('no renderer');}});
 const session=new EngineSession(registry,{} as HTMLElement,defaultVisualConfig,size);
 assert.doesNotThrow(()=>{session.setActive(true);session.select('pearl');session.render(frame);session.retry();session.dispose();});
 assert.match(session.fallbackReason!,/Fallback unavailable/);
});
