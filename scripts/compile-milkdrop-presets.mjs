// Reproducible static compilation of the curated vendored MIT presets. No runtime eval.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const ids=["aurora","galaxy","liquid","kaleidoscope","tunnel","ribbons","starburst","dream","reaction","crystal"];
const encode=value=>{
 if(Array.isArray(value))return '['+value.map(encode).join(',')+']';
 if(value&&typeof value==='object'){
  const entries=Object.entries(value).filter(([key])=>!key.endsWith('_eqs_str')&&!['init_eqs','frame_eqs','pixel_eqs','point_eqs'].includes(key));
  for(const key of ['init_eqs','frame_eqs','pixel_eqs','point_eqs'])if(typeof value[key+'_str']==='string')entries.push([key,{equation:value[key+'_str']}]);
  return '{'+entries.map(([key,v])=>JSON.stringify(key)+':'+(v&&typeof v==='object'&&'equation' in v?'function(a){'+v.equation+'return a;}':encode(v))).join(',')+'}';
 }
 return JSON.stringify(value);
};
const hashes={};
const entries=ids.map(id=>{const raw=readFileSync(`src/visuals/milkdrop/vendor/${id}.json`,'utf8');hashes[id]=createHash('sha256').update(raw).digest('hex');return JSON.stringify(id)+':'+encode(JSON.parse(raw));});
writeFileSync('src/visuals/milkdrop/presets.generated.js','/* Generated from butterchurn-presets 2.4.7; MIT, Copyright (c) 2013-2018 Jordan Berg. See public/licenses and catalog for creators. */\nexport const presets={'+entries.join(',')+'};\n');
writeFileSync('src/visuals/milkdrop/vendor/SHA256.json',JSON.stringify(hashes,null,2)+'\n');
