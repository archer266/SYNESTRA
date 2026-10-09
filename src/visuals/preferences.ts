import { isPreset } from './milkdrop/catalog';
import { defaultVisualConfig,type VisualConfig } from './contracts';
export const VISUAL_PREFERENCES_KEY='synestra.visual-preferences.v1';
/** Only explicitly known keys and valid finite values survive deserialization. No audio state. */
export function validatePreferences(value: unknown): VisualConfig {
  const result={...defaultVisualConfig};
  if(!value||typeof value!=='object'||Array.isArray(value))return result;
  const input=value as Record<string,unknown>;
  if(input.mode==='classic'||input.mode==='pearl'||input.mode==='spectrum'||input.mode==='milkdrop')result.mode=input.mode;
  if(input.mode==='fused-bubbles')result.mode='pearl'; // Migrate the replaced aesthetic, retaining all other settings.
  if(isPreset(input.milkdropPreset))result.milkdropPreset=input.milkdropPreset;
  if(typeof input.milkdropCycle==='boolean')result.milkdropCycle=input.milkdropCycle;
  if(typeof input.milkdropInterval==='number'&&Number.isFinite(input.milkdropInterval)&&input.milkdropInterval>=15&&input.milkdropInterval<=300)result.milkdropInterval=input.milkdropInterval;
  if(typeof input.milkdropTransition==='number'&&Number.isFinite(input.milkdropTransition)&&input.milkdropTransition>=1&&input.milkdropTransition<=8)result.milkdropTransition=input.milkdropTransition;
  if(input.layout==='linear'||input.layout==='radial')result.layout=input.layout;
  if(input.palette==='aurora'||input.palette==='glacier'||input.palette==='ember')result.palette=input.palette;
  if(input.quality==='balanced'||input.quality==='economy'||input.quality==='high')result.quality=input.quality;
  if(input.resolution==='auto'||input.resolution==='720p'||input.resolution==='1080p'||input.resolution==='1440p'||input.resolution==='2160p')result.resolution=input.resolution;
  for(const key of ['sensitivity','richness','smoothing','motion','musicalResponse'] as const){
    const v=input[key],min=key==='sensitivity'?0.5:0,max=key==='sensitivity'?2:1;
    if(typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max)result[key]=v;
  }
  return result;
}
export function readVisualPreferences(){
  try{return validatePreferences(JSON.parse(localStorage.getItem(VISUAL_PREFERENCES_KEY)??'null'));}catch{return {...defaultVisualConfig};}
}
export function saveVisualPreferences(config: VisualConfig){
  try{const {mode,layout,palette,quality,resolution,sensitivity,richness,smoothing,motion,musicalResponse,milkdropPreset,milkdropCycle,milkdropInterval,milkdropTransition}=validatePreferences(config);const preferences={mode,layout,palette,quality,resolution,sensitivity,richness,smoothing,motion,musicalResponse,milkdropPreset,milkdropCycle,milkdropInterval,milkdropTransition};localStorage.setItem(VISUAL_PREFERENCES_KEY,JSON.stringify(preferences));}catch{/* Storage can be unavailable. Current session still works. */}
}
