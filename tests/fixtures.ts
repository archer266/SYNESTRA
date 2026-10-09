/** Deterministic PCM fixtures with an actual Blackman-windowed radix-2 FFT (test-only). */
export function fixture(sampleRate=48000,fftSize=4096,frequencies=[80],rms=0.18){
  const pcm=new Float32Array(fftSize);
  for(let i=0;i<fftSize;i++){
    let value=0;
    for(let j=0;j<frequencies.length;j++)value+=Math.sin(2*Math.PI*frequencies[j]*i/sampleRate+j*2.39996);
    pcm[i]=value;
  }
  let power=0;for(const x of pcm)power+=x*x;
  const gain=rms/Math.sqrt(power/fftSize);
  for(let i=0;i<pcm.length;i++)pcm[i]*=gain;
  const real=new Float64Array(fftSize),imaginary=new Float64Array(fftSize);
  for(let i=0;i<fftSize;i++)real[i]=pcm[i]*(0.42-0.5*Math.cos(2*Math.PI*i/fftSize)+0.08*Math.cos(4*Math.PI*i/fftSize));
  for(let i=1,j=0;i<fftSize;i++){
    let bit=fftSize>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;
    if(i<j)[real[i],real[j]]=[real[j],real[i]];
  }
  for(let length=2;length<=fftSize;length<<=1){
    const angle=-2*Math.PI/length;
    for(let start=0;start<fftSize;start+=length){
      for(let j=0;j<length/2;j++){
        const c=Math.cos(angle*j),s=Math.sin(angle*j),a=start+j,b=a+length/2;
        const tr=real[b]*c-imaginary[b]*s,ti=real[b]*s+imaginary[b]*c;
        real[b]=real[a]-tr;imaginary[b]=imaginary[a]-ti;real[a]+=tr;imaginary[a]+=ti;
      }
    }
  }
  const db=new Float32Array(fftSize/2);
  for(let i=0;i<db.length;i++)db[i]=20*Math.log10(Math.hypot(real[i],imaginary[i])/fftSize);
  return {pcm,db};
}
export function scaled(source: ReturnType<typeof fixture>,gain: number){
  return {pcm:source.pcm.map(x=>x*gain),db:source.db.map(x=>gain>0?x+20*Math.log10(gain):-Infinity)};
}
export const broadFrequencies=Array.from({length:48},(_,i)=>70*Math.pow(11000/70,i/47));
