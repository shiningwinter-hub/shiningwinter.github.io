/* 우리가 만든 세상, 우리가 채우는 색깔 — 학생용 컬러링북 앱
 * 서버·로그인 없이 동작합니다. 색칠 결과는 이 기기의 브라우저(IndexedDB)에만 저장됩니다.
 */
(() => {
  'use strict';

  // ===== 설정 =====
  const CONFIG = {
    maxSide: 1600,        // 색칠 캔버스 최대 크기(px). 태블릿 메모리를 고려한 값
    lineThreshold: 165,   // 이 밝기보다 어두운 픽셀은 '선'으로 보고 채우기를 막음
    edgeGrow: 3,          // 채운 색을 선 밑으로 몇 px 넓힐지(흰 틈 방지)
    undoBytes: 90e6,      // 되돌리기 기록 최대 용량
    saveDelay: 1200,      // 자동 저장 지연(ms)
    brushSizes: [10, 24, 48], // 1600px 기준 붓 굵기
  };

  const CATEGORIES = [
    { name: '전체', emoji: '🌈' },
    { name: '나만의 친구', emoji: '🧸' },
    { name: '좋아하는 음식', emoji: '🍰' },
    { name: '좋아하는 동물', emoji: '🐶' },
    { name: '좋아하는 공룡', emoji: '🦖' },
    { name: '나의 모습', emoji: '🙂' },
    { name: '자유 상상', emoji: '✨' },
  ];

  const PALETTE = [
    '#FF5A5F', '#FF9F43', '#FFD93D', '#A3E048',
    '#3CB371', '#4DD0E1', '#4A90E2', '#6C5CE7',
    '#C77DFF', '#FF8FC7', '#FFD8BE', '#E0A370',
    '#8B5A2B', '#A0A0A0', '#333333', '#FFFFFF',
  ];

  const ICONS = {
    play: '<path d="M8 5l11 7-11 7z" fill="currentColor"/>',
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
    back: '<path d="M15 4l-8 8 8 8"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/>',
    reset: '<path d="M3 4v6h6"/><path d="M3.5 15a9 9 0 102.1-9.4L3 10"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    check: '<path d="M4 12.5l5 5L20 6.5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    bucket: '<path d="M4 12l7-7 7 7-7 7z"/><path d="M4 12h14"/><path d="M20 15s2 2.6 2 4a2 2 0 01-4 0c0-1.4 2-4 2-4z" fill="currentColor"/>',
    brush: '<path d="M14 4l6 6-8 8-6-6z"/><path d="M6 12c-2 0-3.5 1.5-3.5 4 0 1.5-.8 2.5-1.5 3 3 .8 7 .3 8.5-2"/>',
    eraser: '<path d="M15 3l6 6-10 10H6l-3-3z"/><path d="M9 7l8 8M10 21h11"/>',
    magic: '<path d="M4 20L15 9"/><path d="M13 7l4 4"/><path d="M17 2v4M15 4h4M21 8v3M19.5 9.5h3M10 3v2M9 4h2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    mine: '<path d="M12 21s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 11c0 5.5-7 10-7 10z"/>',
    paint: '<path d="M12 3a9 9 0 100 18c1 0 1.6-.8 1.6-1.6 0-.5-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.6 1.6-1.6H16a5 5 0 005-5C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1.2" fill="currentColor"/><circle cx="10" cy="7" r="1.2" fill="currentColor"/><circle cx="15" cy="7.5" r="1.2" fill="currentColor"/>',
  };
  const icon = (n) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;

  // ===== 작은 도우미 =====
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  function applyIcons(root = document) {
    $$('[data-icon]', root).forEach((el) => {
      if (el.dataset.iconDone) return;
      el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon));
      el.dataset.iconDone = '1';
    });
  }
  function loadImage(src) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => res(img);
      img.onerror = () => rej(new Error('이미지를 불러오지 못했어요: ' + src));
      img.src = src;
    });
  }
  const toBlob = (canvas, type = 'image/png', q) => new Promise((r) => canvas.toBlob(r, type, q));
  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  let toastTimer;
  function toast(msg, ms = 1800) {
    const t = $('#toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.hidden = true), ms);
  }
  const loading = (on) => ($('#loading').hidden = !on);

  function confirmBox(msg, iconName = 'reset') {
    return new Promise((resolve) => {
      const m = $('#modal');
      $('#modal-msg').textContent = msg;
      $('#modal-icon').innerHTML = icon(iconName);
      m.hidden = false;
      const done = (v) => { m.hidden = true; yes.onclick = no.onclick = null; resolve(v); };
      const yes = $('#modal-yes'), no = $('#modal-no');
      yes.onclick = () => done(true);
      no.onclick = () => done(false);
    });
  }

  // ===== 저장소 (IndexedDB) =====
  const DB = (() => {
    let dbp;
    const open = () => dbp || (dbp = new Promise((res, rej) => {
      const r = indexedDB.open('our-colorbook', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('works', { keyPath: 'id' });
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    }));
    const tx = async (mode, fn) => {
      const db = await open();
      return new Promise((res, rej) => {
        const t = db.transaction('works', mode);
        const req = fn(t.objectStore('works'));
        t.oncomplete = () => res(req && req.result);
        t.onerror = () => rej(t.error);
      });
    };
    return {
      get: (id) => tx('readonly', (s) => s.get(id)).catch(() => null),
      put: (rec) => tx('readwrite', (s) => s.put(rec)),
      del: (id) => tx('readwrite', (s) => s.delete(id)),
      all: () => tx('readonly', (s) => s.getAll()).catch(() => []),
    };
  })();

  // ===== 작품 데이터 =====
  const state = { site: {}, artworks: [], category: '전체', version: '' };
  const byId = (id) => state.artworks.find((a) => a.id === id);
  const assetUrl = (p) => (p ? p + (state.version ? (p.includes('?') ? '&' : '?') + 'v=' + state.version : '') : '');

  async function loadArtworks() {
    try {
      const r = await fetch('artworks.json', { cache: 'no-store' });
      const data = await r.json();
      const list = Array.isArray(data) ? data : data.artworks || [];
      state.site = Array.isArray(data) ? {} : data;
      state.version = String(state.site.version || '');
      state.artworks = list.filter((a) => a && a.id && a.coloring);
    } catch (e) {
      console.error(e);
      toast('작품 목록을 불러오지 못했어요', 4000);
    }
    if (state.site.title) {
      $('#site-title').innerHTML = esc(state.site.title).replace(/,\s*/, ',<br>');
      document.title = state.site.title;
    }
    if (state.site.subtitle) $('#site-subtitle').textContent = state.site.subtitle;
  }

  // ===== 화면 전환 (주소 #/... 사용 → 태블릿 뒤로가기 지원) =====
  const screens = ['start', 'list', 'detail', 'color', 'done', 'mine'];
  function show(name) {
    screens.forEach((s) => ($('#screen-' + s).hidden = s !== name));
  }

  let currentRoute = '';
  async function route() {
    const h = location.hash.replace(/^#\/?/, '');
    const [page, id] = h.split('/').map(decodeURIComponent);
    const keep = (page === 'color' || page === 'done') && Painter.art && Painter.art.id === id;
    if (Painter.art) await (keep ? Painter.save() : Painter.close());
    currentRoute = h;
    if (page === 'list') return renderList();
    if (page === 'mine') return renderMine();
    if (page === 'art' && byId(id)) return renderDetail(byId(id));
    if (page === 'color' && byId(id)) return openColor(byId(id));
    if (page === 'done' && byId(id)) return renderDone(byId(id));
    show('start');
  }

  // ----- 작품 목록 -----
  async function renderList() {
    show('list');
    const used = new Set(state.artworks.map((a) => a.category));
    const bar = $('#cat-bar');
    bar.innerHTML = CATEGORIES.filter((c) => c.name === '전체' || used.has(c.name))
      .map((c) => `<button class="cat" data-cat="${esc(c.name)}" aria-pressed="${c.name === state.category}"><span class="emoji">${c.emoji}</span>${esc(c.name)}</button>`)
      .join('');
    bar.onclick = (e) => {
      const b = e.target.closest('.cat');
      if (!b) return;
      state.category = b.dataset.cat;
      renderList();
    };
    const saved = new Map((await DB.all()).map((w) => [w.id, w]));
    const list = state.artworks.filter((a) => state.category === '전체' || a.category === state.category);
    $('#art-grid').innerHTML = list.length
      ? list.map((a) => {
          const w = saved.get(a.id);
          const badge = w ? `<span class="badge ${w.done ? 'done' : ''}">${icon(w.done ? 'check' : 'paint')}</span>` : '';
          return `<a class="art-card" href="#/art/${encodeURIComponent(a.id)}">
            <img class="thumb" loading="lazy" src="${esc(assetUrl(a.thumbnail || a.original || a.coloring))}" alt="">
            ${badge}
            <div class="meta"><div class="name">${esc(a.title)}</div>${a.category ? `<span class="chip">${esc(a.category)}</span>` : ''}</div>
          </a>`;
        }).join('')
      : `<p class="empty">아직 그림이 없어요</p>`;
  }

  // ----- 작품 상세 -----
  async function renderDetail(a) {
    show('detail');
    $('#detail-title').textContent = a.title;
    $('#detail-original').src = assetUrl(a.original || a.coloring);
    $('#detail-coloring').src = assetUrl(a.coloring);
    $('#detail-desc').textContent = a.description || '';
    const saved = await DB.get(a.id);
    const box = $('#detail-actions');
    const href = '#/color/' + encodeURIComponent(a.id);
    box.innerHTML = saved
      ? `<a class="btn btn-huge btn-primary" href="${href}" data-icon="brush"><span>이어서 칠하기</span></a>
         <button class="btn btn-big btn-soft" id="btn-fresh" data-icon="reset"><span>새로 칠하기</span></button>`
      : `<a class="btn btn-huge btn-primary" href="${href}" data-icon="brush"><span>색칠 시작</span></a>`;
    applyIcons(box);
    const fresh = $('#btn-fresh');
    if (fresh) fresh.onclick = async () => {
      if (await confirmBox('칠한 것을 지우고\n새로 시작할까요?')) {
        await DB.del(a.id);
        location.hash = href;
      }
    };
  }

  // ----- 내 작품 -----
  let mineUrls = [];
  async function renderMine() {
    show('mine');
    mineUrls.forEach(URL.revokeObjectURL); mineUrls = [];
    const works = (await DB.all()).filter((w) => byId(w.id)).sort((a, b) => b.updated - a.updated);
    const grid = $('#mine-grid');
    if (!works.length) {
      grid.innerHTML = `<p class="empty">아직 색칠한 그림이 없어요</p>`;
      return;
    }
    grid.innerHTML = works.map((w) => {
      const a = byId(w.id);
      const url = w.previewBlob ? URL.createObjectURL(w.previewBlob) : assetUrl(a.coloring);
      if (w.previewBlob) mineUrls.push(url);
      return `<a class="art-card" href="#/color/${encodeURIComponent(a.id)}">
        <img class="thumb" src="${url}" alt="" style="object-fit:contain">
        <span class="badge ${w.done ? 'done' : ''}">${icon(w.done ? 'check' : 'paint')}</span>
        <button class="btn btn-soft del" data-del="${esc(a.id)}" aria-label="지우기">${icon('trash')}</button>
        <div class="meta"><div class="name">${esc(a.title)}</div></div>
      </a>`;
    }).join('');
    grid.onclick = async (e) => {
      const d = e.target.closest('[data-del]');
      if (!d) return;
      e.preventDefault();
      if (await confirmBox('이 그림을 지울까요?', 'trash')) {
        await DB.del(d.dataset.del);
        renderMine();
      }
    };
  }

  // ----- 완성 -----
  async function renderDone(a) {
    show('done');
    let src;
    if (Painter.art && Painter.art.id === a.id) {
      src = Painter.composite(1400).toDataURL('image/png');
    } else {
      const w = await DB.get(a.id);
      src = w && w.previewBlob ? URL.createObjectURL(w.previewBlob) : assetUrl(a.coloring);
    }
    $('#done-img').src = src;
    $('#btn-continue').onclick = () => (location.hash = '#/color/' + encodeURIComponent(a.id));
    $('#btn-save-png').onclick = () => Painter.exportPng(a);
    confetti();
  }

  function confetti() {
    const box = $('#confetti');
    box.innerHTML = '';
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const colors = ['#FF8A80', '#FFD166', '#8FD694', '#7CC6FE', '#C3A6FF', '#FF9FCF'];
    for (let i = 0; i < 70; i++) {
      const p = document.createElement('i');
      p.style.left = Math.random() * 100 + '%';
      p.style.background = colors[i % colors.length];
      p.style.animationDuration = 2.2 + Math.random() * 2.5 + 's';
      p.style.animationDelay = Math.random() * 1.2 + 's';
      p.style.transform = `rotate(${Math.random() * 360}deg)`;
      box.appendChild(p);
    }
  }

  async function openColor(a) {
    show('color');
    await Painter.open(a);
  }

  // ======================================================================
  //  색칠 엔진
  //  - line-canvas : 선화(흰 바탕+검은 선), 위에 '곱하기'로 겹쳐서 선이 항상 보임
  //  - color-canvas: 학생이 칠한 색만 담는 층
  // ======================================================================
  const Painter = {
    art: null, W: 0, H: 0,
    mask: null,        // 1 = 선 픽셀
    colorImg: null,    // color-canvas의 현재 픽셀(ImageData)
    origData: null,    // 원본 그림을 같은 크기로 맞춘 픽셀(원본 색 도구용)
    undo: [], undoBytes: 0,
    tool: 'fill', color: PALETTE[0], sizeIdx: 1,
    view: { s: 1, x: 0, y: 0 },
    dirty: false, saveTimer: 0, opening: null,

    init() {
      this.vp = $('#viewport');
      this.stage = $('#stage');
      this.cc = $('#color-canvas');
      this.lc = $('#line-canvas');
      this.cctx = this.cc.getContext('2d', { willReadFrequently: true });
      this.lctx = this.lc.getContext('2d', { willReadFrequently: true });

      // 팔레트
      const pal = $('#palette');
      pal.innerHTML = PALETTE.map((c, i) => `<button class="swatch" data-color="${c}" style="background:${c}" aria-label="색 ${i + 1}" aria-pressed="${i === 0}"></button>`).join('');
      pal.onclick = (e) => {
        const b = e.target.closest('.swatch');
        if (!b) return;
        this.color = b.dataset.color;
        $$('.swatch', pal).forEach((s) => s.setAttribute('aria-pressed', s === b));
        if (this.tool === 'eraser' || this.tool === 'magic') this.setTool('fill');
      };

      // 도구
      $('#tool-bar').onclick = (e) => {
        const t = e.target.closest('[data-tool]');
        if (t) return this.setTool(t.dataset.tool);
        const s = e.target.closest('[data-size]');
        if (s) {
          this.sizeIdx = +s.dataset.size;
          $$('[data-size]').forEach((b) => b.setAttribute('aria-pressed', b === s));
        }
      };

      $('#btn-undo').onclick = () => this.doUndo();
      $('#btn-reset').onclick = async () => {
        if (await confirmBox('모두 지우고\n처음부터 할까요?')) this.clearAll();
      };
      $('#btn-original').onclick = () => this.togglePeek();
      $('#peek-close').onclick = () => this.togglePeek(false);
      $('#btn-done').onclick = async () => {
        await this.save(true);
        location.hash = '#/done/' + encodeURIComponent(this.art.id);
      };
      $('#btn-exit').onclick = () => (location.hash = '#/list');
      $('#btn-zoom-in').onclick = () => this.zoomBy(1.4);
      $('#btn-zoom-out').onclick = () => this.zoomBy(1 / 1.4);
      $('#btn-zoom-fit').onclick = () => this.fit();

      this.bindPointer();
      window.addEventListener('resize', () => this.art && this.fit());
      document.addEventListener('visibilitychange', () => document.hidden && this.save());
      window.addEventListener('pagehide', () => this.save());
      this.vp.addEventListener('contextmenu', (e) => e.preventDefault());
    },

    setTool(t) {
      this.tool = t;
      $$('[data-tool]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.tool === t));
      $('#size-group').hidden = !(t === 'brush' || t === 'eraser');
      if (t === 'magic' && !this.origData) toast('원본 그림을 준비하고 있어요');
    },

    async open(a) {
      if (this.art && this.art.id === a.id) { this.fit(); return; }
      loading(true);
      try {
        this.art = a;
        $('#color-title').textContent = a.title;
        $('#peek-img').src = assetUrl(a.original || a.coloring);
        this.togglePeek(false);
        const line = await loadImage(assetUrl(a.coloring));
        const sc = Math.min(1, CONFIG.maxSide / Math.max(line.naturalWidth, line.naturalHeight));
        const W = (this.W = Math.round(line.naturalWidth * sc));
        const H = (this.H = Math.round(line.naturalHeight * sc));
        this.stage.style.width = W + 'px';
        this.stage.style.height = H + 'px';
        for (const c of [this.cc, this.lc]) { c.width = W; c.height = H; }

        // 선화 그리기(투명 배경도 흰색으로)
        this.lctx.fillStyle = '#fff';
        this.lctx.fillRect(0, 0, W, H);
        this.lctx.imageSmoothingQuality = 'high';
        this.lctx.drawImage(line, 0, 0, W, H);
        const ld = this.lctx.getImageData(0, 0, W, H).data;
        const mask = (this.mask = new Uint8Array(W * H));
        const T = CONFIG.lineThreshold * 1000;
        for (let i = 0, p = 0; i < mask.length; i++, p += 4) {
          mask[i] = ld[p] * 299 + ld[p + 1] * 587 + ld[p + 2] * 114 < T ? 1 : 0;
        }

        // 저장된 색칠 불러오기
        this.cctx.clearRect(0, 0, W, H);
        const saved = await DB.get(a.id);
        if (saved && saved.colorBlob) {
          const url = URL.createObjectURL(saved.colorBlob);
          try { this.cctx.drawImage(await loadImage(url), 0, 0, W, H); } finally { URL.revokeObjectURL(url); }
        }
        this.colorImg = this.cctx.getImageData(0, 0, W, H);
        this.undo = []; this.undoBytes = 0; this.updateUndo();
        this.dirty = false;
        this.wasDone = !!(saved && saved.done);

        // 원본(원본 색 도구용)은 뒤에서 준비
        this.origData = null;
        if (a.original) {
          loadImage(assetUrl(a.original)).then((img) => {
            if (this.art !== a) return;
            const c = document.createElement('canvas');
            c.width = W; c.height = H;
            const x = c.getContext('2d', { willReadFrequently: true });
            x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
            x.drawImage(img, 0, 0, W, H);
            this.origData = x.getImageData(0, 0, W, H).data;
          }).catch(() => {});
        }
        $('[data-tool="magic"]').hidden = !a.original;
        this.setTool('fill');
        await sleep(0);
        this.fit();
      } catch (e) {
        console.error(e);
        toast('그림을 열지 못했어요', 3000);
        this.art = null;
        location.hash = '#/list';
      } finally {
        loading(false);
      }
    },

    async close() {
      await this.save();
      this.art = null; this.mask = null; this.colorImg = null; this.origData = null;
      this.undo = []; this.undoBytes = 0;
    },

    togglePeek(force) {
      const p = $('#original-peek');
      const on = force ?? p.hidden;
      p.hidden = !on;
      $('#btn-original').setAttribute('aria-pressed', on);
    },

    // ----- 화면 확대/이동 -----
    applyView() {
      const v = this.view;
      this.stage.style.transform = `translate(${v.x}px, ${v.y}px) scale(${v.s})`;
    },
    fit() {
      const r = this.vp.getBoundingClientRect();
      if (!this.W || !r.width) return;
      const s = Math.min(r.width / this.W, r.height / this.H) * 0.95;
      this.view = { s, x: (r.width - this.W * s) / 2, y: (r.height - this.H * s) / 2, fitS: s };
      this.applyView();
    },
    clampScale(s) {
      const f = this.view.fitS || 1;
      return Math.max(f * 0.8, Math.min(f * 8, s));
    },
    zoomAt(px, py, ns) {
      const v = this.view;
      ns = this.clampScale(ns);
      const cx = (px - v.x) / v.s, cy = (py - v.y) / v.s;
      v.x = px - cx * ns; v.y = py - cy * ns; v.s = ns;
      this.applyView();
    },
    zoomBy(k) {
      const r = this.vp.getBoundingClientRect();
      this.zoomAt(r.width / 2, r.height / 2, this.view.s * k);
    },
    toCanvas(px, py) {
      const v = this.view;
      return [Math.floor((px - v.x) / v.s), Math.floor((py - v.y) / v.s)];
    },

    bindPointer() {
      const pts = new Map();
      let g = null; // 현재 동작
      const local = (e) => {
        const r = this.vp.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
      };
      const pinchInfo = () => {
        const [a, b] = [...pts.values()];
        return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
      };

      this.vp.addEventListener('pointerdown', (e) => {
        if (!this.art || e.target.closest('button')) return;
        this.vp.setPointerCapture(e.pointerId);
        pts.set(e.pointerId, local(e));
        if (pts.size === 1) {
          const p = local(e);
          if (this.tool === 'brush' || this.tool === 'eraser') {
            g = { type: 'draw' };
            this.strokeStart(...this.toCanvas(p.x, p.y));
          } else {
            g = { type: 'tap', sx: p.x, sy: p.y, vx: this.view.x, vy: this.view.y };
          }
        } else if (pts.size === 2) {
          if (g && g.type === 'draw') this.strokeCancel();
          const pi = pinchInfo();
          g = { type: 'pinch', d0: pi.d, mx0: pi.mx, my0: pi.my, v0: { ...this.view } };
        }
      });

      this.vp.addEventListener('pointermove', (e) => {
        if (!pts.has(e.pointerId) || !g) return;
        const p = local(e);
        pts.set(e.pointerId, p);
        if (g.type === 'draw') {
          const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
          for (const ce of evs) { const q = local(ce); this.strokeTo(...this.toCanvas(q.x, q.y)); }
        } else if (g.type === 'tap' || g.type === 'pan') {
          const dx = p.x - g.sx, dy = p.y - g.sy;
          if (g.type === 'tap' && Math.hypot(dx, dy) > 12) g.type = 'pan';
          if (g.type === 'pan') { this.view.x = g.vx + dx; this.view.y = g.vy + dy; this.applyView(); }
        } else if (g.type === 'pinch' && pts.size >= 2) {
          const pi = pinchInfo();
          const v0 = g.v0;
          const ns = this.clampScale(v0.s * (pi.d / g.d0));
          const cx = (g.mx0 - v0.x) / v0.s, cy = (g.my0 - v0.y) / v0.s;
          this.view.s = ns; this.view.x = pi.mx - cx * ns; this.view.y = pi.my - cy * ns;
          this.applyView();
        }
      });

      const end = (e) => {
        if (!pts.has(e.pointerId)) return;
        pts.delete(e.pointerId);
        if (!g) return;
        if (g.type === 'tap' && e.type === 'pointerup') {
          const [x, y] = this.toCanvas(g.sx, g.sy);
          this.fillAt(x, y);
        } else if (g.type === 'draw') {
          e.type === 'pointerup' ? this.strokeEnd() : this.strokeCancel();
        }
        if (pts.size === 0) g = null;
        else if (g.type === 'pinch' && pts.size < 2) g = { type: 'idle' };
      };
      this.vp.addEventListener('pointerup', end);
      this.vp.addEventListener('pointercancel', end);

      this.vp.addEventListener('wheel', (e) => {
        if (!this.art) return;
        e.preventDefault();
        const p = local(e);
        this.zoomAt(p.x, p.y, this.view.s * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
      }, { passive: false });
    },

    // ----- 영역 찾기 (스캔라인 채우기) -----
    regionAt(x, y) {
      const { W, H, mask } = this;
      if (x < 0 || y < 0 || x >= W || y >= H) return null;
      let start = y * W + x;
      if (mask[start]) { // 선 위를 눌렀으면 가까운 빈칸 찾기
        start = -1;
        outer: for (let r = 1; r <= 10; r++) {
          for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < W && ny < H && !mask[ny * W + nx]) { start = ny * W + nx; break outer; }
          }
        }
        if (start < 0) return null;
      }
      const reg = new Uint8Array(W * H);
      const stack = [start];
      let x0 = W, y0 = H, x1 = 0, y1 = 0, count = 0;
      while (stack.length) {
        const p = stack.pop();
        if (reg[p]) continue;
        const py = (p / W) | 0, px = p - py * W, row = py * W;
        let l = px, r = px;
        while (l > 0 && !mask[row + l - 1] && !reg[row + l - 1]) l--;
        while (r < W - 1 && !mask[row + r + 1] && !reg[row + r + 1]) r++;
        reg.fill(1, row + l, row + r + 1);
        count += r - l + 1;
        if (l < x0) x0 = l; if (r > x1) x1 = r; if (py < y0) y0 = py; if (py > y1) y1 = py;
        for (const ny of [py - 1, py + 1]) {
          if (ny < 0 || ny >= H) continue;
          const nrow = ny * W;
          let open = false;
          for (let i = l; i <= r; i++) {
            const q = nrow + i;
            const ok = !mask[q] && !reg[q];
            if (ok && !open) { stack.push(q); open = true; } else if (!ok) open = false;
          }
        }
      }
      // 선 밑으로 조금 넓히기 → 선과 색 사이 흰 틈 제거
      const G = CONFIG.edgeGrow;
      x0 = Math.max(0, x0 - G); y0 = Math.max(0, y0 - G); x1 = Math.min(W - 1, x1 + G); y1 = Math.min(H - 1, y1 + G);
      for (let it = 1; it <= G; it++) {
        const mark = it + 1;
        for (let yy = y0; yy <= y1; yy++) {
          const row = yy * W;
          for (let xx = x0; xx <= x1; xx++) {
            const q = row + xx;
            if (reg[q] || !mask[q]) continue;
            if ((xx > 0 && reg[q - 1] && reg[q - 1] < mark) || (xx < W - 1 && reg[q + 1] && reg[q + 1] < mark) ||
                (yy > 0 && reg[q - W] && reg[q - W] < mark) || (yy < H - 1 && reg[q + W] && reg[q + W] < mark)) reg[q] = mark;
          }
        }
      }
      return { reg, x0, y0, x1, y1, count };
    },

    dominantOriginal(R) {
      // 영역 안 원본 색 중 가장 많이 쓰인 색
      const o = this.origData, { reg, x0, y0, x1, y1 } = R, W = this.W;
      const bins = new Map();
      let best = null, bestN = 0;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const q = y * W + x;
        if (reg[q] !== 1) continue;
        const p = q * 4;
        const k = ((o[p] >> 4) << 8) | ((o[p + 1] >> 4) << 4) | (o[p + 2] >> 4);
        let b = bins.get(k);
        if (!b) bins.set(k, (b = [0, 0, 0, 0]));
        b[0] += o[p]; b[1] += o[p + 1]; b[2] += o[p + 2]; b[3]++;
        if (b[3] > bestN) { bestN = b[3]; best = b; }
      }
      return best ? [best[0] / best[3], best[1] / best[3], best[2] / best[3]].map(Math.round) : null;
    },

    fillAt(x, y) {
      if (!this.mask) return;
      if (this.tool === 'magic' && !this.origData) return toast('잠깐만 기다려 주세요');
      const R = this.regionAt(x, y);
      if (!R) return;
      const rgb = this.tool === 'magic' ? this.dominantOriginal(R) : hexToRgb(this.color);
      if (!rgb) return;
      const { reg, x0, y0, x1, y1 } = R, W = this.W, d = this.colorImg.data;
      this.pushUndo(this.snap(x0, y0, x1 - x0 + 1, y1 - y0 + 1));
      for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
        const q = yy * W + xx;
        if (!reg[q]) continue;
        const p = q * 4;
        d[p] = rgb[0]; d[p + 1] = rgb[1]; d[p + 2] = rgb[2]; d[p + 3] = 255;
      }
      this.cctx.putImageData(this.colorImg, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
      this.markDirty();
    },

    // ----- 붓 / 지우개 -----
    brushSize() { return CONFIG.brushSizes[this.sizeIdx] * (Math.max(this.W, this.H) / 1600); },
    strokeStart(x, y) {
      const c = this.cctx, w = this.brushSize();
      this.stroke = { x0: x, y0: y, x1: x, y1: y, lx: x, ly: y, w };
      c.save();
      c.globalCompositeOperation = this.tool === 'eraser' ? 'destination-out' : 'source-over';
      c.strokeStyle = c.fillStyle = this.color;
      c.lineWidth = w; c.lineCap = c.lineJoin = 'round';
      c.beginPath(); c.arc(x, y, w / 2, 0, Math.PI * 2); c.fill();
    },
    strokeTo(x, y) {
      const s = this.stroke;
      if (!s) return;
      const c = this.cctx;
      c.beginPath(); c.moveTo(s.lx, s.ly); c.lineTo(x, y); c.stroke();
      s.lx = x; s.ly = y;
      if (x < s.x0) s.x0 = x; if (x > s.x1) s.x1 = x; if (y < s.y0) s.y0 = y; if (y > s.y1) s.y1 = y;
    },
    strokeBox() {
      const s = this.stroke, m = Math.ceil(s.w / 2) + 2;
      const x0 = Math.max(0, Math.floor(s.x0 - m)), y0 = Math.max(0, Math.floor(s.y0 - m));
      const x1 = Math.min(this.W - 1, Math.ceil(s.x1 + m)), y1 = Math.min(this.H - 1, Math.ceil(s.y1 + m));
      return x1 < x0 || y1 < y0 ? null : [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
    },
    strokeEnd() {
      if (!this.stroke) return;
      this.cctx.restore();
      const b = this.strokeBox();
      if (b) {
        this.pushUndo(this.snap(...b));             // 칠하기 전 상태(colorImg는 아직 이전 값)
        const now = this.cctx.getImageData(...b);   // 칠한 뒤 상태를 colorImg에 반영
        this.blit(now.data, ...b);
        this.markDirty();
      }
      this.stroke = null;
    },
    strokeCancel() {
      if (!this.stroke) return;
      this.cctx.restore();
      const b = this.strokeBox();
      if (b) this.cctx.putImageData(this.colorImg, 0, 0, ...b);
      this.stroke = null;
    },

    // ----- 되돌리기 -----
    snap(x, y, w, h) {
      const d = new Uint8ClampedArray(w * h * 4), src = this.colorImg.data, W = this.W;
      for (let j = 0; j < h; j++) d.set(src.subarray(((y + j) * W + x) * 4, ((y + j) * W + x + w) * 4), j * w * 4);
      return { x, y, w, h, d };
    },
    blit(data, x, y, w, h) {
      const dst = this.colorImg.data, W = this.W;
      for (let j = 0; j < h; j++) dst.set(data.subarray(j * w * 4, (j + 1) * w * 4), ((y + j) * W + x) * 4);
    },
    pushUndo(e) {
      this.undo.push(e);
      this.undoBytes += e.d.length;
      while (this.undoBytes > CONFIG.undoBytes && this.undo.length > 1) this.undoBytes -= this.undo.shift().d.length;
      this.updateUndo();
    },
    doUndo() {
      const e = this.undo.pop();
      if (!e) return;
      this.undoBytes -= e.d.length;
      this.blit(e.d, e.x, e.y, e.w, e.h);
      this.cctx.putImageData(this.colorImg, 0, 0, e.x, e.y, e.w, e.h);
      this.updateUndo();
      this.markDirty();
    },
    updateUndo() { $('#btn-undo').disabled = this.undo.length === 0; },
    clearAll() {
      this.pushUndo(this.snap(0, 0, this.W, this.H)); // 처음부터도 되돌릴 수 있게
      this.colorImg.data.fill(0);
      this.cctx.clearRect(0, 0, this.W, this.H);
      this.markDirty();
    },

    // ----- 저장 -----
    markDirty() {
      this.dirty = true;
      clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(() => this.save(), CONFIG.saveDelay);
    },
    async save(done = false) {
      clearTimeout(this.saveTimer);
      if (!this.art || (!this.dirty && !done)) return;
      const art = this.art;
      this.dirty = false;
      try {
        const colorBlob = await toBlob(this.cc, 'image/png');
        const previewBlob = await toBlob(this.composite(520), 'image/jpeg', 0.85);
        this.wasDone = this.wasDone || done;
        await DB.put({ id: art.id, colorBlob, previewBlob, updated: Date.now(), done: this.wasDone });
      } catch (e) {
        console.error(e);
        this.dirty = true;
        toast('저장하지 못했어요', 3000);
      }
    },
    composite(maxSide) {
      const s = Math.min(1, maxSide / Math.max(this.W, this.H));
      const w = Math.round(this.W * s), h = Math.round(this.H * s);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const x = c.getContext('2d');
      x.fillStyle = '#fff'; x.fillRect(0, 0, w, h);
      x.drawImage(this.cc, 0, 0, w, h);
      x.globalCompositeOperation = 'multiply';
      x.drawImage(this.lc, 0, 0, w, h);
      return c;
    },
    async exportPng(a) {
      if (!this.art || this.art.id !== a.id) await this.open(a);
      const blob = await toBlob(this.composite(4000), 'image/png');
      const name = `${(a.title || '내그림').replace(/[\\/:*?"<>|]/g, '')}_색칠.png`;
      const file = new File([blob], name, { type: 'image/png' });
      const touch = matchMedia('(pointer: coarse)').matches;
      if (touch && navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file] }); return; } catch (e) { if (e.name === 'AbortError') return; }
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = name;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast('그림을 저장했어요');
    },
  };

  // ===== 시작 =====
  async function boot() {
    applyIcons();
    Painter.init();
    await loadArtworks();
    window.addEventListener('hashchange', route);
    route();
  }
  boot();
})();
