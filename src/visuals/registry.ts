import { ClassicWorld } from './classic';
import { MilkDropEngine } from './milkdrop/engine';
import { EngineRegistry } from './engine';
import { WorldAdapter } from './adapter';
import { PearlWorld } from './pearl';
import { SpectrumWorld } from './spectrum';
import { WaveformFallback } from './fallback';
export const engines=new EngineRegistry()
 .register({id:'classic',name:'Classic - Lightflow',selectable:true,capabilities:{backend:'webgl2',spectrum:true,waveform:true,reducedMotion:true,layouts:[]},create:()=>new WorldAdapter(fail=>new ClassicWorld(fail))})
 .register({id:'pearl',name:'Pearl',selectable:true,capabilities:{backend:'webgl2',spectrum:true,waveform:false,reducedMotion:true,layouts:[]},create:()=>new WorldAdapter(fail=>new PearlWorld(fail))})
 .register({id:'spectrum',name:'Spectrum',selectable:true,capabilities:{backend:'webgl2',spectrum:true,waveform:true,reducedMotion:true,layouts:['linear','radial']},create:()=>new WorldAdapter(fail=>new SpectrumWorld(fail))})
 .register({id:'milkdrop',name:'MilkDrop',selectable:true,capabilities:{backend:'webgl2',spectrum:true,waveform:true,reducedMotion:false,layouts:[]},create:()=>new MilkDropEngine()})
 .register({id:'waveform',name:'Waveform fallback',selectable:false,capabilities:{backend:'canvas2d',spectrum:false,waveform:true,reducedMotion:true,layouts:[]},create:()=>new WorldAdapter(()=>new WaveformFallback())});
