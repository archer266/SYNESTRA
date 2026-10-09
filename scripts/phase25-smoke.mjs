import { _electron as electron,expect } from '@playwright/test';
import { Mp3Encoder } from '@breezystack/lamejs';
import { mkdtemp,writeFile,mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join,resolve } from 'node:path';
import assert from 'node:assert/strict';
const directory=await mkdtemp(join(tmpdir(),'synestra-scenes-'));
await mkdir('docs',{recursive:true});
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
 const probe=window.__sceneProbe={sources:0,analysers:0,gains:0,frames:0};
 const request=window.requestAnimationFrame.bind(window);
 window.requestAnimationFrame=callback=>request(time=>{probe.frames++;callback(time);});
 for(const [method,count] of [['createMediaElementSource','sources'],['createAnalyser','analysers'],['createGain','gains']]){
 const original=AudioContext.prototype[method];
 AudioContext.prototype[method]=function(...args){probe[count]++;const result=original.apply(this,args);if(method==='createMediaElementSource'){probe.audio=args[0];probe.context=this;}return result;};
 }
 });await page.reload();
 const mode=()=>page.getByRole('combobox',{name:'Visual mode',exact:true});
 const button=name=>page.getByRole('button',{name,exact:true});
 const status=()=>page.locator('.now-playing [role=status]');
 const tune=async()=>{if(await button('Tune').getAttribute('aria-expanded')!=='true')await button('Tune').click();};
 const signals=async()=>{await tune();if(await button('Signals').getAttribute('aria-expanded')!=='true')await button('Signals').click();};
 const intact=async()=>{
 const p=await page.evaluate(()=>{const p=window.__sceneProbe;return {sources:p.sources,analysers:p.analysers,gains:p.gains,paused:p.audio.paused,time:p.audio.currentTime,volume:p.audio.volume};});
 assert.equal(p.sources,1);assert.equal(p.analysers,1);assert.equal(p.gains,1);assert.equal(p.paused,false);return p.time;
 };
 await expect(mode()).toHaveValue('pearl');await mode().selectOption('pearl');await expect(page.locator('#queue')).toHaveCount(0);
 await app.evaluate(({dialog},fixture)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[fixture]});},fixture);
 await button('Import music').click();await button('Play').click();await expect(status()).toHaveText('Now playing');
 await signals();await expect.poll(()=>page.locator('[data-signal=rms]').innerText().then(Number)).toBeGreaterThan(.05);
 await page.getByRole('slider',{name:'Volume',exact:true}).fill('0.3');
 const start=await intact();
 for(const choice of ['spectrum','pearl','spectrum','pearl']){
 const canvas=await page.locator('.spectrum-canvas canvas').elementHandle();
 await mode().selectOption(choice);await expect(page.locator('.spectrum-canvas canvas')).toHaveCount(1);
 assert.equal(await canvas.evaluate(c=>c.isConnected),false);
 await expect(status()).toHaveText('Now playing');await intact();
 await expect(page.getByRole('slider',{name:'Volume',exact:true})).toHaveValue('0.3');
 }
 await expect.poll(intact).toBeGreaterThan(start+.3);
 if(process.argv.includes('--phase3')){
  const quality=page.getByRole('combobox',{name:'Rendering quality',exact:true});
  const resolution=page.getByRole('combobox',{name:'Render resolution limit',exact:true});
  await quality.selectOption('high');await resolution.selectOption('720p');
  await expect.poll(()=>page.locator('canvas').evaluate(c=>c.width<=1280&&c.height<=720)).toBe(true);
  await resolution.selectOption('2160p');await button('Tune').click();
  await button('Enter fullscreen').click();await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(true);
  await expect(page.locator('canvas')).toHaveCount(1);await intact();
  await page.screenshot({path:'docs/phase3-fullscreen.png'});
  const dimensions=await page.locator('canvas').evaluate(c=>({width:c.width,height:c.height,cssWidth:c.clientWidth,cssHeight:c.clientHeight,dpr:devicePixelRatio}));
  assert.ok(dimensions.width<=3840&&dimensions.height<=2160);console.log('Measured fullscreen buffer (not a 4K performance claim):',dimensions);
  await button('Exit fullscreen').click();await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(false);
  await expect.poll(()=>app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].isFullScreen())).toBe(false);
  await page.waitForTimeout(500);
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].minimize());
  await expect.poll(()=>app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].isMinimized())).toBe(true);
  await page.waitForTimeout(300);const frames=await page.evaluate(()=>window.__sceneProbe.frames);
  const hiddenTime=await intact();await page.waitForTimeout(700);await expect.poll(intact).toBeGreaterThan(hiddenTime+.3);
  assert.equal(await page.evaluate(()=>window.__sceneProbe.frames),frames,'No animation frames while minimized');
  await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.restore();w.show();w.focus();});
  await expect.poll(()=>page.evaluate(()=>window.__sceneProbe.frames)).toBeGreaterThan(frames);
  await signals();await page.locator('canvas').evaluate(c=>c.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
  await expect(page.locator('[data-signal=renderer]')).toHaveText('Waveform fallback');await intact();
  await button('Retry graphics').click();await expect(page.locator('[data-signal=renderer]')).toHaveText('WebGL');await expect(page.locator('canvas')).toHaveCount(1);await intact();
  await expect(page.locator('[data-signal=engine]')).toContainText('Pearl');await expect(page.locator('[data-signal=timing]')).toContainText('ms');
  await page.locator('[data-signal=timing]').scrollIntoViewIfNeeded();
  await page.screenshot({path:'docs/phase3-diagnostics.png'});
  console.log('Short-run scheduling diagnostic (not a hardware benchmark):',await page.locator('[data-signal=timing]').innerText());
  await page.locator('.spectrum-canvas').evaluate(c=>{c.style.width='3840px';c.style.height='2160px';});
  await expect.poll(()=>page.locator('canvas').evaluate(c=>[c.width,c.height].join('x'))).toBe('3840x2160');
  await intact();await page.waitForTimeout(400);
  console.log('PASS: real WebGL canvas allocated and rendered at 3840x2160 (oversized host, not a physical 4K display).');
  await page.locator('.spectrum-canvas').evaluate(c=>{c.style.width='';c.style.height='';});
  await quality.selectOption('balanced');await resolution.selectOption('1080p');
  console.log('PASS Phase 3: explicit resolution limits, High quality, fullscreen entry/exit, hidden-window audio continuity, context-loss fallback and same-engine retry, actual buffer/frame diagnostics.');
 }
 await expect(page.locator('.now-playing strong')).toHaveText('Prismatic motion.mp3');
 const canvas=await page.locator('.spectrum-canvas canvas').elementHandle();
 await page.getByRole('combobox',{name:'Palette',exact:true}).selectOption('ember');
 await page.getByRole('slider',{name:'Motion',exact:true}).fill('0.8');
 await page.getByRole('slider',{name:'Sensitivity',exact:true}).fill('1.3');
 await page.getByRole('slider',{name:'Visual richness',exact:true}).fill('1');
 await page.getByRole('slider',{name:'Smoothing',exact:true}).fill('0.4');
 await page.getByRole('combobox',{name:'Rendering quality',exact:true}).selectOption('economy');
 assert.equal(await canvas.evaluate(c=>c.isConnected),true);await intact();
 await button('Tune').click();await page.waitForTimeout(800);await page.screenshot({path:'docs/phase2.5-fused-ember.png'});
 await tune();await page.getByRole('combobox',{name:'Palette',exact:true}).selectOption('aurora');
 await page.getByRole('combobox',{name:'Rendering quality',exact:true}).selectOption('balanced');
 await button('Tune').click();await page.waitForTimeout(800);await page.screenshot({path:'docs/phase2.5-fused.png'});
 await mode().selectOption('spectrum');await button('Linear').click();await page.waitForTimeout(700);await page.screenshot({path:'docs/phase2.5-spectrum-linear.png'});
 await button('Radial').click();await page.waitForTimeout(700);await page.screenshot({path:'docs/phase2.5-spectrum-radial.png'});
 await mode().selectOption('pearl');await tune();
 await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.setSize(1600,1100);w.webContents.setZoomFactor(1.5);});
 await page.waitForTimeout(600);
 const balanced=await page.locator('canvas').evaluate(c=>c.width*c.height);
 await page.getByRole('combobox',{name:'Rendering quality',exact:true}).selectOption('economy');await page.waitForTimeout(400);
 const economy=await page.locator('canvas').evaluate(c=>c.width*c.height);
 assert.ok(economy<balanced);assert.ok(economy<=850000);assert.ok(balanced<=1600000);await intact();
 await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.webContents.setZoomFactor(1);w.setSize(780,600);});
 await page.waitForTimeout(700);await page.screenshot({path:'docs/phase2.5-compact.png'});
 const layout=await page.evaluate(()=>{
 const rect=s=>document.querySelector(s).getBoundingClientRect();
 const c=rect('.spectrum-canvas'),h=rect('.topbar'),d=rect('.transport'),p=rect('.side-panel');
 return {overflow:document.documentElement.scrollWidth>innerWidth,separate:h.bottom<=c.top&&d.top>=c.bottom&&p.left>=c.right};
 });assert.equal(layout.overflow,false);assert.equal(layout.separate,true);
 await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('.stage-footer')).toContainText('REDUCED MOTION');
 await expect(page.getByRole('slider',{name:'Motion',exact:true})).toBeDisabled();
 await page.emulateMedia({reducedMotion:'no-preference'});await expect(page.getByRole('slider',{name:'Motion',exact:true})).toBeEnabled();
 await signals();await page.locator('canvas').evaluate(c=>c.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
 await expect(page.locator('[data-signal=renderer]')).toHaveText('Waveform fallback');const prior=await intact();await expect.poll(intact).toBeGreaterThan(prior+.3);
 await mode().selectOption('spectrum');await expect(page.locator('[data-signal=renderer]')).toHaveText('WebGL');
 await button('Linear').click();await page.getByRole('combobox',{name:'Palette',exact:true}).selectOption('glacier');await page.getByRole('slider',{name:'Motion',exact:true}).fill('0.25');
 await button('Pause').click();await page.getByRole('slider',{name:'Motion',exact:true}).fill('0');
 await page.waitForTimeout(5000);
 for(const choice of ['pearl','spectrum']){
  await mode().selectOption(choice);
  const colors={};
  for(const palette of ['glacier','ember']){
   await page.getByRole('combobox',{name:'Palette',exact:true}).selectOption(palette);await page.waitForTimeout(500);
   const png=await page.locator('.spectrum-canvas canvas').screenshot();
   colors[palette]=await app.evaluate(({nativeImage},base64)=>{
    const image=nativeImage.createFromBuffer(Buffer.from(base64,'base64'));const {width,height}=image.getSize();
    const pixels=image.getBitmap();let red=0,blue=0;
    for(let y=Math.floor(height*.15);y<height*.85;y++)for(let x=Math.floor(width*.2);x<width*.8;x++){const i=(y*width+x)*4;blue+=pixels[i];red+=pixels[i+2];}
    return red/Math.max(1,blue);
   },png.toString('base64'));
  }
  assert.ok(colors.ember>colors.glacier*1.08,choice+' palette pixel ratios '+JSON.stringify(colors));
 }
 await page.getByRole('combobox',{name:'Palette',exact:true}).selectOption('glacier');await page.getByRole('slider',{name:'Motion',exact:true}).fill('0.25');
 await button('Queue').click();await expect(page.locator('.track')).toHaveCount(1);
 await app.close();app=null;
 page=await launch();await expect(mode()).toHaveValue('spectrum');await expect(button('Linear')).toHaveAttribute('aria-pressed','true');await expect(status()).toHaveText('Ready to listen');
 await expect(page.locator('#queue')).toHaveCount(0);await tune();
 await expect(page.getByRole('combobox',{name:'Palette',exact:true})).toHaveValue('glacier');
 await expect(page.getByRole('combobox',{name:'Rendering quality',exact:true})).toHaveValue('economy');
 if(process.argv.includes('--phase3'))await expect(page.getByRole('combobox',{name:'Render resolution limit',exact:true})).toHaveValue('1080p');
 await expect(page.getByRole('slider',{name:'Motion',exact:true})).toHaveValue('0.25');
 await expect(page.getByRole('slider',{name:'Sensitivity',exact:true})).toHaveValue('1.3');
 await expect(page.getByRole('slider',{name:'Visual richness',exact:true})).toHaveValue('1');
 await expect(page.getByRole('slider',{name:'Smoothing',exact:true})).toHaveValue('0.4');
 assert.deepEqual(errors,[]);
 await page.addInitScript(()=>{
 const original=WebGL2RenderingContext.prototype.getProgramParameter;
 WebGL2RenderingContext.prototype.getProgramParameter=function(program,param){return param===this.LINK_STATUS?false:original.call(this,program,param);};
 });
 await page.reload();await signals();
 await expect(page.locator('[data-signal=renderer]')).toHaveText('Waveform fallback');
 await button('Play').click();await expect(status()).toHaveText('Now playing');
 await mode().selectOption('pearl');await expect(page.locator('[data-signal=renderer]')).toHaveText('Waveform fallback');
 await expect(status()).toHaveText('Now playing');
 console.log('PASS: Pearl and original Spectrum layouts; repeated switching preserves one audio source/analyser/gain, position, queue and volume; all tuning controls preserve playback; GPU quality budgets; compact non-overlapping layout; reduced motion; Pearl context-loss fallback/recovery; both-world shader-failure fallback; pixel-verified palettes in both modes; preference persistence without autoplay; no JS or shader errors.');
 console.log({balancedPixels:balanced,economyPixels:economy,profile:directory});
}finally{await app?.close();}
