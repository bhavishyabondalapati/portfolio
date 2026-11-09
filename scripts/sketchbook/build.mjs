// Builds public/sketchbook/sketchbook.html from ThreeUI's canonical sketchbook page (kept untouched in
// public/landing-pages/) with my words and my plates. All text comes from src/content.ts.
//   node --experimental-strip-types scripts/sketchbook/build.mjs
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { contact, coursework, earlierWork, featured, person, sketchbook } from "../../src/content.ts";

const ROOT = new URL("../..", import.meta.url).pathname;
const SRC = join(ROOT, "scripts/sketchbook/source");   // ThreeUI's canonical page (hash e0330548b1ac), kept out of public/
const OUT = join(ROOT, "public/sketchbook");
mkdirSync(join(OUT, "decor"), { recursive: true });
let s = readFileSync(join(SRC, "meng-to-sketchbook.html"), "utf8");
const rep = (a, b) => {
  if (!s.includes(a)) throw new Error("build target not found: " + a.slice(0, 80));
  s = s.replace(a, () => b);
};
const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ---- the plates: title, field, short result label and GitHub link, from content.ts
const lookup = (slug) => {
  const f = featured.find((p) => p.slug === slug);
  if (f) return { title: f.name, place: f.field, href: f.links[0].href };
  const c = [...coursework, ...earlierWork].find((p) => p.slug === slug);
  if (!c) throw new Error("unknown plate " + slug);
  const code = c.links.find((l) => l.href.includes("github.com")) ?? c.links[0];
  const live = c.links.find((l) => /live/i.test(l.label));
  return { title: c.name, place: c.course ?? "Coursework", href: code.href, ...(live ? { live: live.href } : {}) };
};
const plates = sketchbook.plates
  .filter((p) => existsSync(join(OUT, "pages", p.slug + ".webp")))
  .map((p) => ({ file: p.slug + ".webp", result: p.label, ...lookup(p.slug) }));
const ghRaw = (href) => href;
rep(/const PAGES=\[[\s\S]*?\];\nPAGES\.forEach/.exec(s)[0], `const PAGES=${JSON.stringify(plates, null, 2)};\nPAGES.forEach`);
rep("const DIR='meng-to-sketchbook/';", "const DIR='pages/';");
rep("LAND=6;", "LAND=0;");   // the book opens on my first plate

// ---- decoration and fonts stay ThreeUI's (MIT): copied once, referenced from decor/
for (const f of ["bg-wash.jpg", "bloom.png", "botany-left.png", "botany-right.png", "divider.png", "instrument-serif.woff2", "instrument-serif-italic.woff2", "newsreader.woff2"]) {
  copyFileSync(join(SRC, "decor", f), join(OUT, "decor", f));
}
s = s.replaceAll("meng-to-sketchbook/", "decor/");

// ---- my words
rep("<title>Meng To</title>", `<title>${esc(person.name)}: Sketchbook</title>`);
rep('<meta name="description" content="designer, creator, AI educator — Singapore">', `<meta name="description" content="${esc(person.tagline)}">`);
rep('<a class="name" href="#">Meng To</a>', `<a class="name" href="#">${esc(person.name)}</a>`);
rep('<a href="#plates">Journal</a>', '<a href="#plates">Projects</a>');
const github = contact.links.find((l) => l.label === "GitHub").href;
const linkedin = contact.links.find((l) => l.label === "LinkedIn").href;
const ghIcon = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2 0-.4-.5-1.6.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3"/></svg>';
s = s.replace(/<a href="#" class="icon-btn" aria-label="X">[\s\S]*?<\/a>/, () => `<a href="${github}" class="icon-btn" aria-label="GitHub" target="_blank" rel="noopener noreferrer">${ghIcon}</a>`);
s = s.replace('<a href="#" class="icon-btn" aria-label="LinkedIn">', () => `<a href="${linkedin}" class="icon-btn" aria-label="LinkedIn" target="_blank" rel="noopener noreferrer">`);
s = s.replace(/\s*<a href="#" class="icon-btn" aria-label="Instagram">[\s\S]*?<\/a>/, "");
rep('<a href="#contact" class="icon-btn" aria-label="Email">', `<a href="mailto:${contact.email}" target="_top" class="icon-btn" aria-label="Email">`);
rep("Designer / Creator / AI Educator / Founder @ Singapore", esc(sketchbook.kicker));
rep("Drag the page to turn · Drag the glass across it", esc(sketchbook.hint));
rep('<p class="section-label">Plates</p>', `<p class="section-label">${esc(sketchbook.indexLabel)}</p>`);
s = s.replace(/<p class="bio">[\s\S]*?<\/p>/, () => `<p class="bio">${esc(sketchbook.about)}</p>`);
s = s.replace(/<p class="foot" id="contact">[\s\S]*?<\/p>/, () =>
  `<p class="foot" id="contact">${esc(person.location)} · <a href="mailto:${contact.email}" target="_top" class="bio-link">${esc(contact.email)}</a> · <a href="/" target="_top" class="bio-link">Back to the plain site</a></p>`);
