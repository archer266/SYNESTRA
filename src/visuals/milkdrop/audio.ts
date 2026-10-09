/** Existing mono pre-gain PCM -> Butterchurn's 1024 unsigned samples at its null-context 44.1 kHz convention.
 * Linear interpolation preserves time scale; this is not a stereo analyser or studio resampler. */
export class MilkAudioInput {
 readonly bytes=new Uint8Array(1024).fill(128);
 readonly levels={timeByteArray:this.bytes,timeByteArrayL:this.bytes,timeByteArrayR:this.bytes};
 private gain=0;
 update(pcm:Readonly<Float32Array>,sampleRate:number,active:boolean,sensitivity:number,smoothing:number,delta:number){
  const target=active?sensitivity:0,tau=target>this.gain?.025+.09*smoothing:.16+.44*smoothing;
  this.gain+=(target-this.gain)*(1-Math.exp(-Math.max(0,delta)/tau));
  const ratio=sampleRate>0?sampleRate/44100:1;
  for(let i=0;i<1024;i++){
   const at=pcm.length-1-(1023-i)*ratio,low=Math.floor(at),fraction=at-low;
   const a=pcm[Math.max(0,low)]??0,b=pcm[Math.max(0,Math.min(pcm.length-1,low+1))]??0;
   const value=Number.isFinite(a)&&Number.isFinite(b)?(a+(b-a)*fraction)*this.gain:0;
   this.bytes[i]=Math.max(0,Math.min(255,Math.round(128+value*127)));
  }
  return this.levels;
 }
 reset(){this.gain=0;this.bytes.fill(128);}
}
