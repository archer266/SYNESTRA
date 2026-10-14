import { _electron as electron,expect } from '@playwright/test';
import { Mp3Encoder } from '@breezystack/lamejs';
import {readFile,writeFile,mkdtemp,mkdir} from 'node:fs/promises';import {join,resolve} from 'node:path';import {tmpdir} from 'node:os';import assert from 'node:assert/strict';
const dir=await mkdtemp(join(tmpdir(),'synestra-collection-')),out='docs/milkdrop-collection';await mkdir(out,{recursive:true});
const text=await readFile('src/visuals/milkdrop/catalog.ts','utf8'),catalog=JSON.parse(text.slice(text.indexOf('['),text.indexOf('] as const')+1));
const rate=44100,encoder=new Mp3Encoder(1,rate,128),chunks=[];
for(let start=0;start<rate*28;start+=1152){const pcm=new Int16Array(Math.min(1152,rate*28-start));for(let j=0;j<pcm.length;j++){const t=(start+j)/rate,pulse=.2+.8*Math.exp(-(t%.5)/.045);let v=0;if(t<7)v=.012*Math.sin(2*Math.PI*330*t)*(.75+.25*pulse);else if(t<14)v=.35*Math.sin(2*Math.PI*65*t)*pulse+.025*Math.sin(2*Math.PI*1500*t);else if(t<21){for(let k=0;k<24;k++)v+=Math.sin(2*Math.PI*70*Math.pow(11000/70,k/23)*t+k*2.4);v=v/Math.sqrt(24)*.22*(.5+.5*pulse);}pcm[j]=Math.round(Math.max(-.95,Math.min(.95,v))*32767);}chunks.push(Buffer.from(encoder.encodeBuffer(pcm)));}chunks.push(Buffer.from(encoder.flush()));const file=join(dir,'Quiet bass dense silence.mp3');await writeFile(file,Buffer.concat(chunks));
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;delete env.SYNESTRA_DEV_URL;const started=Date.now(),app=await electron.launch({args:[resolve('.'),'--user-data-dir='+dir],env,recordVideo:{dir:resolve(out),size:{width:1280,height:820}}});let video;const report=[];
try{
 const page=await app.firstWindow();video=page.video();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|GL_INVALID|program.*valid/i.test(m.text()))errors.push(m.text());});
 await page.addInitScript(()=>{const p=window.__collection={contexts:0,sources:0,analysers:0,gains:0};const Native=AudioContext;window.AudioContext=new Proxy(Native,{construct(t,a){p.contexts++;return Reflect.construct(t,a);}});for(const [method,key] of [['createMediaElementSource','sources'],['createAnalyser','analysers'],['createGain','gains']]){const f=AudioContext.prototype[method];AudioContext.prototype[method]=function(...a){p[key]++;if(key==='sources')p.audio=a[0];return f.apply(this,a);};}});await page.reload();
 await app.evaluate(({BrowserWindow,dialog},file)=>{const w=BrowserWindow.getAllWindows()[0];w.setContentSize(1280,820);w.show();w.focus();dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},file);
 const button=name=>page.getByRole('button',{name,exact:true});const tune=async()=>{if(await button('Tune').getAttribute('aria-expanded')!=='true')await button('Tune').click();};const mode=()=>page.getByRole('combobox',{name:'Visual mode',exact:true});
 await button('Import music').click();await button('Play').click();await mode().selectOption('milkdrop');await page.keyboard.press('Escape');await tune();await page.getByRole('slider',{name:'Transition duration',exact:true}).fill('1');
 const waitPosition=async n=>expect.poll(()=>page.evaluate(()=>window.__collection.audio.currentTime),{timeout:18000}).toBeGreaterThan(n);
 for(const {id,label} of catalog.filter(p=>!process.env.SYNESTRA_PRESET||process.env.SYNESTRA_PRESET.split(',').includes(p.id))){
  await tune();await page.getByRole('combobox',{name:'MilkDrop preset',exact:true}).selectOption(id);await page.keyboard.press('Escape');const seek=page.getByRole('slider',{name:'Seek',exact:true});await seek.fill('0');await seek.press('ArrowRight');if(await button('Play').count())await button('Play').click();
  await expect(page.locator('canvas')).toHaveAttribute('aria-label','MilkDrop visualizer');await expect(page.locator('canvas')).toHaveAttribute('data-preset',id);await expect(page.locator('.world-title')).toContainText(label);
  const item={id,label,from:(Date.now()-started)/1000,duration:24,stages:[]};
  for(const [signal,position] of [['quiet',4],['bass',11],['dense',18],['silence',24]]){
   await waitPosition(position);const png=await page.locator('canvas').screenshot();await writeFile(join(out,id+'-'+signal+'.png'),png);
   const pixels=await app.evaluate(({nativeImage},base64)=>{const p=nativeImage.createFromBuffer(Buffer.from(base64,'base64')).resize({width:96}).toBitmap();let sum=0,lit=0,white=0;for(let i=0;i<p.length;i+=4){const lum=(p[i]+p[i+1]+p[i+2])/3;sum+=lum;if(lum>4)lit++;if(lum>245)white++;}return {mean:sum/(p.length/4),lit:lit/(p.length/4),white:white/(p.length/4)};},png.toString('base64'));
   const gl=await page.locator('canvas').evaluate(c=>({error:c.getContext('webgl2').getError(),resources:Number(c.dataset.resources),preset:c.dataset.preset,blend:c.dataset.blend}));assert.equal(gl.error,0);assert.equal(gl.preset,id);if(signal==='dense')assert.ok(pixels.lit>.002,'Black dense frame: '+id);
   item.stages.push({signal,...pixels,...gl});
  }
  const probe=await page.evaluate(()=>{const p=window.__collection;return [p.contexts,p.sources,p.analysers,p.gains,p.audio.paused];});assert.deepEqual(probe,[1,1,1,1,false]);report.push(item);console.log(id,item.stages.map(p=>({signal:p.signal,mean:p.mean.toFixed(1),white:p.white.toFixed(3),resources:p.resources})));
 }
 await writeFile(join(out,'collection.json'),JSON.stringify({profile:dir,presets:report,errors},null,2));assert.deepEqual(errors,[]);console.log('PASS all curated presets: real renderer identity, four signal classes, no shader/GL failures, bounded allocations and one audio graph.');
}finally{await app.close();if(video)await video.saveAs(resolve(out,'collection-motion.webm'));}
