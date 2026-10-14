import { _electron as electron,expect } from '@playwright/test';
import { readFile,mkdtemp,mkdir,writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join,resolve } from 'node:path';
const library=JSON.parse(await readFile(join(process.env.APPDATA,'SYNESTRA','library.json'),'utf8'));
if(!library.length)throw new Error('Import a real MP3 into SYNESTRA before running the optional art review.');
const directory=await mkdtemp(join(tmpdir(),'synestra-curation-'));await mkdir('docs/milkdrop-curation',{recursive:true});
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;delete env.SYNESTRA_DEV_URL;
const record=process.argv.includes('--record');const started=Date.now();const report=[];const source=await readFile('src/visuals/milkdrop/catalog.ts','utf8');const catalog=JSON.parse(source.slice(source.indexOf('['),source.indexOf('] as const')+1));
const app=await electron.launch({args:[resolve('.'),'--user-data-dir='+directory],env,...(record?{recordVideo:{dir:resolve('docs/milkdrop-curation'),size:{width:1280,height:820}}}:{})});let video;
try{
 const page=await app.firstWindow();video=page.video();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const button=name=>page.getByRole('button',{name,exact:true});
 await app.evaluate(({BrowserWindow,dialog},file)=>{BrowserWindow.getAllWindows()[0].setContentSize(1280,820);dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},library[0].path);
 await button('Import music').click();await button('Play').click();await page.getByRole('slider',{name:'Seek',exact:true}).fill('40');await page.getByRole('slider',{name:'Seek',exact:true}).press('ArrowRight');
 await page.getByRole('combobox',{name:'Visual mode',exact:true}).selectOption('milkdrop');await button('Tune').click();
 await page.getByRole('slider',{name:'Transition duration',exact:true}).fill('1');
 for(const {id,name} of catalog.filter(p=>!process.env.SYNESTRA_PRESET||p.id===process.env.SYNESTRA_PRESET)){
  await page.getByRole('combobox',{name:'MilkDrop preset',exact:true}).selectOption(id);await page.keyboard.press('Escape');
  // Escape also closes Tune. Check the actual canvas identity, not just the chosen control.
  await expect(page.locator('canvas')).toHaveAttribute('aria-label','MilkDrop visualizer',{timeout:15000});await expect(page.locator('canvas')).toHaveAttribute('data-preset',id);
  await page.waitForTimeout(4000);const from=(Date.now()-started)/1000;await page.screenshot({path:'docs/milkdrop-curation/'+id+'.png'});
  await page.waitForTimeout(5000);await page.screenshot({path:'docs/milkdrop-curation/'+id+'-later.png'});
  const result=await page.locator('canvas').evaluate(c=>{const gl=c.getContext('webgl2');return {resources:Number(c.dataset.resources),blend:c.dataset.blend,error:gl.getError(),width:c.width,height:c.height};});
  report.push({id,name,from,duration:5,...result});console.log(id,result);if(result.error)throw Error('GL error '+id);
  await button('Tune').click();
 }
 await writeFile('docs/milkdrop-curation/audition.json',JSON.stringify(report,null,2));
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(780,600));await page.waitForTimeout(500);await page.screenshot({path:'docs/milkdrop-curation/compact-controls.png'});
 await button('Pause').click();await page.waitForTimeout(2400);await expect(page.getByRole('button',{name:'Play',exact:true})).toBeVisible();
 if(errors.length)throw new Error(errors.join('\n'));console.log('PASS curated actual MilkDrop audition.');
}finally{await app.close();if(record&&video)await video.saveAs(resolve('docs/milkdrop-curation/real-track-motion.webm'));}
