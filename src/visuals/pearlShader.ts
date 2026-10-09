/** Analytic glass shells and curling color sheets. No ray marching, textures or bloom pass. */
export const pearlVertex=`
varying vec2 vUv;
void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}
`;
export const pearlFragment=`
precision highp float;
varying vec2 vUv;
uniform vec3 uColors[3];
uniform float uPhase;
uniform float uSeed;
uniform float uEnergy;
uniform float uMid;
uniform float uHigh;
uniform float uMotion;
uniform float uRichness;
uniform float uLayers;
mat2 rotate(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
void main(){
 vec2 q=(vUv-0.5)*3.0;
 float angle=atan(q.y,q.x);
 float breathe=0.007*uMotion*(0.35+uEnergy*0.65);
 float shellRadius=1.0+breathe*(sin(angle*3.0+uPhase*0.8)+0.4*sin(angle*2.0-uPhase));
 float radius=length(q),distance=radius-shellRadius;
 float aa=max(fwidth(distance),0.001);
 float mask=1.0-smoothstep(-aa,aa,distance);
 float halo=exp(-max(distance,0.0)*max(distance,0.0)/0.025)*0.12;
 if(distance>0.45)discard;
 float depth=max(-distance,0.0);
 vec2 p=q*rotate(uSeed*0.72);
 p+=0.10*vec2(sin(p.y*2.5+uPhase),cos(p.x*2.7-uPhase*0.7));
 float cloud1=0.5+0.5*sin(p.x*2.8+sin(p.y*2.4-uPhase*0.55)+uPhase*0.4);
 float cloud2=0.5+0.5*cos(p.y*2.5+sin(p.x*2.3+uPhase*0.35));
 cloud1=smoothstep(0.2,0.8,cloud1);cloud2=smoothstep(0.18,0.82,cloud2);
 vec3 cyan=mix(uColors[0],vec3(0.66,0.93,1.0),0.10);
 vec3 lavender=mix(uColors[1],vec3(0.77,0.66,1.0),0.18);
 vec3 blush=mix(uColors[2],vec3(1.0,0.69,0.78),0.15);
 vec3 warm=vec3(1.0,0.82,0.68);
 vec3 pigment=mix(mix(cyan,lavender,cloud1*0.8),blush,cloud2*0.48);
 // Transparent windows alternate with broad colored interior volumes.
 float volume=0.5+0.5*sin(p.x*3.0-p.y*2.0+uPhase*0.28);
 vec3 color=pigment*(0.10+volume*0.32);
 float detail=0.0;
 for(int i=0;i<3;i++){
  if(float(i)>=uLayers)break;
  float id=float(i);
  vec2 c=rotate(id*2.08+uSeed*0.42+(1.4+0.3*sin(uPhase*0.35))*(1.0-radius))*q;
  float curl=c.y+0.46*sin(c.x*2.9+uPhase*0.48+id*1.5)+0.16*sin(c.y*3.2-uPhase*0.3);
  float sheet=exp(-pow((curl-0.03)/0.23,2.0));
  float edge=exp(-pow((curl-0.19)/0.035,2.0));
  float fade=pow(max(0.0,1.0-radius*radius),0.45);
  float weight=i==0?1.0:(0.25+uRichness*0.75);
  vec3 tint=i==0?cyan:i==1?blush:lavender;
  color+=mix(tint,warm,0.16)*sheet*fade*0.48*weight;
  color+=mix(tint,vec3(0.88,0.95,1.0),0.45)*edge*fade*0.58*weight;
  detail+=sheet*weight*0.06;
 }
 vec2 core=q-vec2(0.06*sin(uPhase*0.4+uSeed),-0.08);
 float glow=exp(-dot(core,core)*25.0);
 color+=mix(warm,vec3(0.95,0.96,1.0),0.42)*glow*(0.65+uMid*0.28);
 // Thin shell, broad grazing crescent and slowly drifting high-frequency highlight.
 float rim=exp(-depth*85.0);
 float shoulder=exp(-pow((depth-0.055)/0.045,2.0));
 float drift=uPhase*0.24+uHigh*0.12*uMotion;
 float crescent=pow(0.5+0.5*cos(angle-2.0-drift),5.0);
 float opposite=pow(0.5+0.5*cos(angle+0.8-drift*0.4),9.0);
 vec3 shell=mix(pigment,vec3(0.93,0.95,1.0),0.57);
 color+=shell*rim*(0.9+0.55*crescent);
 color+=mix(cyan,warm,0.3)*shoulder*crescent*1.1;
 color+=warm*exp(-depth*22.0)*opposite*0.55;
 float innerCrescent=exp(-pow((depth-0.14)/0.04,2.0))*crescent;
 color+=mix(cyan,vec3(0.95,0.94,1.0),0.4)*innerCrescent*0.38;
 vec2 cap=q-vec2(-0.28,0.61);
 color+=mix(cyan,vec3(0.97,0.94,1.0),0.65)*exp(-cap.x*cap.x*7.0-cap.y*cap.y*65.0)*0.28;
 float alpha=clamp(0.74+volume*0.13+detail+glow*0.18+rim*0.35,0.0,0.96);
 vec3 outside=mix(cyan,blush,0.5+q.x*0.2)*0.55;
 gl_FragColor=vec4(clamp(mix(outside,color,mask),0.0,1.8),mix(halo,alpha,mask));
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}
`;