// credits: the page and its decoration are ThreeUI's (MIT); the plates are mine
rep('</main>', `<p class="credit">The sketchbook page and its paper, ferns and flowers are ThreeUI's sketchbook (Copyright (c) 2026 Meng To, <a class="bio-link" href="https://github.com/MengTo/threeui" target="_blank" rel="noopener noreferrer">MIT licence</a>). Set in Instrument Serif and Newsreader (SIL Open Font License). Every drawing is made from my own project figures or in code; the full notices are in <a class="bio-link" href="https://github.com/bhavishyabondalapati/portfolio/blob/main/THIRD_PARTY_NOTICES.md" target="_blank" rel="noopener noreferrer">THIRD_PARTY_NOTICES.md</a>.</p>
</main>`);
rep(".foot{font-size", `.credit{max-width:62ch;margin:-18px auto 0;padding:0 24px 56px;text-align:center;font-size:12.5px;line-height:1.6;color:var(--ink-faint)}\n.foot{font-size`);

// ---- captions: title, then the key result on its own line, then the repo
rep("capOut=el('p','sb-caption live');capOut.textContent=PAGES[turn.from].title;", "capOut=el('p','sb-caption live');fill(capOut,turn.from);");
rep("capIn=el('p','sb-caption live');capIn.textContent=PAGES[turn.to].title;", "capIn=el('p','sb-caption live');fill(capIn,turn.to);");
rep("const p=el('p','sb-caption');p.textContent=PAGES[idx].title;", "const p=el('p','sb-caption');fill(p,idx,true);");
rep("function caption(){", `function fill(p,i,link){
  p.textContent='';
  const t=el('span','ttl');t.textContent=PAGES[i].title;p.appendChild(t);
  const r=el('span','res');r.textContent=PAGES[i].result;p.appendChild(r);
  if(link&&PAGES[i].href){
    const row=el('span','sb-links');
    const a=el('a','sb-gh');a.href=PAGES[i].href;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Code on GitHub ↗';row.appendChild(a);
    if(PAGES[i].live){const b=el('a','sb-gh');b.href=PAGES[i].live;b.target='_blank';b.rel='noopener noreferrer';b.textContent='Live site ↗';row.appendChild(b);}
    p.appendChild(row);
  }
}
function caption(){`);

// ---- the index: title with its result, field, and the repo link
rep(`  b.querySelector('.t').textContent=p.title;
  b.querySelector('.p').textContent=p.place;`, `  const tt=b.querySelector('.t');tt.textContent=p.title;
  const rs=el('span','res');rs.textContent=p.result;tt.appendChild(rs);
  b.querySelector('.p').textContent=p.place;`);
