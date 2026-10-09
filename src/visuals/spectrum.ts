import type { MusicalIntelligence } from '../analysis/intelligence';
import { MusicalResponse } from './musicalResponse';
import * as THREE from 'three';
import type { MusicFeatures } from '../analysis/contracts';
import type { ProgressionState } from './progression';
import { defaultVisualConfig,type VisualConfig,type VisualWorld } from './contracts';
import { BAND_COUNT,WAVEFORM_SIZE } from '../analysis/processor';
import { palettes } from './palettes';

function line(count: number,color: number,opacity=1){
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(count*3),3).setUsage(THREE.DynamicDrawUsage));
  return new THREE.Line(geometry,new THREE.LineBasicMaterial({color,transparent:true,opacity,depthWrite:false,blending:THREE.AdditiveBlending}));
}
function ring(radius: number,color: number){
  const object=line(161,color,0.3),positions=object.geometry.getAttribute('position');
  for(let i=0;i<=160;i++){const angle=i/160*Math.PI*2;positions.setXYZ(i,Math.cos(angle)*radius,Math.sin(angle)*radius,0);}
  return object;
}

/** Fixed object budget. Layout changes only update matrices; no per-frame object creation. */
export class SpectrumWorld implements VisualWorld {
  private response=new MusicalResponse();
  private renderer?: THREE.WebGLRenderer;
  private scene=new THREE.Scene();
  private camera=new THREE.PerspectiveCamera(42,1,0.1,50);
  private composition=new THREE.Group();
  private config={...defaultVisualConfig};
  private bars=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:0xffffff,metalness:0.3,roughness:0.28,emissive:0x14242b,emissiveIntensity:1.4}),BAND_COUNT);
  private caps=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial({color:0xffffff}),BAND_COUNT);
  private core=new THREE.Mesh(new THREE.IcosahedronGeometry(0.42,4),new THREE.MeshStandardMaterial({color:0x367d83,metalness:0.65,roughness:0.25,emissive:0x2bbaa8,emissiveIntensity:0.4}));
  private coreWire=new THREE.Mesh(new THREE.IcosahedronGeometry(0.47,1),new THREE.MeshBasicMaterial({color:0x7ce0d2,wireframe:true,transparent:true,opacity:0.18}));
  private glow=new THREE.Mesh(new THREE.PlaneGeometry(4.8,4.8),new THREE.ShaderMaterial({
    uniforms:{intensity:{value:0.3},tint:{value:new THREE.Color(0x21dcff)}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:'varying vec2 uvp; void main(){uvp=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'varying vec2 uvp; uniform float intensity; uniform vec3 tint; void main(){float r=length(uvp-0.5)*2.0;float a=exp(-r*r*9.0)*smoothstep(1.0,0.1,r);gl_FragColor=vec4(tint,a*intensity);}'
  }));
  private traces=[line(WAVEFORM_SIZE,0xadf6df),line(WAVEFORM_SIZE,0x5692d2),line(WAVEFORM_SIZE,0x9673da)];
  private rails=[ring(1.24,0x497b8c),ring(2.77,0x5c6e91)];
  private orbits=[ring(2.18,0x6bb8b3),ring(2.48,0x668aca),ring(2.6,0x9585cf)];
  private satellites=new THREE.InstancedMesh(new THREE.SphereGeometry(0.038,8,6),new THREE.MeshBasicMaterial({color:0xb1e8e1,transparent:true}),12);
  private connections=line(13,0x538a9c,0);
  private architecture=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial({color:0x729ed5,transparent:true,depthWrite:false}),48);
  private detail: THREE.Points<THREE.BufferGeometry,THREE.PointsMaterial>;
  private matrix=new THREE.Object3D();
  private color=new THREE.Color();
  private flash=0;
  private phase=0;
  private lost=false;
  constructor(private onFailure: ()=>void){
    const positions=new Float32Array(96*3);
    for(let i=0;i<96;i++){
      // Deterministic stationary foreground details, not fabricated audio samples.
      positions[i*3]=Math.sin(i*127.1)*5.5;positions[i*3+1]=Math.cos(i*311.7)*3.3;positions[i*3+2]=Math.sin(i*71.3)*1.2-0.3;
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
    this.detail=new THREE.Points(geometry,new THREE.PointsMaterial({color:0x9bbde0,size:0.018,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));
    this.scene.add(this.composition);
    this.composition.add(this.bars,this.caps,this.glow,this.core,this.coreWire,...this.traces,...this.rails,...this.orbits,this.satellites,this.connections,this.architecture,this.detail);
  }
  initialize(container: HTMLElement){
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
    this.renderer.debug.onShaderError=()=>this.onFailure();
    this.renderer.setClearColor(0x080d18,0);
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.domElement.setAttribute('aria-label','Music-reactive Spectrum');
    this.renderer.domElement.addEventListener('webglcontextlost',this.contextLost);
    container.appendChild(this.renderer.domElement);
    this.camera.position.set(0,0.1,9.5);this.camera.lookAt(0,0,0);
    this.scene.add(new THREE.AmbientLight(0x6395af,1.9));
    const key=new THREE.DirectionalLight(0xd2fff1,3.8);key.position.set(-3,4,5);this.scene.add(key);
    const rim=new THREE.PointLight(0x7d7aff,20,20);rim.position.set(3,-2,2);this.scene.add(rim);
    this.glow.position.z=-0.6;
    this.bars.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.bars.frustumCulled=false;
    this.caps.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.caps.frustumCulled=false;
    this.satellites.frustumCulled=false;this.architecture.frustumCulled=false;
    for(let i=0;i<BAND_COUNT;i++){
      this.color.setHSL(0.46+i/BAND_COUNT*0.24,0.60,0.48);
      this.bars.setColorAt(i,this.color);this.color.multiplyScalar(1.45);this.caps.setColorAt(i,this.color);
    }
    this.bars.instanceColor!.needsUpdate=true;this.caps.instanceColor!.needsUpdate=true;
    this.orbits[0].rotation.set(0.65,0.3,0.2);
    this.orbits[1].rotation.set(-0.45,0.7,-0.5);
    this.orbits[2].rotation.set(0.2,-0.8,0.6);
  }
  private contextLost=(event: Event)=>{event.preventDefault();if(!this.lost){this.lost=true;this.onFailure();}};
  configure(config: VisualConfig){
    this.config={...config};
    const colors=palettes[config.palette],end=new THREE.Color();
    for(let i=0;i<BAND_COUNT;i++){
      const progress=i/(BAND_COUNT-1)*2,index=Math.min(1,Math.floor(progress));
      this.color.setHex(colors[index]).lerp(end.setHex(colors[index+1]),progress-index);
      this.bars.setColorAt(i,this.color);this.caps.setColorAt(i,this.color);
    }
    this.bars.instanceColor!.needsUpdate=true;this.caps.instanceColor!.needsUpdate=true;
    this.core.material.color.setHex(colors[1]);this.core.material.emissive.setHex(colors[0]);
    this.coreWire.material.color.setHex(colors[2]);this.glow.material.uniforms.tint.value.setHex(colors[0]);
    this.traces.forEach((trace,index)=>trace.material.color.setHex(colors[index]));
    this.orbits.forEach((orbit,index)=>orbit.material.color.setHex(colors[index]));
    this.architecture.material.color.setHex(colors[1]);this.detail.material.color.setHex(colors[0]);
    this.detail.geometry.setDrawRange(0,config.quality==='economy'?48:96);
  }
  resize(width: number,height: number,pixelRatio: number){
    
    if(!this.renderer)return;
    this.camera.aspect=width/Math.max(1,height);
    this.camera.position.z=Math.max(8.7,8.8/Math.max(0.7,this.camera.aspect));
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width,height,false);
  }
  update(f: Readonly<MusicFeatures>,p: Readonly<ProgressionState>,dt: number,intelligence?:Readonly<MusicalIntelligence>|null){
    if(!this.renderer||this.lost)return;
    const response=this.response.update(intelligence,this.config,dt);
    const radial=this.config.layout==='radial',motion=this.config.reducedMotion?0:this.config.motion,r=this.config.richness;
    this.flash=f.attack?Math.max(this.flash,f.onsetStrength*0.6+0.15):this.flash*Math.exp(-dt/0.22);
    this.phase+=dt*(0.035+f.envelope*0.025)*motion*(1+response.flow*.1-response.settle*.2);
    this.composition.rotation.z=radial?Math.sin(this.phase)*0.025:0;
    this.composition.rotation.x=radial?0:0.12;
    this.composition.scale.set(radial?1:1.5,1,1);
    const coreY=radial?0:0.65;
    this.core.position.y=this.coreWire.position.y=this.glow.position.y=coreY;
    this.core.scale.setScalar(1+f.bass*0.38*motion+this.flash*0.12*motion+response.accent*.04);
    this.coreWire.scale.setScalar(1+f.bass*0.24*motion+this.flash*0.18*motion);
    this.core.rotation.y=this.phase;
    this.coreWire.rotation.set(0.2,this.phase*0.7,0.3);
    this.core.material.emissiveIntensity=0.3+f.envelope*0.8+response.flow*.08+response.rise*.05;
    this.glow.material.uniforms.intensity.value=0.2+f.bass*0.35+this.flash*0.15*motion;
    const m=this.matrix;
    for(let i=0;i<BAND_COUNT;i++){
      const strength=f.bands[i],angle=i/BAND_COUNT*Math.PI*2-Math.PI/2;
      const length=0.025+strength*(radial?1.5:2.7);
      if(radial){
        m.position.set(Math.cos(angle)*(1.4+length/2),Math.sin(angle)*(1.4+length/2),0);
        m.rotation.set(0,0,angle-Math.PI/2);m.scale.set(0.071,length,0.1+f.bass*0.12);
      }else{
        m.position.set((i/(BAND_COUNT-1)-0.5)*7.4,-1.1+length/2,0);
        m.rotation.set(0,0,0);m.scale.set(0.085,length,0.16+f.bass*0.12);
      }
      m.updateMatrix();this.bars.setMatrixAt(i,m.matrix);
      if(radial)m.position.set(Math.cos(angle)*(1.4+length),Math.sin(angle)*(1.4+length),0.02);
      else m.position.y=-1.1+length;
      m.scale.y=0.018+f.treble*0.022;m.scale.z=0.12;m.updateMatrix();this.caps.setMatrixAt(i,m.matrix);
    }
    this.bars.instanceMatrix.needsUpdate=true;this.caps.instanceMatrix.needsUpdate=true;
    for(let layer=0;layer<this.traces.length;layer++){
      const trace=this.traces[layer],positions=trace.geometry.getAttribute('position');
      trace.material.opacity=layer===0?0.45+f.loudness*0.35:p.groove*r*(layer===1?0.45:0.23);
      for(let i=0;i<WAVEFORM_SIZE;i++){
        const sample=f.waveform[i],u=i/(WAVEFORM_SIZE-1),angle=u*Math.PI*2;
        if(radial){
          const radius=0.94+layer*0.16+sample*(0.35+this.config.sensitivity*0.2);
          positions.setXYZ(i,Math.cos(angle)*radius,Math.sin(angle)*radius,0.12+layer*0.04);
        }else positions.setXYZ(i,(u-0.5)*7.7,-1.38-layer*0.18+sample*0.85,0.2+layer*0.03);
      }
      positions.needsUpdate=true;
    }
    this.rails[0].visible=radial;this.rails[1].visible=radial;
    this.rails[1].material.opacity=0.08+p.peak*r*0.14;
    for(let i=0;i<3;i++){
      const orbit=this.orbits[i];orbit.material.opacity=p.lift*r*(0.18+i*0.05);
      orbit.visible=orbit.material.opacity>0.003;orbit.scale.setScalar(0.7+p.lift*0.3);
      orbit.rotation.z=(i-1)*0.5+this.phase*(i%2?-1:1);
    }
    const connectionPositions=this.connections.geometry.getAttribute('position');
    this.connections.material.opacity=p.lift*r*0.16;
    this.satellites.material.opacity=p.lift*r*(0.55+this.flash*0.2*motion);
    this.satellites.visible=p.lift*r>0.005;
    for(let i=0;i<=12;i++){
      const angle=(i%12)/12*Math.PI*2+this.phase*0.4;
      const radius=2.25+Math.sin(i*2.3)*0.25;
      const x=Math.cos(angle)*radius,y=Math.sin(angle)*radius*0.65,z=Math.sin(angle)*0.65;
      connectionPositions.setXYZ(i,x,y,z);
      if(i<12){m.position.set(x,y,z);m.rotation.set(0,0,0);m.scale.setScalar(0.5+p.lift+f.bands[(i*5)%BAND_COUNT]*2*motion);m.updateMatrix();this.satellites.setMatrixAt(i,m.matrix);}
    }
    connectionPositions.needsUpdate=true;this.satellites.instanceMatrix.needsUpdate=true;
    this.architecture.material.opacity=p.peak*r*0.4;
    this.architecture.visible=p.peak*r>0.005;
    for(let i=0;i<48;i++){
      const angle=i/48*Math.PI*2,rad=3.0+p.peak*0.15;
      m.position.set(Math.cos(angle)*rad,Math.sin(angle)*rad*0.8,-0.15);
      m.rotation.set(0,0,angle-Math.PI/2);m.scale.set(0.018,0.07+f.bands[Math.floor(i*BAND_COUNT/48)]*0.32,0.05);m.updateMatrix();this.architecture.setMatrixAt(i,m.matrix);
    }
    this.architecture.instanceMatrix.needsUpdate=true;
    this.detail.material.opacity=p.peak*r*(0.18+f.treble*0.5);
    this.detail.material.size=0.013+f.treble*0.018;
    this.renderer.render(this.scene,this.camera);
  }
  dispose(){
    this.renderer?.domElement.removeEventListener('webglcontextlost',this.contextLost);
    this.scene.traverse(object=>{
      const mesh=object as THREE.Mesh;
      mesh.geometry?.dispose();
      if(mesh.material){const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];for(const material of materials)material.dispose();}
      if(object instanceof THREE.InstancedMesh)object.dispose();
    });
    // Also dispose allocations if renderer initialization failed before they joined the scene.
    if(!this.composition.parent){
      for(const object of [this.bars,this.caps,this.core,this.coreWire,this.glow,...this.traces,...this.rails,...this.orbits,this.satellites,this.connections,this.architecture,this.detail]){
        object.geometry.dispose();object.material.dispose();
        if(object instanceof THREE.InstancedMesh)object.dispose();
      }
    }
    this.renderer?.dispose();this.renderer?.forceContextLoss();this.renderer?.domElement.remove();this.scene.clear();
  }
}
