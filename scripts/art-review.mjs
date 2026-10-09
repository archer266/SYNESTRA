import { _electron as electron,expect } from '@playwright/test';
import { Mp3Encoder } from '@breezystack/lamejs';
import { mkdtemp,writeFile,mkdir,rename } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve,join } from 'node:path';
const folder=await mkdtemp(join(tmpdir(),'synestra-art-'));
await mkdir('docs/pearl',{recursive:true});
const sampleRate=44100,encoder=new Mp3Encoder(1,sampleRate,128),chunks=[];
for(let start=0;start<sampleRate*32;start+=1152){
 const samples=new Int16Array(Math.min(1152,sampleRate*32-start));
 for(let i=0;i<samples.length;i++){
  const t=(start+i)/sampleRate;
  const energy=t<4?.1:t<10?.22:.34;
  const pulse=.4+.6*Math.exp(-(t%.48)/.12);
  let v=0;for(let k=0;k<40;k++)v+=Math.sin(2*Math.PI*65*Math.pow(10500/65,k/39)*t+k*2.39996);
  samples[i]=Math.round(Math.max(-.98,Math.min(.98,v/Math.sqrt(40)*energy*pulse))*32767);
 }
 chunks.push(Buffer.from(encoder.encodeBuffer(samples)));
}
chunks.push(Buffer.from(encoder.flush()));
const fixture=join(folder,'Light in motion.mp3');await writeFile(fixture,Buffer.concat(chunks));
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;delete env.SYNESTRA_DEV_URL;
const record=process.argv.includes('--record'),executablePath=process.env.SYNESTRA_EXECUTABLE;
const app=await electron.launch({executablePath,args:[...(executablePath?[]:[resolve('.')]),'--user-data-dir='+join(folder,'profile')],env,...(record?{recordVideo:{dir:resolve('docs/pearl'),size:{width:1440,height:900}}}:{})});
let video;
try{
 const page=await app.firstWindow();video=page.video();await page.getByRole('combobox',{name:'Visual mode',exact:true}).selectOption('pearl');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'&&/shader|GL_INVALID/i.test(m.text()))errors.push(m.text());});
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(1440,900));
 await page.waitForTimeout(1200);await page.screenshot({path:'docs/pearl/quiet.png'});
 await app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},fixture);
 await page.getByRole('button',{name:'Import music',exact:true}).click();
 await page.getByRole('button',{name:'Play',exact:true}).click();
 await expect(page.locator('.now-playing [role=status]')).toHaveText('Now playing');
 for(const [name,wait] of [['flow',4000],['lift',4000],['peak',5000],['recovery',3000]]){
  await page.waitForTimeout(wait);await page.screenshot({path:'docs/pearl/'+name+'.png'});
 }
 const performance=await page.evaluate(async()=>{
  const intervals=[];let previous=0;
  await new Promise(resolve=>{let count=0;const sample=time=>{if(previous)intervals.push(time-previous);previous=time;if(++count<181)requestAnimationFrame(sample);else resolve();};requestAnimationFrame(sample);});
  const sorted=[...intervals].sort((a,b)=>a-b),mean=intervals.reduce((a,b)=>a+b,0)/intervals.length;
  const gl=document.querySelector('canvas').getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');
  return {meanFps:1000/mean,medianFrameMs:sorted[Math.floor(sorted.length*.5)],p95FrameMs:sorted[Math.floor(sorted.length*.95)],gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable',width:innerWidth,height:innerHeight,dpr:devicePixelRatio};
 });
 await writeFile('docs/pearl/performance.json',JSON.stringify({...performance,recording:record},null,2));console.log('Frame pacing:',performance);
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(780,600));
 await page.waitForTimeout(650);await page.screenshot({path:'docs/pearl/compact.png'});
 await page.getByRole('button',{name:'Tune',exact:true}).click();await page.waitForTimeout(600);await page.screenshot({path:'docs/pearl/compact-tune.png'});
 await page.getByRole('button',{name:'Tune',exact:true}).click();
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(1440,900));
 await page.getByRole('button',{name:'Pause',exact:true}).click();await page.waitForTimeout(3500);
 await page.screenshot({path:'docs/pearl/settled.png'});
 await page.getByRole('combobox',{name:'Visual mode',exact:true}).selectOption('spectrum');
 await page.waitForTimeout(700);await page.screenshot({path:'docs/pearl/spectrum.png'});
 if(errors.length)throw new Error(errors.join('\n'));
 console.log('Captured full 1440 × 900 Electron window: quiet, flow, lift, peak, recovery, settled, Spectrum. No renderer errors.');
}finally{await app.close();}
if(video){await rename(await video.path(),'docs/pearl/pearl-motion.webm');console.log('Recording: docs/pearl/pearl-motion.webm (silent screen recording of generated MP3 response).');}
