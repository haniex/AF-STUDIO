// =====================================================================
// AF AI 3.1 — safe rendering of assistant answers.
// • fenced code blocks with a tiny tokenizing highlighter (every token is escaped)
// • GitHub-style tables, blockquotes; everything else goes through ui.md()
// • code is NEVER executed: no eval / Function / innerHTML of model output
// =====================================================================
import { esc, md, raw } from './ui.js';

// ---------------------------------------------------------------- languages & file extensions
const ALIAS = {
  js: 'js', javascript: 'js', jsx: 'js', mjs: 'js', cjs: 'js', node: 'js',
  ts: 'ts', typescript: 'ts', tsx: 'ts',
  html: 'html', htm: 'html', xml: 'html', svg: 'html', vue: 'html',
  css: 'css', scss: 'css', sass: 'css', less: 'css',
  py: 'py', python: 'py', python3: 'py',
  sql: 'sql', postgres: 'sql', postgresql: 'sql', mysql: 'sql', sqlite: 'sql', plpgsql: 'sql',
  json: 'json', jsonc: 'json',
  md: 'md', markdown: 'md',
  bash: 'sh', sh: 'sh', shell: 'sh', zsh: 'sh', console: 'sh', powershell: 'sh', ps1: 'sh',
  txt: 'txt', text: 'txt', plain: 'txt', plaintext: 'txt',
};
/** Allowlisted download extensions (anything else → .txt) */
export const EXT_ALLOW = ['html', 'css', 'js', 'ts', 'py', 'sql', 'json', 'md', 'txt'];
export const normLang = (l) => ALIAS[String(l || '').toLowerCase().trim()] || (String(l || '').trim() ? 'other' : 'txt');
export function extFor(lang) {
  const n = normLang(lang);
  return EXT_ALLOW.includes(n) ? n : 'txt';
}
const LABEL = { js: 'JavaScript', ts: 'TypeScript', html: 'HTML', css: 'CSS', py: 'Python', sql: 'SQL', json: 'JSON', md: 'Markdown', sh: 'Shell', txt: 'Text' };
export const langLabel = (l) => LABEL[normLang(l)] || String(l || 'Code').slice(0, 20);

/** Safe file name: af-ai-<slug>-<yyyy-mm-dd>.<ext> */
export function safeFileName(base, ext) {
  const e = EXT_ALLOW.includes(ext) ? ext : 'txt';
  const slug = String(base || '').normalize('NFKD').toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'result';
  return `af-ai-${slug}-${new Date().toISOString().slice(0, 10)}.${e}`;
}

