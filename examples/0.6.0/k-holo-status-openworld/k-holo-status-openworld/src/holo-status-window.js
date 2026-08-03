const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const escapeHTML = (value = '') => String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));

export const CATEGORY = Object.freeze({
  info: { label: '정보', rgb: '63, 218, 255', accent: '#3fdaff' },
  danger: { label: '위험', rgb: '255, 76, 72', accent: '#ff4c48' },
  quest: { label: '임무', rgb: '255, 177, 56', accent: '#ffb138' },
  event: { label: '특수', rgb: '176, 104, 255', accent: '#b068ff' }
});

const ICON_PATHS = {
  close: '<path d="M7 7l10 10M17 7L7 17"/>',
  expand: '<path d="M8 4H4v4M16 4h4v4M20 16v4h-4M4 16v4h4"/>',
  collapse: '<path d="M9 4v5H4M15 4v5h5M20 15h-5v5M4 15h5v5"/>',
  shield: '<path d="M12 3l7 3v5c0 4.5-2.8 7.7-7 10-4.2-2.3-7-5.5-7-10V6l7-3z"/><path d="M12 7v9"/>',
  pulse: '<path d="M3 12h4l2-5 4 10 2-5h6"/>',
  person: '<circle cx="12" cy="8" r="3"/><path d="M5.5 20c.8-4.2 3-6 6.5-6s5.7 1.8 6.5 6"/>',
  box: '<path d="M4 7l8-4 8 4-8 4-8-4zM4 7v10l8 4 8-4V7M12 11v10"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  map: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6zM9 3v15M15 6v15"/>',
  alert: '<path d="M12 3l9 17H3L12 3z"/><path d="M12 9v5M12 17h.01"/>',
  quest: '<path d="M12 3l9 9-9 9-9-9 9-9z"/><circle cx="12" cy="12" r="2"/>',
  event: '<path d="M12 3c4 0 7 2.4 7 5.5 0 4.8-6.3 3.7-6.3 7.2 0 1.5 1.3 2.3 3.1 2.3 2 0 3.6-1 4.7-2.7-.7 3.5-3.5 5.7-7.2 5.7-4 0-7.3-2.5-7.3-5.8 0-4.6 6.2-3.8 6.2-7 0-1.3-1.2-2.1-2.8-2.1-2 0-3.8 1-5 2.8C5.2 5.2 8.1 3 12 3z"/>',
  check: '<path d="M5 12l4 4L19 6"/>',
  pin: '<path d="M12 21s6-5.2 6-11a6 6 0 10-12 0c0 5.8 6 11 6 11z"/><circle cx="12" cy="10" r="2"/>',
  coin: '<circle cx="12" cy="12" r="8"/><path d="M9 9.5c.8-1.5 5.2-1.5 6 0 .8 2-5.5 1.5-5.5 4s5.1 2.3 5.9.5M12 6v12"/>',
  signal: '<path d="M5 17v2M9 14v5M13 10v9M17 7v12M21 4v15"/>',
  speed: '<path d="M4 17a8 8 0 1116 0M12 13l5-4"/>',
  eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>'
};

