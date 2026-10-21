import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const raw=JSON.parse(await fs.readFile('src/data/notion.json','utf8'));
const walk=async dir=>(await Promise.all((await fs.readdir(dir,{withFileTypes:true})).map(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]))).flat();
const files=await walk('dist');const htmlFiles=files.filter(f=>f.endsWith('.html'));const failures=[];
for(const file of htmlFiles){const html=await fs.readFile(file,'utf8');
  if(/notion-file-block:\/\/|data-migration-slot|<toggle>|<columns>/.test(html))failures.push(`${file}: unconverted markup`);
  for(const m of html.matchAll(/(?:href|src)="(\/[^"#?]*)(?:[?#][^"]*)?"/g)){let p=decodeURIComponent(m[1]);const target=path.join('dist',p,p.endsWith('/')?'index.html':'');try{await fs.access(target);}catch{failures.push(`${file}: missing ${p}`);}}
}
assert.equal(htmlFiles.length,raw.filter(p=>!p.hidden).length+3,'Every visible source page, home, archive and 404 must be built');
const refs=[...new Set(raw.flatMap(p=>[...p.content.matchAll(/notion-file-block:\/\/[^"\s<>]+/g)].map(m=>m[0])))];
for(const ref of refs){const u=new URL(ref);const ext=u.searchParams.get('name').match(/\.[a-z0-9]+$/i)[0];const f=`public/media/${u.pathname.split('/').pop()}${ext}`;try{assert((await fs.stat(f)).size>0);}catch{failures.push(`Missing source media: ${f}`);}}
const expectedCode=raw.reduce((n,p)=>n+[...p.content.matchAll(/^([ \t]*)```[^\n]*\n[\s\S]*?^\1```/gm)].length,0);
let actualCode=0;for(const f of htmlFiles.filter(f=>f.includes(`${path.sep}work${path.sep}`))){const h=await fs.readFile(f,'utf8');actualCode+=(h.match(/<pre>/g)||[]).length;}
assert.equal(actualCode,expectedCode,'Every source code block must survive conversion');
const decode=s=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');
for(const f of htmlFiles.filter(f=>f.includes(`${path.sep}work${path.sep}`))){
  const h=await fs.readFile(f,'utf8');const id=h.match(/data-source-id="([^"]+)"/)?.[1];const source=raw.find(p=>p.id===id);assert(source,`${f}: source id missing`);
  const expected=[...source.content.matchAll(/^([ \t]*)```[^\n]*\n([\s\S]*?)^\1```/gm)].map(m=>m[2].split('\n').map(l=>l.startsWith(m[1])?l.slice(m[1].length):l).join('\n').trim());
  const actual=[...h.matchAll(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/g)].map(m=>decode(m[1].replace(/<\/?span[^>]*>/g,'')).trim());assert.deepEqual(actual,expected,`${f}: code text changed`);
}
for(const p of raw){for(const m of p.content.matchAll(/<(?:page|mention) url="([^"]+)"/g)){const id=m[1].split('/').pop().replaceAll('-','');assert(raw.some(p=>p.id===id),`Unfetched descendant: ${m[1]}`);}}
for(const f of files.filter(f=>f.includes(`${path.sep}media${path.sep}`))){assert((await fs.stat(f)).size<25*1024*1024,`${f}: exceeds static asset size budget`);}
assert.equal(failures.length,0,failures.join('\n'));
console.log(`Verified ${raw.length} source documents, ${htmlFiles.length} routes, ${refs.length} local media files, ${actualCode} code blocks and all internal links.`);
