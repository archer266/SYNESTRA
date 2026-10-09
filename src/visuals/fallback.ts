import type { MusicFeatures } from '../analysis/contracts';
import { defaultVisualConfig,type VisualConfig,type VisualWorld } from './contracts';
import { palettes } from './palettes';
export class WaveformFallback implements VisualWorld {
  private canvas=document.createElement('canvas');
  private context: CanvasRenderingContext2D|null=null;
  private width=1;private height=1;private dpr=1;
  private config={...defaultVisualConfig};
  initialize(container: HTMLElement){this.context=this.canvas.getContext('2d');if(!this.context)throw new Error('Canvas 2D is unavailable');this.canvas.setAttribute('aria-label','Measured waveform fallback');container.appendChild(this.canvas);}
  configure(config: VisualConfig){this.config={...config};this.resize(this.width,this.height,this.dpr);}
  resize(width: number,height: number,pixelRatio: number){
    this.width=width;this.height=height;this.dpr=pixelRatio;
    const ratio=pixelRatio;
    this.canvas.width=Math.max(1,Math.floor(width*ratio));this.canvas.height=Math.max(1,Math.floor(height*ratio));
    this.context?.setTransform(ratio,0,0,ratio,0,0);
  }
  update(features: Readonly<MusicFeatures>){
    const ctx=this.context;if(!ctx)return;
    ctx.clearRect(0,0,this.width,this.height);
    const gradient=ctx.createLinearGradient(24,0,this.width-24,0);
    palettes[this.config.palette].forEach((color,index)=>gradient.addColorStop(index/2,'#'+color.toString(16).padStart(6,'0')));
    ctx.lineWidth=1.5;ctx.strokeStyle=gradient;ctx.beginPath();
    const waveform=features.waveform;
    for(let i=0;i<waveform.length;i++){
      const x=24+i/(waveform.length-1)*(this.width-48),y=this.height/2-waveform[i]*this.height*0.3;
      if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    ctx.stroke();
  }
  dispose(){this.canvas.remove();this.context=null;}
}
