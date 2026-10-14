import { _electron as electron,expect } from '@playwright/test';
import { Mp3Encoder } from '@breezystack/lamejs';
import { mkdtemp,writeFile,mkdir,readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join,resolve } from 'node:path';
import assert from 'node:assert/strict';
const directory=await mkdtemp(join(tmpdir(),'synestra-milkdrop-'));
await mkdir('docs',{recursive:true});
const silence=join(directory,'Silence.mp3'),silentEncoder=new Mp3Encoder(1,44100,128),silentChunks=[];for(let i=0;i<44100*8;i+=1152)silentChunks.push(Buffer.from(silentEncoder.encodeBuffer(new Int16Array(1152))));silentChunks.push(Buffer.from(silentEncoder.flush()));await writeFile(silence,Buffer.concat(silentChunks));
const rate=44100,encoder=new Mp3Encoder(1,rate,128),chunks=[];
for(let start=0;start<rate*8;start+=1152){
 const samples=new Int16Array(Math.min(1152,rate*8-start));
 for(let j=0;j<samples.length;j++){
 const t=(start+j)/rate;let v=0;
 for(let k=0;k<48;k++)v+=Math.sin(2*Math.PI*70*Math.pow(11000/70,k/47)*t+k*2.39996);
 samples[j]=Math.round(Math.max(-.98,Math.min(.98,v/Math.sqrt(48)*.24*(.4+.6*Math.exp(-(t%.5)/.08))))*32767);
 }
 chunks.push(Buffer.from(encoder.encodeBuffer(samples)));
}
chunks.push(Buffer.from(encoder.flush()));
const fixture=join(directory,'Prismatic motion.mp3');
await writeFile(fixture,Buffer.concat(Array.from({length:20},()=>Buffer.concat(chunks))));
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;delete env.SYNESTRA_DEV_URL;
const executablePath=process.env.SYNESTRA_EXECUTABLE;let app;
const launch=async()=>{
 app=await electron.launch({executablePath,args:[...(executablePath?[]:[resolve('.')]),'--user-data-dir='+join(directory,'profile')],env});
 const p=await app.firstWindow();await p.waitForLoadState('domcontentloaded');return p;
};
const errors=[];
try{
 let page=await launch();
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|GL_INVALID|program.*valid/i.test(m.text()))errors.push(m.text());});
 await page.addInitScript(()=>{
 const probe=window.__sceneProbe={sources:0,analysers:0,gains:0,frames:0,contexts:0};
 const NativeContext=window.AudioContext;window.AudioContext=new Proxy(NativeContext,{construct(target,args){probe.contexts++;return Reflect.construct(target,args);}});
 const request=window.requestAnimationFrame.bind(window);
 window.requestAnimationFrame=callback=>request(time=>{probe.frames++;callback(time);});
 for(const [method,count] of [['createMediaElementSource','sources'],['createAnalyser','analysers'],['createGain','gains']]){
 const original=AudioContext.prototype[method];
 AudioContext.prototype[method]=function(...args){probe[count]++;const result=original.apply(this,args);if(method==='createMediaElementSource'){probe.audio=args[0];probe.context=this;}return result;};
 }
 });await page.reload();
 const mode=()=>page.getByRole('combobox',{name:'Visual mode',exact:true});
 const button=name=>page.getByRole('button',{name,exact:true});

 const tune=async()=>{if(await button('Tune').getAttribute('aria-expanded')!=='true')await button('Tune').click();};
 const signals=async()=>{await tune();if(await button('Signals').getAttribute('aria-expanded')!=='true')await button('Signals').click();};
 const intact=async()=>{
 const p=await page.evaluate(()=>{const p=window.__sceneProbe;return {sources:p.sources,analysers:p.analysers,gains:p.gains,contexts:p.contexts,paused:p.audio.paused,time:p.audio.currentTime,volume:p.audio.volume};});
 assert.equal(p.contexts,1);assert.equal(p.sources,1);assert.equal(p.analysers,1);assert.equal(p.gains,1);assert.equal(p.paused,false);return p.time;
 };

 await app.evaluate(({dialog},fixture)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[fixture]});},fixture);
 await button('Import music').click();await button('Play').click();await mode().selectOption('milkdrop');await signals();

 await expect(page.locator('canvas')).toHaveAttribute('aria-label','MilkDrop visualizer',{timeout:15000});
 await expect(page.locator('[data-signal=engine]')).toContainText('MilkDrop');await intact();
 let preset=page.getByRole('combobox',{name:'MilkDrop preset',exact:true});
 for(const id of ['aurora','galaxy','liquid','crystal']){
  await preset.selectOption(id);await page.waitForTimeout(4200);await intact();
  await expect(page.locator('[data-signal=renderer]')).toHaveText('WebGL');
  await button('Tune').click();await page.screenshot({path:'docs/phase4-'+id+'.png'});await signals();
  console.log(id,'resources',await page.locator('canvas').getAttribute('data-resources'));
 }

 // Preset navigation, seconds-based transitions and bounded allocations under repeated changes.
 await page.getByRole('slider',{name:'Transition duration',exact:true}).fill('1');
 await preset.selectOption('aurora');await button('Previous preset').click();await expect(preset).toHaveValue('crystal');await button('Next preset').click();await expect(preset).toHaveValue('aurora');
 await button('Random preset').click();assert.notEqual(await preset.inputValue(),'aurora');
 const resources=[];
 for(let i=0;i<12;i++){await button('Next preset').click();await page.waitForTimeout(160);resources.push(Number(await page.locator('canvas').getAttribute('data-resources')));}
 assert.ok(Math.max(...resources)-Math.min(...resources)<15,'GL allocations stay bounded');await intact();
 await preset.selectOption('aurora');await page.waitForTimeout(1300);await expect(page.locator('canvas')).toHaveAttribute('data-blend','1.000');
 // Output mute cannot affect the upstream PCM/analysis.
 const rms=()=>page.locator('[data-signal=rms]').innerText().then(Number);
 const sampleRms=async()=>{let total=0;for(let i=0;i<8;i++){total+=await rms();await page.waitForTimeout(100);}return total/8;};
 const before=await sampleRms();await page.getByRole('slider',{name:'Volume',exact:true}).fill('0');const after=await sampleRms();assert.ok(after>.02&&after/before>.5&&after/before<2);await intact();
 await page.getByRole('slider',{name:'Volume',exact:true}).fill('0.3');
 for(const position of [65,12,110]){await page.getByRole('slider',{name:'Seek',exact:true}).fill(String(position));await page.getByRole('slider',{name:'Seek',exact:true}).press('ArrowRight');await expect.poll(intact).toBeGreaterThan(position+.2);}
 await page.getByRole('slider',{name:'Seek',exact:true}).fill('0');await page.getByRole('slider',{name:'Seek',exact:true}).press('ArrowRight');
 // Cycling is opt-in, pauses with playback, and publishes/persists the actual selected preset.
 await page.getByRole('slider',{name:'Cycle interval',exact:true}).fill('15');await page.getByRole('checkbox',{name:'Automatic cycling',exact:true}).check();
 await button('Pause').click();await page.waitForTimeout(1800);await expect(preset).toHaveValue('aurora');await expect.poll(rms).toBeLessThan(.005);
 await button('Play').click();await expect(preset).toHaveValue('galaxy',{timeout:22000});await intact();
 await page.getByRole('checkbox',{name:'Automatic cycling',exact:true}).uncheck();
 // Every existing scene, saved volume and sole audio graph remain intact.
 for(const id of ['classic','pearl','spectrum','milkdrop','pearl','milkdrop']){const old=await page.locator('canvas').elementHandle();await mode().selectOption(id);await expect(page.locator('canvas')).toHaveCount(1);assert.equal(await old.evaluate(c=>c.isConnected),false);await intact();}
 await expect(page.locator('canvas')).toHaveAttribute('aria-label','MilkDrop visualizer');
 await expect(page.getByRole('slider',{name:'Volume',exact:true})).toHaveValue('0.3');
 await page.getByRole('combobox',{name:'Palette',exact:true}).selectOption('glacier');await page.getByRole('slider',{name:'Visual richness',exact:true}).fill('0.4');
 await expect(page.locator('canvas')).toHaveCSS('filter',/^hue-rotate\(-35deg\) saturate\(1\) brightness\(1(?:\.\d+)?\)$/);
 const brightness=await page.locator('canvas').evaluate(c=>Number(getComputedStyle(c).filter.match(/brightness\(([^)]+)/)[1]));assert.ok(brightness>=1&&brightness<=1.04);
 await page.getByRole('slider',{name:'Sensitivity',exact:true}).fill('1.4');await page.getByRole('slider',{name:'Smoothing',exact:true}).fill('0.8');await page.getByRole('slider',{name:'Motion',exact:true}).fill('0.4');await intact();
 await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('[data-signal=engine]')).toContainText('Waveform fallback');await intact();
 await page.emulateMedia({reducedMotion:'no-preference'});await expect(page.locator('canvas')).toHaveAttribute('aria-label','MilkDrop visualizer');await intact();
 await page.getByRole('slider',{name:'Motion',exact:true}).fill('0');await expect(page.locator('[data-signal=engine]')).toContainText('Waveform fallback');
 await page.getByRole('slider',{name:'Motion',exact:true}).fill('0.65');await expect(page.locator('canvas')).toHaveAttribute('aria-label','MilkDrop visualizer');
 await button('Tune').click();await button('Enter fullscreen').click();await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(true);await intact();
 await page.screenshot({path:'docs/phase4-fullscreen.png'});await button('Exit fullscreen').click();await expect.poll(()=>app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].isFullScreen())).toBe(false);await page.waitForTimeout(500);
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].minimize());await page.waitForTimeout(400);const frames=await page.evaluate(()=>window.__sceneProbe.frames),time=await intact();await page.waitForTimeout(700);assert.equal(await page.evaluate(()=>window.__sceneProbe.frames),frames);assert.ok(await intact()>time+.3);
 await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.restore();w.show();w.focus();});await expect.poll(()=>page.evaluate(()=>window.__sceneProbe.frames)).toBeGreaterThan(frames);await signals();
 await page.locator('canvas').evaluate(c=>c.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());await expect(page.locator('[data-signal=engine]')).toContainText('Waveform fallback');await intact();await button('Retry graphics').click();await expect(page.locator('canvas')).toHaveAttribute('aria-label','MilkDrop visualizer');await intact();
 // Measure actual stage buffers, RAF cadence and GPU identity, not a physical-display guarantee.
 const samplePerformance=async()=>await page.evaluate(()=>new Promise(resolve=>{let last=performance.now();const intervals=[];let count=0;const tick=now=>{intervals.push(now-last);last=now;if(++count<90)requestAnimationFrame(tick);else{const canvas=document.querySelector('canvas'),gl=canvas.getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');intervals.sort((a,b)=>a-b);resolve({width:canvas.width,height:canvas.height,medianMs:intervals[45],p95Ms:intervals[85],gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'Unavailable',error:gl.getError()});}};requestAnimationFrame(tick);}));
 const measurements=[];
 for(const [quality,limit,width,height] of [['economy','720p',1280,720],['balanced','1080p',1920,1080],['high','1440p',2560,1440],['high','2160p',3840,2160]]){
  await page.getByRole('combobox',{name:'Rendering quality',exact:true}).selectOption(quality);await page.getByRole('combobox',{name:'Render resolution limit',exact:true}).selectOption(limit);
  await page.locator('.spectrum-canvas').evaluate((c,{width,height})=>{c.style.width=width+'px';c.style.height=height+'px';},{width,height});await page.waitForTimeout(1200);
  const measure=await samplePerformance();
  assert.equal(measure.error,0);if(limit==='2160p')assert.deepEqual([measure.width,measure.height],[3840,2160]);measurements.push({preset:await preset.inputValue(),quality,limit,...measure});await intact();
 }
 for(const id of ['aurora','liquid','crystal']){await preset.selectOption(id);await page.waitForTimeout(1400);const measure=await samplePerformance();assert.equal(measure.error,0);assert.deepEqual([measure.width,measure.height],[3840,2160]);measurements.push({preset:id,quality:'high',limit:'2160p',...measure});}
 await page.locator('.spectrum-canvas').evaluate(c=>{c.style.width='';c.style.height='';});
 await page.getByRole('combobox',{name:'Rendering quality',exact:true}).selectOption('balanced');await page.getByRole('combobox',{name:'Render resolution limit',exact:true}).selectOption('auto');
 // A real user-library track is read-only and imported into the isolated test profile when available.
 let realTrack='Unavailable';
 const libraryPath=join(process.env.APPDATA,'SYNESTRA','library.json');
 if(existsSync(libraryPath)){const library=JSON.parse(await readFile(libraryPath,'utf8'));if(library.length){const entry=library[0],originalHash=createHash('sha256').update(await readFile(entry.path)).digest('hex');await app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},entry.path);await button('Import music').click();await button('Queue').click();await page.locator('.track').last().click();await signals();await expect.poll(rms).toBeGreaterThan(.005);await intact();await page.getByRole('slider',{name:'Seek',exact:true}).fill('40');await page.getByRole('slider',{name:'Seek',exact:true}).press('ArrowRight');await preset.selectOption('liquid');await page.waitForTimeout(4000);await intact();realTrack=entry.name??'Saved library MP3';await page.screenshot({path:'docs/phase4-real-track.png'});assert.equal(createHash('sha256').update(await readFile(entry.path)).digest('hex'),originalHash);}}
 await app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},silence);await button('Import music').click();await button('Queue').click();await page.locator('.track').last().click();await signals();await expect.poll(rms).toBeLessThan(.0001);await page.waitForTimeout(1000);await expect(page.locator('[data-signal=engine]')).toContainText('MilkDrop');await intact();

 await preset.selectOption('liquid');await page.getByRole('checkbox',{name:'Automatic cycling',exact:true}).check();await page.getByRole('slider',{name:'Cycle interval',exact:true}).fill('60');
 assert.deepEqual(errors,[]);
 await writeFile('docs/phase4-measurements.json',JSON.stringify({profile:directory,resources,rmsBeforeMute:before,rmsAfterMute:after,realTrack,measurements},null,2));
 await app.close();app=null;page=await launch();await expect(mode()).toHaveValue('milkdrop');await expect(page.locator('.now-playing [role=status]')).toHaveText('Ready to listen');await signals();preset=page.getByRole('combobox',{name:'MilkDrop preset',exact:true});await expect(preset).toHaveValue('liquid');await expect(page.getByRole('checkbox',{name:'Automatic cycling',exact:true})).toBeChecked();await expect(page.getByRole('slider',{name:'Cycle interval',exact:true})).toHaveValue('60');
 await page.addInitScript(()=>{const original=WebGL2RenderingContext.prototype.getProgramParameter;WebGL2RenderingContext.prototype.getProgramParameter=function(program,param){return param===this.LINK_STATUS?false:original.call(this,program,param);};});
 await page.reload();await signals();await expect(page.locator('[data-signal=engine]')).toContainText('Waveform fallback');await button('Play').click();await expect(page.locator('.now-playing [role=status]')).toHaveText('Now playing');
 console.log('PASS MilkDrop: four presets, transitions/navigation/cycling, bounded GL allocations, one audio graph, mute/seek/pause/track response, all modes/settings, reduced-motion fallback/restore, fullscreen/minimize/retry, real 4K buffer, saved presets without autoplay.');console.log({profile:directory,realTrack,measurements});

}finally{await app?.close();}
