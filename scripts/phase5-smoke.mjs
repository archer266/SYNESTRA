import { _electron as electron,expect } from '@playwright/test';
import { Mp3Encoder } from '@breezystack/lamejs';
import { mkdtemp,writeFile,mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join,resolve } from 'node:path';
import assert from 'node:assert/strict';
const directory=await mkdtemp(join(tmpdir(),'synestra-phase5-'));await mkdir('docs/phase5',{recursive:true});
const rate=44100,encoder=new Mp3Encoder(1,rate,128),chunks=[];
for(let start=0;start<rate*70;start+=1152){const pcm=new Int16Array(Math.min(1152,rate*70-start));for(let i=0;i<pcm.length;i++){const t=(start+i)/rate,phase=t%.5;pcm[i]=Math.round(32767*(phase<.08?.25*Math.exp(-phase/.04)*Math.sin(2*Math.PI*200*t):0));}chunks.push(Buffer.from(encoder.encodeBuffer(pcm)));}chunks.push(Buffer.from(encoder.flush()));const track=join(directory,'120 BPM pulse fixture.mp3');await writeFile(track,Buffer.concat(chunks));
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;delete env.SYNESTRA_DEV_URL;let app;
const launch=async()=>{app=await electron.launch({args:[resolve('.'),'--user-data-dir='+join(directory,'profile')],env});const page=await app.firstWindow();await page.waitForLoadState('domcontentloaded');return page;};
try{
 let page=await launch();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
 const p=window.__phase5={contexts:0,sources:0,analysers:0,gains:0,samples:0,frames:0,intervals:[],last:0,cap:0};
 const Native=window.AudioContext;window.AudioContext=new Proxy(Native,{construct(target,args){p.contexts++;return Reflect.construct(target,args);}});
 for(const [method,key] of [['createMediaElementSource','sources'],['createAnalyser','analysers'],['createGain','gains']]){const original=AudioContext.prototype[method];AudioContext.prototype[method]=function(...args){p[key]++;if(method==='createMediaElementSource')p.audio=args[0];return original.apply(this,args);};}
 const sample=AnalyserNode.prototype.getFloatTimeDomainData;AnalyserNode.prototype.getFloatTimeDomainData=function(...args){const now=performance.now();if(p.last&&p.intervals.length<2000)p.intervals.push(now-p.last);p.last=now;p.samples++;return sample.apply(this,args);};
 const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=callback=>raf(time=>{const invoke=()=>{p.frames++;callback(time);};if(p.cap)setTimeout(invoke,p.cap);else invoke();});
 });await page.reload();
 const button=name=>page.getByRole('button',{name,exact:true}),slider=name=>page.getByRole('slider',{name,exact:true});
 const mode=()=>page.getByRole('combobox',{name:'Visual mode',exact:true});
 await app.evaluate(({dialog},track)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[track]});},track);
 await button('Import music').click();await button('Play').click();await button('Tune').click();await button('Signals').click();
 const tempo=()=>page.locator('[data-signal=tempo]').innerText();
 await expect.poll(async()=>parseFloat(await tempo()),{timeout:12000}).toBeGreaterThan(115);assert.ok(parseFloat(await tempo())<125);
 const measured=[];
 for(const engine of ['pearl','spectrum','milkdrop']){
 await mode().selectOption(engine);await page.waitForTimeout(1500);
 const before=await page.evaluate(()=>window.__phase5.samples);await page.waitForTimeout(2000);const state=await page.evaluate(()=>{const p=window.__phase5;return {samples:p.samples,time:p.audio.currentTime,paused:p.audio.paused,contexts:p.contexts,sources:p.sources,analysers:p.analysers,gains:p.gains};});
 assert.equal(state.paused,false);assert.deepEqual([state.contexts,state.sources,state.analysers,state.gains],[1,1,1,1]);assert.ok(state.samples-before>80);await expect.poll(async()=>parseFloat(await tempo()),{timeout:10000}).toBeGreaterThan(115);
 measured.push({engine,samplesInTwoSeconds:state.samples-before,tempo:await tempo(),renderTiming:await page.locator('[data-signal=timing]').innerText()});
 await slider('Musical Response').fill('0');await page.waitForTimeout(200);await slider('Musical Response').fill('0.8');await page.screenshot({path:'docs/phase5/'+engine+'.png'});
 }
 await slider('Volume').fill('0');await page.waitForTimeout(1600);assert.ok(parseFloat(await tempo())>115);assert.notEqual(await page.locator('[data-signal=beat-confidence]').innerText(),'0%');
 await slider('Volume').fill('0.5');await page.evaluate(()=>{window.__phase5.cap=33;});const samples=await page.evaluate(()=>window.__phase5.samples);await page.waitForTimeout(2500);assert.ok(await page.evaluate(()=>window.__phase5.samples)-samples>100);assert.ok(parseFloat(await tempo())>115);await page.evaluate(()=>{window.__phase5.cap=0;});
 await button('Pause').click();await expect(page.locator('[data-signal=tempo]')).toHaveText('Unknown');await button('Play').click();await expect.poll(async()=>parseFloat(await tempo()),{timeout:12000}).toBeGreaterThan(115);
 await slider('Seek').fill('12');await slider('Seek').press('ArrowRight');await expect(page.locator('[data-signal=tempo]')).toHaveText('Unknown');await expect.poll(async()=>parseFloat(await tempo()),{timeout:12000}).toBeGreaterThan(115);
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].minimize());await page.waitForTimeout(300);const stopped=await page.evaluate(()=>window.__phase5.samples);await page.waitForTimeout(800);assert.equal(await page.evaluate(()=>window.__phase5.samples),stopped);await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.restore();w.focus();});await expect(page.locator('[data-signal=tempo]')).toHaveText('Unknown');
 await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('[data-signal=renderer]')).toHaveText('Waveform fallback');await page.emulateMedia({reducedMotion:'no-preference'});await expect(page.locator('[data-signal=renderer]')).toHaveText('WebGL');
 const intervals=await page.evaluate(()=>window.__phase5.intervals.filter(n=>n<100).sort((a,b)=>a-b));const report={profile:directory,engines:measured,sampleIntervalMedianMs:intervals[Math.floor(intervals.length*.5)],sampleIntervalP95Ms:intervals[Math.floor(intervals.length*.95)]};
 await writeFile('docs/phase5/measurements.json',JSON.stringify(report,null,2));assert.deepEqual(errors,[]);
 await app.close();page=await launch();await button('Tune').click();assert.equal(await slider('Musical Response').inputValue(),'0.8');await expect(button('Play')).toBeVisible();
 console.log('PASS Phase 5: actual pulse acquisition, one graph, all engines, mute, RAF throttling, seek/pause reset, minimize/reacquire, reduced motion and saved response without autoplay.',report);
}finally{await app?.close();}
