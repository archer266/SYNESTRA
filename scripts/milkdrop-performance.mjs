import assert from 'node:assert/strict';
import { _electron as electron } from '@playwright/test';
import { readFile,mkdtemp,mkdir,writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join,resolve } from 'node:path';
const library=JSON.parse(await readFile(join(process.env.APPDATA,'SYNESTRA','library.json'),'utf8'));
if(!library.length)throw new Error('Import a real MP3 into SYNESTRA before running the optional art review.');
const directory=await mkdtemp(join(tmpdir(),'synestra-curation-'));await mkdir('docs/milkdrop-curation',{recursive:true});
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;delete env.SYNESTRA_DEV_URL;
const record=process.argv.includes('--record');const report=[];const source=await readFile('src/visuals/milkdrop/catalog.ts','utf8');const catalog=JSON.parse(source.slice(source.indexOf('['),source.indexOf('] as const')+1));
const app=await electron.launch({args:[resolve('.'),'--user-data-dir='+directory],env,...(record?{recordVideo:{dir:resolve('docs/milkdrop-curation'),size:{width:1280,height:820}}}:{})});let video;
try{
 const page=await app.firstWindow();video=page.video();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const button=name=>page.getByRole('button',{name,exact:true});
 await app.evaluate(({BrowserWindow,dialog},file)=>{BrowserWindow.getAllWindows()[0].setContentSize(1280,820);dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},library[0].path);
 await button('Import music').click();await button('Play').click();await page.getByRole('slider',{name:'Seek',exact:true}).fill('40');await page.getByRole('slider',{name:'Seek',exact:true}).press('ArrowRight');
 await page.getByRole('combobox',{name:'Visual mode',exact:true}).selectOption('milkdrop');await button('Tune').click();
 await page.getByRole('slider',{name:'Transition duration',exact:true}).fill('1');

 await page.getByRole('combobox',{name:'Rendering quality',exact:true}).selectOption('high');
 const sample=()=>page.evaluate(()=>new Promise(resolve=>{let last=performance.now();const intervals=[];const tick=now=>{intervals.push(now-last);last=now;if(intervals.length<90)requestAnimationFrame(tick);else{const c=document.querySelector('canvas'),g=c.getContext('webgl2'),ext=g.getExtension('WEBGL_debug_renderer_info');intervals.sort((a,b)=>a-b);resolve({width:c.width,height:c.height,medianMs:intervals[45],p95Ms:intervals[85],gpu:ext?g.getParameter(ext.UNMASKED_RENDERER_WEBGL):'Unavailable',error:g.getError(),resources:Number(c.dataset.resources),activePreset:c.dataset.preset});}};requestAnimationFrame(tick);}));
 for(const [limit,width,height] of [['1080p',1920,1080],['2160p',3840,2160]]){
  await page.getByRole('combobox',{name:'Render resolution limit',exact:true}).selectOption(limit);
  await page.locator('.spectrum-canvas').evaluate((c,{width,height})=>{c.style.width=width+'px';c.style.height=height+'px';},{width,height});
  for(const {id} of catalog){
   await page.getByRole('combobox',{name:'MilkDrop preset',exact:true}).selectOption(id);await page.waitForTimeout(1600);
   const result=await sample();assert.deepEqual([result.width,result.height],[width,height]);assert.equal(result.activePreset,id);assert.equal(result.error,0);report.push({id,quality:'high',limit,...result});console.log(id,limit,result.medianMs.toFixed(1),result.p95Ms.toFixed(1));
  }
 }
 await writeFile('docs/milkdrop-collection/performance.json',JSON.stringify(report,null,2));
 console.log('PASS all ten presets at genuine 1080p and 2160p buffers.');
}finally{await app.close();if(record&&video)await video.saveAs(resolve('docs/milkdrop-curation/real-track-motion.webm'));}