export function icon(name, size = 20, label = '') {
  const path = ICON_PATHS[name] || ICON_PATHS.pulse;
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="${label ? 'false' : 'true'}"${label ? ` role="img"><title>${escapeHTML(label)}</title>` : '>'}${path}</svg>`;
}

export class HoloStore {
  #state;
  #listeners = new Set();

  constructor(initialState = {}) {
    this.#state = structuredClone(initialState);
  }

  getState() { return this.#state; }

  subscribe(listener) {
    this.#listeners.add(listener);
    listener(this.#state, null);
    return () => this.#listeners.delete(listener);
  }

  set(nextState, meta = {}) {
    const previous = this.#state;
    this.#state = typeof nextState === 'function' ? nextState(previous) : nextState;
    for (const listener of this.#listeners) listener(this.#state, previous, meta);
  }

  patch(partial, meta = {}) {
    this.set(previous => ({ ...previous, ...partial }), meta);
  }
}

const DEFAULT_STATE = {
  location: { district: '한강 북부 방재구역', subtitle: '도시 안전망 정상', coordinate: { x: 0, z: 245 } },
  player: { hp: 100, shield: 76, energy: 64, speed: 0 },
  resources: { credits: 7450, data: 320, kits: 3 },
  objectives: [
    { id: 'control', title: '북악 관제탑 접속', detail: '관제 비콘까지 이동', progress: 0, total: 1, distance: 108, status: 'active', x: 24, z: 145 },
    { id: 'sensor', title: '도시 센서망 복구', detail: '중계기 3개 동기화', progress: 1, total: 3, status: 'pending', x: -90, z: 40 }
  ],
  alerts: [
    { time: '22:54', category: 'info', message: '보행 모드가 활성화되었습니다.' },
    { time: '22:53', category: 'quest', message: '북악 관제탑 좌표를 수신했습니다.' }
  ],
  nearby: [],
  telemetry: { fps: 60, frameP95: 16.7 }
};

export class HoloStatusWindow extends HTMLElement {
  #store = null;
  #unsubscribe = null;
  #open = false;
  #mode = 'standard';
  #category = 'info';
  #notifications = [];
  #notificationTimer = null;
  #renderTimer = null;
  #lastRenderAt = 0;
  #state = structuredClone(DEFAULT_STATE);

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = this.#template();
    this.#bindInternalEvents();
  }

  connectedCallback() {
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', '홀로그램 상태창');
    if (!this.hasAttribute('tabindex')) this.tabIndex = -1;
    this.#syncAttributes();
  }

  disconnectedCallback() { this.destroy(); }

  bind(store) {
    this.#unsubscribe?.();
    this.#store = store;
    this.#unsubscribe = store?.subscribe?.(state => {
      this.#state = { ...DEFAULT_STATE, ...state };
      if (this.#open) this.#scheduleRender();
    }) || null;
    return this;
  }

  show(options = {}) {
    this.#category = options.category || this.#category;
    this.#mode = options.mode || this.#mode;
    this.#open = true;
    this.#renderState();
    this.#syncAttributes();
    this.dispatchEvent(new CustomEvent('holo:open', { bubbles: true, detail: { category: this.#category, mode: this.#mode } }));
  }

  hide(reason = 'user') {
    this.#open = false;
    this.#syncAttributes();
    this.dispatchEvent(new CustomEvent('holo:close', { bubbles: true, detail: { reason } }));
  }

  toggle(options = {}) { this.#open ? this.hide('toggle') : this.show(options); }

  setMode(mode) {
    this.#mode = ['compact', 'standard', 'expanded'].includes(mode) ? mode : 'standard';
    this.#syncAttributes();
  }

  setCategory(category) {
    if (CATEGORY[category]) this.#category = category;
    this.#syncAttributes();
  }

  notify({ category = 'info', title = '시스템 알림', message = '', icon: iconName, duration = 4200 } = {}) {
    const id = crypto.randomUUID?.() || `notice-${Date.now()}-${Math.random()}`;
    const notice = { id, category: CATEGORY[category] ? category : 'info', title, message, icon: iconName || category, duration };
    this.#notifications.push(notice);
    this.#renderNotifications();
    window.setTimeout(() => this.dismissNotification(id), duration);
    return id;
  }

  dismissNotification(id) {
    this.#notifications = this.#notifications.filter(item => item.id !== id);
    this.#renderNotifications();
  }

  update(partial) {
    this.#state = { ...this.#state, ...partial };
    if (this.#open) this.#scheduleRender();
  }

  getSnapshot() {
    return { open: this.#open, mode: this.#mode, category: this.#category, notifications: this.#notifications.length, state: structuredClone(this.#state) };
  }

  destroy() {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    if (this.#notificationTimer) clearTimeout(this.#notificationTimer);
    if (this.#renderTimer) clearTimeout(this.#renderTimer);
  }

  #syncAttributes() {
    this.toggleAttribute('open', this.#open);
    this.dataset.mode = this.#mode;
    this.dataset.category = this.#category;
    const theme = CATEGORY[this.#category] || CATEGORY.info;
    this.style.setProperty('--holo-rgb', theme.rgb);
    this.style.setProperty('--holo-accent', theme.accent);
    this.shadowRoot.querySelector('.category-label').textContent = theme.label;
    this.shadowRoot.querySelector('.panel').setAttribute('aria-hidden', String(!this.#open));
    this.shadowRoot.querySelector('[data-action="mode"]').innerHTML = this.#mode === 'expanded' ? icon('collapse', 18, '축소') : icon('expand', 18, '확장');
    this.shadowRoot.querySelector('[data-action="mode"]').setAttribute('aria-label', this.#mode === 'expanded' ? '상태창 축소' : '상태창 확장');
  }

  #bindInternalEvents() {
    this.shadowRoot.addEventListener('click', event => {
      const action = event.target.closest('[data-action]')?.dataset.action;
      if (action === 'close') this.hide('button');
      if (action === 'mode') this.setMode(this.#mode === 'expanded' ? 'standard' : 'expanded');
      const category = event.target.closest('[data-category]')?.dataset.category;
      if (category) this.setCategory(category);
    });
  }

  #scheduleRender() {
    if (this.#renderTimer) return;
    const elapsed = performance.now() - this.#lastRenderAt;
    const wait = Math.max(0, 220 - elapsed);
    this.#renderTimer = window.setTimeout(() => {
      this.#renderTimer = null;
      if (this.#open) this.#renderState();
    }, wait);
  }

  #renderState() {
    this.#lastRenderAt = performance.now();
    const state = this.#state || DEFAULT_STATE;
    const location = state.location || DEFAULT_STATE.location;
    const player = state.player || DEFAULT_STATE.player;
    const resources = state.resources || DEFAULT_STATE.resources;
    const objectives = Array.isArray(state.objectives) ? state.objectives : [];
    const alerts = Array.isArray(state.alerts) ? state.alerts : [];

    this.shadowRoot.querySelector('.district').textContent = location.district || '미확인 구역';
    this.shadowRoot.querySelector('.district-sub').textContent = location.subtitle || '연결 상태 확인 중';
    this.shadowRoot.querySelector('.speed-value').textContent = `${Number(player.speed || 0).toFixed(1)} m/s`;
    this.shadowRoot.querySelector('.coordinate').textContent = `${Math.round(location.coordinate?.x || 0)}, ${Math.round(location.coordinate?.z || 0)}`;

    this.#setMeter('hp', player.hp ?? 0);
    this.#setMeter('shield', player.shield ?? 0);
    this.#setMeter('energy', player.energy ?? 0);

    this.shadowRoot.querySelector('.objectives').innerHTML = objectives.map(item => {
      const completed = item.status === 'complete' || item.progress >= item.total;
      const progress = item.total > 1 ? `${item.progress}/${item.total}` : completed ? '완료' : `${Math.max(0, Math.round(item.distance || 0))}m`;
      return `<li class="objective ${completed ? 'complete' : ''}">
        <span class="objective-icon">${icon(completed ? 'check' : item.status === 'active' ? 'target' : 'quest', 16)}</span>
        <span class="objective-copy"><strong>${escapeHTML(item.title)}</strong><small>${escapeHTML(item.detail || '')}</small></span>
        <span class="objective-progress">${escapeHTML(progress)}</span>
      </li>`;
    }).join('') || '<li class="empty">활성 목표가 없습니다.</li>';

    this.shadowRoot.querySelector('.alerts').innerHTML = alerts.slice(0, 5).map(item => `<li class="alert-line" data-level="${escapeHTML(item.category || 'info')}"><time>${escapeHTML(item.time || '--:--')}</time><span>${escapeHTML(item.message)}</span></li>`).join('');
    this.shadowRoot.querySelector('.credit-value').textContent = Number(resources.credits || 0).toLocaleString('ko-KR');
    this.shadowRoot.querySelector('.data-value').textContent = Number(resources.data || 0).toLocaleString('ko-KR');
    this.shadowRoot.querySelector('.kit-value').textContent = Number(resources.kits || 0).toLocaleString('ko-KR');
    this.#renderRadar(objectives, location.coordinate || { x: 0, z: 0 });
  }

  #setMeter(name, value) {
    const safe = clamp(Number(value) || 0, 0, 100);
    const meter = this.shadowRoot.querySelector(`[data-meter="${name}"]`);
    meter.style.setProperty('--value', safe);
    meter.querySelector('b').textContent = `${Math.round(safe)}`;
    meter.setAttribute('aria-valuenow', String(Math.round(safe)));
  }

  #renderRadar(objectives, coordinate) {
    const radar = this.shadowRoot.querySelector('.radar-marks');
    const range = 180;
    radar.innerHTML = objectives.filter(item => item.status !== 'complete').slice(0, 6).map((item, index) => {
      const dx = clamp(((item.x ?? coordinate.x) - coordinate.x) / range, -1, 1);
      const dz = clamp(((item.z ?? coordinate.z) - coordinate.z) / range, -1, 1);
      const x = 50 + dx * 38;
      const y = 50 + dz * 38;
      const shape = item.status === 'active' ? 'diamond' : 'dot';
      return `<span class="radar-mark ${shape}" style="--x:${x}%;--y:${y}%" aria-label="${escapeHTML(item.title)}"></span>`;
    }).join('');
  }

  #renderNotifications() {
    const host = this.shadowRoot.querySelector('.notice-stack');
    host.innerHTML = this.#notifications.slice(-3).map(item => {
      const theme = CATEGORY[item.category];
      return `<article class="notice" style="--notice-rgb:${theme.rgb}" data-id="${item.id}">
        <span class="notice-icon">${icon(item.icon, 22)}</span>
        <span class="notice-copy"><b>${escapeHTML(item.title)}</b><small>${escapeHTML(item.message)}</small></span>
        <button type="button" aria-label="알림 닫기" data-dismiss="${item.id}">${icon('close', 14)}</button>
      </article>`;
    }).join('');
    host.querySelectorAll('[data-dismiss]').forEach(button => button.addEventListener('click', () => this.dismissNotification(button.dataset.dismiss), { once: true }));
  }

  #template() {
    return `
      <style>${COMPONENT_CSS}</style>
      <div class="anchor" aria-live="polite">
        <div class="notice-stack"></div>
        <section class="panel" aria-hidden="true">
          <i class="scanline"></i>
          <header class="panel-header">
            <span class="crest" aria-hidden="true"><i></i><i></i><i></i></span>
            <span class="header-copy"><strong class="district">한강 북부 방재구역</strong><small class="district-sub">도시 안전망 정상</small></span>
            <span class="header-status"><span class="category-label">정보</span>${icon('signal', 18)}</span>
            <button type="button" data-action="mode" aria-label="상태창 확장">${icon('expand', 18)}</button>
            <button type="button" data-action="close" aria-label="상태창 닫기">${icon('close', 18)}</button>
          </header>

          <nav class="category-tabs" aria-label="상태 카테고리 미리보기">
            <button type="button" data-category="info" aria-label="정보 색상">${icon('shield', 18)}<span>정보</span></button>
            <button type="button" data-category="quest" aria-label="임무 색상">${icon('quest', 18)}<span>임무</span></button>
            <button type="button" data-category="danger" aria-label="위험 색상">${icon('alert', 18)}<span>위험</span></button>
            <button type="button" data-category="event" aria-label="특수 이벤트 색상">${icon('event', 18)}<span>특수</span></button>
          </nav>

          <div class="panel-grid">
            <main>
              <section class="module objective-module">
                <div class="module-title"><span>현재 임무</span><small>LIVE</small></div>
                <ul class="objectives"></ul>
              </section>
              <section class="module vitals-module">
                <div class="meter" data-meter="hp" role="meter" aria-label="생명력" aria-valuemin="0" aria-valuemax="100"><span>생명력</span><i></i><b>100</b></div>
                <div class="meter" data-meter="shield" role="meter" aria-label="보호막" aria-valuemin="0" aria-valuemax="100"><span>보호막</span><i></i><b>76</b></div>
                <div class="meter" data-meter="energy" role="meter" aria-label="동력" aria-valuemin="0" aria-valuemax="100"><span>동력</span><i></i><b>64</b></div>
              </section>
            </main>

            <aside>
              <section class="module radar-module">
                <div class="module-title"><span>근접 레이더</span><small>180m</small></div>
                <div class="radar" role="img" aria-label="플레이어 주변 목표 레이더">
                  <span class="radar-cross x"></span><span class="radar-cross y"></span>
                  <span class="radar-ring r1"></span><span class="radar-ring r2"></span><span class="radar-ring r3"></span>
                  <span class="radar-player"></span><div class="radar-marks"></div>
                </div>
                <div class="position-row"><span>${icon('speed', 15)} <b class="speed-value">0.0 m/s</b></span><span>${icon('pin', 15)} <b class="coordinate">0, 245</b></span></div>
              </section>
              <section class="module feed-module">
                <div class="module-title"><span>상황 기록</span><small>최근 5건</small></div>
                <ul class="alerts"></ul>
              </section>
            </aside>
          </div>

          <footer class="resource-strip">
            <span>${icon('coin', 17)}<b class="credit-value">7,450</b><small>크레딧</small></span>
            <span>${icon('pulse', 17)}<b class="data-value">320</b><small>도시 데이터</small></span>
            <span>${icon('box', 17)}<b class="kit-value">3</b><small>복구 키트</small></span>
            <span class="system-mark">K-URBAN // HSW-06</span>
          </footer>
        </section>
      </div>`;
  }
}

const COMPONENT_CSS = `
:host{display:block;--holo-rgb:63,218,255;--holo-accent:#3fdaff;--holo-scale:1;position:fixed;inset:0;z-index:40;pointer-events:none;color:#eafcff;font-family:Pretendard,"Noto Sans KR","Apple SD Gothic Neo",system-ui,sans-serif;contain:layout style paint}
*{box-sizing:border-box}.icon{display:block;flex:0 0 auto}.anchor{position:absolute;inset:0;overflow:hidden}.panel{position:absolute;right:clamp(22px,5vw,84px);top:50%;width:min(570px,42vw);max-height:min(760px,78vh);transform:translate3d(54px,-48%,0) scale(calc(var(--holo-scale)*.97));transform-origin:right center;opacity:0;visibility:hidden;pointer-events:none;overflow:hidden;border:1px solid rgba(var(--holo-rgb),.7);border-radius:3px 18px 4px 18px;background:linear-gradient(145deg,rgba(2,12,18,.97),rgba(3,23,29,.94));box-shadow:0 0 0 1px rgba(var(--holo-rgb),.12) inset,0 0 18px rgba(var(--holo-rgb),.12),0 18px 52px rgba(0,0,0,.32);transition:opacity .22s ease,transform .38s cubic-bezier(.17,.85,.2,1),visibility .38s}
.panel::before,.panel::after{content:"";position:absolute;z-index:4;pointer-events:none}.panel::before{inset:6px;border:1px solid rgba(var(--holo-rgb),.18);clip-path:polygon(0 0,34% 0,36% 5px,68% 5px,70% 0,100% 0,100% 100%,75% 100%,73% calc(100% - 5px),25% calc(100% - 5px),23% 100%,0 100%)}.panel::after{inset:0;background:linear-gradient(90deg,transparent 0 18%,rgba(var(--holo-rgb),.08) 18.2%,transparent 18.4% 82%,rgba(var(--holo-rgb),.07) 82.2%,transparent 82.4%),repeating-linear-gradient(0deg,rgba(255,255,255,.018) 0 1px,transparent 1px 4px);opacity:.42}
:host([open]) .panel{opacity:1;visibility:visible;pointer-events:auto;transform:translate3d(0,-50%,0) scale(var(--holo-scale))}:host([open]) .panel[aria-hidden]{aria-hidden:false}.scanline{display:none;position:absolute;z-index:5;left:0;right:0;height:20%;top:-20%;background:linear-gradient(180deg,transparent,rgba(var(--holo-rgb),.12),transparent);animation:scan 5.5s linear infinite;pointer-events:none}@keyframes scan{to{top:120%}}
.panel-header{position:relative;z-index:6;display:grid;grid-template-columns:46px 1fr auto 36px 36px;gap:9px;align-items:center;padding:17px 18px 14px;border-bottom:1px solid rgba(var(--holo-rgb),.3);background:linear-gradient(90deg,rgba(var(--holo-rgb),.11),transparent 60%)}.crest{position:relative;width:42px;height:42px;display:grid;place-items:center;border:1px solid rgba(var(--holo-rgb),.65);clip-path:polygon(20% 0,100% 0,100% 80%,80% 100%,0 100%,0 20%);box-shadow:0 0 15px rgba(var(--holo-rgb),.28) inset}.crest::before{content:"";width:18px;height:18px;border:2px solid var(--holo-accent);transform:rotate(45deg);box-shadow:0 0 10px rgba(var(--holo-rgb),.4)}.crest i{position:absolute;width:2px;height:8px;background:var(--holo-accent);opacity:.7}.crest i:nth-child(1){top:5px}.crest i:nth-child(2){right:6px;bottom:5px;transform:rotate(45deg)}.crest i:nth-child(3){left:6px;bottom:5px;transform:rotate(-45deg)}.header-copy{min-width:0}.header-copy strong{display:block;font-size:16px;letter-spacing:.06em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.header-copy small{display:block;margin-top:3px;color:rgba(var(--holo-rgb),.9);font-size:11px;letter-spacing:.08em}.header-status{display:flex;align-items:center;gap:8px;color:var(--holo-accent);font-size:11px;letter-spacing:.1em}.panel button{appearance:none;border:0;color:inherit;background:none;font:inherit}.panel-header button{width:34px;height:34px;display:grid;place-items:center;border:1px solid rgba(var(--holo-rgb),.22);border-radius:4px;cursor:pointer;transition:.16s}.panel-header button:hover,.panel-header button:focus-visible{outline:none;border-color:rgba(var(--holo-rgb),.85);background:rgba(var(--holo-rgb),.13);box-shadow:0 0 14px rgba(var(--holo-rgb),.16)}
.category-tabs{position:relative;z-index:6;display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:9px 13px;border-bottom:1px solid rgba(var(--holo-rgb),.15)}.category-tabs button{display:flex;align-items:center;justify-content:center;gap:7px;min-height:34px;color:rgba(235,252,255,.68);border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.018);cursor:pointer;font-size:11px;letter-spacing:.05em}.category-tabs button:hover,.category-tabs button:focus-visible{color:#fff;outline:none;border-color:rgba(var(--holo-rgb),.55);background:rgba(var(--holo-rgb),.09)}:host([data-category="info"]) [data-category="info"],:host([data-category="quest"]) [data-category="quest"],:host([data-category="danger"]) [data-category="danger"],:host([data-category="event"]) [data-category="event"]{color:var(--holo-accent);border-color:rgba(var(--holo-rgb),.62);box-shadow:0 0 12px rgba(var(--holo-rgb),.1) inset}
.panel-grid{position:relative;z-index:6;display:grid;grid-template-columns:1.08fr .92fr;gap:9px;padding:10px 13px}.panel-grid>main,.panel-grid>aside{display:grid;gap:9px;align-content:start}.module{border:1px solid rgba(var(--holo-rgb),.18);background:linear-gradient(145deg,rgba(255,255,255,.025),rgba(var(--holo-rgb),.025));clip-path:polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,8px 100%,0 calc(100% - 8px));}.module-title{display:flex;justify-content:space-between;align-items:center;padding:8px 10px 6px;border-bottom:1px solid rgba(var(--holo-rgb),.13);color:var(--holo-accent);font-size:11px;letter-spacing:.08em}.module-title small{font-size:9px;color:rgba(238,252,255,.42)}.objectives,.alerts{list-style:none;margin:0;padding:6px}.objective{display:grid;grid-template-columns:23px minmax(0,1fr) auto;gap:7px;align-items:center;min-height:48px;padding:6px;border-bottom:1px solid rgba(255,255,255,.045)}.objective:last-child{border-bottom:0}.objective-icon{color:var(--holo-accent)}.objective-copy{min-width:0}.objective-copy strong,.objective-copy small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.objective-copy strong{font-size:12px;font-weight:600}.objective-copy small{margin-top:3px;color:rgba(235,252,255,.5);font-size:10px}.objective-progress{font-size:10px;color:rgba(var(--holo-rgb),.9)}.objective.complete{opacity:.54}.objective.complete .objective-copy strong{text-decoration:line-through}.empty{padding:14px;color:rgba(255,255,255,.4);font-size:11px}.vitals-module{padding:9px}.meter{display:grid;grid-template-columns:42px 1fr 28px;gap:8px;align-items:center;padding:4px 0;font-size:9px;color:rgba(235,252,255,.65)}.meter i{height:5px;background:rgba(255,255,255,.07);box-shadow:0 0 0 1px rgba(255,255,255,.05) inset;overflow:hidden}.meter i::before{content:"";display:block;width:calc(var(--value)*1%);height:100%;background:linear-gradient(90deg,rgba(var(--holo-rgb),.45),var(--holo-accent));box-shadow:0 0 8px rgba(var(--holo-rgb),.45)}.meter b{text-align:right;color:#fff;font-size:10px}.radar-module{padding-bottom:8px}.radar{position:relative;width:min(156px,15vw);aspect-ratio:1;margin:10px auto;border-radius:50%;border:1px solid rgba(var(--holo-rgb),.55);background:radial-gradient(circle,rgba(var(--holo-rgb),.08),transparent 62%);box-shadow:0 0 18px rgba(var(--holo-rgb),.08) inset}.radar-ring,.radar-cross,.radar-player,.radar-mark{position:absolute}.radar-ring{inset:var(--inset);border:1px solid rgba(var(--holo-rgb),.17);border-radius:50%}.r1{--inset:16%}.r2{--inset:32%}.r3{--inset:45%}.radar-cross.x{left:0;right:0;top:50%;border-top:1px solid rgba(var(--holo-rgb),.18)}.radar-cross.y{top:0;bottom:0;left:50%;border-left:1px solid rgba(var(--holo-rgb),.18)}.radar::after{content:"";position:absolute;inset:4%;border-radius:50%;background:conic-gradient(from 8deg,rgba(var(--holo-rgb),.18),transparent 22%,transparent);transform:rotate(18deg)}@keyframes radar{to{transform:rotate(1turn)}}.radar-player{z-index:2;left:50%;top:50%;width:7px;height:7px;transform:translate(-50%,-50%) rotate(45deg);background:#fff;box-shadow:0 0 10px var(--holo-accent)}.radar-mark{z-index:3;left:var(--x);top:var(--y);width:6px;height:6px;transform:translate(-50%,-50%);border:1px solid var(--holo-accent);background:rgba(var(--holo-rgb),.3);box-shadow:0 0 8px var(--holo-accent)}.radar-mark.diamond{transform:translate(-50%,-50%) rotate(45deg)}.radar-mark.dot{border-radius:50%;width:4px;height:4px}.position-row{display:flex;justify-content:center;gap:12px;color:rgba(235,252,255,.6);font-size:9px}.position-row span{display:flex;align-items:center;gap:4px}.position-row b{color:#fff}.feed-module{display:none}.alerts{font-size:10px}.alert-line{display:grid;grid-template-columns:36px 1fr;gap:6px;padding:5px;border-bottom:1px solid rgba(255,255,255,.04);color:rgba(235,252,255,.7)}.alert-line time{color:rgba(var(--holo-rgb),.8)}.alert-line[data-level="danger"] span{color:#ff7875}.alert-line[data-level="quest"] span{color:#ffd07e}.alert-line[data-level="event"] span{color:#caa1ff}
.resource-strip{position:relative;z-index:6;display:flex;gap:18px;align-items:center;min-height:48px;padding:9px 16px;border-top:1px solid rgba(var(--holo-rgb),.22);background:rgba(var(--holo-rgb),.035)}.resource-strip>span{display:grid;grid-template-columns:18px auto;column-gap:6px;align-items:center}.resource-strip b{font-size:12px}.resource-strip small{grid-column:2;color:rgba(235,252,255,.4);font-size:8px}.resource-strip .system-mark{display:block;margin-left:auto;color:rgba(var(--holo-rgb),.5);font:9px ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.06em}
:host([data-mode="compact"]) .panel{width:min(410px,38vw)}:host([data-mode="compact"]) .category-tabs,:host([data-mode="compact"]) .panel-grid aside,:host([data-mode="compact"]) .vitals-module,:host([data-mode="compact"]) .resource-strip small{display:none}:host([data-mode="compact"]) .panel-grid{display:block}:host([data-mode="compact"]) .resource-strip{min-height:36px;padding-block:6px}:host([data-mode="expanded"]) .panel{width:min(690px,50vw)}:host([data-mode="expanded"]) .feed-module{display:block}:host([data-mode="expanded"]) .panel-grid{grid-template-columns:1.08fr .92fr}:host([data-mode="expanded"]) .radar{width:min(184px,16vw)}
.notice-stack{position:absolute;right:clamp(24px,5vw,84px);top:14%;display:grid;gap:8px;width:min(390px,36vw);pointer-events:none}.notice{--notice-rgb:63,218,255;display:grid;grid-template-columns:40px 1fr 26px;gap:8px;align-items:center;padding:11px 10px;border:1px solid rgba(var(--notice-rgb),.58);border-radius:2px 12px 2px 12px;background:linear-gradient(110deg,rgba(2,13,18,.94),rgba(var(--notice-rgb),.12));box-shadow:0 8px 24px rgba(0,0,0,.25),0 0 12px rgba(var(--notice-rgb),.09);animation:notice-in .36s cubic-bezier(.16,.8,.24,1);pointer-events:auto}@keyframes notice-in{from{opacity:0;transform:translateX(30px) scale(.96)}}.notice-icon{width:36px;height:36px;display:grid;place-items:center;color:rgb(var(--notice-rgb));border:1px solid rgba(var(--notice-rgb),.35);clip-path:polygon(20% 0,100% 0,100% 80%,80% 100%,0 100%,0 20%)}.notice-copy{min-width:0}.notice-copy b,.notice-copy small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.notice-copy b{font-size:12px;letter-spacing:.04em}.notice-copy small{margin-top:3px;color:rgba(237,252,255,.62);font-size:10px}.notice button{width:24px;height:24px;display:grid;place-items:center;color:rgba(255,255,255,.55);cursor:pointer}
@media(max-width:900px){.panel{right:18px;width:min(540px,58vw)}:host([data-mode="expanded"]) .panel{width:min(620px,70vw)}.header-status{display:none}.panel-header{grid-template-columns:42px 1fr 34px 34px}.radar{width:min(142px,19vw)}}
@media(max-width:720px){:host{--holo-scale:1}.panel,:host([data-mode="expanded"]) .panel,:host([data-mode="compact"]) .panel{left:10px;right:10px;top:auto;bottom:10px;width:auto;max-height:72vh;transform:translateY(40px) rotateX(2deg);transform-origin:center bottom;border-radius:12px 12px 3px 3px}:host([open]) .panel{transform:translateY(0) rotateX(0)}.panel-grid,:host([data-mode="expanded"]) .panel-grid{grid-template-columns:1fr}.panel-grid aside{display:none}:host([data-mode="expanded"]) .panel-grid aside{display:grid;grid-template-columns:1fr 1fr}.category-tabs span{display:none}.notice-stack{left:10px;right:10px;top:10px;width:auto}.resource-strip{gap:12px}.resource-strip .system-mark{display:none}.header-copy strong{font-size:14px}}
@media(max-width:460px){.panel-header{padding:12px 12px 10px}.category-tabs{padding:7px 10px}.panel-grid{padding:8px 10px}.resource-strip{overflow:hidden}.resource-strip>span:nth-child(3){display:none}:host([data-mode="expanded"]) .panel-grid aside{grid-template-columns:1fr}.radar{width:138px}}
@media(prefers-reduced-motion:reduce){.panel,.notice{transition:none;animation:none}.scanline,.radar::after{animation:none}}
`;

customElements.define('k-holo-status', HoloStatusWindow);
