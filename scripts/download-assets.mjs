import fs from 'node:fs/promises';
import path from 'node:path';
const input=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
await fs.mkdir('public/media',{recursive:true});
const results=[]; let cursor=0;
await Promise.all(Array.from({length:5},async()=>{while(cursor<input.length){const item=input[cursor++];const ref=new URL(item.reference);const name=item.path || `/media/${ref.pathname.split('/').pop()}${path.extname(ref.searchParams.get('name')||'image.jpg')}`;try{const target=`public${name}`;try{if((await fs.stat(target)).size>0){results.push({reference:item.reference,path:name});continue;}}catch{} const r=await fetch(item.url,{signal:AbortSignal.timeout(180000)});if(!r.ok)throw Error(`HTTP ${r.status}`);await fs.writeFile(target,Buffer.from(await r.arrayBuffer()));results.push({reference:item.reference,path:name});console.log('Saved '+name);}catch(e){results.push({reference:item.reference,error:e.message});console.log('Failed '+name+' '+e.message);}}}));
await fs.writeFile(process.argv[2]+'.results.json',JSON.stringify(results,null,2));
