import type { MusicalIntelligence } from '../analysis/intelligence';
import { MusicalResponse } from './musicalResponse';
import * as THREE from 'three';
import type { MusicFeatures } from '../analysis/contracts';
import type { ProgressionState } from './progression';
import { defaultVisualConfig,type VisualConfig,type VisualWorld } from './contracts';
import { palettes } from './palettes';
import { PearlMotion,PEARL_CENTERS,PEARL_RADIUS,pearlCameraHalfHeight } from './pearlMotion';
import { pearlVertex,pearlFragment } from './pearlShader';
/** Exactly three bounded shader quads; owned by the shared director's single loop. */
export class PearlWorld implements VisualWorld {
  private response=new MusicalResponse();
  private renderer?: THREE.WebGLRenderer;
  private scene=new THREE.Scene();
  private camera=new THREE.OrthographicCamera(-4,4,2.2,-2.2,0.1,20);
  private geometry=new THREE.PlaneGeometry(3,3);
  private motion=new PearlMotion();
  private config={...defaultVisualConfig};
  private pearls: THREE.Mesh<THREE.PlaneGeometry,THREE.ShaderMaterial>[];
  private lost=false;
  constructor(private failure: ()=>void){
    this.pearls=PEARL_CENTERS.map((center,i)=>{
      const material=new THREE.ShaderMaterial({vertexShader:pearlVertex,fragmentShader:pearlFragment,transparent:true,depthWrite:false,
        uniforms:{uColors:{value:palettes.aurora.map(hex=>new THREE.Color(hex))},uPhase:{value:this.motion.phases[i]},
          uSeed:{value:i*1.7},uEnergy:{value:0},uMid:{value:0},uHigh:{value:0},uMotion:{value:.65},uRichness:{value:.7},uLayers:{value:3}}});
      const mesh=new THREE.Mesh(this.geometry,material);mesh.position.set(center[0],center[1],0);mesh.scale.setScalar(PEARL_RADIUS);
      mesh.renderOrder=i;this.scene.add(mesh);return mesh;
    });
    this.camera.position.z=5;
  }
  initialize(container: HTMLElement){
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
    this.renderer.debug.onShaderError=()=>this.failure();
    this.renderer.setClearColor(0x0b0713,0);this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;
    this.renderer.domElement.setAttribute('aria-label','Music-reactive Pearl trio');
    this.renderer.domElement.addEventListener('webglcontextlost',this.contextLost);
    container.appendChild(this.renderer.domElement);this.configure(this.config);
  }
  private contextLost=(event: Event)=>{event.preventDefault();if(!this.lost){this.lost=true;this.failure();}};
  configure(config: VisualConfig){
    this.config={...config};
    for(const pearl of this.pearls){
      const u=pearl.material.uniforms;
      (u.uColors.value as THREE.Color[]).forEach((color,i)=>color.setHex(palettes[config.palette][i]));
      u.uMotion.value=config.reducedMotion?0:config.motion;
      u.uLayers.value=config.quality==='economy'?2:3;
    }
  }
  resize(width: number,height: number,pixelRatio: number){
    const aspect=width/Math.max(1,height),half=pearlCameraHalfHeight(aspect);
    this.camera.left=-half*aspect;this.camera.right=half*aspect;this.camera.top=half;this.camera.bottom=-half;this.camera.updateProjectionMatrix();
    this.renderer?.setPixelRatio(pixelRatio);this.renderer?.setSize(width,height,false);
  }
  update(features: Readonly<MusicFeatures>,progression: Readonly<ProgressionState>,dt: number,intelligence?:Readonly<MusicalIntelligence>|null){
    if(!this.renderer||this.lost)return;
    const response=this.response.update(intelligence,this.config,dt);
    this.motion.update(features,this.config,dt);
    for(let i=0;i<3;i++){
      const pearl=this.pearls[i],u=pearl.material.uniforms;
      pearl.position.set(PEARL_CENTERS[i][0]+this.motion.offsets[i*2],PEARL_CENTERS[i][1]+this.motion.offsets[i*2+1],0);
      pearl.scale.setScalar(PEARL_RADIUS*this.motion.radii[i]*(1+response.accent*.018+response.flow*.012));
      u.uPhase.value=this.motion.phases[i]+response.rise*.035;u.uEnergy.value=Math.min(1,this.motion.energy+response.flow*.08+response.accent*.035);
      u.uMid.value=i===1?this.motion.mids:0;u.uHigh.value=i===2?this.motion.highs:0;
      u.uRichness.value=this.config.richness*(0.65+progression.activity*0.35);
    }
    this.renderer.render(this.scene,this.camera);
  }
  dispose(){
    this.renderer?.domElement.removeEventListener('webglcontextlost',this.contextLost);
    this.geometry.dispose();for(const pearl of this.pearls)pearl.material.dispose();
    this.scene.clear();this.renderer?.dispose();this.renderer?.forceContextLoss();this.renderer?.domElement.remove();
  }
}