// ---------------------------------------------------------------- highlighter
const KW = {
  js: 'await async break case catch class const continue default delete do else export extends finally for from function if import in instanceof let new of return static super switch this throw try typeof var void while yield null undefined true false',
  py: 'and as assert async await break class continue def del elif else except False finally for from global if import in is lambda None nonlocal not or pass raise return True try while with yield self print',
  sql: 'select from where and or not insert into values update set delete create table alter drop index primary key foreign references join left right inner outer on group by order having limit offset as distinct union all case when then else end is null like in exists between returning with function returns language begin commit rollback grant revoke policy trigger security definer default constraint check unique',
  css: '',
  sh: 'if then else fi for do done while case esac function in echo export cd ls sudo npm npx node git curl',
};
KW.ts = KW.js + ' interface type enum implements private public protected readonly declare namespace abstract as any number string boolean unknown never';
const RULES = {
  js: [['c', /\/\/[^\n]*|\/\*[\s\S]*?\*\//y], ['s', /`(?:\\[\s\S]|[^`\\])*`|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/y], ['n', /\b\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?\b|\b0x[\da-f]+\b/iy], ['w', /[A-Za-z_$][\w$]*/y]],
  py: [['c', /#[^\n]*/y], ['s', /"""[\s\S]*?"""|'''[\s\S]*?'''|[rbuf]*"(?:\\.|[^"\\\n])*"|[rbuf]*'(?:\\.|[^'\\\n])*'/iy], ['n', /\b\d[\d_]*(?:\.\d+)?\b/y], ['w', /[A-Za-z_]\w*/y]],
  sql: [['c', /--[^\n]*|\/\*[\s\S]*?\*\//y], ['s', /'(?:''|[^'])*'|"(?:[^"])*"|\$\$[\s\S]*?\$\$/y], ['n', /\b\d+(?:\.\d+)?\b/y], ['w', /[A-Za-z_][\w$]*/y]],
  css: [['c', /\/\*[\s\S]*?\*\//y], ['s', /"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/y], ['n', /#[\da-f]{3,8}\b|-?\b\d+(?:\.\d+)?(?:px|rem|em|%|vh|vw|dvh|s|ms|deg|fr)?\b/iy], ['k', /@[\w-]+/y], ['p', /[\w-]+(?=\s*:)/y], ['w', /[A-Za-z_-][\w-]*/y]],
  json: [['p', /"(?:\\.|[^"\\\n])*"(?=\s*:)/y], ['s', /"(?:\\.|[^"\\\n])*"/y], ['n', /-?\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b/iy], ['k', /\b(?:true|false|null)\b/y]],
  sh: [['c', /#[^\n]*/y], ['s', /"(?:\\.|[^"\\])*"|'[^']*'/y], ['v', /\$\{?[\w@#?*!-]+\}?/y], ['n', /\b\d+\b/y], ['w', /[A-Za-z_][\w-]*/y]],
  html: [['c', /<!--[\s\S]*?-->/y], ['t', /<\/?[A-Za-z][\w:-]*/y], ['a', /\s[\w:@.-]+(?==)/y], ['s', /"[^"]*"|'[^']*'/y], ['t', /\/?>/y]],
};
RULES.ts = RULES.js;
const CLS = { c: 'tk-c', s: 'tk-s', n: 'tk-n', k: 'tk-k', p: 'tk-p', t: 'tk-t', a: 'tk-a', v: 'tk-v' };

/** → escaped HTML string with <span class="tk-*"> tokens. Pure & safe. */
export function highlight(code, lang) {
  const l = normLang(lang);
  const src = String(code ?? '');
  const rules = RULES[l];
  if (!rules) return esc(src);
  const kw = new Set((KW[l] || '').split(' ').filter(Boolean));
  const ci = l === 'sql';
  let i = 0; let out = ''; let plain = '';
  const flush = () => { if (plain) { out += esc(plain); plain = ''; } };
  while (i < src.length) {
    let hit = null;
    for (const [type, re] of rules) {
      re.lastIndex = i;
      const m = re.exec(src);
      if (m && m.index === i && m[0].length) { hit = [type, m[0]]; break; }
    }
    if (!hit) { plain += src[i]; i++; continue; }
    const [type, text] = hit;
    if (type === 'w') {
      const isKw = kw.has(ci ? text.toLowerCase() : text);
      if (isKw) { flush(); out += `<span class="tk-k">${esc(text)}</span>`; } else plain += text;
    } else { flush(); out += `<span class="${CLS[type]}">${esc(text)}</span>`; }
    i += text.length;
  }
  flush();
  return out;
}

// ---------------------------------------------------------------- answer parsing
/** Split an answer into text / code segments. An unterminated fence (truncated answer) is kept as code. */
export function splitBlocks(text) {
  const src = String(text ?? '').replace(/\r\n?/g, '\n');
  const lines = src.split('\n');
  const out = []; let buf = []; let code = null;
  const pushText = () => { if (buf.length) { out.push({ type: 'text', text: buf.join('\n') }); buf = []; } };
  for (const line of lines) {
    const f = line.match(/^\s{0,3}(```+|~~~+)\s*([\w#+.-]*)[^\n]*$/);
    if (!code && f) { pushText(); code = { fence: f[1], lang: f[2] || '', lines: [] }; continue; }
    if (code && f && f[1][0] === code.fence[0] && f[1].length >= code.fence.length && !f[2]) {
      out.push({ type: 'code', lang: code.lang, code: code.lines.join('\n') }); code = null; continue;
    }
    if (code) code.lines.push(line); else buf.push(line);
  }
  if (code) out.push({ type: 'code', lang: code.lang, code: code.lines.join('\n'), open: true });
  pushText();
  return out;
}

const isRow = (l) => /^\s*\|.*\|\s*$/.test(l);
const isSep = (l) => /-/.test(l) && /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(l);
const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
const inlineMd = (s) => String(md(s)).replace(/^<p>|<\/p>$/g, '');

/** Text segment → safe HTML (tables + blockquotes here, the rest via md()). */
function renderText(text) {
  const lines = text.split('\n'); const out = []; let buf = [];
  const flush = () => { if (buf.length) { out.push(String(md(buf.join('\n')))); buf = []; } };
  for (let i = 0; i < lines.length; i++) {
    if (isRow(lines[i]) && i + 1 < lines.length && isSep(lines[i + 1])) {
      flush();
      const head = cells(lines[i]); i += 2; const rows = [];
      while (i < lines.length && isRow(lines[i])) { rows.push(cells(lines[i])); i++; }
      i--;
      out.push(`<div class="ax-table"><table><thead><tr>${head.map((h) => `<th>${inlineMd(h)}</th>`).join('')}</tr></thead><tbody>${
        rows.map((r) => `<tr>${head.map((_, k) => `<td>${inlineMd(r[k] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    const q = lines[i].match(/^\s*>\s?(.*)$/);
    if (q) {
      flush(); const ql = [q[1]];
      while (i + 1 < lines.length && /^\s*>/.test(lines[i + 1])) { i++; ql.push(lines[i].replace(/^\s*>\s?/, '')); }
      out.push(`<blockquote>${String(md(ql.join('\n')))}</blockquote>`);
      continue;
    }
    if (/^\s*(---|\*\*\*|___)\s*$/.test(lines[i])) { flush(); out.push('<hr />'); continue; }
    buf.push(lines[i]);
  }
  flush();
  return out.join('');
}

/**
 * Render a whole answer. Returns { html: Safe, blocks: [{lang, code}] }.
 * Code blocks get data-code="<index>" so the view can attach Copy / Download.
 */
export function renderAnswer(text, { t = (k) => k } = {}) {
  const blocks = [];
  const html = splitBlocks(text).map((seg) => {
    if (seg.type === 'text') return renderText(seg.text);
    const idx = blocks.push({ lang: seg.lang, code: seg.code }) - 1;
    const label = langLabel(seg.lang);
    return `<figure class="ax-code" data-code="${idx}"><figcaption><span>${esc(label)}${seg.open ? ` · ${esc(t('ax.truncatedCode'))}` : ''}</span>`
      + `<span class="ax-code__act"><button type="button" data-code-copy="${idx}">${esc(t('ax.copyCode'))}</button>`
      + `<button type="button" data-code-dl="${idx}">${esc(t('ax.downloadExt', { ext: '.' + extFor(seg.lang) }))}</button></span></figcaption>`
      + `<pre><code class="lang-${esc(normLang(seg.lang))}">${highlight(seg.code, seg.lang)}</code></pre></figure>`;
  }).join('');
  return { html: raw(html), blocks };
}

/** Markdown → plain text (for .txt downloads). */
export function toPlainText(text) {
  return splitBlocks(text).map((seg) => (seg.type === 'code' ? seg.code : seg.text
    .replace(/^#{1,6}\s+/gm, '').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1').replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '$1 ($2)')
    .replace(/^\s*>\s?/gm, '').replace(/^\s*\|?\s*:?-{2,}[-|: ]*$/gm, ''))).join('\n\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

/** Trigger a download of text content (never rendered or executed). */
export function downloadText(content, filename) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
