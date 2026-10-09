import * as THREE from 'three';
import type { MusicFeatures } from '../analysis/contracts';
import type { MusicalIntelligence } from '../analysis/intelligence';
import { smooth } from '../analysis/processor';
import type { ProgressionState } from './progression';
import { defaultVisualConfig,type VisualConfig,type VisualWorld } from './contracts';
import { palettes } from './palettes';
const STEPS=320,STREAMS=5,PARTICLES=1200;
const vertex=`varying vec2 vUv;varying float depth;void main(){vUv=uv;depth=position.z;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const fragment=`varying vec2 vUv;varying float depth;uniform vec3 a;uniform vec3 b;uniform vec3 c;uniform float phase;uniform float energy;
void main(){float x=abs(vUv.y*2.-1.);float soft=exp(-x*x*8.);float core=exp(-x*x*180.);float fade=pow(sin(vUv.x*3.14159),.65);vec3 color=mix(a,b,.5+.5*sin(vUv.x*5.+phase));color=mix(color,c,.5+.5*sin(vUv.x*8.-phase*.6));color+=vec3(.55,.62,.7)*core;float alpha=fade*(soft*.38+core*.7)*(.52+energy*.48);gl_FragColor=vec4(color,alpha);}`;
/** One authored light composition. Fixed geometry budget; no audio, timers, feedback allocation or postprocessing chain. */
export class ClassicWorld implements VisualWorld {
 private renderer?:THREE.WebGLRenderer;private scene=new THREE.Scene();private camera=new THREE.OrthographicCamera(-5,5,3,-3,.1,30);
 private config={...defaultVisualConfig};private time=2;private energy=0;private bass=0;private treble=0;private accent=0;private lost=false;
 private ribbons:THREE.Mesh<THREE.BufferGeometry,THREE.ShaderMaterial>[]=[];
 private points:THREE.Points<THREE.BufferGeometry,THREE.ShaderMaterial>;private haze:THREE.Mesh<THREE.PlaneGeometry,THREE.ShaderMaterial>;
 private heads:THREE.Mesh<THREE.PlaneGeometry,THREE.ShaderMaterial>[]=[];
 private point=new THREE.Vector3();private next=new THREE.Vector3();
 constructor(private failure:()=>void){
  this.camera.position.z=10;
  for(let j=0;j<STREAMS;j++){
   const geometry=new THREE.BufferGeometry(),positions=new Float32Array(STEPS*2*3),uv=new Float32Array(STEPS*4),indices=[];
   for(let i=0;i<STEPS;i++){uv.set([i/(STEPS-1),0,i/(STEPS-1),1],i*4);if(i<STEPS-1){const n=i*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}}
   geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));geometry.setIndex(indices);
   const material=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,uniforms:{a:{value:new THREE.Color()},b:{value:new THREE.Color()},c:{value:new THREE.Color()},phase:{value:j},energy:{value:0}},transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
   const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;this.ribbons.push(mesh);this.scene.add(mesh);
   const head=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.6),new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{color:{value:new THREE.Color()},power:{value:1}},vertexShader:vertex,fragmentShader:`varying vec2 vUv;uniform vec3 color;uniform float power;void main(){vec2 p=vUv-.5;float r=dot(p,p);float halo=exp(-r*28.);float core=exp(-r*800.);float rays=exp(-abs(p.x)*180.-abs(p.y)*20.)+exp(-abs(p.y)*180.-abs(p.x)*20.);gl_FragColor=vec4(color*halo+vec3(1.)*(core+rays*.12),power*(halo*.22+core*.8+rays*.06));}`}));this.heads.push(head);this.scene.add(head);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(PARTICLES*3),3).setUsage(THREE.DynamicDrawUsage));g.setAttribute('seed',new THREE.BufferAttribute(Float32Array.from({length:PARTICLES},(_,i)=>(Math.sin(i*127.1)*43758.5453)%1),1));
  this.points=new THREE.Points(g,new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{a:{value:new THREE.Color()},b:{value:new THREE.Color()},size:{value:1},energy:{value:0}},vertexShader:`attribute float seed;varying float v;uniform float size;void main(){v=abs(seed);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=size*(2.+v*v*10.);}`,fragmentShader:`varying float v;uniform vec3 a;uniform vec3 b;uniform float energy;void main(){float r=length(gl_PointCoord-.5)*2.;float glow=exp(-r*r*6.)*smoothstep(1.,.3,r);gl_FragColor=vec4(mix(a,b,v)+.25,glow*(.25+energy*.65));}`}));this.points.frustumCulled=false;this.scene.add(this.points);
  this.haze=new THREE.Mesh(new THREE.PlaneGeometry(24,16),new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0},energy:{value:0},a:{value:new THREE.Color()},b:{value:new THREE.Color()}},vertexShader:vertex,fragmentShader:`varying vec2 vUv;uniform float time;uniform float energy;uniform vec3 a;uniform vec3 b;void main(){vec2 p=(vUv-.5)*vec2(2.,1.);float n=sin(p.x*4.+sin(p.y*5.+time*.12))*sin(p.y*4.-time*.09);float glow=exp(-dot(p,p)*5.);vec3 color=mix(a,b,.5+.5*n);gl_FragColor=vec4(color,glow*(.035+energy*.035));}`}));this.haze.position.z=-4;this.scene.add(this.haze);
 }
 initialize(container:HTMLElement){this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});this.renderer.setClearColor(0x090613,0);this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.domElement.setAttribute('aria-label','Classic Lightflow visualizer');this.renderer.domElement.addEventListener('webglcontextlost',this.contextLost);this.renderer.debug.onShaderError=this.failure;container.appendChild(this.renderer.domElement);this.configure(this.config);}
 private contextLost=(event:Event)=>{event.preventDefault();this.lost=true;this.failure();};
 configure(config:VisualConfig){this.config={...config};const colors=palettes[config.palette];for(const mesh of this.ribbons){mesh.material.uniforms.a.value.setHex(colors[0]);mesh.material.uniforms.b.value.setHex(colors[1]);mesh.material.uniforms.c.value.setHex(colors[2]);}for(const material of [this.points.material,this.haze.material]){material.uniforms.a.value.setHex(colors[0]);material.uniforms.b.value.setHex(colors[2]);}this.heads.forEach((head,i)=>head.material.uniforms.color.value.setHex(colors[i%3]));this.points.geometry.setDrawRange(0,config.quality==='economy'?400:PARTICLES);}
 resize(width:number,height:number,dpr:number){const aspect=width/Math.max(1,height),half=Math.max(2.65,4.2/aspect);this.camera.left=-half*aspect;this.camera.right=half*aspect;this.camera.top=half;this.camera.bottom=-half;this.camera.updateProjectionMatrix();this.renderer?.setPixelRatio(dpr);this.renderer?.setSize(width,height,false);this.points.material.uniforms.size.value=dpr*(height/800);}
 private curve(t:number,j:number,out:THREE.Vector3){const drift=this.time*.12,spread=.16*j;out.set(Math.sin(t*.71+drift)*2.7+Math.sin(t*1.37+drift*.7)*.55,Math.cos(t*.93-drift*.45)*1.35+Math.sin(t*1.6)*.35,Math.sin(t*.82)*.7);out.x+=Math.cos(t*1.7+j)*spread;out.y+=Math.sin(t*1.4+j)*spread;out.multiplyScalar(1+this.bass*.12);return out;}
 update(f:Readonly<MusicFeatures>,_p:Readonly<ProgressionState>,delta:number,intelligence?:Readonly<MusicalIntelligence>|null){
  if(!this.renderer||this.lost)return;const dt=Math.min(.1,delta),active=!f.gated&&!f.suppressed,motion=this.config.reducedMotion?0:this.config.motion;
  this.energy=smooth(this.energy,active?f.envelope:0,dt,.3,.9);this.bass=smooth(this.bass,active?f.bass:0,dt,.12,.7);this.treble=smooth(this.treble,active?f.treble:0,dt,.15,.5);
  this.accent=smooth(this.accent,active?(intelligence?.onsetStrength??f.onsetStrength)*this.config.musicalResponse:0,dt,.055,.35);
  this.time+=dt*(.13+this.energy*.18+this.accent*.08)*motion;
  for(let j=0;j<STREAMS;j++){
   const mesh=this.ribbons[j],positions=mesh.geometry.getAttribute('position');mesh.visible=j<2+Math.round(this.config.richness*3);
   for(let i=0;i<STEPS;i++){const u=i/(STEPS-1),t=this.time-u*(6.3+this.energy*.7),p=this.curve(t,j,this.point),n=this.curve(t+.005,j,this.next);let nx=-(n.y-p.y),ny=n.x-p.x;const length=Math.hypot(nx,ny)||1;nx/=length;ny/=length;
    const wave=f.waveform[Math.floor(u*(f.waveform.length-1))]*(.025+this.config.richness*.025),width=(.11+this.bass*.075+this.accent*.04)*(1+j*.14)*(1+.5*Math.sin(u*8+this.time+j));p.x+=nx*wave;p.y+=ny*wave;
    positions.setXYZ(i*2,p.x+nx*width,p.y+ny*width,p.z);positions.setXYZ(i*2+1,p.x-nx*width,p.y-ny*width,p.z);}
   const head=this.heads[j];head.visible=mesh.visible;this.curve(this.time-.08,j,head.position);head.material.uniforms.power.value=.6+this.energy*.5+this.accent*.2;head.scale.setScalar(.65+this.bass*.3);
   positions.needsUpdate=true;mesh.material.uniforms.phase.value=this.time*.2+j*.7;mesh.material.uniforms.energy.value=this.energy;
  }
  const points=this.points.geometry.getAttribute('position');for(let i=0;i<PARTICLES;i++){const u=i/PARTICLES,age=(u*7+this.time*.035)%1,j=i%STREAMS,p=this.curve(this.time-age*7,j,this.point),scatter=age*age*(.1+this.config.richness*.65);points.setXYZ(i,p.x+Math.sin(i*12.989+this.time*.1)*scatter,p.y+Math.cos(i*7.39+this.time*.13)*scatter,p.z+Math.sin(i*1.7)*scatter);}
  points.needsUpdate=true;this.points.material.uniforms.energy.value=this.energy*(.5+this.treble*.5);this.points.visible=this.config.richness>.05;
  this.haze.material.uniforms.time.value=this.time;this.haze.material.uniforms.energy.value=this.energy;this.renderer.render(this.scene,this.camera);
 }
 dispose(){this.renderer?.domElement.removeEventListener('webglcontextlost',this.contextLost);for(const object of [...this.ribbons,...this.heads,this.points,this.haze]){object.geometry.dispose();object.material.dispose();}this.scene.clear();this.renderer?.dispose();this.renderer?.forceContextLoss();this.renderer?.domElement.remove();}
}
