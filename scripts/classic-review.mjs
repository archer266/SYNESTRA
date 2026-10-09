import { _electron as electron,expect } from '@playwright/test';
import { readFile,mkdtemp,mkdir,writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join,resolve } from 'node:path';
const library=JSON.parse(await readFile(join(process.env.APPDATA,'SYNESTRA','library.json'),'utf8'));
if(!library.length)throw new Error('Import a real MP3 into SYNESTRA before running the optional art review.');
const directory=await mkdtemp(join(tmpdir(),'synestra-classic-'));await mkdir('docs/classic',{recursive:true});
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;delete env.SYNESTRA_DEV_URL;
const record=process.argv.includes('--record');
const app=await electron.launch({args:[resolve('.'),'--user-data-dir='+directory],env,...(record?{recordVideo:{dir:resolve('docs/classic'),size:{width:1280,height:820}}}:{})});let video;
try{
 const page=await app.firstWindow();video=page.video();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const button=name=>page.getByRole('button',{name,exact:true});
 await app.evaluate(({BrowserWindow,dialog},file)=>{BrowserWindow.getAllWindows()[0].setContentSize(1280,820);dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},library[0].path);
 await button('Import music').click();await button('Play').click();await page.getByRole('slider',{name:'Seek',exact:true}).fill('40');await page.getByRole('slider',{name:'Seek',exact:true}).press('ArrowRight');
 await page.getByRole('combobox',{name:'Visual mode',exact:true}).selectOption('classic');await page.keyboard.press('Escape');await page.locator('.stage').click();await button('Tune').click();
 await button('Tune').click();
 for(let i=0;i<3;i++){await page.waitForTimeout(3500);await expect(page.locator('canvas')).toHaveAttribute('aria-label','Classic Lightflow visualizer');await page.screenshot({path:'docs/classic/frame-'+i+'.png'});}
 await button('Tune').click();await button('Signals').click();console.log('Classic timing',await page.locator('[data-signal=timing]').innerText());
 if(process.argv.includes('--check')){
 const modes=page.getByRole('combobox',{name:'Visual mode',exact:true});
 for(const mode of ['pearl','spectrum','milkdrop','classic']){await modes.selectOption(mode);await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Pause',exact:true})).toBeVisible();await expect(page.locator('canvas')).toHaveCount(1);}
 if(await button('Tune').getAttribute('aria-expanded')!=='true')await button('Tune').click();if(await button('Signals').getAttribute('aria-expanded')!=='true')await button('Signals').click();
 await page.getByRole('slider',{name:'Volume',exact:true}).fill('0');await page.waitForTimeout(700);await expect.poll(async()=>Number(await page.locator('[data-signal=rms]').innerText())).toBeGreaterThan(.01);await page.getByRole('slider',{name:'Volume',exact:true}).fill('0.6');
 await page.getByRole('slider',{name:'Seek',exact:true}).fill('65');await page.getByRole('slider',{name:'Seek',exact:true}).press('ArrowRight');await page.waitForTimeout(1200);await expect(page.getByRole('button',{name:'Pause',exact:true})).toBeVisible();
 await page.getByRole('combobox',{name:'Rendering quality',exact:true}).selectOption('high');await page.getByRole('combobox',{name:'Render resolution limit',exact:true}).selectOption('2160p');
 await button('Enter fullscreen').click();await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(true);await page.screenshot({path:'docs/classic/fullscreen.png'});await button('Exit fullscreen').click();
 await page.locator('.spectrum-canvas').evaluate(c=>{c.style.width='3840px';c.style.height='2160px';});await expect.poll(()=>page.locator('canvas').evaluate(c=>c.width+'x'+c.height)).toBe('3840x2160');await page.waitForTimeout(700);
 const performanceResult=await page.evaluate(async()=>{const c=document.querySelector('canvas'),gl=c.getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info'),times=[];let last=0;await new Promise(resolve=>{const tick=now=>{if(last)times.push(now-last);last=now;if(times.length<180)requestAnimationFrame(tick);else resolve();};requestAnimationFrame(tick);});times.sort((a,b)=>a-b);return {width:c.width,height:c.height,median:times[90],p95:times[171],gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'Unavailable',error:gl.getError()};});await writeFile('docs/classic/performance.json',JSON.stringify(performanceResult,null,2));console.log('Short 4K render-buffer sample',performanceResult);
 await page.locator('.spectrum-canvas').evaluate(c=>{c.style.width='';c.style.height='';});await page.getByRole('combobox',{name:'Rendering quality',exact:true}).selectOption('balanced');
 await page.locator('canvas').evaluate(c=>c.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());await expect(page.locator('[data-signal=renderer]')).toHaveText('Waveform fallback');await button('Retry graphics').click();await expect(page.locator('canvas')).toHaveAttribute('aria-label','Classic Lightflow visualizer');
 await page.emulateMedia({reducedMotion:'reduce'});await expect(page.getByRole('slider',{name:'Motion',exact:true})).toBeDisabled();await page.emulateMedia({reducedMotion:'no-preference'});
 }
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(780,600));await page.waitForTimeout(500);await page.screenshot({path:'docs/classic/compact-controls.png'});
 await button('Pause').click();await page.waitForTimeout(2400);await expect(page.getByRole('button',{name:'Play',exact:true})).toBeVisible();
 if(errors.length)throw new Error(errors.join('\n'));console.log('PASS Classic real-track artwork capture, compact controls and pause settling.');
}finally{await app.close();if(record&&video)await video.saveAs(resolve('docs/classic/real-track-motion.webm'));}
