import type { VisualConfig } from './contracts';
import type { RenderSize } from './engine';
const dimensions={auto:[3840,2160], '720p':[1280,720], '1080p':[1920,1080], '1440p':[2560,1440], '2160p':[3840,2160]} as const;
const budgets={economy:{dpr:1,pixels:850000},balanced:{dpr:1.5,pixels:1600000},high:{dpr:2,pixels:3840*2160}} as const;
const positive=(value:number,fallback:number)=>Number.isFinite(value)&&value>0?value:fallback;
/** One aspect-preserving policy for all engines. Explicit limits never upscale CSS beyond DPR. */
export function resolveRenderSize(width:number,height:number,dpr:number,quality:VisualConfig['quality'],resolution:VisualConfig['resolution']='auto'):RenderSize{
  const cssWidth=positive(width,1),cssHeight=positive(height,1),devicePixelRatio=positive(dpr,1);
  const budget=budgets[quality],limit=dimensions[resolution];
  const pixelRatio=Math.min(devicePixelRatio,budget.dpr,limit[0]/cssWidth,limit[1]/cssHeight,Math.sqrt(budget.pixels/(cssWidth*cssHeight)));
  return {cssWidth,cssHeight,devicePixelRatio,pixelRatio,width:Math.max(1,Math.floor(cssWidth*pixelRatio)),height:Math.max(1,Math.floor(cssHeight*pixelRatio))};
}
