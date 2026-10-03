/* 广告素材增长图鉴 — single-page app (hash routes). Data: data/*.json (site) or window.__ATLAS__ (artifact).
   Built by src/scripts/build_site.py from docs/atlas/atlas.json. No framework. */
(function () {
  'use strict';
  const A = window.__ATLAS__ || null;
  const V = '20261002182834';
  const $main = document.getElementById('main');
  const cache = {};
  let META = null, CORE = [], BYID = {};

  // ------------------------------------------------------------ utils
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fx = (x, d = 2) => (x == null || isNaN(x) ? '—' : Number(x).toFixed(d));
  const pctTxt = (p) => (p == null ? '—' : p.toFixed(2));
  const num = (n) => (n == null ? '—' : Number(n).toLocaleString('en-US'));
  const store = {
    get(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
  };
  const FAM = { 'GMV代理': '付费类（GMV 代理）', '店铺成交': '店铺成交', '电商支付': '电商支付', '线索': '线索', '咨询': '咨询', '其他转化': '其他转化', '互动率': '互动率', '曝光与互动量': '曝光与互动量' };
  const famName = (f) => FAM[f] || f || '原表';
  const TAG = { observed: '观察', correlated: '相关', hypothesis: '假设', platform_mechanism: '平台机制' };
  const tagB = (t) => `<span class="badge tag-${esc(t)}">${esc(TAG[t] || t)}</span>`;
  const CONF = { high: '高', mid: '中', low: '低' };
  const WIN = '<span class="badge warn" title="榜单只收录赢家；相关，非因果">赢家共性 · 相关非因果</span>';

  async function get(name) {
    if (A) {
      const m = { core: { meta: A.meta, core: A.core }, laws: A.laws, algo: A.algo, ref: A.ref, lists: A.lists, ss: A.ss };
      if (name in m) return m[name];
      throw new Error('no ' + name);
    }
    if (!cache[name]) {
      cache[name] = location.protocol === 'file:'
        ? new Promise((ok, no) => { // file:// blocks fetch(); load the .js mirror written by build_site.py
            const s = document.createElement('script');
            s.src = `data/${name}.js?v=${V}`;
            s.onload = () => { const d = (window.__AD || {})[name]; d ? ok(d) : no(new Error('no ' + name)); s.remove(); };
            s.onerror = () => { s.remove(); no(new Error(name + ' 加载失败')); };
            document.head.appendChild(s);
          })
        : fetch(`data/${name}.json?v=${V}`).then((r) => { if (!r.ok) throw new Error(name + ' ' + r.status); return r.json(); });
      cache[name].catch(() => { delete cache[name]; });
    }
    return cache[name];
  }
  // artifact build packs case details (build_site.py strip_detail_for_artifact); expand them back to the site shape
  const CONF_TXT = { budget: '不可得：平台不返回消耗；排名可能主要反映投放力度', list_selection: '每个榜只返回前 100（部分 50）：全部是赢家样本，后 20 名也只是「赢家里的后段」', note: '模型已控制阅读量、粉丝、天数（cover_contrast 另控制视频、榜、标注批次）；预算、定向、出价、落地页均不可得' };
  function hydrate(id, d) {
    if (!d || d._h) return d;
    const at = d.attribution;
    at.disclaimer = '相关，非因果；只有榜单赢家样本 → 赢家共性；没有 GMV 数值（Y4 代理 = 榜内排名百分位）';
    at.appearances = (at.apps_c || []).map(([li, rank, used, skip]) => { const L = A.lists[li]; return { list: L[0], y_family: L[2], y_level: L[3], rank, of: L[4], pct: L[4] > 1 ? 1 - (rank - 1) / (L[4] - 1) : 1, used: !!used, skip_reasons: skip ? skip.split('、') : [] }; });
    const unpack = (b, isor) => {
      const rows = (xs) => (xs || []).map((x) => (isor ? { label: x[0], direction: x[1], odds: x[2], or_ci90: [x[3], x[4]] } : { label: x[0], direction: x[1], beta_std: x[2], ci90: [x[3], x[4]], implied_points: x[5] }));
      return { model: b.model, n: b.n, n_authors: b.n_authors, r2: b.r2, r2_controls_only: b.r2_controls_only, applies: b.applies, stable_hits: rows(b.h), absent_positive: rows(b.ap), avoided_negative: rows(b.av), no_stable_signal: b.ns };
    };
    at.cover_contrast = (at.cc_c || []).map((b) => unpack(b, true));
    at.within_rank = (at.wr_c || []).map((b) => unpack(b, false));
    at.confounders = Object.assign({}, CONF_TXT, at.confounders || {});
    d.url = (BYID[id] || {}).url;
    d.feature_methods = d.feature_methods || {};
    d._h = true;
    return d;
  }
  async function caseDetail(id) {
    if (A) return hydrate(id, A.details[id]);
    const s = String(parseInt(id.slice(0, 8), 16) % 64).padStart(2, '0');
    const sh = await get('cases/' + s);
    return sh[id];
  }
  function coverSrc(id) {
    const r = BYID[id];
    if (!r || !r.cv) return null;
    return A ? (A.covers[id] || null) : `covers/${id}.webp`;
  }
  const initial = (s) => esc((s || '?').trim().slice(0, 1));
  const dur = (s) => { if (!s) return ''; s = Math.round(s); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const NC_NOTE = '广告专用笔记，网页无法打开；需要 App 分享链接（xhslink）补封面';
  // videos: never autoplay; only one plays at a time (a new play pauses every other <video>)
  document.addEventListener('play', (e) => { document.querySelectorAll('video').forEach((v) => { if (v !== e.target && !v.paused) v.pause(); }); }, true);
  // a <video> whose file is missing (deleted / renamed after the build) falls back to its sibling fallback block
  function wireVideos(root) {
    root.querySelectorAll('video[data-fb]').forEach((v) => {
      const fail = () => { const fb = document.getElementById(v.dataset.fb); if (fb) { fb.hidden = false; v.remove(); } };
      const s = v.querySelector('source'); if (s) s.addEventListener('error', fail); v.addEventListener('error', fail);
    });
  }

  // ------------------------------------------------------------ theme
  document.getElementById('theme').addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    const dark = cur ? cur === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    const next = dark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('atlas-theme', next); } catch (e) { /* ignore */ }
  });

  // ------------------------------------------------------------ tooltip (charts)
  const tip = document.createElement('div'); tip.className = 'tip'; tip.hidden = true; document.body.appendChild(tip);
  document.addEventListener('mousemove', (e) => {
    const t = e.target.closest && e.target.closest('[data-tip]');
    if (!t) { tip.hidden = true; return; }
    tip.textContent = t.getAttribute('data-tip'); tip.hidden = false;
    const x = Math.min(e.clientX + 14, innerWidth - 310), y = e.clientY + 14;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  });

  // ------------------------------------------------------------ router
  let homeScroll = 0, lastRoute = '';
  function parse() {
    const [h, qs] = location.hash.replace(/^#\/?/, '').split('?');
    const [r, ...rest] = h.split('/');
    const q = {}; (qs || '').split('&').filter(Boolean).forEach((kv) => { const [k, v] = kv.split('='); q[decodeURIComponent(k)] = decodeURIComponent(v || ''); });
    return { r: r || 'home', arg: rest.join('/') ? decodeURIComponent(rest.join('/')) : null, q };
  }
  async function route() {
    const { r, arg, q } = parse();
    if (lastRoute === 'home') homeScroll = scrollY;
    if (r === 'home' && q.arch) homeScroll = 0;
    document.querySelectorAll('.vtabs a').forEach((a) => {
      const on = a.dataset.r === (r === 'case' ? 'home' : r);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    try {
      if (!META) { const c = await get('core'); META = c.meta; CORE = c.core; CORE.forEach((x) => { BYID[x.id] = x; }); }
      if (r === 'home') await renderHome(q);
      else if (r === 'favorites') await window.AtlasFavorites.render();
      else if (r === 'types') await renderTypes();
      else if (r === 'case') await renderCase(arg);
      else if (r === 'laws') await (arg ? renderLaw(arg) : renderLaws());
      else if (r === 'algo') await renderAlgo(arg);
      else if (r === 'library') await renderLibrary();
      else if (r === 'ss') await renderSS();
      else if (r === 'ref' && arg === 'screenstudio') { location.replace('#/ss'); return; }
      else if (r === 'ref') await ( arg === 'cayson' ? renderRef() : arg ? Promise.reject(new Error('没有这个参照组 ' + arg)) : renderRefHub());
      else $main.innerHTML = `<div class="wrap boot">没有这个页面。<a href="#/">回到精选</a></div>`;
    } catch (err) {
      console.error(err);
      $main.innerHTML = `<div class="wrap boot">加载失败：${esc(err.message)}。请刷新重试；若仍失败，在 site 目录运行 <code>python3 -m http.server</code> 后用浏览器打开。</div>`;
    }
    const titles = { home: '精选', types: '原型', case: '案例', laws: '底层规律', algo: '算法', library: '素材库', ss: 'Screen Studio', ref: '邻近参照', favorites: '共享收藏' };
    document.title = `${titles[r] || ''} · 广告素材增长图鉴`;
    if (r === 'home' && lastRoute && lastRoute !== 'home') scrollTo(0, homeScroll);
    else if (!(r === 'home' && !lastRoute)) scrollTo(0, 0);
    $main.focus({ preventScroll: true });
    lastRoute = r;
  }
  addEventListener('hashchange', route);
  // in-page jumps without touching the hash router
  document.addEventListener('click', (e) => {
    const j = e.target.closest('[data-jump]');
    if (!j) return;
    e.preventDefault();
    const el = document.getElementById(j.getAttribute('data-jump'));
    if (el) el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  });

  addEventListener('scroll', () => { tip.hidden = true; }, { passive: true });
  function fxJump(el) {
    tip.hidden = true;
    const t = document.getElementById(el.getAttribute('data-fx'));
    if (!t) return;
    t.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    t.classList.add('flash'); setTimeout(() => t.classList.remove('flash'), 900);
  }
  document.addEventListener('click', (e) => { const j = e.target.closest && e.target.closest('[data-fx]'); if (j) { e.preventDefault(); fxJump(j); } });
  document.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest && e.target.closest('[data-fx]')) { e.preventDefault(); fxJump(e.target.closest('[data-fx]')); } });

  // ------------------------------------------------------------ shared bits
  function coverImg(id, cls, alt) {
    const src = coverSrc(id); const r = BYID[id];
    if (!src) return '';
    const ar = r && r.cv ? `style="aspect-ratio:${r.cv[0]}/${r.cv[1]}"` : '';
    return `<img ${cls ? `class="${cls}"` : ''} src="${src}" alt="${esc(alt || '')}" loading="lazy" decoding="async" ${ar}>`;
  }
  function placeholder(title) {
    return `<div class="ph"><b>${esc(title)}</b><small>封面不可得</small></div>`;
  }
  function kpiLine(r) {
    if (r.br) return `<b>${r.br[0]}/${r.br[1]}</b><span>${esc(famName(r.br[2]))}·${esc(r.br[3])}</span><span class="mut">最好榜内名次</span>`;
    if (r.sheet && r.sheet.length) {
      const s = r.sheet[0];
      return s[2] != null ? `<b>¥${fx(s[2], 1)}</b><span>原表开口成本</span>` : (s[1] != null ? `<b>${fx(s[1] * 100, 1)}%</b><span>原表 CTR</span>` : '<span class="mut">原表</span>');
    }
    return '<span class="mut">无榜单数据</span>';
  }
  function card(r) {
    const src = coverSrc(r.id);
    const ar = r.cv ? `--ar:${r.cv[0]}/${r.cv[1]}` : '';
    const flags = [r.sc === 'off_topic' ? '<span class="badge bad" title="在 AI 行业榜上，但标题 / 封面在卖货源、店铺等别的东西，看不到 AI 产品">主题外</span>' : '',
      r.mode === 'full' ? '<span class="badge acc">完整拆解</span>' : ''].join('');
    return `<article class="card" style="${ar}">
      <a class="cl" href="#/case/${r.id}" aria-label="${esc(r.t)}">
        <div class="cov">${src ? `<img src="${src}" alt="" loading="lazy" decoding="async" width="${r.cv[0]}" height="${r.cv[1]}">` : placeholder(r.t)}
          <div class="flags">${flags}</div>${r.vd ? `<span class="vdur" aria-label="视频 ${r.vd} 秒"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 2v8l7-4z"/></svg>${dur(r.vd)}</span>` : ''}</div>
        <div class="body">
          <div class="ttl">${esc(r.t)}</div>
          <div class="who"><span class="av" aria-hidden="true">${initial(r.a)}</span><span>${esc(r.a || '—')}${r.af != null ? ` · ${num(r.af)} 粉` : ''}</span></div>
          <div class="kpi">${kpiLine(r)}</div>
          ${r.bp != null ? `<div class="pctbar" aria-hidden="true"><i style="width:${Math.round(r.bp * 100)}%"></i></div>` : ''}
          ${r.ol ? `<div class="ol">${esc(r.ol)}</div>` : ''}
        </div></a>
      ${window.AtlasFavorites.button(r.id)}<a class="ext" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer" aria-label="在小红书打开" title="在小红书打开">↗</a>
    </article>`;
  }
  function masonry(rows, width) {
    const n = Math.max(2, Math.min(6, Math.floor((width + 16) / 236)));
    const cols = Array.from({ length: n }, () => ({ h: 0, items: [] }));
    rows.forEach((r) => {
      const c = cols.reduce((a, b) => (b.h < a.h ? b : a));
      c.items.push(r); c.h += (r.cv ? r.cv[1] / r.cv[0] : 1.33) + 0.62;
    });
    return `<div class="mas">${cols.map((c) => `<div class="col">${c.items.map(card).join('')}</div>`).join('')}</div>`;
  }
  function miniCase(id, note, extra) {
    const r = BYID[id];
    const t = r ? r.t : id;
    const src = coverSrc(id);
    return `<a class="mini" href="#/case/${id}">${src ? `<img src="${src}" alt="" loading="lazy">` : `<div class="phs">封面不可得</div>`}
      <div><div class="tt">${esc(t)}</div><div class="mt">${extra || ''}</div>${note ? `<div class="nt">${esc(note)}</div>` : ''}</div></a>`;
  }
  // Which part of the note a law is about (Ziye 2026-10-02: 「封面 xxx 标题 xxx」要标清楚). `L.focus` from build_laws wins if present.
  const FOCUS = {
    L01: 'cover', L02: 'cover', L05: 'cover', L06: 'cover', L08: 'cover', L09: 'cover', L13: 'cover',
    L03: 'title', L04: 'title', L07: 'title', L10: 'title', L14: 'title', L15: 'title', L16: 'title', L22: 'title', L24: 'title', L25: 'title', L26: 'title',
    L11: 'mix', L12: 'mix', L17: 'format', L23: 'time', L18: 'method', L19: 'method', L20: 'method', L21: 'method',
  };
  const FOCUS_TXT = { cover: '看封面', title: '看标题', mix: '封面 + 标题', format: '看形式', time: '看发布时间', method: '口径' };
  const lawFocus = (L) => L.focus || FOCUS[L.id] || 'method';
  const focusChip = (L) => `<span class="fchip f-${lawFocus(L)}">${FOCUS_TXT[lawFocus(L)]}</span>`;
  // `visible` mixes 「标题「…」；封面：…」 in one string → split into cover / title-note / time parts
  function splitVisible(v) {
    const out = { cover: [], tnote: [], time: null };
    String(v || '').split(/[；;]/).map((x) => x.trim()).filter(Boolean).forEach((seg) => {
      let m;
      if ((m = seg.match(/^(\d{1,2}:\d{2}) ?发布$/))) { out.time = m[1]; return; }
      if (/^标题/.test(seg)) {
        const parts = seg.split(/[，,](?=封面)/);
        const rest = parts[0].replace(/^标题[：:]?\s*「[^」]*」\s*/, '').replace(/^[，,]\s*/, '');
        if (rest) out.tnote.push(rest);
        if (parts[1]) out.cover.push(parts[1].replace(/^封面[：:是]?\s*/, ''));
        return;
      }
      const [cv, tl] = seg.split(/[，,](?=标题)/);
      out.cover.push(cv.replace(/^封面[：:是]?\s*/, ''));
      if (tl) out.tnote.push(tl.replace(/^标题[：:]?\s*/, ''));
    });
    return out;
  }
  function lawThumb(c, law) {
    const r = BYID[c.id] || {};
    const src = coverSrc(c.id);
    const role = { do: '<span class="badge good">正例</span>', pos: '<span class="badge good">正例</span>', illustrate: '<span class="badge good">示例</span>', exception: '<span class="badge warn">例外</span>' }[c.role] || '<span class="badge bad">反例</span>';
    const f = law ? lawFocus(law) : 'title';
    const sv = splitVisible(c.visible);
    const title = c.title || r.t || c.id;
    const lines = {
      cover: `<div class="ln${f === 'cover' || f === 'mix' ? ' on' : ''}"><b>封面</b><span>${esc(sv.cover.join('；') || '（看图）')}</span></div>`,
      title: `<div class="ln${f === 'title' || f === 'mix' ? ' on' : ''}"><b>标题</b><span>「${esc(title)}」${sv.tnote.length ? `<i>${esc(sv.tnote.join('；'))}</i>` : ''}</span></div>`,
      time: sv.time ? `<div class="ln on"><b>发布</b><span>${esc(sv.time)}</span></div>` : '',
    };
    const order = f === 'title' ? ['title', 'cover'] : f === 'time' ? ['time', 'title', 'cover'] : ['cover', 'title'];
    return `<a class="lcase" href="#/case/${c.id}" title="${esc(c.why)}">
      <div class="im">${src ? `<img src="${src}" alt="" loading="lazy">` : `<div class="phx">${esc(title)}<br><small class="mut">封面不可得</small></div>`}${role}</div>
      <div class="cap2">${order.map((k) => lines[k]).join('')}</div></a>`;
  }

  // ------------------------------------------------------------ HOME (gallery)
  const G = Object.assign({ q: '', ind: [], board: [], fmt: [], arch: [], scope: [], ch: [], media: [], group: 'arch', sort: 'pct', side: true, shown: {} }, store.get('atlas-g') || {});
  const SCOPE_KINDS = { ai_visible: '可见 AI 产品', native_ad: '原生广告（看不到 AI 产品）', non_ai_list: '非 AI 行业榜', off_topic: '主题外（在卖别的东西）' };
  G.scope = (G.scope || []).filter((k) => k in SCOPE_KINDS);
  G.media = (G.media || []).filter((k) => k === 'video' || k === 'nc');
  // 有视频 = local mp4 present (site); the artifact has no video files, so there it means 视频笔记 (watch on 小红书)
  const MEDIA_LABEL = { video: A ? '视频笔记' : '有视频', nc: '封面不可得' };
  const isVid = (r) => (A ? !!r.vd : !!r.hv); // v2 (M6): scope filter is by kind; drop stale v1 values
  const saveG = () => store.set('atlas-g', G);
  const archKey = (r) => r.archv2 || (r.arch && r.arch[0] === 'A' ? 'A' : '—');
  const boardKey = (b) => b.split('·')[0];
  function facets() {
    const c = { ind: {}, board: {}, fmt: {}, arch: {}, scope: {}, ch: {}, media: {} };
    CORE.forEach((r) => {
      c.ind[r.ind || '—'] = (c.ind[r.ind || '—'] || 0) + 1;
      new Set(r.boards.map(boardKey)).forEach((b) => { c.board[b] = (c.board[b] || 0) + 1; });
      if (!r.boards.length) c.board['原表'] = (c.board['原表'] || 0) + 1;
      c.fmt[r.f || '—'] = (c.fmt[r.f || '—'] || 0) + 1;
      c.arch[archKey(r)] = (c.arch[archKey(r)] || 0) + 1;
      c.scope[r.sk] = (c.scope[r.sk] || 0) + 1;
      r.ch.forEach((k) => { c.ch[k] = (c.ch[k] || 0) + 1; });
      if (isVid(r)) c.media.video = (c.media.video || 0) + 1;
      if (r.nc) c.media.nc = (c.media.nc || 0) + 1;
    });
    return c;
  }
  function pass(r) {
    if (G.q) { const q = G.q.toLowerCase(); if (!((r.t || '').toLowerCase().includes(q) || (r.a || '').toLowerCase().includes(q) || r.id.includes(q))) return false; }
    if (G.ind.length && !G.ind.includes(r.ind || '—')) return false;
    if (G.board.length) { const bs = r.boards.length ? r.boards.map(boardKey) : ['原表']; if (!G.board.some((b) => bs.includes(b))) return false; }
    if (G.fmt.length && !G.fmt.includes(r.f || '—')) return false;
    if (G.arch.length && !G.arch.includes(archKey(r))) return false;
    if (G.scope.length && !G.scope.includes(r.sk)) return false;
    if (G.ch.length && !G.ch.every((k) => r.ch.includes(k))) return false;
    // 封面不可得 (ad-only notes): hidden by default, the chip shows only them
    if (G.media.includes('nc') ? !r.nc : r.nc) return false;
    if (G.media.includes('video') && !isVid(r)) return false;
    return true;
  }
  const archName = (k) => {
    if (k === 'A') return '原表 54 条（另一套原型轴 A0–A5）';
    if (k === '—') return '未归原型';
    const a = META.archetypes.find((x) => x.id === k); return a ? a.name : k;
  };
  const archDef = (k) => {
    if (k === 'A') return '原表 54 条按特征字典 v1 聚类（人设 / CTA / 卖什么 / 口吻），与 C1–C5 不是同一套轴；只有 5 条两套都有，这里归 C 组。';
    const a = META.archetypes.find((x) => x.id === k); return a ? a.definition : '';
  };
  function sortRows(rows) {
    const byPct = (a, b) => ((b.bp == null ? -1 : b.bp) - (a.bp == null ? -1 : a.bp)) || (b.na - a.na) || (a.id < b.id ? -1 : 1);
    const byNa = (a, b) => (b.na - a.na) || byPct(a, b);
    return rows.sort(G.sort === 'na' ? byNa : byPct);
  }
  async function renderHome(q) {
    Object.assign(G, store.get('atlas-g') || {});
    if (q && q.arch && (q.arch === 'A' || META.archetypes.some((a) => a.id === q.arch))) { // #/?arch=C1 → only that type, other filters cleared
      Object.assign(G, { q: '', ind: [], board: [], fmt: [], arch: [q.arch], scope: [], ch: [], media: [], shown: {}, group: 'arch' }); saveG();
      try { history.replaceState(null, '', location.pathname + location.search + '#/'); } catch (e) { /* sandboxed */ }
    }
    const m = META, c = m.counts;
    const st = m.laws_status || {};
    const r2 = m.r2 || {};
    const fc = facets();
    const opt = (key, val, label) => `<button type="button" class="chip" data-f="${key}" data-v="${esc(val)}" aria-pressed="${G[key].includes(val)}">${esc(label)} <span class="n">${fc[key][val] || 0}</span></button>`;
    const sortByCount = (o) => Object.keys(o).sort((a, b) => o[b] - o[a]);
    const archOrder = ['C1', 'C2', 'C3', 'C4', 'C5', 'A', '—'].filter((k) => fc.arch[k]);
    $main.innerHTML = `<div class="wrap">
      <section class="hero">
        <div>
          <div class="kick lab">小红书 · AI 工具 / 虚拟产品投放素材</div>
          <h1>广告素材增长图鉴</h1>
          <div class="en">An Atlas of Ad Creatives that Win the List</div>
          <p class="lede">聚光内容广场 393 个榜单里的赢家素材：精选层每一条都有真实封面、逐项拆解和脚本算的算法归因；底层规律按漏斗「停下 → 点开 → 开口/留资 → 付钱」整理，每条附 3 个案例。</p>
          <div class="decision">${esc(m.decision)}</div>
        </div>
        <div class="stats">
          <div class="stat"><b><em>${num(c.cases)}</em></b><span>精选条目<br>封面标注 ${num(c.cases_cover_v2)} + 原表 ${c.cases_sheet}（重叠 ${c.overlap_cover_v2_sheet}）</span></div>
          <div class="stat"><b>${num(c.cases - (c.cases_cover_source.placeholder || 0))}</b><span>有真实封面<br>${c.cases_cover_source.placeholder || 0} 条封面不可得</span></div>
          <div class="stat"><b>${num(c.cases_analysis_full)}</b><span>完整拆解（七格）<br>其余 ${num(c.cases_analysis_light)} 条一句话 + 骨架</span></div>
          <div class="stat"><b>${num(c.library)}</b><span>素材库全量笔记<br>${num(c.lists)} 个榜 · ${num(c.appearances)} 次上榜</span></div>
          <div class="stat"><b>${m.n_laws}</b><span>底层规律<br>规律 ${st['规律'] || 0} · 假设 ${st['假设'] || 0}</span></div>
          <div class="stat"><b>${num((c.cases_scope || {}).off_topic || 0)}</b><span>主题外（在 AI 榜上但在卖货源 / 店铺等）<br>规律案例只用可见 AI 产品的 ${num(c.cases_ai_relevant || 0)} 条</span></div>
        </div>
      </section>
      <div class="caveat" style="margin-top:18px"><b>口径</b><span>名次 = 聚光榜内排名（平台只给排序、不给数值），百分位 1 = 榜首；榜单只收录赢家 → 只能说「赢家共性」；所有系数「相关，非因果」，标题 / 封面特征只多解释很少一部分差异（付费类 R² ${r2['GMV代理'] ? r2['GMV代理'].join('→') : '—'}，线索 R² ${r2['线索'] ? r2['线索'].join('→') : '—'}）；没有 GMV 数值。</span></div>
      <div class="shell ${G.side ? '' : 'closed'}" id="shell">
        <aside class="side" aria-label="筛选">
          <div class="fg"><div class="count">当前 <b id="cnt">0</b> / ${CORE.length} 条 <button type="button" class="btn xs" id="clr" style="margin-left:8px;min-height:28px;padding:2px 10px">清除</button></div>
            <p class="xs mut" id="nchint">${fc.media.nc || 0} 条封面不可得（广告专用笔记）默认不显示，点下面「封面不可得」看。</p></div>
          <div class="fg"><span class="lab">媒体</span><div class="opts">${['video', 'nc'].filter((k) => fc.media[k]).map((k) => opt('media', k, MEDIA_LABEL[k])).join('')}</div></div>
          <div class="fg"><span class="lab">原型</span><div class="opts">${archOrder.map((k) => opt('arch', k, k === 'A' ? '原表 A0–A5' : k === '—' ? '未归' : `${k} ${archName(k)}`)).join('')}</div></div>
          <div class="fg"><span class="lab">链路（榜单板块）</span><div class="opts">${sortByCount(fc.board).map((k) => opt('board', k, k)).join('')}</div></div>
          <div class="fg"><span class="lab">行业（最好名次所在榜）</span><div class="opts">${sortByCount(fc.ind).map((k) => opt('ind', k, k)).join('')}</div></div>
          <div class="fg"><span class="lab">形式</span><div class="opts">${sortByCount(fc.fmt).map((k) => opt('fmt', k, k)).join('')}</div></div>
          <div class="fg"><span class="lab">主题范围</span><div class="opts">${Object.keys(SCOPE_KINDS).filter((k) => fc.scope[k]).map((k) => opt('scope', k, SCOPE_KINDS[k])).join('')}</div></div>
          <div class="fg"><span class="lab">特征（同时满足）</span><div class="opts">${Object.keys(m.chip_labels).filter((k) => fc.ch[k]).map((k) => opt('ch', k, m.chip_labels[k])).join('')}</div></div>
          <div class="fg"><button type="button" class="btn fbtn" id="fdone">看结果</button></div>
        </aside>
        <div>
          <div class="toolbar">
            <button type="button" class="btn" id="tside" aria-expanded="${G.side}">筛选${G.side ? '（收起）' : ''}</button>
            <label class="search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="q" type="search" placeholder="搜标题 / 作者 / note id" value="${esc(G.q)}" aria-label="搜索精选条目"></label>
            <span class="grow"></span>
            <span class="lab">分组</span><div class="seg" role="group" aria-label="分组">
              <button type="button" data-g="arch" aria-pressed="${G.group === 'arch'}">原型</button><button type="button" data-g="fam" aria-pressed="${G.group === 'fam'}">Y 家族</button></div>
            <span class="lab">排序</span><div class="seg" role="group" aria-label="排序">
              <button type="button" data-s="pct" aria-pressed="${G.sort === 'pct'}">最好榜内百分位</button><button type="button" data-s="na" aria-pressed="${G.sort === 'na'}">上榜次数</button></div>
          </div>
          <div id="groups"></div>
        </div>
      </div></div>`;
    const draw = () => {
      const rows = sortRows(CORE.filter(pass));
      document.getElementById('cnt').textContent = rows.length;
      document.getElementById('nchint').hidden = G.media.includes('nc');
      const by = {};
      rows.forEach((r) => {
        const k = G.group === 'arch' ? archKey(r) : (r.br ? r.br[2] : '原表');
        (by[k] = by[k] || []).push(r);
      });
      const order = G.group === 'arch' ? ['C1', 'C2', 'C3', 'C4', 'C5', 'A', '—'] : [...META.family_order, '原表'];
      const w = (document.getElementById('groups').clientWidth || 900);
      const html = order.filter((k) => by[k]).map((k, i) => {
        const list = by[k]; const lim = G.shown[G.group + k] || 24;
        const head = G.group === 'arch'
          ? `<b>${k === 'A' ? 'A' : k === '—' ? '·' : k}</b><h2>${esc(archName(k))}</h2><span class="cnt">${list.length} 条</span><div class="def">${esc(archDef(k))}</div>`
          : `<b>${String(i + 1).padStart(2, '0')}</b><h2>${esc(famName(k))}</h2><span class="cnt">${list.length} 条</span><div class="def">按每条笔记「最好名次」所在榜的 Y 家族分组；同一条可能也在其他家族的榜上。</div>`;
        return `<section class="grp" id="g-${esc(k)}"><div class="hh">${head}</div>${masonry(list.slice(0, lim), w)}
          ${list.length > lim ? `<div class="more"><button type="button" class="btn" data-more="${esc(G.group + k)}">再看 ${Math.min(48, list.length - lim)} 张（共 ${list.length}）</button></div>` : ''}</section>`;
      }).join('') || '<p class="boot">没有符合筛选的条目。</p>';
      document.getElementById('groups').innerHTML = html;
    };
    draw();
    const shell = document.getElementById('shell');
    shell.addEventListener('click', (e) => {
      const b = e.target.closest('[data-f]');
      if (b) {
        const k = b.dataset.f, v = b.dataset.v, arr = G[k];
        const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v);
        b.setAttribute('aria-pressed', String(i < 0)); G.shown = {}; saveG(); draw(); return;
      }
      const mo = e.target.closest('[data-more]');
      if (mo) { const k = mo.dataset.more; G.shown[k] = (G.shown[k] || 24) + 48; saveG(); const y = scrollY; draw(); scrollTo(0, y); return; }
      const g = e.target.closest('[data-g]');
      if (g) { G.group = g.dataset.g; G.shown = {}; saveG(); shell.querySelectorAll('[data-g]').forEach((x) => x.setAttribute('aria-pressed', String(x === g))); draw(); return; }
      const s = e.target.closest('[data-s]');
      if (s) { G.sort = s.dataset.s; saveG(); shell.querySelectorAll('[data-s]').forEach((x) => x.setAttribute('aria-pressed', String(x === s))); draw(); }
    });
    document.getElementById('clr').onclick = () => { Object.assign(G, { q: '', ind: [], board: [], fmt: [], arch: [], scope: [], ch: [], media: [], shown: {} }); saveG(); renderHome(); };
    const mobile = () => matchMedia('(max-width:860px)').matches;
    document.getElementById('tside').onclick = (e) => {
      if (mobile()) { shell.classList.remove('closed'); shell.classList.toggle('open'); return; }
      G.side = !G.side; saveG(); shell.classList.toggle('closed', !G.side);
      e.currentTarget.textContent = G.side ? '筛选（收起）' : '筛选'; e.currentTarget.setAttribute('aria-expanded', String(G.side)); draw();
    };
    document.getElementById('fdone').onclick = () => shell.classList.remove('open');
    let t; document.getElementById('q').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => { G.q = e.target.value.trim(); G.shown = {}; saveG(); draw(); }, 160); });
    let rw = innerWidth; onResize(() => { if (parse().r === 'home' && Math.abs(innerWidth - rw) > 40) { rw = innerWidth; draw(); } });
  }
  let resizeFns = [];
  function onResize(fn) { resizeFns = [fn]; }
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => resizeFns.forEach((f) => f()), 150); });

  // ------------------------------------------------------------ CASE
  async function renderCase(id) {
    const r = BYID[id];
    if (!r) { $main.innerHTML = `<div class="wrap boot">精选层里没有 ${esc(id)}。<a href="#/library">去素材库找</a></div>`; return; }
    $main.innerHTML = `<div class="wrap boot">加载案例…</div>`;
    const [d, lawsDoc, algo] = await Promise.all([caseDetail(id), get('laws'), get('algo')]);
    const a = d.analysis || {}, at = d.attribution || {};
    const seen = a.seen || {};
    const mark = (b) => (b ? '✓' : '✗');
    const src = coverSrc(id);
    const sec = [];
    const outline = [];
    const S = (key, n, title, body) => { outline.push([key, title]); sec.push(`<section class="sec" id="s-${key}"><h2><span class="n">${n}</span>${esc(title)}</h2>${body}</section>`); };
    const expById = {}; (algo.experiments || []).forEach((e) => { expById[e.id.split(' ')[0]] = e; });
    const alias = algo.experiment_aliases || {};
    const expLink = (raw) => {
      if (!raw) return '';
      const id2 = alias[raw] || raw;
      if (expById[id2]) return `<a class="badge acc" href="#/algo/exp-${id2}" title="${esc(raw)}">→ ${esc(id2)}</a>`;
      const b = (algo.experiment_buckets || {})[id2];
      return `<span class="badge" title="${esc(raw)}${b ? '：' + esc(b.title) + '（' + esc(b.handling) + '）' : ''}">${esc(id2)} 未入卡</span>`;
    };
    const evs = (ev) => (ev || []).map((x) => `<q>${esc(x.quote)}</q><span class="mut">（${esc(x.kind)}）</span>`).join('；');

    // 1 source
    const apps = at.appearances || [];
    const pub = d.public || {};
    const sheetRows = (d.sheet && d.sheet.rows) || [];
    S('src', '01', '原始素材与来源', `
      <div class="tw"><table class="t"><thead><tr><th>榜单</th><th>Y</th><th>名次</th><th>百分位</th><th>用于归因</th></tr></thead><tbody>
      ${apps.map((x) => `<tr class="${x.used ? '' : 'off'}"><td>${esc(x.list)}</td><td>${esc(famName(x.y_family))} <span class="mut">${esc(x.y_level)}</span></td><td class="c">${x.rank}/${x.of}</td><td class="c">${pctTxt(x.pct)}</td><td>${x.used ? '用' : `剔除：${esc((x.skip_reasons || []).join('、'))}`}</td></tr>`).join('') || '<tr><td colspan="5" class="mut">不在聚光榜单池（原表条目）</td></tr>'}
      </tbody></table></div>
      <p class="xs mut" style="margin-top:6px">百分位 = 1 − (名次 − 1)/(榜大小 − 1)，1 = 榜首；平台只给排名不给数值。剔除 = 排序可疑 / 与另一排序同序 / 成本类排序，不进模型。</p>
      ${sheetRows.length ? `<h3>原表指标（口径未经后台核验）</h3><div class="tw"><table class="t"><thead><tr><th>表</th><th>名次</th><th>曝光</th><th>CTR</th><th>开口量</th><th>留资量</th><th>开口成本</th></tr></thead><tbody>
        ${sheetRows.map((s) => `<tr><td>${esc(s.sheet)}</td><td class="c">${s.rank ?? '—'}</td><td class="c">${num(s['曝光_30d'])}</td><td class="c">${s.CTR != null ? fx(s.CTR * 100, 1) + '%' : '—'}</td><td class="c">${num(s['开口量'])}</td><td class="c">${num(s['留资量'])}</td><td class="c">${s['开口成本_元'] != null ? '¥' + fx(s['开口成本_元'], 1) : '—'}</td></tr>`).join('')}</tbody></table></div>` : ''}
      <h3>公开互动（Y1，只作背景，混着预算）</h3>
      <p class="sm">阅读 ${num(pub.read)} · 赞 ${num(pub.like)} · 藏 ${num(pub.fav)} · 评 ${num(pub.cmt)} <span class="mut">（${esc(pub.captured_at || '')} 快照）</span></p>`);

    // 2 analysis
    let anBody = '';
    if (a.one_liner) anBody += `<div class="oneliner">${esc(a.one_liner.text)} ${tagB(a.one_liner.tag)}</div>`;
    if (d.analysis_mode === 'full' && a.cells) {
      anBody += `<div class="cells">${a.cells.map((cl) => `<div class="cellrow"><div class="h">${esc(cl.label)}</div><div>
        ${(cl.claims || []).map((x) => `<div class="claim"><div class="tx">${esc(x.text)} ${tagB(x.tag)} ${expLink(x.experiment_id)}</div><div class="ev">证据：${evs(x.evidence)}</div></div>`).join('')}
        ${cl.not_visible ? `<div class="nv">看不到：${esc(cl.not_visible)}</div>` : ''}</div></div>`).join('')}</div>`;
      if (a.attribution_reading && a.attribution_reading.length) {
        anBody += `<h3>归因解读（分析者按三档写）</h3><div class="cells">${a.attribution_reading.map((x) => `<div class="cellrow"><div class="h">${tagB(x.tier)}</div><div class="claim"><div class="tx">${esc(x.text)} ${expLink(x.experiment_id)}</div>${x.model ? `<div class="ev">模型：${esc(x.model)}</div>` : ''}</div></div>`).join('')}</div>`;
      }
    } else if (a.one_liner) {
      anBody += `<p class="sm mut">轻分析：只写一句话解读 + 可复用骨架（${esc(d.analysis_set_reason || '')}）。七格拆解只给合格转化榜前 5 / 后 5 的条目。</p>`;
    } else anBody += '<p class="mut">分析待做。</p>';
    S('an', '02', d.analysis_mode === 'full' ? '逐项拆解（七格）' : '一句话解读', anBody);

    // 3 attribution
    const sum = at.summary || {};
    const fam = sum.families || {};
    const modelBox = (b, kind) => {
      const isOR = kind === 'cc';
      const v = (x) => isOR ? `OR ${fx(x.odds)} [${fx(x.or_ci90[0])}, ${fx(x.or_ci90[1])}]` : `${x.implied_points != null ? (x.implied_points > 0 ? '+' : '') + fx(x.implied_points, 1) + ' 点' : 'β×100 ' + fx(x.beta_std * 100, 1)}（β×100 区间 ${fx(x.ci90[0] * 100, 1)} ~ ${fx(x.ci90[1] * 100, 1)}）`;
      const lst = (xs, empty) => (xs && xs.length ? xs.map((x) => `<div class="hit"><span>${esc(x.label)} <span class="mut">${x.direction === '+' ? '正向' : '负向'}</span></span><span class="v">${v(x)}</span></div>`).join('') : `<p class="xs mut">${empty}</p>`);
      return `<div class="box"><h4>${esc(b.model)}</h4>
        <p class="xs mut">${isOR ? `前 20 vs 后 20 逻辑回归 · ${num(b.n)} 行 · ${num(b.n_authors)} 位作者 · 无 R²（同族 OLS 见旁边）` : `榜内百分位 OLS · ${num(b.n)} 行 · R² ${b.r2_controls_only}→${b.r2}（只控制项 → 加特征）`} · 相关，非因果</p>
        <div class="lab" style="margin-top:4px">本条命中的稳定特征</div>${lst(b.stable_hits, '没有命中区间不跨 ' + (isOR ? '1' : '0') + ' 的特征')}
        ${b.absent_positive && b.absent_positive.length ? `<div class="lab">本条没有的正向特征</div>${lst(b.absent_positive)}` : ''}
        ${b.avoided_negative && b.avoided_negative.length ? `<div class="lab">本条避开的负向特征</div>${lst(b.avoided_negative)}` : ''}
        ${b.no_stable_signal && b.no_stable_signal.length ? `<p class="xs mut">本条带、但模型无稳定信号：${esc(b.no_stable_signal.join('、'))}</p>` : ''}</div>`;
    };
    const models = [...(at.cover_contrast || []).filter((b) => b.applies !== false).map((b) => modelBox(b, 'cc')), ...(at.within_rank || []).filter((b) => b.applies !== false).map((b) => modelBox(b, 'wr'))];
    const ar = (at.archetype || {}).v2;
    const ct = at.contrasts || {};
    const cr = {}; (a.contrasts_reading || []).forEach((x) => { cr[x.position] = x.text; });
    const contrastCard = (pos, label) => {
      const x = ct[pos];
      if (!x) return `<div class="box"><div class="lab">${label}</div><p class="sm mut">${esc(ct[pos + '_reason'] || '没有合适的对照')}</p></div>`;
      const diff = (x.diff || []).map((dd) => `${dd[0]}：本条${dd[1] ? '有' : '无'} / 对照${dd[2] ? '有' : '无'}`).join('；');
      const inner = `${x.cv || BYID[x.id] ? '' : ''}`;
      const img = BYID[x.id] && coverSrc(x.id) ? `<img src="${coverSrc(x.id)}" alt="" loading="lazy">` : (x.cover_url && !A ? `<img src="${esc(x.cover_url)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.outerHTML='<div class=&quot;phs&quot;>封面不可得</div>'">` : '<div class="phs">封面不可得</div>');
      const href = BYID[x.id] ? `#/case/${x.id}` : (x.url || `https://www.xiaohongshu.com/explore/${x.id}`);
      const ext = BYID[x.id] ? '' : ' target="_blank" rel="noopener noreferrer"';
      return `<a class="mini" href="${esc(href)}"${ext}>${img}${inner}<div><div class="lab">${label} · 第 ${x.rank}/${x.of}</div><div class="tt">${esc(x.title)}</div>
        <div class="mt">${esc(x.author || '')}${x.fans != null ? ' · ' + num(x.fans) + ' 粉' : ''}${BYID[x.id] ? '' : ' · 不在精选层（外链）'}</div>
        ${diff ? `<div class="nt">稳定特征差异：${esc(diff)}</div>` : ''}${cr[pos] ? `<div class="nt">${esc(cr[pos])}</div>` : ''}</div></a>`;
    };
    const cf = at.confounders || {};
    S('algo', '03', '算法归因', `
      <div class="caveat"><b>口径</b><span>${esc(at.disclaimer || '相关，非因果')}。确定性脚本生成（build_attribution.py，无 LLM）。</span></div>
      <h3>本条在各 Y 家族的位置</h3>
      <div class="tw"><table class="t"><thead><tr><th>Y 家族</th><th>级别</th><th>榜数</th><th>中位百分位</th><th>最好</th></tr></thead><tbody>
      ${Object.keys(fam).map((k) => `<tr><td>${esc(famName(k))}</td><td>${esc(fam[k].y_level)}</td><td class="c">${fam[k].n}</td><td class="c">${pctTxt(fam[k].median_pct)}</td><td class="c">${pctTxt(fam[k].best_pct)}</td></tr>`).join('') || '<tr><td colspan="5" class="mut">不在榜单池</td></tr>'}
      </tbody></table></div>
      ${at.lead_view && (at.lead_view.primary || at.lead_view.secondary) ? `<p class="sm" style="margin-top:8px">线索类主 Y = 留资（${at.lead_view.primary ? `${at.lead_view.primary.n_lists} 榜，中位 ${pctTxt(at.lead_view.primary.median_pct)}` : '无'}），次 Y = 开口（${at.lead_view.secondary ? `${at.lead_view.secondary.n_lists} 榜，中位 ${pctTxt(at.lead_view.secondary.median_pct)}` : '无'}）。</p>` : ''}
      <h3>它命中了哪些特征（模型里的优势比 / 百分位点）</h3>
      ${at.reference_only ? `<p class="sm mut">${esc(at.reference_note || '本条不在模型样本里，只作参考')}</p>` : ''}
      ${models.length ? `<div class="grid2">${models.join('')}</div>` : '<p class="sm mut">本条不在任何模型的样本里（没有封面标注或不在合格榜）。</p>'}
      <h3>原型</h3>
      ${ar ? `<p class="sm"><b>${esc(ar.id)} ${esc(ar.name)}</b> · 距中心 ${fx(ar.distance)}（分位 ${fx(ar.distance_pctile)}，${esc(ar.reading || '')}）· 第二近 ${esc(ar.second)} ${esc(ar.second_name || '')}。原型是看素材的坐标，不是天然类别（轮廓系数约 0.2）。<a href="#/types">看原型页</a></p>` : `<p class="sm mut">${d.archetype ? esc(d.archetype) + '（原表原型 A0–A5，另一套轴）' : '没有封面标注，不在 v2 原型空间'}</p>`}
      <h3>同榜对照（${esc(ct.list || '—')}，本条第 ${ct.case_rank || '—'}/${ct.of || '—'}）</h3>
      ${ct.available ? `<div class="grid3">${contrastCard('higher', '更高')}${contrastCard('similar', '相近')}${contrastCard('lower', '更低')}</div><p class="xs mut" style="margin-top:6px">${esc(ct.basis || '')}；比较的是该 Y 家族模型里区间不跨 0/1 的特征。</p>` : `<p class="sm mut">${esc(ct.reason || '没有可用的同榜对照')}</p>`}
      <h3>混杂因素</h3>
      <dl class="kv"><dt>预算 / 定向</dt><dd>${esc(cf.budget || '不可得')}</dd><dt>选择偏差</dt><dd>${esc(cf.list_selection || '')}</dd><dt>体量</dt><dd>阅读 ${num(cf.read)} · 作者 ${num(cf.author_fans)} 粉 · 发布 ${num(cf.days_since_publish)} 天</dd><dt>已控制</dt><dd>${esc(cf.note || '')}</dd></dl>
      ${a.confounders && a.confounders.length ? `<p class="xs mut" style="margin-top:6px">分析者补充：${esc(a.confounders.join('；'))}</p>` : ''}`);

    // 4 skeleton
    let sk = '';
    if (a.skeleton) sk += `<div class="skel"><div>${esc(a.skeleton.text)}</div><div class="slots">${(a.skeleton.slots || []).map((s) => `<span class="badge">${esc(s)}</span>`).join('')}</div></div>`;
    if (a.transfer && a.transfer.length) sk += `<h3>迁移到 Queencard</h3>${a.transfer.map((x) => `<div class="claim" style="margin-bottom:8px"><div class="tx">${esc(x.text)} ${tagB(x.tag)} ${expLink(x.experiment_id)}</div></div>`).join('')}`;
    S('skel', '04', '可复用骨架', sk || '<p class="mut">暂无。</p>');

    // 5 laws
    const lawIds = d.law_ids || [];
    const laws = lawsDoc.laws.filter((L) => lawIds.includes(L.id));
    S('laws', '05', '相关规律', laws.length ? `<div class="grid2">${laws.map((L) => {
      const me = L.cases.find((x) => x.id === id) || {};
      return `<a class="lawlink" href="#/laws/${L.id}"><span class="id">${L.id}</span> <span class="badge ${L.status === '假设' ? 'warn' : 'acc'}">${esc(L.status)}</span> ${me.role ? `<span class="badge ${POS_ROLES.has(me.role) ? 'good' : me.role === 'exception' ? 'warn' : 'bad'}">本条是${POS_ROLES.has(me.role) ? '正例' : me.role === 'exception' ? '例外' : '反例'}</span>` : ''}
        <h3 style="margin:6px 0 4px;font-size:16px">${esc(L.title)}</h3><p class="sm mut">${esc(me.why || '')}</p></a>`;
    }).join('')}</div>` : `<p class="sm mut">本条没有被选为任何规律的案例${d.scope === 'off_topic' ? '（主题外条目不作规律案例）' : ''}。<a href="#/laws">看全部规律</a></p>`);

    // 6 experiments
    const eids = d.experiment_ids || [];
    S('exp', '06', '实验卡', eids.length ? `<p class="sm mut" style="margin-bottom:10px">分析里引用到的 Queencard 实验卡（全部是提议，未投放）。</p><div class="grid2">${eids.map((e) => expCard(expById[e])).join('')}</div>` + ((d.experiment_buckets || []).length ? `<p class="xs mut" style="margin-top:8px">另有未入卡的问题：${esc(d.experiment_buckets.map((q) => q + ' ' + ((algo.experiment_buckets || {})[q] || {}).title).join('、'))}</p>` : '') : '<p class="sm mut">没有引用实验卡。</p>');

    // 7 features
    const fe = d.features || {};
    const cl = META.chip_labels;
    S('feat', '07', '特征标签与封面文字', `
      <div class="feats">${r.ch.map((k) => `<span class="badge">${esc(cl[k] || k)}</span>`).join('') || '<span class="mut sm">无</span>'}</div>
      <p class="xs mut" style="margin-top:6px">封面属性 = 模型看 360px 封面标注（含人工更正）；标题特征 = 正则规则；方法计数 ${esc(JSON.stringify(d.feature_methods || {}))}</p>
      ${d.cover_text ? `<h3>封面文字（OCR 全文，可能有错字）</h3><div class="ocr">${esc(d.cover_text)}</div>` : ''}
      ${a.label_check && a.label_check.length ? `<h3>分析者复核标注</h3><div class="tw"><table class="t"><thead><tr><th>特征</th><th>原标注</th><th>看到</th><th>同意</th><th>说明</th></tr></thead><tbody>${a.label_check.map((x) => `<tr><td>${esc(x.feature)}</td><td>${esc(JSON.stringify(x.label))}</td><td>${esc(JSON.stringify(x.seen))}</td><td>${x.agree === true ? '✓' : '<span class="badge warn">待复核</span>'}</td><td>${esc(x.note || '')}</td></tr>`).join('')}</tbody></table></div>` : ''}
      ${a.open_questions && a.open_questions.length ? `<h3>未解的问题</h3><ul class="evitems">${a.open_questions.map((q) => `<li>${esc(q)}</li>`).join('')}</ul>` : ''}`);
    void fe;

    const si = d.scope_info || {};
    const scopeNote = d.scope === 'off_topic' ? `<div class="caveat" style="margin-top:10px"><b>主题外</b><span>${esc(si.reason)}。证据：「${esc(si.evidence || '')}」。保留在图鉴里，但不作规律案例。</span></div>`
      : si.kind === 'native_ad' ? `<div class="caveat" style="margin-top:10px"><b>原生广告</b><span>${esc(si.reason)}。主题内，但封面 / 标题看不到 AI 产品，一般不作规律案例。</span></div>` : '';
    $main.innerHTML = `<div class="wrap"><div class="dshell">
      <nav class="outline" aria-label="本页目录"><span class="lab">本页</span>${outline.map(([k, t]) => `<a href="#/case/${id}" data-jump="s-${k}">${esc(t)}</a>`).join('')}
        <span class="lab">导航</span><a href="#/">← 精选</a><a href="#/laws">底层规律</a></nav>
      <article>
        <div class="crumb"><button type="button" class="btn" id="back">← 返回</button><span>精选</span><span>›</span><span>${esc(archName(archKey(r)))}</span></div>
        <div class="dhead">
          <div>${caseMedia(r, d, src)}</div>
          <div>
            <div class="feats">${r.archv2 ? `<span class="badge acc">${esc(r.archv2)} ${esc(archName(r.archv2))}</span>` : ''}${d.analysis_mode === 'full' ? '<span class="badge ink">完整拆解</span>' : '<span class="badge">轻分析</span>'}${d.status === 'pending_verify' ? '<span class="badge warn">待核验</span>' : ''}${d.scope === 'off_topic' ? '<span class="badge bad">主题外</span>' : ''}</div>
            <h1 style="margin-top:10px">${esc(d.title)}</h1>
            <dl class="kv">
              <dt>作者</dt><dd>${d.author ? `<a href="${esc(d.author.url)}" target="_blank" rel="noopener noreferrer">${esc(d.author.name)}</a> · ${num(d.author.fans)} 粉` : '—'}</dd>
              <dt>形式</dt><dd>${esc(d.format || '—')}${d.video_duration ? ` · ${d.video_duration} 秒` : ''}${d.image_count && d.format === '图文' ? ` · ${d.image_count} 张` : ''}</dd>
              <dt>发布</dt><dd>${esc(d.published || '—')}</dd>
              <dt>行业</dt><dd>${esc(d.industry || '—')} <span class="mut xs">（${esc(d.industry_basis || '')}）</span></dd>
              <dt>来源</dt><dd>${esc((d.source.origins || []).join(' + '))} · 采集 ${esc(d.source.captured_at)}</dd>
              <dt>链接</dt><dd><a href="${esc(d.url)}" target="_blank" rel="noopener noreferrer">在小红书打开 ↗</a> · <span class="mono xs">${esc(id)}</span></dd>
              ${d.cover.source === 'placeholder' ? `<dt>封面</dt><dd class="mut">不可得：${esc(d.cover.missing_reason || '')}</dd>` : ''}
              ${r.vd ? `<dt>视频</dt><dd>${r.hv ? '本地副本（<span class="mono xs">videos/' + esc(id) + '.mp4</span>）' : A ? '精简版不带视频文件' : '还没下载或下载失败'} · <a href="${esc(d.url)}" target="_blank" rel="noopener noreferrer">在小红书看 ↗</a></dd>` : ''}
            </dl>
            <p class="honest" style="margin-top:14px"><b>看了什么：</b>封面 ${mark(seen.cover)} · 标题 ${mark(seen.title)} · 正文 ${mark(seen.body)} · 视频 ${mark(seen.video)} · 评论 ${mark(seen.comments)}${seen.note ? `（${esc(seen.note)}）` : ''}。只看了封面和标题，不写正文与视频里的内容。</p>
            ${r.nc ? `<div class="caveat" style="margin-top:10px"><b>封面不可得</b><span>${NC_NOTE}。数据与拆解照常保留；首页默认不显示，筛选「封面不可得」可见。</span></div>` : ''}
            ${scopeNote}
          </div>
        </div>
        ${sec.join('')}
      </article></div></div>`;
    wireVideos($main);
    document.getElementById('back').onclick = () => { if (lastRoute && history.length > 1) history.back(); else location.hash = '#/'; };
  }
  function caseMedia(r, d, src) {
    const cov = src ? `<img src="${src}" alt="封面：${esc(r.t)}" style="width:100%;height:auto">` : placeholder(r.t);
    const xhs = `<a class="vlink" href="${esc(d.url)}" target="_blank" rel="noopener noreferrer">`;
    if (!r.vd) return `<div class="covbig">${cov}</div>`;
    if (A) return `<div class="covbig vwrap">${cov}${xhs}<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 2v8l7-4z"/></svg>在小红书看 · ${dur(r.vd)} ↗</a></div>`;
    const fb = `<div class="covbig vwrap">${cov}${xhs}视频还没下载 · 在小红书看 ↗</a></div>`;
    if (!r.hv) return fb;
    const ar = r.cv ? `aspect-ratio:${r.cv[0]}/${r.cv[1]};` : '';
    return `<div class="covbig vbox"><video controls playsinline preload="metadata" ${src ? `poster="${src}"` : ''} style="${ar}" data-fb="vfb-${r.id}" aria-label="视频：${esc(r.t)}"><source src="videos/${r.id}.mp4" type="video/mp4"></video></div>
      <div id="vfb-${r.id}" hidden>${fb}</div>`;
  }
  function expCard(e) {
    if (!e) return '';
    const id = e.id.split(' ')[0];
    const wd = (e.status || '').includes('撤回');
    return `<div class="exp ${wd ? 'withdrawn' : ''}" id="exp-${id}"><div><span class="id">${esc(e.id)}</span> <span class="badge ${wd ? 'bad' : 'warn'}">${esc(e.status || '提议，未投放')}</span>${(e.law_ids || []).map((l) => ` <a class="badge acc" href="#/laws/${l}">${l}</a>`).join('')}</div>
      <h4 style="font-family:var(--serif);font-size:15.5px">${esc(e.title)}</h4>
      ${e.withdrawn_reason ? `<p class="sm" style="color:var(--bad)">撤回原因：${esc(e.withdrawn_reason)}</p>` : ''}
      ${e.note ? `<p class="xs mut">${esc(e.note)}</p>` : ''}
      <div class="tw"><table class="t"><tbody>${(e.rows || []).map((rw) => `<tr><td class="k">${esc(rw[0])}</td><td>${esc(rw[1])}</td></tr>`).join('')}</tbody></table></div>
      ${e.n_cases != null ? `<p class="xs mut">${e.n_cases} 条案例的分析引用了它</p>` : ''}</div>`;
  }

  // ------------------------------------------------------------ LAWS
  const GROUP_N = { '停下': '01', '点开': '02', '开口/留资': '03', '付钱': '04', '方法与口径': '05' };
  function lawMeta(L) {
    return `<span class="badge ${L.status === '假设' ? 'warn' : 'acc'}">${esc(L.status)}</span><span class="badge">可信度 ${CONF[L.confidence] || L.confidence}</span><span class="badge">${esc(L.evidence.y_level)}</span>${L.experiment_id ? `<a class="badge acc" href="#/algo/exp-${esc(L.experiment_id)}">→ ${esc(L.experiment_id)}</a>` : ''}`;
  }
  const POS_ROLES = new Set(['do', 'pos', 'illustrate']);
  const lawPos = (L) => L.cases.filter((c) => POS_ROLES.has(c.role));
  const lawNeg = (L) => L.cases.filter((c) => !POS_ROLES.has(c.role));
  async function renderLaws() {
    const doc = await get('laws');
    const by = {}; doc.laws.forEach((L) => { by[L.id] = L; });
    $main.innerHTML = `<div class="wrap">
      <section class="hero" style="grid-template-columns:1fr">
        <div><div class="kick lab">底层规律 · Laws</div><h1>为什么这些素材赢了榜</h1>
        <p class="lede">${doc.laws.length} 条规律按漏斗分组：停下 → 点开 → 开口 / 留资 → 付钱，最后是读数字之前要知道的口径。每条标明看的是<b>封面</b>还是<b>标题</b>（案例下也分行写「封面｜…」「标题｜…」，本条规律说的那一行加粗）；每条附 3 个正面案例（照着做的样子），点封面进详情；反面与例外收在每条规律的详情页里。规律 ${doc.laws.filter((x) => x.status === '规律').length} 条（至少一个模型稳定或直接计数），假设 ${doc.laws.filter((x) => x.status === '假设').length} 条（只有小样本或新信号未审）。</p></div>
      </section>
      <div class="caveat" style="margin-top:18px"><b>口径</b><span>榜单只收录赢家 → 「赢家共性」；系数「相关，非因果」，同族 R² 很低（付费类 ${META.r2['GMV代理'] ? META.r2['GMV代理'].join('→') : ''}，线索 ${META.r2['线索'] ? META.r2['线索'].join('→') : ''}）；「付钱」组的 Y 是付费类榜内排名，不是 GMV。【推】= 超出数据的推断。案例不挑主题外条目。</span></div>
      ${doc.groups.map((g) => `<section class="lgrp" id="lg-${GROUP_N[g.id]}"><div class="hh"><b>${GROUP_N[g.id]}</b><h2>${esc(g.id)}</h2><span class="mut sm">${g.law_ids.length} 条</span></div><p class="lede">${esc(g.lede)}</p>
        ${g.law_ids.map((lid) => { const L = by[lid]; return `<div class="law" id="law-${L.id}"><div>
          <a class="id" href="#/laws/${L.id}">${L.id}</a> ${focusChip(L)}<h3><a href="#/laws/${L.id}">${esc(L.title)}</a></h3>
          <p class="stmt">${esc(L.statement)}</p>
          <p class="evl">证据：${esc(L.evidence.items[0].text)}${L.evidence.items.length > 1 ? `；另 ${L.evidence.items.length - 1} 项` : ''}</p>
          <div class="meta">${lawMeta(L)}</div></div>
          <div class="lcases">${lawPos(L).map((c) => lawThumb(c, L)).join('')}</div></div>`; }).join('')}</section>`).join('')}
    </div>`;
  }
  async function renderLaw(id) {
    const doc = await get('laws');
    const L = doc.laws.find((x) => x.id === id);
    if (!L) { $main.innerHTML = `<div class="wrap boot">没有规律 ${esc(id)}。<a href="#/laws">全部规律</a></div>`; return; }
    const algo = await get('algo');
    const e = (algo.experiments || []).find((x) => x.id.split(' ')[0] === L.experiment_id);
    const idx = doc.laws.findIndex((x) => x.id === id);
    const prev = doc.laws[idx - 1], next = doc.laws[idx + 1];
    const modelAnchor = (it) => (it.model && (it.kind === 'cc22' || it.kind === 'wr21' || it.kind === 'r2') ? ` <a class="xs" href="#/algo/m-${slug(it.model)}">看模型图</a>` : (it.kind === 'overlap' ? ' <a class="xs" href="#/algo/overlap">看图</a>' : ''));
    $main.innerHTML = `<div class="wrap lawd"><div style="padding-top:24px" class="crumb"><a class="btn" href="#/laws">← 全部规律</a><span>${esc(L.group)}</span>${prev ? `<a class="btn" href="#/laws/${prev.id}">‹ ${prev.id}</a>` : ''}${next ? `<a class="btn" href="#/laws/${next.id}">${next.id} ›</a>` : ''}</div>
      <div style="padding-top:22px"><span class="lab">${esc(L.group)} · ${L.id}</span> ${focusChip(L)}<h1 style="font-size:clamp(26px,3.4vw,40px);margin-top:6px">${esc(L.title)}</h1>
      <div class="meta feats" style="margin-top:10px">${lawMeta(L)}</div>
      <p class="stmt">${esc(L.statement)}</p></div>
      ${L.status_reason ? `<div class="caveat" style="margin-top:12px"><b>为什么是假设</b><span>${esc(L.status_reason)}</span></div>` : ''}
      <section class="sec"><h2><span class="n">01</span>正面案例（${lawPos(L).length} 个）</h2>
        <div class="lcases">${lawPos(L).map((c) => `<div>${lawThumb(c, L)}<p class="why" style="margin-top:6px">${esc(c.why)}</p></div>`).join('')}</div>
        ${lawNeg(L).length ? `<details class="meth"><summary>反面与例外（${lawNeg(L).length} 个）</summary><div class="lcases" style="margin-top:10px">${lawNeg(L).map((c) => `<div>${lawThumb(c, L)}<p class="why" style="margin-top:6px">${esc(c.why)}</p></div>`).join('')}</div></details>` : ''}</section>
      <section class="sec"><h2><span class="n">02</span>机制</h2><p>${esc(L.mechanism)}</p><p class="xs mut" style="margin-top:6px">${esc(L.mechanism_note || '')}</p></section>
      <section class="sec"><h2><span class="n">03</span>证据 ${WIN}</h2><ul class="evitems">${L.evidence.items.map((it) => `<li>${esc(it.text)}${modelAnchor(it)}</li>`).join('')}</ul>
        <p class="xs mut" style="margin-top:8px">${esc(L.evidence.wording)}。Y 级别：${esc(L.evidence.y_level)}。</p></section>
      <section class="sec"><h2><span class="n">04</span>适用边界</h2><p>${esc(L.boundary)}</p></section>
      <section class="sec"><h2><span class="n">05</span>迁移到 Queencard</h2><p>${esc(L.transfer)}</p><div style="margin-top:12px;max-width:760px">${e ? expCard(e) : '<p class="sm mut">本条不挂实验卡。</p>'}</div></section>
      <section class="sec"><h2><span class="n">06</span>可信度</h2><p>${CONF[L.confidence]}——${esc(L.confidence_reason)}</p><p class="xs mut" style="margin-top:6px">来源旧规则：${esc((L.origin || []).join('；') || '新')}</p></section>
    </div>`;
  }
  const slug = (s) => String(s).replace(/[^\w一-龥]+/g, '-').replace(/^-|-$/g, '');

  // ------------------------------------------------------------ charts
  function forest(model, isOR, fxIds) {
    const rows = model.coefs.slice().sort((a, b) => (isOR ? b.coef - a.coef : b.beta - a.beta));
    const W = chartW(), narrow = W < 520, rowH = 22, padL = narrow ? 128 : 200, padR = 52, top = 22, H = top + rows.length * rowH + 8;
    const vals = rows.flatMap((c) => (isOR ? [c.ci90[0], c.ci90[1]] : [c.ci90[0] * 100, c.ci90[1] * 100])).map(Math.abs).sort((a, b) => a - b);
    // robust range: rare features have huge intervals; clip at 1.4 × the 85th percentile so the bulk stays readable (clipped ends run to the edge)
    const lim = Math.max(isOR ? Math.log(2.5) : 3, vals[Math.floor(vals.length * 0.85)] * 1.4);
    let lo = -lim, hi = lim;
    const x = (v) => padL + ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * (W - padL - padR);
    const ticks = isOR ? [0.25, 0.5, 1, 2, 4, 8].map(Math.log).filter((t) => t >= lo && t <= hi) : niceTicks(lo, hi);
    const tl = (t) => (isOR ? (Math.round(Math.exp(t) * 100) / 100) : (t > 0 ? '+' : '') + t);
    let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(model.name)} 系数图">`;
    ticks.forEach((t) => { s += `<line class="gl" x1="${x(t)}" x2="${x(t)}" y1="${top - 6}" y2="${H - 6}"/><text class="ax" x="${x(t)}" y="${top - 10}" text-anchor="middle">${tl(t)}</text>`; });
    s += `<line class="zero" x1="${x(0)}" x2="${x(0)}" y1="${top - 6}" y2="${H - 6}"/>`;
    rows.forEach((c, i) => {
      const y = top + i * rowH + rowH / 2;
      const v = isOR ? c.coef : c.beta * 100, l = isOR ? c.ci90[0] : c.ci90[0] * 100, h = isOR ? c.ci90[1] : c.ci90[1] * 100;
      const col = !c.stable ? 'var(--ns)' : v > 0 ? 'var(--pos)' : 'var(--neg)';
      const ctrl = /控制|log_read|age_days|log_fans/.test(c.label + c.feature);
      const txt = isOR ? `OR ${fx(c.odds)}，90% 区间 ${fx(Math.exp(l))}–${fx(Math.exp(h))}` : `β×100 ${fx(v, 1)}，90% 区间 ${fx(l, 1)} ~ ${fx(h, 1)}`;
      const t2 = `${c.label}：${txt}；${c.stable ? '稳定' : '区间跨 ' + (isOR ? '1' : '0')}${c.n_with != null ? `；带该特征 ${c.n_with} 行` : ''}${c.prevalence != null && !isOR ? `；出现率 ${fx(c.prevalence * 100, 1)}%` : ''}。相关，非因果`;
      const maxL = narrow ? 9 : 16;
      const fxId = fxIds && c.stable && v > 0 && fxIds[c.feature];
      s += `<g class="row${fxId ? ' fxl' : ''}" data-tip="${esc(t2 + (fxId ? '。点击看 3 个例子' : ''))}"${fxId ? ` data-fx="${fxId}" tabindex="0" role="link" aria-label="${esc(c.label)}：看 3 个例子"` : ''}><rect class="hov" x="0" y="${y - rowH / 2}" width="${W}" height="${rowH}"/>
        <text x="${padL - 10}" y="${y + 4}" text-anchor="end" ${ctrl ? 'style="fill:var(--ink-3)"' : ''}>${esc(c.label.length > maxL ? c.label.slice(0, maxL) + '…' : c.label)}</text>
        <line class="ci" x1="${x(l)}" x2="${x(h)}" y1="${y}" y2="${y}" stroke="${col}"/>
        <circle cx="${x(v)}" cy="${y}" r="4.5" fill="${c.stable ? col : 'var(--surface)'}" stroke="${col}" stroke-width="2"/>
        <text class="ax" x="${W - padR + 8}" y="${y + 4}">${isOR ? fx(c.odds) : (v > 0 ? '+' : '') + fx(v, 1)}</text></g>`;
    });
    s += '</svg>';
    return `<div class="chart">${s}<div class="legend"><span><i style="background:var(--pos)"></i>稳定正向</span><span><i style="background:var(--neg)"></i>稳定负向</span><span><i style="border:2px solid var(--ns)"></i>区间跨 ${isOR ? '1' : '0'}（空心）</span>${fxIds && Object.keys(fxIds).length ? '<span>点实心正向点 → 看例子</span>' : ''}<span class="mut">横轴 ${isOR ? '优势比（对数刻度）' : 'β×100（标准化）'} · 灰字 = 控制项 · 悬停看数字</span></div></div>`;
  }
  function chartW() {
    const w = $main.clientWidth - (innerWidth > 1100 ? 260 + 48 : 32) - 64;
    return Math.max(300, Math.min(760, w));
  }
  function niceTicks(lo, hi) {
    const step = [1, 2, 5, 10, 20].find((s) => (hi - lo) / s <= 6) || 20;
    const out = []; for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) out.push(Math.round(t * 10) / 10);
    return out;
  }
  function bars(items, fmt) {
    const W = Math.min(560, chartW()), rowH = 26, padL = 110, padR = 60, H = items.length * rowH + 6;
    const max = Math.max(...items.map((d) => d.v), 1e-9);
    let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="条形图">`;
    items.forEach((d, i) => {
      const y = i * rowH + 4, w = (d.v / max) * (W - padL - padR);
      s += `<g class="row" data-tip="${esc(d.tip || '')}"><rect class="hov" x="0" y="${y - 2}" width="${W}" height="${rowH}"/><text x="${padL - 10}" y="${y + 14}" text-anchor="end">${esc(d.k)}</text>
        <rect x="${padL}" y="${y + 4}" width="${Math.max(2, w)}" height="14" rx="4" fill="var(--pos)"/><text class="ax" x="${padL + w + 8}" y="${y + 15}">${fmt(d.v)}</text></g>`;
    });
    return `<div class="chart">${s}</svg></div>`;
  }

  // ------------------------------------------------------------ ALGO · 正向因子 × 3 个例子 (build_factor_examples.py)
  const fxIdOf = (m, feat) => `fx-${slug(m)}-${feat}`;
  function fxCard(e, tag, ctr) {
    const r = BYID[e.id] || {};
    const src = coverSrc(e.id);
    const ar = r.cv ? `style="aspect-ratio:${r.cv[0]}/${r.cv[1]}"` : '';
    return `<a class="fxc${ctr ? ' ctr' : ''}" href="#/case/${e.id}" data-case="${e.id}">
      <div class="im">${src ? `<img src="${src}" alt="" loading="lazy" decoding="async" ${ar}>` : `<div class="phx">${esc(e.title)}<br><small class="mut">封面不可得</small></div>`}<span class="badge ${ctr ? 'bad' : 'good'}">${tag}</span></div>
      <div class="cap">${esc(e.title)}</div>
      <div class="why">${esc(e.why)}</div>
      ${e.relaxed ? `<div class="rx">${esc(e.relaxed)}</div>` : ''}</a>`;
  }
  function fxBlock(m, card) {
    if (!card) return '';
    const isOR = card.effect === 'OR';
    const head = '<h4>正向因子 × 3 个例子</h4>';
    if (!card.factors.length) return `<div class="fxs">${head}<p class="sm mut">${esc(card.note || '这张卡没有稳定的正向因子。')}</p></div>`;
    const eff = (f) => (isOR ? `OR ${fx(f.value)}（90% 区间 ${fx(f.interval[0])}–${fx(f.interval[1])}）`
      : `β×100 ${f.value > 0 ? '+' : ''}${fx(f.value * 100, 1)}（90% 区间 ${fx(f.interval[0] * 100, 1)} ~ ${fx(f.interval[1] * 100, 1)}）`);
    return `<div class="fxs">${head}
      <p class="xs mut">每个稳定的正向因子挑 3 条「有这个特征、在本族榜里排得靠前」的案例，另附 1 条「有这个特征却排在后 20」的反例。只挑主题内、有封面的；优先 AI 相关、完整拆解、作者和原型不重复；不够时放宽并在卡片下注明。赢家共性；相关，非因果。</p>
      ${card.factors.map((f) => `<div class="fx" id="${fxIdOf(m.name, f.feature)}">
        <div class="fxh"><b>${esc(f.label)}</b><span class="mono">${eff(f)}</span><span class="badge warn">相关，非因果</span>${f.definition ? `<span class="xs mut">${esc(f.definition)}</span>` : ''}</div>
        ${f.examples.length ? `<div class="fxrow">${f.examples.map((e, i) => fxCard(e, `例 ${i + 1}`)).join('')}${f.counter ? fxCard(f.counter, '反例', true) : ''}</div>` : ''}
        ${card.note && !f.examples.length ? `<p class="sm mut">${esc(card.note)}</p>` : (f.caption && f.examples.length < 3 ? `<p class="xs" style="color:var(--warn)">${esc(f.caption)}</p>` : '')}
      </div>`).join('')}</div>`;
  }

  // ------------------------------------------------------------ TYPES · 原型象限 (build_site.py types_block)
  // x = 该类封面里「像笔记」（c_native）的占比，y = 「有人」（c_face 或 c_person ≠ none）的占比；中线 = 全体占比。位置全部来自数据。
  const T_COLOR = { sell: '卖货强', lead: '要私信强', both: '都强', flat: '都不领先' };
  const T_COLOR_LONG = { sell: '卖货强：付费类榜里的位置比全体高 ≥ 0.05', lead: '要私信强：线索榜里的位置比全体高 ≥ 0.05', both: '都强：两族都比全体高 ≥ 0.05', flat: '都不领先：两族都没有高出全体 0.05（持平或偏弱）' };
  const T_FAM = { sell: '卖货', lead: '要私信' };
  const QUAD = { tl: ['有人 · 像广告', '主播式卖点'], tr: ['有人 · 像笔记', '朋友式分享'], bl: ['无人 · 像广告', '海报式展示'], br: ['无人 · 像笔记', '生活随手拍'] };
  function typeStrength(t) {
    const word = (k) => {
      const s = t.strength[k]; if (!s) return '';
      const d = s.v - s.all;
      const w = s.dir === 'up' ? '强' : s.dir === 'down' ? '弱' : d >= 0.02 ? '略强' : d <= -0.02 ? '略弱' : '持平';
      return `${T_FAM[k]}${w}（${fx(s.v)} vs ${fx(s.all)}${s.n < 30 ? '，样本少' : ''}）`;
    };
    return ['sell', 'lead'].map(word).filter(Boolean).join('、');
  }
  function quadSVG(T, mode) {
    const full = mode === 'full';
    const G0 = full
      ? { W: 1000, H: 612, fx0: 24, fx1: 976, fy0: 16, fy1: 560, x0: 330, x1: 670, y1: 130, y0: 470, rMax: 42, fs: 14, cap: 15 }
      : { W: 360, H: 440, fx0: 22, fx1: 352, fy0: 6, fy1: 400, x0: 84, x1: 268, y1: 92, y0: 320, rMax: 24, fs: 11.5, cap: 12 };
    const { W, H, fx0, fx1, fy0, fy1 } = G0;
    const X = (v) => G0.x0 + v * (G0.x1 - G0.x0), Y = (v) => G0.y0 - v * (G0.y0 - G0.y1);
    const nMax = Math.max(...T.items.map((t) => t.n));
    const R = (n) => Math.sqrt(n / nMax) * G0.rMax;
    const mx = X(T.mx), my = Y(T.my);
    const link = mode !== 'mini';
    let s = `<svg class="quad q-${mode}" viewBox="0 0 ${W} ${H}" role="img" aria-label="原型象限图：横轴像广告到像笔记，纵轴无人到有人；${esc(T.items.map((t) => `${t.id} ${t.name} 像笔记 ${Math.round(t.x * 100)}%、有人 ${Math.round(t.y * 100)}%、${T_COLOR[t.color]}`).join('；'))}">`;
    s += '<defs><clipPath id="qclip" clipPathUnits="objectBoundingBox"><rect width="1" height="1" rx=".12" ry=".09"/></clipPath></defs>';
    s += `<rect class="qbg" x="${fx0}" y="${fy0}" width="${fx1 - fx0}" height="${fy1 - fy0}" rx="10"/>`;
    s += `<line class="qmid" x1="${mx}" x2="${mx}" y1="${fy0}" y2="${fy1}"/><line class="qmid" x1="${fx0}" x2="${fx1}" y1="${my}" y2="${my}"/>`;
    if (mode !== 'mini') { // quadrant captions in the corners
      const p = full ? 14 : 8;
      const cap = (k, x, y, anchor, below) => `<text class="qcap" x="${x}" y="${y}" text-anchor="${anchor}"><tspan class="qk" x="${x}" dy="0" style="font-size:${full ? 12 : 10}px">${QUAD[k][0]}</tspan><tspan x="${x}" dy="${below ? full ? 19 : 15 : -(full ? 19 : 15)}" style="font-size:${G0.cap}px">${QUAD[k][1]}</tspan></text>`;
      s += cap('tl', fx0 + p, fy0 + p + 10, 'start', true) + cap('tr', fx1 - p, fy0 + p + 10, 'end', true);
      s += cap('bl', fx0 + p, fy1 - p - 2, 'start', false) + cap('br', fx1 - p, fy1 - p - 2, 'end', false);
    }
    // axes: 0% / 100% ticks where the data scale actually sits, words at the ends, midline values
    const ay = fy1 + (full ? 22 : 16), af = full ? 12.5 : 10.5;
    s += `<g class="qax" style="font-size:${af}px">
      <text x="${fx0}" y="${ay}">← 像广告</text><text x="${fx1}" y="${ay}" text-anchor="end">像笔记 →</text>
      <text x="${mx}" y="${ay}" text-anchor="middle">全体 ${Math.round(T.mx * 100)}%</text>
      ${full ? `<text x="${X(0)}" y="${ay + 18}" text-anchor="middle" class="qt">0%</text><text x="${X(1)}" y="${ay + 18}" text-anchor="middle" class="qt">100%</text><text x="${(X(0) + X(1)) / 2}" y="${ay + 18}" text-anchor="middle" class="qt">封面「像笔记」的占比</text>` : ''}
      <text transform="translate(${fx0 - (full ? 8 : 7)} ${fy0 + 4}) rotate(-90)" text-anchor="end">有人 →</text>
      <text transform="translate(${fx0 - (full ? 8 : 7)} ${fy1}) rotate(-90)" text-anchor="start">← 无人</text>
      <text transform="translate(${fx0 - (full ? 8 : 7)} ${my}) rotate(-90)" text-anchor="middle">全体 ${Math.round(T.my * 100)}%</text></g>`;
    if (full) s += `<g class="qax qt" style="font-size:11px"><line class="qtick" x1="${fx0}" x2="${fx0 + 6}" y1="${Y(0)}" y2="${Y(0)}"/><line class="qtick" x1="${fx0}" x2="${fx0 + 6}" y1="${Y(1)}" y2="${Y(1)}"/><text x="${fx0 + 10}" y="${Y(0) + 4}">0%</text><text x="${fx0 + 10}" y="${Y(1) + 4}">100%</text></g>`;
    // thumbnails first (under the bubbles' rings), then bubbles + labels
    if (full) {
      T.items.forEach((t) => {
        const cx = X(t.x), cy = Y(t.y), r = R(t.n), tw = 44, th = 59, g = 6;
        const left = t.x < 0.5;
        t.picks.slice(0, 4).forEach((p, i) => {
          const src = coverSrc(p.id); if (!src) return;
          const x = left ? cx - r - 14 - (i + 1) * tw - i * g : cx + r + 14 + i * (tw + g);
          const rr = BYID[p.id] || {};
          s += `<a class="qth" href="#/case/${p.id}" data-tip="${esc(`${t.id} 典型封面：${rr.t || p.id}（离类中心 ${fx(p.d)}）。点开看案例`)}" aria-label="${esc(`${t.id} 典型封面：${rr.t || p.id}`)}"><image href="${src}" x="${x}" y="${cy - th / 2}" width="${tw}" height="${th}" preserveAspectRatio="xMidYMid slice" clip-path="url(#qclip)"/><rect class="qthr" x="${x}" y="${cy - th / 2}" width="${tw}" height="${th}" rx="5"/></a>`;
        });
      });
    }
    T.items.forEach((t) => {
      const cx = X(t.x), cy = Y(t.y), r = R(t.n);
      const tipTxt = `${t.id} ${t.name}：${t.n} 条；像笔记 ${Math.round(t.x * 100)}%、有人 ${Math.round(t.y * 100)}%；${typeStrength(t)} → ${T_COLOR[t.color]}。赢家共性，相关非因果`;
      const inner = `<circle class="qb" cx="${cx}" cy="${cy}" r="${r}" style="fill:var(--t-${t.color})"/>
        ${full ? `<text class="qlab" x="${cx}" y="${cy + r + G0.fs + 3}" text-anchor="middle" style="font-size:${G0.fs}px"><tspan class="qid">${t.id}</tspan> ${esc(t.name)}</text>`
          : `<text class="qlab" x="${cx}" y="${cy + r + G0.fs + 2}" text-anchor="middle" style="font-size:${G0.fs}px"><tspan class="qid">${t.id}</tspan><tspan x="${cx}" dy="${G0.fs + 3}">${esc(t.name)}</tspan></text>`}
        ${full ? `<text class="qsub" x="${cx}" y="${cy + r + G0.fs * 2 + 7}" text-anchor="middle">${t.n} 条 · ${T_COLOR[t.color]}</text>` : ''}`;
      s += link ? `<a class="qbub" href="#/types" data-tcard="${t.id}" data-tip="${esc(tipTxt)}" aria-label="${esc(tipTxt)}">${inner}</a>` : `<g>${inner}</g>`;
    });
    return s + '</svg>';
  }
  function typeLegend(T) {
    const used = new Set(T.items.map((t) => t.color));
    return `<div class="legend qleg">${['sell', 'lead', 'both', 'flat'].filter((k) => used.has(k)).map((k) => `<span title="${esc(T_COLOR_LONG[k])}"><i style="background:var(--t-${k})"></i>${T_COLOR[k]}</span>`).join('')}<span class="mut">圆越大 = 条数越多 · 小图 = 离类中心最近的真实封面，点开看案例</span><span class="badge warn">赢家共性，相关非因果</span></div>`;
  }
  async function renderTypes() {
    const T = META.types;
    if (!T) { $main.innerHTML = '<div class="wrap boot">这个版本没有原型数据。</div>'; return; }
    const m = T.method || {}, q = m.quality || {};
    const card = (t) => `<article class="tcard" id="t-${t.id}">
        <div class="th"><i style="background:var(--t-${t.color})" aria-hidden="true"></i><h3><span class="mono">${t.id}</span> ${esc(t.name)}</h3><span class="xs mut">${t.n} 条 · ${T_COLOR[t.color]}</span></div>
        <p class="sm"><b>长什么样：</b>${esc(t.definition)}</p>
        <p class="sm"><b>强在哪 / 弱在哪：</b>${esc(typeStrength(t))}</p>
        <div class="tcov">${t.picks.slice(0, 3).map((p) => { const r = BYID[p.id] || {}; const src = coverSrc(p.id); return `<a href="#/case/${p.id}" title="${esc(r.t || p.id)}">${src ? `<img src="${src}" alt="${esc(r.t || '')}" loading="lazy" decoding="async">` : `<span class="phs">${esc(r.t || p.id)}</span>`}<span class="cap">${esc(r.t || p.id)}</span></a>`; }).join('')}</div>
        <a class="btn tgo" href="#/?arch=${t.id}">在精选里只看这一类 →</a>
      </article>`;
    // same quadrants as the chart above: right = 像笔记 share ≥ overall, top = 有人 share ≥ overall
    const quadOf = (t) => (t.y >= T.my ? 't' : 'b') + (t.x >= T.mx ? 'r' : 'l');
    const quads = ['tl', 'tr', 'bl', 'br'].map((k) => {
      const ts = T.items.filter((t) => quadOf(t) === k);
      return `<section class="tquad tq-${k}" aria-label="${esc(QUAD[k][0])} · ${esc(QUAD[k][1])}">
        <header class="tqh"><b>${QUAD[k][1]}</b><span class="xs mut">${QUAD[k][0]}</span><span class="xs mut tqn">${ts.length ? `${ts.length} 类 · ${ts.reduce((a, t) => a + t.n, 0)} 条` : '没有类落在这里'}</span></header>
        ${ts.length ? `<div class="tqcards">${ts.map(card).join('')}</div>` : ''}</section>`;
    }).join('');
    $main.innerHTML = `<div class="wrap">
      <section class="hero" style="grid-template-columns:1fr;padding-top:40px"><div><div class="kick lab">原型 · Types</div><h1>5 种封面长相</h1>
        <p class="lede">把 ${T.n} 张封面按长相自动分成 5 类（分组时不看成绩）。图上每个圆的位置是算出来的：往右 = 这类封面里「像笔记」的比例越高，往上 = 「有人出镜」的比例越高；两条中线是全体的平均（像笔记 ${Math.round(T.mx * 100)}%、有人 ${Math.round(T.my * 100)}%）。颜色说它在哪种榜里更靠前。</p></div></section>
      <section class="sec" style="padding-top:22px">
        <div class="qwrap" id="qwrap"></div>
        ${typeLegend(T)}
        <details class="meth"><summary>数据表</summary><div class="tw" style="margin-top:8px"><table class="t"><thead><tr><th>原型</th><th>条数</th><th>像笔记</th><th>有人</th><th>卖货（付费类）</th><th>要私信（线索）</th><th>颜色</th></tr></thead><tbody>
          ${T.items.map((t) => `<tr><td class="k">${t.id} ${esc(t.name)}</td><td class="c">${t.n}</td><td class="c">${Math.round(t.x * 100)}%</td><td class="c">${Math.round(t.y * 100)}%</td>${['sell', 'lead'].map((k) => { const s = t.strength[k]; return `<td class="c">${s ? `${fx(s.v)} vs ${fx(s.all)}` : '—'}</td>`; }).join('')}<td>${T_COLOR[t.color]}</td></tr>`).join('')}
          <tr><td class="k">全体</td><td class="c">${T.n}</td><td class="c">${Math.round(T.mx * 100)}%</td><td class="c">${Math.round(T.my * 100)}%</td><td></td><td></td><td></td></tr></tbody></table></div></details>
      </section>
      <section class="sec"><h2><span class="n">01</span>每一类</h2>
        <p class="xs mut" style="margin-bottom:12px">括号里的数 = 这类封面在本族榜里的典型位置（榜内百分位中位数，1 = 榜首，0 = 榜尾），vs 后面是全体；差 ≥ 0.05 才算强 / 弱，0.02–0.05 写「略」。卖货 = 付费类（GMV 代理）榜，要私信 = 线索榜。赢家共性，相关非因果。</p>
        <div class="tquads">${quads}</div>
        <details class="meth"><summary>方法细节</summary><ul>
          <li>范围：${esc(m.scope || '')}。</li>
          <li>算法：${esc(m.algorithm || '')}，k = ${m.k}（${esc(m.k_pinned || '')}）；选 k 的规则：${esc(m.k_rule || '')}。</li>
          <li>编码：${esc(m.encoding || '')}；用到的属性：${esc((m.attributes || []).join('、'))}。标注已含 ${m.label_corrections ?? '—'} 条人工更正（${esc(m.stage || '')}）。</li>
          <li>质量：轮廓系数 ${fx(q.silhouette_hamming, 3)}（汉明）/ ${fx(q.silhouette_encoded, 3)}（编码后）；稳定性（15 次 80% 子样本重拟合的 ARI）平均 ${fx(q.stability_ari_mean, 3)}、最低 ${fx(q.stability_ari_min, 3)}。${esc(q.reading || '')}</li>
          <li>象限位置：横轴 = 该类封面里 c_native = true（像普通用户发的）的占比；纵轴 = c_face = true 或 c_person ≠ none（有人）的占比；均用更正后的标注。中线 = 全体 ${T.n} 张的同一占比（${fx(T.mx, 3)} / ${fx(T.my, 3)}）。</li>
          <li>颜色：各类在付费类（GMV 代理）与线索两族的榜内百分位中位数 vs 全体中位数，差 ≥ ${T.eps} 算强。${esc(m.y_definition || '')}</li>
          <li>典型封面：离 k-means 类中心最近、有封面的笔记，优先「主题内且看得到 AI 产品」，同一作者只取一张。</li>
        </ul></details>
      </section></div>`;
    const draw = () => { const w = document.getElementById('qwrap'); if (w) w.innerHTML = quadSVG(T, w.clientWidth < 640 ? 'narrow' : 'full'); };
    draw();
    let rw = innerWidth; onResize(() => { if (parse().r === 'types' && Math.abs(innerWidth - rw) > 40) { rw = innerWidth; draw(); } });
    $main.querySelector('#qwrap').addEventListener('click', (e) => {
      const b = e.target.closest('[data-tcard]'); if (!b) return;
      e.preventDefault(); tip.hidden = true;
      const el = document.getElementById('t-' + b.getAttribute('data-tcard'));
      if (el) { el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 900); }
    });
  }

  async function renderAlgo(anchor) {
    const al = await get('algo');
    const y = al.y;
    const av = al.archetypes_v2;
    const models = al.models;
    const law = await get('laws');
    const lawByExp = {}; law.laws.forEach((L) => { if (L.experiment_id) (lawByExp[L.experiment_id] = lawByExp[L.experiment_id] || []).push(L.id); });
    const ov = (al.law_charts || {}).exposure_vs_conversion_top20;
    const knn = (al.match.knn || []);
    const prof = al.match.queencard_profile || {};
    $main.innerHTML = `<div class="wrap dshell" style="padding-top:0">
      <nav class="outline" aria-label="本页目录" style="top:calc(var(--top) + 40px)"><span class="lab">算法</span>
        ${[['y', 'Y 卡与 Y 梯子'], ['x', 'X 特征'], ['models', '模型卡'], ['overlap', '曝光 ≠ 转化'], ['arch', '原型'], ['match', 'Queencard 最近邻'], ['exps', '实验卡']].map(([k, t]) => `<a href="#/algo" data-jump="${k}">${t}</a>`).join('')}
        <span class="lab">模型</span>${models.map((m) => `<a href="#/algo" data-jump="m-${slug(m.name)}">${esc(m.name.split('（')[0])}</a>`).join('')}</nav>
      <div>
      <section class="hero" style="grid-template-columns:1fr;padding-top:40px"><div><div class="kick lab">算法 · Algo</div><h1>Y 先于 X</h1>
        <p class="lede">先定「赢」是什么（Y），再看哪些素材特征（X）和赢相关。没有 GMV 数值，所以用榜内排名百分位逐级代理；所有模型都是「榜单赢家之间」的比较。</p></div></section>
      <div class="caveat" style="margin-top:18px"><b>口径</b><span>相关，非因果；只有榜单赢家样本 → 赢家共性；标题 / 封面特征在控制项之外只多解释很小一部分差异（见每张模型卡的 R²）；预算、定向、出价不可得。</span></div>

      <section class="sec" id="y"><h2><span class="n">01</span>Y 卡与 Y 梯子</h2>
        <p class="sm" style="margin-bottom:12px">${esc(META.decision)}。百分位：${esc(y.percentile)}。</p>
        <div class="ladder">${y.ladder.map((l) => `<div class="rung ${l.available ? '' : 'na'}"><b>${esc(l.level)}</b><div><div style="font-weight:600">${esc(l.name)}</div>${l.note ? `<div class="xs mut">${esc(l.note)}</div>` : ''}</div><div class="x sm mut">${l.available ? `${l.lists != null ? l.lists + ' 个榜' : ''}${l.sheet_notes ? ` · 原表 ${l.sheet_notes} 条` : ''}` : '不可得'}</div></div>`).join('')}</div>
        <h3>Y 家族（榜单排序 → 家族）</h3>
        <div class="tw"><table class="t"><thead><tr><th>家族</th><th>级别</th><th>榜数</th><th>排序字段</th></tr></thead><tbody>${Object.entries(y.families).map(([k, v]) => `<tr><td class="k">${esc(famName(k))}</td><td>${esc(v.y_level)}</td><td class="c">${v.lists}</td><td class="sm">${esc(v.orders.join('、'))}</td></tr>`).join('')}</tbody></table></div>
      </section>

      <section class="sec" id="x"><h2><span class="n">02</span>X 特征</h2>
        <div class="grid2"><div class="box"><h4>标题规则（正则，method = rule）</h4>${Object.entries(al.x.title_rules).map(([k, v]) => `<div class="hit"><span>${esc(v)}</span><span class="v">${esc(k)}</span></div>`).join('')}</div>
        <div class="box"><h4>封面属性（模型看图标注，method = model，含人工更正）</h4>${(av.meta.attributes || []).map((t) => `<div class="hit"><span>${esc(t.label)}<br><span class="xs mut">${esc((t.levels || []).join(' / '))}</span></span><span class="v">${esc(t.attr)}</span></div>`).join('')}
          <p class="xs mut">另有：标题或封面全文结果词 tc_result（v2.1 词表）、封面信息密 busy、控制项（阅读 log、粉丝 log、发布天数、视频、榜固定效应）。字段字典：${esc(al.x.schema)}</p></div></div>
      </section>

      <section class="sec" id="models"><h2><span class="n">03</span>模型卡</h2>
        <p class="sm" style="margin-bottom:12px">两类模型：<b>榜内百分位 OLS</b>（Y = 榜内百分位，榜固定效应，特征标准化，β×100）与<b>前 20 vs 后 20 逻辑回归</b>（优势比 OR）。区间都是作者层 bootstrap 90% 区间；实心点 = 区间不跨 0 / 1。</p>
        ${models.map((m) => { const isOR = m.name.startsWith('cover_contrast'); const fam = m.name.split(' · ')[1].split('（')[0]; const r2 = META.r2[fam];
          const fxCardData = ((al.factor_examples || {}).cards || {})[m.name];
          const fxIds = {}; ((fxCardData || {}).factors || []).forEach((f) => { fxIds[f.feature] = fxIdOf(m.name, f.feature); });
          return `<div class="mcard" id="m-${slug(m.name)}" style="margin-bottom:16px;scroll-margin-top:calc(var(--top) + 12px)"><span class="lab">${isOR ? '逻辑回归 · 前 20 vs 后 20' : 'OLS · 榜内百分位'}</span><h3>${esc(m.name)}</h3>
            <p class="sm">${esc(m.kind)}。样本 ${num(m.n)} 行 · ${m.n_lists} 个榜 · ${num(m.n_authors)} 位作者${m.n_top ? `（前 20 ${m.n_top} / 后 20 ${m.n_bottom}）` : ''}。</p>
            <p class="sm"><b>R²：</b>${m.r2 != null ? `只控制项 ${m.r2_controls_only} → 加标题 / 形式 ${m.r2}（增量 ${fx((m.r2 - m.r2_controls_only) * 100, 1)} 个百分点）` : `逻辑回归无 R²；同族 OLS R² ${r2 ? r2.join(' → ') : '—'}`}。${esc(m.notes || '')}</p>
            ${forest(m, isOR, fxIds)}
            ${fxBlock(m, fxCardData)}
            <details style="margin-top:8px"><summary class="sm">表格</summary><div class="tw" style="margin-top:8px"><table class="t"><thead><tr><th>特征</th><th>${isOR ? 'OR' : 'β×100'}</th><th>90% 区间</th><th>稳定</th><th>${isOR ? '带该特征行' : '出现率'}</th></tr></thead><tbody>
              ${m.coefs.map((c) => `<tr><td>${esc(c.label)}</td><td class="c">${isOR ? fx(c.odds) : fx(c.beta * 100, 1)}</td><td class="c">${isOR ? `${fx(Math.exp(c.ci90[0]))}–${fx(Math.exp(c.ci90[1]))}` : `${fx(c.ci90[0] * 100, 1)} ~ ${fx(c.ci90[1] * 100, 1)}`}</td><td>${c.stable ? '✓' : ''}</td><td class="c">${isOR ? (c.n_with ?? '—') : (c.prevalence != null ? fx(c.prevalence * 100, 1) + '%' : '—')}</td></tr>`).join('')}</tbody></table></div></details></div>`; }).join('')}
      </section>

      <section class="sec" id="overlap"><h2><span class="n">04</span>曝光最多 ≠ 转化最好</h2>
        ${ov ? `<p class="sm" style="margin-bottom:10px">${esc(ov.title)}：${ov.n_pairs} 对，前 20 重合中位 <b>${Math.round(ov.median_share * 100)}%</b>；${ov.share_le_25pct} 对 ≤ 25%，${ov.share_ge_75pct} 对 ≥ 75%（直接计数，不依赖模型）。<a href="#/laws/L18">→ L18</a></p>
        ${bars(Object.entries(ov.by_family).map(([k, v]) => ({ k: famName(k), v: v.median_share, tip: `${famName(k)}：${v.n} 对，前 20 重合中位 ${Math.round(v.median_share * 100)}%` })), (v) => Math.round(v * 100) + '%')}
        <p class="xs mut" style="margin-top:6px">按 Y 家族：同一格子（链路 · 行业 · 时间窗）里曝光榜前 20 与转化榜前 20 的重合率中位数。${esc(ov.method || '')}</p>` : ''}
      </section>

      <section class="sec" id="arch"><h2><span class="n">05</span>原型 C1–C5</h2>
        <p class="sm" style="margin-bottom:10px">${META.types ? META.types.n : ''} 张封面按长相自动分成 5 类；每类的位置、强弱、典型封面和方法细节见原型页。<a href="#/types">见原型页 →</a></p>
        <a class="qmini" href="#/types" aria-label="打开原型页：5 个原型的象限图">${META.types ? quadSVG(META.types, 'mini') : ''}</a>
        <h3>原表 54 条的另一套原型（A0–A5，v1 字典）</h3>
        <div class="tw"><table class="t"><thead><tr><th>原型</th><th>条数</th><th>说明</th></tr></thead><tbody>${(al.sheet_archetypes_v1 || []).map((a2) => `<tr><td class="k">${esc(a2.id)} ${esc(a2.name)}</td><td class="c">${a2.size}</td><td class="sm">${esc(a2.desc)}</td></tr>`).join('')}</tbody></table></div>
      </section>

      <section class="sec" id="match"><h2><span class="n">06</span>Queencard 最近邻</h2>
        <p class="sm">${esc(prof.name || '')}：${esc(prof.what || '')}。<span class="mut">${esc(prof.assumption || '')}</span> 空间：${esc(al.match.scope)}。</p>
        <div class="grid2" style="margin-top:12px">${knn.map((k) => BYID[k.note_id] ? miniCase(k.note_id, null, `距离 ${fx(k.distance, 3)}${k.ctr != null ? ` · 原表 CTR ${fx(k.ctr * 100, 1)}%` : ''}${k.cost_per_open != null ? ` · 开口成本 ¥${fx(k.cost_per_open, 1)}` : ''}`) : `<div class="box"><b>${esc(k.title)}</b><span class="xs mut">距离 ${fx(k.distance, 3)}（不在精选层）</span></div>`).join('')}</div>
      </section>

      <section class="sec" id="exps"><h2><span class="n">07</span>实验卡（全部提议，未投放）</h2>
        <p class="sm" style="margin-bottom:12px">每张卡只改一个 X。来源：docs/reports/0003-queencard-experiments.md。E3、E4 已撤回（只有 Cayson 证据）。</p>
        <div class="grid2">${al.experiments.map((e) => expCard(e)).join('')}</div>
        <h3>未入卡的问题桶</h3>
        <div class="tw"><table class="t"><tbody>${Object.entries(al.experiment_buckets || {}).map(([k, v]) => `<tr><td class="k">${k}</td><td>${esc(v.title)}</td><td class="sm mut">${esc(v.handling)}</td></tr>`).join('')}</tbody></table></div>
      </section>
      </div></div>`;
    void lawByExp;
    if (anchor) { const el = document.getElementById(anchor); if (el) setTimeout(() => el.scrollIntoView({ block: 'start' }), 30); }
  }

  // ------------------------------------------------------------ LIBRARY
  const LQ = Object.assign({ q: '', ind: '', fam: '', feat: false }, store.get('atlas-lq') || {});
  async function renderLibrary() {
    $main.innerHTML = '<div class="wrap boot">加载素材库（13,749 条）…</div>';
    let rows, lists;
    if (A) {
      lists = A.lists;
      rows = A.library.map((x) => { const L = lists[x[4]]; return [x[0], x[1], x[2], x[3] ? '视频' : '图文', L[5], L[4] > 1 ? 1 - (x[5] - 1) / (L[4] - 1) : 1, x[5], L[4], x[4], L[2], x[6], x[7]]; });
    } else {
      const parts = await Promise.all([0, 1, 2, 3].map((i) => get('library-' + i)));
      rows = [].concat(...parts); lists = await get('lists');
    }
    const textOnly = !!A;
    const inds = [...new Set(rows.map((r) => r[4]))].sort();
    const fams = META.family_order.filter((f) => rows.some((r) => r[9] === f));
    $main.innerHTML = `<div class="wrap">
      <section class="hero" style="grid-template-columns:1fr;padding-bottom:20px"><div><div class="kick lab">素材库 · Library</div><h1>全量 ${num(rows.length)} 条</h1>
        <p class="lede">聚光内容广场 393 个榜单的全部笔记（2026-09-30 快照）。只有标题、作者、最好名次和上榜记录；有精选标记的点开进完整详情。${textOnly ? '这是精简版：只有文字列表，没有缩略图和上榜明细。' : '缩略图直接引用小红书原图链接，加载失败显示占位。'}</p></div></section>
      <div class="libbar">
        <label class="search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="lq" type="search" placeholder="搜标题 / 作者" value="${esc(LQ.q)}" aria-label="搜索素材库"></label>
        <select id="lind" aria-label="行业"><option value="">全部行业</option>${inds.map((i) => `<option ${LQ.ind === i ? 'selected' : ''}>${esc(i)}</option>`).join('')}</select>
        <select id="lfam" aria-label="最好名次所在 Y 家族"><option value="">全部榜单类型</option>${fams.map((f) => `<option value="${esc(f)}" ${LQ.fam === f ? 'selected' : ''}>${esc(famName(f))}</option>`).join('')}</select>
        <label class="chip"><input type="checkbox" id="lfeat" ${LQ.feat ? 'checked' : ''} style="margin:0"> 只看精选层</label>
        <span class="sm mut" id="lcnt"></span>
      </div>
      <div class="vlist" id="vl" role="list"></div>
      <dialog class="drawer" id="dr" aria-label="笔记详情"><div class="in" id="drin"></div></dialog></div>`;
    const vl = document.getElementById('vl');
    const H = textOnly ? 56 : 76;
    let cur = [];
    const apply = () => {
      const q = LQ.q.toLowerCase();
      cur = rows.filter((r) => (!q || (r[1] || '').toLowerCase().includes(q) || (r[2] || '').toLowerCase().includes(q)) && (!LQ.ind || r[4] === LQ.ind) && (!LQ.fam || r[9] === LQ.fam) && (!LQ.feat || r[11]));
      document.getElementById('lcnt').textContent = `${num(cur.length)} 条 · 按最好榜内百分位排序`;
      vl.style.height = cur.length * H + 'px';
      paint(true);
    };
    cur = [];
    rows.sort((a, b) => (b[5] - a[5]) || (b[10] - a[10]) || (a[0] < b[0] ? -1 : 1));
    let lastStart = -1;
    const paint = (force) => {
      if (parse().r !== 'library') return;
      const top = vl.getBoundingClientRect().top + scrollY;
      const s = Math.max(0, Math.floor((scrollY - top) / H) - 8);
      const e = Math.min(cur.length, s + Math.ceil(innerHeight / H) + 16);
      if (!force && s === lastStart) return; lastStart = s;
      let html = '';
      for (let i = s; i < e; i++) {
        const r = cur[i];
        const th = textOnly ? '' : `<div class="th">${r[12] ? `<img src="${esc(r[12])}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.textContent='封面不可得'">` : '封面不可得'}</div>`;
        html += `<div role="listitem" tabindex="0" class="lrow ${textOnly ? 'txt' : ''}" style="top:${i * H}px" data-i="${i}">${window.AtlasFavorites.button(r[0])}${th}
          <div style="min-width:0"><div class="tt">${r[11] ? '<span class="badge acc">精选</span> ' : ''}${esc(r[1])}</div><div class="mt">${esc(r[2])} · ${esc(r[3])} · ${esc(r[4])} · 上榜 ${r[10]} 次</div></div>
          <div class="rk">${r[6]}/${r[7]}<br><span class="mut xs">${esc(famName(r[9]))}</span></div></div>`;
      }
      vl.innerHTML = html;
    };
    const onScroll = () => requestAnimationFrame(() => paint(false));
    addEventListener('scroll', onScroll, { passive: true });
    const off = () => { if (parse().r !== 'library') { removeEventListener('scroll', onScroll); removeEventListener('hashchange', off); } };
    addEventListener('hashchange', off);
    onResize(() => paint(true));
    let t;
    document.getElementById('lq').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => { LQ.q = e.target.value.trim(); store.set('atlas-lq', LQ); apply(); }, 180); });
    document.getElementById('lind').onchange = (e) => { LQ.ind = e.target.value; store.set('atlas-lq', LQ); apply(); };
    document.getElementById('lfam').onchange = (e) => { LQ.fam = e.target.value; store.set('atlas-lq', LQ); apply(); };
    document.getElementById('lfeat').onchange = (e) => { LQ.feat = e.target.checked; store.set('atlas-lq', LQ); apply(); };
    const dr = document.getElementById('dr');
    vl.addEventListener('keydown', (e) => { if (e.target.classList.contains('lrow') && ['Enter',' '].includes(e.key)) { e.preventDefault(); e.target.click(); } });
    vl.addEventListener('click', (e) => {
      const b = e.target.closest('.lrow'); if (!b) return;
      if (e.target.closest('[data-favorite]')) return;
      const r = cur[+b.dataset.i];
      if (BYID[r[0]]) { location.hash = '#/case/' + r[0]; return; }
      const L = lists[r[8]];
      const apps = textOnly ? [] : (r[14] || []);
      const url = textOnly ? `https://www.xiaohongshu.com/explore/${r[0]}` : r[13];
      document.getElementById('drin').innerHTML = `<button type="button" class="btn x" id="drx">关闭</button>
        ${!textOnly && r[12] ? `<img src="${esc(r[12])}" alt="" style="max-width:240px;border-radius:8px" referrerpolicy="no-referrer" onerror="this.outerHTML='<div class=&quot;ph&quot; style=&quot;max-width:240px&quot;><b>${esc(r[1]).replace(/'/g, '')}</b><small>封面不可得</small></div>'">` : ''}
        <h2 style="font-size:20px">${esc(r[1])}</h2>
        <dl class="kv"><dt>作者</dt><dd>${esc(r[2])}</dd><dt>形式</dt><dd>${esc(r[3])}</dd><dt>行业</dt><dd>${esc(r[4])}</dd>
          <dt>最好名次</dt><dd>${r[6]}/${r[7]} · 百分位 ${pctTxt(r[5])}<br><span class="xs mut">${esc(L ? L[0] : '')}</span></dd><dt>上榜</dt><dd>${r[10]} 次</dd><dt>精选层</dt><dd>否（没有封面标注与拆解）</dd></dl>
        ${apps.length ? `<div class="tw"><table class="t"><thead><tr><th>榜单</th><th>名次</th></tr></thead><tbody>${apps.map(([li, rk]) => `<tr class="${lists[li][8] ? 'off' : ''}"><td class="sm">${esc(lists[li][0])}</td><td class="c">${rk}/${lists[li][4]}</td></tr>`).join('')}</tbody></table></div>` : ''}
        <a class="btn" href="${esc(url)}" target="_blank" rel="noopener noreferrer">在小红书打开 ↗</a>${textOnly ? '<p class="xs mut">精简版没有带签名参数的链接，可能需要在 App 里搜索。</p>' : ''}`;
      dr.showModal();
      document.getElementById('drx').onclick = () => dr.close();
    });
    dr.addEventListener('click', (e) => { if (e.target === dr) dr.close(); });
    apply();
  }

  // ------------------------------------------------------------ REF (Cayson)
  async function renderRef() {
    const ref = await get('ref');
    const m = ref.model || {};
    $main.innerHTML = `<div class="wrap">
      <div style="padding-top:24px" class="crumb"><a class="btn" href="#/ref">← 邻近参照</a></div>
      <section class="hero" style="grid-template-columns:1fr;padding-top:28px"><div><div class="kick lab">邻近参照 · Cayson</div><h1>是Cayson ${ref.items.length} 条</h1>
        <p class="lede">${esc(ref.note)}。这里只做对照阅读：它的数字<b>不进</b>首页统计、模型、规律和实验卡证据（E3、E4 因为只有这里的证据已撤回）。</p></div></section>
      <div class="caveat" style="margin-top:18px"><b>不进统计</b><span>另一业务线（数码 / 生活技巧博主的自然笔记），Y 只有点赞收藏评论（Y1），与 AI 产品投放榜单不可比。</span></div>
      <section class="sec"><h2><span class="n">01</span>参照模型（只作对照）</h2><p class="sm">${esc(m.name || '')}：${esc(m.kind || '')}；n = ${m.n ?? '—'}，交叉验证 AUC ${fx(m.auc)} ± ${fx(m.auc_sd)}。${esc(m.notes || '')}</p>
        ${m.coefs && m.coefs.length ? `<div class="tw" style="margin-top:10px"><table class="t"><thead><tr><th>特征</th><th>系数</th><th>90% 区间</th></tr></thead><tbody>${m.coefs.map((c) => `<tr><td>${esc(c.label || c.feature)}</td><td class="c">${fx(c.coef ?? c.beta)}</td><td class="c">${c.ci90 ? fx(c.ci90[0]) + ' ~ ' + fx(c.ci90[1]) : '—'}</td></tr>`).join('')}</tbody></table></div>` : ''}</section>
      <section class="sec"><h2><span class="n">02</span>条目</h2><div class="tw"><table class="t"><thead><tr><th>标题</th><th>形式</th><th>赞</th><th>藏</th><th>评</th><th></th></tr></thead><tbody>
        ${ref.items.map((x) => `<tr><td>${esc(x.title)}</td><td>${esc(x.format)}</td><td class="c">${num(x.metrics.likes)}</td><td class="c">${num(x.metrics.collects)}</td><td class="c">${num(x.metrics.comments)}</td><td class="favorite-table">${window.AtlasFavorites.button(x.id)}<a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">↗</a></td></tr>`).join('')}</tbody></table></div></section></div>`;
  }

  // ------------------------------------------------------------ REF hub
  async function renderRefHub() {
    const [ref, ss] = await Promise.all([get('ref'), get('ss')]);
    const card = (href, kick, title, n, body, foot) => `<a class="refcard" href="${href}"><span class="lab">${kick}</span><h2>${title}</h2>
      <p class="sm">${body}</p><p class="xs mut">${foot}</p><span class="go">${n} 条 →</span></a>`;
    $main.innerHTML = `<div class="wrap">
      <section class="hero" style="grid-template-columns:1fr"><div><div class="kick lab">邻近参照 · Reference</div><h1>邻近参照</h1>
        <p class="lede">不是聚光投放榜、但值得对照着看的两组素材。它们的数字<b>都不进</b>首页统计、模型、规律和实验卡证据。</p></div></section>
      <div class="refhub">
        ${card('#/ref/cayson', '小红书 · 自然笔记', '是Cayson', ref.items.length, esc(ref.note), '另一业务线（数码 / 生活技巧博主），Y 只有赞藏评；E3、E4 因为只有这里的证据已撤回。')}
        ${card('#/ss', 'X 平台 · 产品演示视频（已单独成页）', 'Screen Studio 展示墙', ss.n, esc(ss.summary.split('\n')[0]), `screen.studio 官网挑出的 X 帖子（${esc(ss.captured_at || '')} 抓取）；拆了 12 条规律，提了 5 个 Queencard 视频实验。`)}
      </div></div>`;
  }

  // ------------------------------------------------------------ REF · Screen Studio (X 平台产品演示视频)
  async function renderSS() {
    const ss = await get('ss');
    const by = {}; ss.items.forEach((x) => { by[x.id] = x; });
    const poster = (id) => (A ? (ss.posters || {})[id] : `covers-ss/${id}.webp`);
    const AUD = { silent: '静音', music: '音乐', voice: '人声' };
    const thumb = (id) => { const x = by[id]; if (!x) return ''; const p = poster(id);
      return `<button type="button" class="ssthumb" data-ss="${id}" aria-label="${esc(x.name)}：${esc(x.feature || x.zh || '')}">${p ? `<img src="${p}" alt="" loading="lazy" style="aspect-ratio:${x.w}/${x.h}">` : ''}<span>${esc(x.name)}</span></button>`; };
    // card = the original video, playable in place (local build); the artifact build has no videos → poster opens the detail
    const sscard = (x) => { const p = poster(x.id);
      const still = `<div class="pv" style="aspect-ratio:${x.w}/${x.h}">${p ? `<img src="${p}" alt="" loading="lazy">` : ''}<a class="vlink" href="${esc(x.url)}" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 2v8l7-4z"/></svg>在 X 上看 · ${dur(x.dur)} ↗</a></div>`;
      const media = !A && x.hv
        ? `<div class="pv vid"><video controls playsinline preload="none" ${p ? `poster="${p}"` : ''} style="aspect-ratio:${x.w}/${x.h}" data-fb="ssfb-${x.id}" aria-label="${esc(x.name)} 演示视频"><source src="videos-ss/${x.id}.mp4" type="video/mp4"></video></div><div id="ssfb-${x.id}" hidden>${still}</div>`
        : still;
      return `<article class="sscard">${window.AtlasFavorites.button(x.id)}${media}
        <div class="b"><div class="nm"><b>${esc(x.name)}</b><span class="mut">@${esc(x.handle)}</span></div>
        <div class="ln">${esc(x.feature || x.zh || '')}</div>
        <div class="mt"><span>♥ ${num(x.likes)}</span><span>${dur(x.dur)}</span><span>${esc(x.aspect || '')}</span><span>${esc(AUD[x.g.audio] || x.g.audio || '')}</span>${x.g.zoom ? '<span>自动缩放</span>' : ''}</div>
        <button type="button" class="btn sm ssmore" data-ss="${x.id}">看拆解</button></div></article>`; };
    // two axes from the data: who posts (brand vs personal, P11) × whether someone explains (voice-over or face cam, P03/P09)
    const talks = (x) => x.g.audio === 'voice' || !!x.g.face;
    const SSQ = { tl: ['品牌号 · 有人讲解', '官方教程'], tr: ['个人号 · 有人讲解', '创作者讲解'], bl: ['品牌号 · 静默演示', '官方功能短片'], br: ['个人号 · 静默演示', '「我做了 / 刚上线」'] };
    const ssq = (x) => (talks(x) ? 't' : 'b') + (x.kind === 'brand' ? 'l' : 'r');
    const med = (a) => { if (!a.length) return null; const b = a.slice().sort((u, v) => u - v); const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
    const lawLink = (l) => `<a class="badge acc" href="#/laws/${esc(l)}">${esc(l)}</a>`;
    const items = ss.items.slice().sort((a, b) => (b.likes || 0) - (a.likes || 0));
    $main.innerHTML = `<div class="wrap ss">
      <section class="hero" style="grid-template-columns:1fr;padding-top:40px"><div><div class="kick lab">Screen Studio · 产品演示视频</div><h1>好看的录屏演示片长什么样</h1>
        <div class="en">${ss.n} product demos from the screen.studio showcase on X</div>
        <p class="lede">screen.studio 官网展示墙上的 ${ss.n} 条 X 帖子（Stripe、Notion、Vercel、levelsio……），都是用 Screen Studio 录的产品演示。每条抽 10 帧逐条看，数出 12 条共性，再搬成 5 个给 ima Queencard 的视频实验提议。</p></div></section>
      <div class="caveat" style="margin-top:18px"><b>不进统计</b><span>邻近参照：X 平台产品演示视频，不进小红书统计；赢家共性（官网挑出来的 ${ss.n} 条，看不到失败案例；点赞受账号体量影响，只作描述）。</span></div>
      <section class="sec"><h2><span class="n">01</span>一句话</h2><p class="ssum">${esc(ss.summary)}</p></section>
      <section class="sec"><h2><span class="n">02</span>${ss.patterns.length} 条共性（n / N）</h2>
        <div class="pats">${ss.patterns.map((p) => `<div class="pat"><div class="ph2"><span class="id">${esc(p.id)}</span><h3>${esc(p.title)}</h3>
          ${p.n != null && p.N ? `<span class="nn"><b>${p.n}</b>/${p.N}</span>` : ''}</div>
          ${p.n != null && p.N ? `<div class="pctbar" aria-hidden="true"><i style="width:${Math.round(p.n / p.N * 100)}%"></i></div>` : ''}
          <p class="sm">${esc(p.finding)}</p>
          <div class="sthumbs">${p.ex.slice(0, 4).map(thumb).join('')}</div></div>`).join('')}</div></section>
      <section class="sec"><h2><span class="n">03</span>全部 ${ss.n} 条 · 四象限 <span class="mut sm" style="font-family:var(--sans);font-weight:400">横轴：品牌号 / 个人号 · 纵轴：有人讲解（人声或头像框）/ 静默演示 · 格内按点赞排序 · ${A ? '视频在 X 上看' : '直接播放原视频'}</span></h2>
        <div class="tquads ssquads">${['tl', 'tr', 'bl', 'br'].map((k) => { const xs = items.filter((x) => ssq(x) === k); const ml = med(xs.map((x) => x.likes || 0)), mk = med(xs.map((x) => x.lpk || 0));
          return `<section class="tquad" aria-label="${esc(SSQ[k][0])}"><header class="tqh"><b>${SSQ[k][1]}</b><span class="xs mut">${SSQ[k][0]}</span><span class="xs mut tqn">${xs.length ? `${xs.length} 条 · 点赞中位 ${num(Math.round(ml))} · 每千粉 ${fx(mk)} 赞` : '没有条目落在这里'}</span></header>
            ${xs.length ? `<div class="ssgrid">${xs.map(sscard).join('')}</div>` : ''}</section>`; }).join('')}</div>
        <p class="xs mut" style="margin-top:8px">点赞受账号体量影响，中位数只作描述；官网挑出来的都是赢家，相关非因果。</p></section>
      <section class="sec"><h2><span class="n">04</span>给 ima Queencard 的 ${ss.ideas.length} 个视频实验</h2>
        <p class="sm mut" style="margin-bottom:12px">全部是提议，未投放。每条挂到图鉴里的规律；做法来自上面的演示片，搬到小红书前都要当作待验证的假设。</p>
        <div class="ideas">${ss.ideas.map((i) => `<article class="idea"><div><span class="id">${esc(i.id)}</span> <span class="badge warn">${esc(i.status)}</span></div>
          <h3>${esc(i.title)}</h3>
          <dl class="kv"><dt>脚本</dt><dd>${esc(i.script)}</dd><dt>封面</dt><dd>${esc(i.cover)}</dd><dt>假设</dt><dd>${esc(i.hypothesis)}</dd>
          <dt>规律</dt><dd><span class="feats">${(i.laws || []).map(lawLink).join('')}</span><span class="xs mut">${esc(i.law_notes || '')}</span></dd></dl>
          <div class="lab">参考</div><div class="sthumbs">${(i.inspired_by || []).map(thumb).join('')}</div></article>`).join('')}</div></section>
      <p class="xs mut" style="margin-top:24px">${esc(ss.method || '')}</p>
      <dialog class="ssdlg" id="ssdlg" aria-label="演示视频"><div class="in" id="ssin"></div></dialog></div>`;
    wireVideos($main);
    const dlg = document.getElementById('ssdlg');
    const ssin = document.getElementById('ssin'); // keep the node: 'close' can fire after a route change removed the dialog
    const open = (id) => {
      const x = by[id]; if (!x) return;
      const p = poster(id);
      const media = !A && x.hv
        ? `<video controls playsinline preload="metadata" ${p ? `poster="${p}"` : ''} style="aspect-ratio:${x.w}/${x.h}" data-fb="ssfb" aria-label="${esc(x.name)} 演示视频"><source src="videos-ss/${id}.mp4" type="video/mp4"></video>`
        : '';
      const still = `<div class="ssstill" style="aspect-ratio:${x.w}/${x.h}">${p ? `<img src="${p}" alt="">` : ''}<a class="vlink" href="${esc(x.url)}" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 2v8l7-4z"/></svg>在 X 上看 · ${dur(x.dur)} ↗</a></div>`;
      const yn = (b) => (b ? '有' : '无');
      ssin.innerHTML = `<div class="hd"><div><b>${esc(x.name)}</b> <span class="mut sm">@${esc(x.handle)} · ${esc(x.date)} · ${x.kind === 'brand' ? '品牌号' : '个人号'}</span></div><button type="button" class="btn" id="ssx">关闭</button></div>
        ${media ? `${media}<div id="ssfb" hidden>${still}</div>` : still}
        <p class="sm" style="margin-top:12px"><b>${esc(x.product || '')}</b> · ${esc(x.feature || '')}</p>
        <p class="sm mut">${esc(x.zh || '')}</p>
        <dl class="kv"><dt>开场</dt><dd>${esc(x.op[0] || '')}：${esc(x.op[1] || '')}</dd><dt>结尾</dt><dd>${esc(x.end[0] || '')}：${esc(x.end[1] || '')}</dd>
          <dt>手法</dt><dd>自动缩放 ${yn(x.g.zoom)} · 留边圆角 ${yn(x.g.pad)} · 背景 ${esc(x.g.bg || '—')} · 动态模糊 ${x.g.blur ? '看到' : '未见'} · 头像框 ${yn(x.g.face)} · 字幕 ${yn(x.g.cap)} · 手机外框 ${yn(x.g.dev)} · ${esc(AUD[x.g.audio] || x.g.audio || '')}</dd>
          <dt>数字</dt><dd>${dur(x.dur)} · ${esc(x.aspect || '')} · ♥ ${num(x.likes)} · 每千粉 ${fx(x.lpk)} 赞 · ${num(x.fol)} 粉（抓取时）</dd>
          <dt>链接</dt><dd><a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">X 原帖 ↗</a></dd></dl>`;
      wireVideos(dlg);
      document.getElementById('ssx').onclick = () => dlg.close();
      dlg.showModal();
    };
    $main.querySelector('.ss').addEventListener('click', (e) => { const b = e.target.closest('[data-ss]'); if (b) open(b.dataset.ss); });
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', () => { dlg.querySelectorAll('video').forEach((v) => v.pause()); ssin.innerHTML = ''; });
  }

  route();
})();