rep("li.appendChild(b);plateList.appendChild(li);", `li.appendChild(b);
  const lk=el('span','plate-links');
  const g=el('a','plate-gh');g.href=p.href;g.target='_blank';g.rel='noopener noreferrer';g.textContent='Code on GitHub ↗';g.setAttribute('aria-label',p.title+': code on GitHub (opens in a new tab)');
  lk.appendChild(g);
  if(p.live){const v=el('a','plate-gh');v.href=p.live;v.target='_blank';v.rel='noopener noreferrer';v.textContent='Live site ↗';v.setAttribute('aria-label',p.title+': live site (opens in a new tab)');lk.appendChild(v);}
  li.appendChild(lk);plateList.appendChild(li);`);
rep(".plate .p{", `.sb-caption{display:flex;flex-direction:column;align-items:center;gap:5px}
.sb-caption .res{font-size:12.5px;letter-spacing:.01em;text-transform:none;color:var(--ink-faint);max-width:min(560px,86vw);text-align:center;line-height:1.4}
.sb-gh{font-size:11px;letter-spacing:.14em;color:var(--earth);text-decoration:underline;text-decoration-color:rgba(43,39,33,.28);text-underline-offset:4px;pointer-events:auto;position:relative;z-index:80}
.sb-gh:hover{text-decoration-color:var(--earth)}
.plate-list li{position:relative}
.plate .t .res{display:block;margin-top:4px;font-family:inherit;font-size:13.5px;line-height:1.45;color:var(--ink-faint);letter-spacing:0}
.plate-links{position:absolute;right:4px;bottom:14px;display:flex;gap:20px}
.sb-links{display:flex;gap:20px;justify-content:center}
.plate-gh{font-size:11.5px;letter-spacing:.1em;color:var(--earth);text-decoration:underline;text-decoration-color:rgba(43,39,33,.25);text-underline-offset:4px}
.plate-gh:hover{text-decoration-color:var(--earth)}
.plate{padding-bottom:40px}
.plate .p{`);

// ---- the arrows sit inside the stage that starts a page-drag on pointerdown and captures the pointer, which sends the
//      click to the stage instead of the button; the arrows now keep their own pointerdown, so every click works
rep("document.getElementById('sbLeft').onclick=()=>step('prev');", "['sbLeft','sbRight','zOut','zIn','loupeBtn'].forEach(id=>{const b=document.getElementById(id);if(b)b.addEventListener('pointerdown',e=>e.stopPropagation());});\ndocument.getElementById('sbLeft').onclick=()=>step('prev');");

// ---- layout: a bigger book, higher up, and a glass that rests clear of the notes
rep("--earth:#9a6a3e;", "--earth:#7a4f2c;");
rep("lx=b.x+b.w*0.88; ly=b.y+b.h*0.855;", "lx=b.x+b.w*0.93; ly=b.y+b.h*0.94;");
// ThreeUI's typography recipe re-declares these two colours (at .58 and .36), so mine need more specificity: AA contrast for small grey text
rep("</style>", `html:root{--ink-soft:rgba(43,39,33,.82);--ink-faint:rgba(43,39,33,.72)}\nhtml{overflow-x:clip}\n@media (max-width:640px){.plate{grid-template-columns:2.2em minmax(0,1fr);gap:4px 10px;padding:14px 2px 44px}.plate .p{grid-column:2;text-align:left;margin-top:2px}.plate .t{font-size:21px}.plate .t .res{font-size:14px}.sb-links{flex-wrap:wrap;gap:6px 20px}}
@media (min-width:641px){
  .hero{align-content:start;padding-top:clamp(88px,9.5svh,112px)}
  .hero-kicker{margin:clamp(8px,1.2svh,14px) 0 clamp(6px,1svh,12px)}
  .sb-3d{max-width:min(1280px,calc(100vw - 96px))}
  .sb-stage{margin-top:-8vw}
  .sb-captions{margin-top:-8.5vw}
}
</style>`);
writeFileSync(join(OUT, "sketchbook.html"), s);
console.log(`wrote public/sketchbook/sketchbook.html with ${plates.length} plate(s): ${plates.map((p) => p.title).join(", ")}`);
