/** Track only this engine's exclusive GL context. Stable Butterchurn has no full dispose API. */
export class GLResources {
 readonly gl:WebGL2RenderingContext;
 private allocations=new Map<object,(value:object)=>void>();
 private disposed=false;
 constructor(private native:WebGL2RenderingContext){
  const methods=new Map<PropertyKey,unknown>();
  const kinds=['Buffer','Texture','Framebuffer','Renderbuffer','Program','Shader','VertexArray','Sampler','TransformFeedback','Query'];
  const creators=new Set(kinds.map(k=>'create'+k)),deleters=new Set(kinds.map(k=>'delete'+k));
  this.gl=new Proxy(native,{get:(target,key)=>{
   if(methods.has(key))return methods.get(key);
   const value=Reflect.get(target,key,target);if(typeof value!=='function')return value;
   const name=String(key);
   const fn=(...args:unknown[])=>{
    const result=Reflect.apply(value,target,args);
    if(creators.has(name)&&result){const dispose=Reflect.get(target,name.replace('create','delete'),target);this.allocations.set(result,item=>Reflect.apply(dispose,target,[item]));}
    if(deleters.has(name)&&args[0])this.allocations.delete(args[0] as object);
    if(name==='linkProgram'&&!target.getProgramParameter(args[0] as WebGLProgram,target.LINK_STATUS))throw new Error('MilkDrop shader link failed: '+target.getProgramInfoLog(args[0] as WebGLProgram));
    return result;
   };
   methods.set(key,fn);return fn;
  }});
 }
 get count(){return this.allocations.size;}
 /** Programs retain attached shaders after deleteShader; other live resources remain reachable in the renderer. */
 sweep(root:unknown){
  const live=new Set<object>(),seen=new Set<object>();
  const visit=(value:unknown)=>{
   if(!value||typeof value!=='object'||value===this.gl||value===this.native||ArrayBuffer.isView(value)||seen.has(value))return;
   seen.add(value);if(this.allocations.has(value)){live.add(value);return;}
   if(value instanceof ArrayBuffer)return;
   for(const child of Object.values(value))visit(child);
  };
  visit(root);
  for(const [resource,remove] of this.allocations)if(!live.has(resource)){remove(resource);this.allocations.delete(resource);}
 }
 dispose(){if(this.disposed)return;this.disposed=true;for(const [resource,remove] of this.allocations)remove(resource);this.allocations.clear();this.native.getExtension('WEBGL_lose_context')?.loseContext();}
}
