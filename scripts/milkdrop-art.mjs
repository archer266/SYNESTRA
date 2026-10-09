import { _electron as electron,expect } from '@playwright/test';
import { readFile,mkdtemp,mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join,resolve } from 'node:path';
const library=JSON.parse(await readFile(join(process.env.APPDATA,'SYNESTRA','library.json'),'utf8'));
if(!library.length)throw new Error('Import a real MP3 into SYNESTRA before running the optional art review.');
const directory=await mkdtemp(join(tmpdir(),'synestra-milkdrop-art-'));await mkdir('docs/milkdrop',{recursive:true});
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;delete env.SYNESTRA_DEV_URL;
const record=process.argv.includes('--record');
const app=await electron.launch({args:[resolve('.'),'--user-data-dir='+directory],env,...(record?{recordVideo:{dir:resolve('docs/milkdrop'),size:{width:1280,height:820}}}:{})});let video;
try{
 const page=await app.firstWindow();video=page.video();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const button=name=>page.getByRole('button',{name,exact:true});
 await app.evaluate(({BrowserWindow,dialog},file)=>{BrowserWindow.getAllWindows()[0].setContentSize(1280,820);dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},library[0].path);
 await button('Import music').click();await button('Play').click();await page.getByRole('slider',{name:'Seek',exact:true}).fill('40');await page.getByRole('slider',{name:'Seek',exact:true}).press('ArrowRight');
 await page.getByRole('combobox',{name:'Visual mode',exact:true}).selectOption('milkdrop');await button('Tune').click();
 for(const id of ['aurora','galaxy','liquid','crystal']){
  await page.getByRole('combobox',{name:'MilkDrop preset',exact:true}).selectOption(id);await button('Tune').click();await page.waitForTimeout(4500);
  await expect(page.locator('canvas')).toHaveAttribute('aria-label','MilkDrop visualizer');await page.screenshot({path:'docs/milkdrop/'+id+'-real-track.png'});await button('Tune').click();
 }
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(780,600));await page.waitForTimeout(500);await page.screenshot({path:'docs/milkdrop/compact-controls.png'});
 await button('Pause').click();await page.waitForTimeout(2400);await expect(page.getByRole('button',{name:'Play',exact:true})).toBeVisible();
 if(errors.length)throw new Error(errors.join('\n'));console.log('PASS real-track artwork review: all presets, compact controls, pause settling.');
}finally{await app.close();if(record&&video)await video.saveAs(resolve('docs/milkdrop/real-track-motion.webm'));}
