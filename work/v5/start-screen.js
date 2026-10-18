'use strict';
// This room only presents the loaded save. Its animation never reads the market RNG.
const StartScreen = {
  active: false, busy: false, opening: false, timer: null, flickerTimer: null, frame: null,
  leaveTimer: null, lineIndex: 0, fxMemory: new Map(),
  resumeKey: 'nigumiao-title-entered',
  lines: [
    '「只要回到那个数字，你就会离开。对吗？」',
    '「你的亏损有上限。我们的期待没有。」',
    '「他们把你的失眠，写进了活跃用户。」',
    '「风险归你。佣金归我。明天还来吗？」',
    '「门一直开着。你为什么还在这里？」',
    '「你在等待反弹。它在等待下一次点击。」'
  ],
  fxKey(id = LocalProfiles.current?.id) { return 'nigumiao-start-fx-' + (id || 'guest'); },
  readFx(key = this.fxKey()) {
    if (this.fxMemory.has(key)) return this.fxMemory.get(key);
    try { return localStorage.getItem(key) !== 'off'; }
    catch { return this.fxMemory.get(key) !== false; }
  },
  writeFx(value, key = this.fxKey()) {
    this.fxMemory.set(key, value);
    try { localStorage.setItem(key, value ? 'on' : 'off'); } catch { /* The button still works for this session. */ }
  },
  allowed() {
    const p = TerminalSettings.prefs();
    return p.effects && p.motion && p.atmosphere !== 'off' && !this.reduced.matches;
  },
  stopEffects() {
    clearTimeout(this.timer); clearTimeout(this.flickerTimer); cancelAnimationFrame(this.frame);
    this.timer = this.flickerTimer = this.frame = null;
    this.gate.classList.remove('start-playing', 'start-disturb');
    this.pupil.style.transform = '';
  },
  refreshEffects() {
    this.stopEffects();
    const allowed = this.allowed(), wanted = this.readFx(), enabled = allowed && wanted;
    this.gate.classList.toggle('start-still', !enabled);
    const button = $('startEffects');
    button.disabled = !allowed;
    button.setAttribute('aria-pressed', String(enabled));
    button.innerHTML = !allowed ? '开场演出 · 已停用 <span>○</span>' : enabled ? '开场演出 · 开启 <span>◉</span>' : '开场演出 · 关闭 <span>○</span>';
    button.title = !allowed ? '跟随游戏特效、界面动画与系统减少动态效果设置。' : '关闭眼睛跟随、光影变化与低语轮播；不会更改游戏内的特效设置。';
    if (!this.active || document.hidden || !enabled || this.busy) return;
    this.gate.classList.add('start-playing');
    this.scheduleWhisper();
  },
  scheduleWhisper() {
    this.timer = setTimeout(() => {
      this.timer = null;
      if (!this.active || document.hidden || !this.allowed() || !this.readFx()) return;
      this.lineIndex = (this.lineIndex + 1) % this.lines.length;
      $('startWhisper').textContent = this.lines[this.lineIndex];
      $('startWhisperCount').textContent = String(this.lineIndex + 1).padStart(3, '0');
      this.gate.classList.add('start-disturb');
      this.flickerTimer = setTimeout(() => { this.gate.classList.remove('start-disturb'); this.flickerTimer = null; }, 180);
      this.scheduleWhisper();
    }, 9200 + (this.lineIndex % 3) * 1400);
  },
  track(event) {
    if (!this.active || this.busy || !this.gate.classList.contains('start-playing') || event.pointerType === 'touch') return;
    this.pointer = { x: event.clientX, y: event.clientY };
    if (this.frame !== null) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = null;
      if (!this.active || !this.gate.classList.contains('start-playing')) return;
      const r = this.scene.getBoundingClientRect();
      const x = Math.max(-9, Math.min(9, (this.pointer.x - r.left - r.width / 2) / 35));
      const y = Math.max(-6, Math.min(6, (this.pointer.y - r.top - r.height * .45) / 40));
      this.pupil.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    });
  },
  rememberEntry(id) {
    try { sessionStorage.setItem(this.resumeKey, id); } catch { /* A fresh title is safe if session storage is unavailable. */ }
  },
  shouldResume() {
    try { return performance.getEntriesByType('navigation')[0]?.type === 'reload' && sessionStorage.getItem(this.resumeKey) === LocalProfiles.current?.id; }
    catch { return false; }
  },
  showContinue() {
    const p = LocalProfiles.current;
    if (!p) return this.showIdentity();
    $('startContinuePanel').hidden = false;
    $('startIdentityPanel').hidden = true;
    $('startBack').hidden = true;
    $('localLoginTitle').textContent = '交易室还亮着。';
    document.querySelector('.start-access .auth-slogan').textContent = '你离开过。它一直在等。';
    $('startPlayerAvatar').innerHTML = Presentation.avatar(p);
    $('startPlayerName').textContent = p.name;
    const modes = { endless: '无尽市场', story: '20 日故事', challenge: '无尽挑战', sandbox: '自定义市场' };
    $('startSaveLine').textContent = (modes[game.s.config.mode] || '模拟市场') + ' / 第 ' + game.s.day + ' 日';
    $('startEquity').textContent = '¥ ' + money(game.equity);
    $('startSaveNote').textContent = game.s.finished ? '这段旅程已结束。可以回来看看，或开启新的一局。' : '进度已就位，等待你的下一次选择。';
    $('startContinue').firstChild.textContent = game.s.finished ? '回看这段旅程 ' : '继续我的交易日 ';
    $('rememberPlayer').checked = LocalProfiles.read().remembered === p.id;
    $('authError').textContent = '';
  },
  showIdentity() {
    $('startContinuePanel').hidden = true;
    $('startIdentityPanel').hidden = false;
    $('startBack').hidden = !LocalProfiles.current;
    $('localLoginTitle').textContent = LocalProfiles.list().length ? '今天，谁来承担风险？' : '给欲望一个名字。';
    document.querySelector('.start-access .auth-slogan').textContent = '欢迎进入你的下一场交易日。';
    AuthUI.renderPicker();
  },
  focusEntry() {
    const target = !$('startContinuePanel').hidden ? $('startContinue') : !$('authForm').classList.contains('hidden') ? $('playerName') : $('playerPicker').querySelector('button') || $('showCreatePlayer');
    target?.focus({ preventScroll: true });
  },
  opened() {
    this.active = true; this.busy = false; this.gate.inert = false;
    try { sessionStorage.removeItem(this.resumeKey); } catch { /* Optional resume convenience. */ }
    this.gate.classList.remove('start-leaving');
    // Cancel queued gameplay presentations before they can overlay the title room.
    CapitalHorror.dismiss();
    clearTimeout(TradingPsychology.demonTimer); clearTimeout(TradingPsychology.phantomTimer);
    TradingPsychology.demonTimer = TradingPsychology.phantomTimer = null;
    TradingPsychology.scheduled = false;
    RoomAtmosphere.stopPreview(); RoomAtmosphere.silence();
    for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
    this.showContinue(); this.refreshEffects(); this.focusEntry();
    this.gate.scrollTop = 0;
  },
  closed() {
    this.active = false; this.busy = false; this.gate.inert = true;
    clearTimeout(this.leaveTimer); this.leaveTimer = null;
    this.stopEffects(); this.gate.classList.remove('start-leaving');
    RoomAtmosphere.update();
  },
  transition(action) {
    if (this.busy) return;
    this.busy = true; this.stopEffects();
    if (!this.allowed() || !this.readFx()) { action(); return; }
    this.gate.classList.add('start-leaving');
    this.leaveTimer = setTimeout(() => { this.leaveTimer = null; action(); }, 520);
  },
  fail(error) {
    this.busy = false; this.gate.classList.remove('start-leaving');
    $('authError').textContent = '无法进入本地玩家：' + error.message;
    this.refreshEffects();
  },
  enter(newRun = false) {
    if (!LocalProfiles.current) return;
    this.transition(() => {
      try {
        LocalProfiles.select(LocalProfiles.current.id, $('rememberPlayer').checked);
        this.rememberEntry(LocalProfiles.current.id);
        AuthUI.hideGate();
        $('navTrade').focus({ preventScroll: true });
        // Canvas may have been measured while the background was hidden.
        ChartView.cacheKey = ''; requestAnimationFrame(drawChart);
        if (newRun) UIExtras.newGame();
      } catch (error) { this.fail(error); }
    });
  },
  login(id) {
    this.transition(() => {
      try {
        const guestFx = this.readFx();
        LocalProfiles.select(id, $('rememberPlayer').checked);
        try { if (localStorage.getItem(this.fxKey(id)) === null) this.writeFx(guestFx, this.fxKey(id)); } catch { /* Cosmetic preference only. */ }
        this.rememberEntry(id);
        location.reload();
      } catch (error) { this.fail(error); }
    });
  },
  async openFromGame() {
    if (this.opening || this.active) return;
    this.opening = true;
    stopAuto();
    try {
      if (!save()) throw Error('存档未能写入，请先导出进度。');
      await LocalVault.flush();
      AuthUI.showGate();
    } catch (error) { toast('无法返回起始页：' + error.message, true); }
    finally { this.opening = false; }
  },
  keydown(event) {
    if (!this.active) return;
    if (this.busy) { event.preventDefault(); event.stopImmediatePropagation(); return; }
    if (event.key === 'Tab') {
      const items = [...this.gate.querySelectorAll('button:not(:disabled),input:not(:disabled),a[href]')].filter(el => el.getClientRects().length && !el.closest('[hidden],.hidden,[inert]'));
      const first = items[0], last = items.at(-1);
      if (event.shiftKey && (document.activeElement === first || !this.gate.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !this.gate.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
      return;
    }
    // Form typing and Enter/Space activation retain their native behavior. All other
    // game shortcuts are stopped before the document's trading handlers receive them.
    if (event.target.closest('input,textarea') || ['Enter', ' '].includes(event.key) && event.target.closest('button')) return;
    event.stopImmediatePropagation();
  },
  init() {
    this.gate = $('authGate'); this.pupil = this.gate.querySelector('.start-pupil'); this.scene = this.gate.querySelector('.start-eye-scene');
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const logo = this.gate.querySelector('.login-game-icon');
    if (logo) this.gate.querySelector('.start-logo').replaceChildren(logo);
    const show = AuthUI.showGate, hide = AuthUI.hideGate;
    AuthUI.showGate = function () { show.call(this); StartScreen.opened(); };
    AuthUI.hideGate = function () { hide.call(this); StartScreen.closed(); };
    AuthUI.login = id => this.login(id);
    const showCapital = CapitalHorror.tryShow;
    CapitalHorror.tryShow = function () { if (!StartScreen.active) return showCapital.call(this); };
    const atmosphereUpdate = RoomAtmosphere.update;
    RoomAtmosphere.update = function () { if (StartScreen.active) { this.silence(); return; } atmosphereUpdate.call(this); };
    const allowPsychology = TradingPsychology.effectAllowed;
    TradingPsychology.effectAllowed = function () { return !StartScreen.active && allowPsychology.call(this); };
    $('startEffects').onclick = () => { this.writeFx(!this.readFx()); this.refreshEffects(); };
    $('startContinue').onclick = () => this.enter();
    $('startNewRun').onclick = () => this.enter(true);
    $('startSwitch').onclick = () => { this.showIdentity(); this.focusEntry(); };
    $('startBack').onclick = () => { this.showContinue(); this.focusEntry(); };
    $('startAbout').onclick = () => { const panel = $('startAboutPanel'); panel.hidden = !panel.hidden; $('startAbout').setAttribute('aria-expanded', String(!panel.hidden)); $('startAbout').querySelector('span').textContent = panel.hidden ? '＋' : '−'; };
    this.gate.addEventListener('pointermove', event => this.track(event), { passive: true });
    this.gate.addEventListener('pointerleave', () => { cancelAnimationFrame(this.frame); this.frame = null; this.pupil.style.transform = ''; });
    this.gate.addEventListener('click', event => { if (this.busy) { event.preventDefault(); event.stopImmediatePropagation(); } }, true);
    this.gate.addEventListener('submit', event => { if (this.busy) { event.preventDefault(); event.stopImmediatePropagation(); } }, true);
    window.addEventListener('keydown', event => this.keydown(event), true);
    document.addEventListener('visibilitychange', () => this.refreshEffects());
    this.reduced.addEventListener('change', () => this.refreshEffects());
    document.querySelector('.topnav').insertAdjacentHTML('beforeend', '<button type="button" id="navStart"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m3 10 9-7 9 7v10H3V10Zm6 10v-7h6v7" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg><span>起始页面</span></button>');
    $('navStart').onclick = () => this.openFromGame();
    if (LocalProfiles.current && this.shouldResume()) this.closed();
    else AuthUI.showGate();
  }
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => StartScreen.init());
else StartScreen.init();
