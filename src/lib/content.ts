import raw from '../data/notion.json';
import { projects, extraSlugs } from '../data/projects';
import MarkdownIt from 'markdown-it';
import sanitizeHtml from 'sanitize-html';
import resolvedLinks from '../data/resolved-links.json';
import { createHighlighter } from 'shiki';

export const idOf = (url: string) => url.split(/[?#]/)[0].split('/').pop()!.replaceAll('-','');
export const plain = (value: string) => value.replace(/<[^>]*>/g,'').replace(/\\([~.[\]*])/g,'$1').trim();
// Notion titles end with "(2023.09.20)" or "(2020.09~2023.05)"; drop the date.
const cleanTitle = (value: string) => plain(value).replace(/\s*\(\s*\d{4}\.\d{2}[\d.\s~]*\)$/,'');
// Pages flagged "hidden" in notion.json are kept in the data but not built or linked.
export const pages = raw.filter(p => !('hidden' in p && p.hidden)).map(p => ({ ...p, title: cleanTitle(p.title), slug: projects.find(x=>x.id===p.id)?.slug || extraSlugs[p.id] || p.id }));
export const urlFor = (id: string) => `/work/${pages.find(p=>p.id===idOf(id))?.slug || idOf(id)}/`;
export const mediaPath = (ref: string) => {
  const u = new URL(ref.replaceAll('&amp;','&'));
  const ext = (u.searchParams.get('name') || '').match(/\.[a-z0-9]+$/i)?.[0] || '.jpg';
  return `/media/${u.pathname.split('/').pop()}${ext}`;
};
const md = new MarkdownIt({ html: true, linkify: true, breaks: false }).disable('code');
const escape = (s: string) => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
// Heading text is taken from rendered HTML, so undo its entities before Astro escapes it again.
const unescapeHtml = (s: string) => s.replace(/&(amp|lt|gt|quot|#39);/g,(_,e)=>({amp:'&',lt:'<',gt:'>',quot:'"','#39':"'"} as Record<string,string>)[e]);
const safeUrl = (s: string) => /^(https?:\/\/|\/[^/]|mailto:|tel:|#)/.test(s) ? s : '#';
// Syntax colors for code blocks; the block background stays the site's own.
const highlighter = await createHighlighter({ themes: ['dark-plus'], langs: ['csharp', 'markdown'] });
const LANGS: Record<string,string> = { cs: 'csharp', csharp: 'csharp', 'c#': 'csharp', markdown: 'markdown', md: 'markdown' };
const highlight = (code: string, lang: string) => {
  const id = LANGS[lang.toLowerCase()];
  if (!id) return escape(code);
  return highlighter.codeToTokensBase(code, { lang: id, theme: 'dark-plus' })
    .map(line => line.map(t => `<span style="color:${t.color}${t.fontStyle && t.fontStyle & 1 ? ';font-style:italic' : ''}">${escape(t.content)}</span>`).join(''))
    .join('\n');
};

export function renderContent(source: string) {
  const slots: string[] = [];
  const slot = (html: string) => { const i=slots.push(html)-1; return `\n\n<div data-migration-slot="${i}"></div>\n\n`; };
  // Protect source code before translating Notion markup, including indented fences.
  let s = source.replace(/^([ \t]*)```([^\n]*)\n([\s\S]*?)^\1```/gm, (_,indent,lang,code) => slot(`<pre><code class="language-${escape(lang.trim())}">${highlight(code.split('\n').map((l:string)=>l.startsWith(indent)?l.slice(indent.length):l).join('\n'),lang.trim())}</code></pre>`));
  s = s.replace(/<(image|video|bookmark|embed|file)\s+source="([^"]+)"[^>]*?(?:\/>|>([\s\S]*?)<\/\1>)/g, (_,tag,src,caption='') => {
    src=src.replaceAll('&amp;','&');
    const local=src.startsWith('notion-file-block://')?mediaPath(src):safeUrl(src);
    const label=plain(caption); const cap=label?`<figcaption>${md.renderInline(caption.trim())}</figcaption>`:'';
    if(tag==='image') return slot(`<figure><a href="${escape(local)}" target="_blank" rel="noopener"><img src="${escape(local)}" alt="${escape(label||'프로젝트 이미지')}" loading="lazy" decoding="async" /></a>${cap}</figure>`);
    if(tag==='video') {
      if(src.startsWith('notion-file-block://')) return slot(`<figure><video controls playsinline preload="none" poster="${escape(local.replace(/\.mp4$/,'.poster.jpg'))}" aria-label="${escape(label||'프로젝트 시연 영상')}"><source src="${escape(local)}" type="video/mp4" /></video>${cap}</figure>`);
      let youtube=''; try { const u=new URL(src); if(u.hostname==='youtu.be')youtube=u.pathname.slice(1); else if(['www.youtube.com','youtube.com'].includes(u.hostname))youtube=u.searchParams.get('v')||''; }catch{}
      if(/^[\w-]{11}$/.test(youtube)) { const time=new URL(src).searchParams.get('t'); const start=time && /^\d+$/.test(time)?`?start=${time}`:''; return slot(`<figure><iframe class="youtube" loading="lazy" title="${escape(label||'프로젝트 YouTube 영상')}" src="https://www.youtube-nocookie.com/embed/${youtube}${start}" allow="fullscreen; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>${cap}</figure>`); }
    }
    return slot(`<a class="external-block" href="${escape(local)}" target="_blank" rel="noopener noreferrer"><span>${escape(label || (tag==='embed'?'외부 콘텐츠 열기':new URL(src).hostname))}</span><small>${escape(src)}</small><span aria-hidden="true">↗</span></a>`);
  });
  s=s.replace(/<page url="([^"]+)"[^>]*>([\s\S]*?)<\/page>/g,(_,url,title)=>!pages.some(p=>p.id===idOf(url))?'':slot(`<a class="page-link" href="${urlFor(url)}"><span>${escape(pages.find(p=>p.id===idOf(url))?.title||cleanTitle(title))}</span><span aria-hidden="true">↗</span></a>`));
  s=s.replace(/<mention url="([^"]+)"[^>]*\/>/g,(_,url)=>`<a href="${urlFor(url)}">${escape(pages.find(p=>p.id===idOf(url))?.title||'연결 문서')}</a>`);
  // Notion's "next page" aliases point at block ids we can't resolve; drop them with their label.
  s=s.replace(/(?:^[ \t]*---\s*)?(?:<p>\s*)?<b>\\\[ 다음 페이지 \\\]<\/b>(?:\s*<\/p>)?\s*<unknown url="[^"]+" alt="alias"\s*\/>/gm,'');
  s=s.replace(/<unknown url="([^"]+)" alt="[^"]+"\s*\/>/g,(_,url)=>{
    const resolved=resolvedLinks[url.split('#')[1] as keyof typeof resolvedLinks];
    if(resolved)return slot(`<a class="external-block" href="${resolved.url}" target="_blank" rel="noopener"><span>${resolved.title}</span><small>${resolved.url}</small><span aria-hidden="true">↗</span></a>`);
    return '';
  });
  s=s.replace(/<toggle>\s*([^\n]+)\n/g,(_,title)=>`\n\n<details>\n<summary>${md.renderInline(title.trim())}</summary>\n\n`).replace(/<\/toggle>/g,'\n\n</details>\n\n');
  // Keep Notion's column ratios; drop empty spacer columns.
  s=s.replace(/<column[^>]*>(?:\s|<p\s*\/>)*<\/column>/g,'');
  s=s.replace(/<columns>/g,'\n\n<div class="content-columns">\n\n').replace(/<\/columns>/g,'\n\n</div>\n\n').replace(/<column(?: ratio="([\d.]+)")?[^>]*>/g,(_,ratio)=>`\n\n<div class="content-column"${ratio?` style="flex:${ratio} 1 0"`:''}>\n\n`).replace(/<\/column>/g,'\n\n</div>\n\n');
  s=s.replace(/<callout[^>]*>/g,'\n\n<aside class="callout">\n\n').replace(/<\/callout>/g,'\n\n</aside>\n\n');
  s=s.replace(/<table[^>]*>/g,'\n\n<div class="table-scroll" tabindex="0" role="region" aria-label="데이터 표"><table>\n').replace(/<\/table>/g,'</table></div>\n\n');
  s=s.replace(/<p\s*\/>/g,'\n\n').replace(/<p[^>]*>\s*\n/g,'\n\n').replace(/\n\s*<\/p>/g,'\n\n');
  s=s.replace(/<(\/?(?:ul|ol|li))([^>]*)>/g,'\n\n<$1$2>\n\n');
  s=s.replace(/<span color="([^"]+)">/g,'<span class="notion-$1">');
  let html=md.render(s);
  html=html.replace(/<div data-migration-slot="(\d+)"><\/div>/g,(_,i)=>slots[Number(i)]);
  html=sanitizeHtml(html,{
    allowedTags:[...sanitizeHtml.defaults.allowedTags,'img','video','source','iframe','details','summary','figure','figcaption','aside','span'],
    allowedAttributes:{...sanitizeHtml.defaults.allowedAttributes,'*':['class','id','aria-label','role','tabindex'],div:['style'],span:['style'],a:['href','target','rel'],img:['src','alt','loading','decoding'],video:['controls','playsinline','preload','poster','aria-label'],source:['src','type'],iframe:['src','title','loading','allow','allowfullscreen','referrerpolicy'],ol:['start'],td:['colspan','rowspan']},
    allowedIframeHostnames:['www.youtube-nocookie.com'],
    allowedStyles:{div:{flex:[/^[\d.]+ 1 0$/]},span:{color:[/^#[0-9a-f]{3,8}$/i],'font-style':[/^italic$/]}},
    transformTags:{a:(tagName,attribs)=>({tagName,attribs:{...attribs,...(attribs.target==='_blank'?{rel:'noopener noreferrer'}:{})}})}
  });
  const headings:{id:string;text:string;level:number}[]=[];
  html=html.replace(/<h([2-4])>([\s\S]*?)<\/h\1>/g,(_,level,text)=>{const id=`section-${headings.length+1}`;headings.push({id,text:unescapeHtml(plain(text)),level:Number(level)});return `<h${level} id="${id}">${text}</h${level}>`;});
  return {html,headings};
}
