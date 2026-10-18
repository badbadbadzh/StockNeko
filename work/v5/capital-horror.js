'use strict';
// Presentation-only loss milestones. Money is stored in cents, like the trading engine.
const CapitalHorror = {
  thresholds: [300000, 800000, 1500000, 3000000],
  names: ['等待报价', '试算', '定价', '收割', '清算'],
  lines: [
    '你以为自己打开的是交易终端。',
    '你叫它生活费。我们叫它流动性。',
    '风险归你。佣金归我。',
    '你在等回本。我们在等你的下一次点击。',
    '账上只有数字。账外才是你。'
  ],
  sublines: [
    '资本清算部，正在等待下一位客户。',
    '资本清算部：你的恐惧，开始有了价格。',
    '资本清算部：你的损失需要解释，我们的收费不需要。',
    '资本清算部：把希望留在这里，把风险带回家。',
    '资本清算部：本次结算不包含你的睡眠、时间和明天。'
  ],
  watchedGame: null, pending: null, timer: null, settleTimer: null,
  scheduled: false, audio: null, hitGain: null, hitTones: [], previewing: false, shockTimer: null, revealTimer: null,

  loss(g = game) { return Math.max(0, g.s.initialCash - g.equity); },
  band(loss) { return this.thresholds.filter(value => loss >= value).length; },
  ensure(g = game) {
    if (!g.s.capitalHorror) {
      // Existing saves start at their current tier; loading never springs a surprise.
      g.s.capitalHorror = { version: 1, reached: this.band(this.loss(g)), last: null };
    }
    return g.s.capitalHorror;
  },
  allowed(p = TerminalSettings.prefs()) {
    return !!LocalProfiles.current && p.effects && p.jumpscare && p.atmosphere !== 'off';
  },
  observe() {
    if (!LocalProfiles.current) return false;
    if (this.watchedGame !== game) {
      this.dismiss();
      this.pending = null;
      this.watchedGame = game;
    }
    const state = this.ensure(), loss = this.loss(), band = this.band(loss);
    if (band <= state.reached) return false;
    state.reached = band;
    state.last = { band, loss, day: game.s.day };
    // Also consume tiers while disabled: enabling FX later never retroactively jumps.
    if (this.allowed() && !document.hidden && !game.s.finished) {
      this.pending = { game, band, loss, day: game.s.day };
      this.schedule();
    }
    return true;
  },
  schedule() {
    if (this.scheduled) return;
    this.scheduled = true;
    setTimeout(() => { this.scheduled = false; this.tryShow(); }, 0);
  },
  tryShow() {
    const event = this.pending;
    if (!event) return;
    if (event.game !== game || !this.allowed() || document.hidden || game.s.finished) {
      this.pending = null;
      return;
    }
    // A trading confirmation, story, report or settings dialog always finishes first.
    if (document.querySelector('dialog[open]') || RoomAtmosphere.draft) return;
    this.pending = null;
    this.show(event, false);
  },
  face() {
    if (GameAssets.capitalFace) return '<img class="capital-photo" src="'+GameAssets.capitalFace+'" alt="">';
    // Original vector mask remains as a deterministic fallback if the bitmap is unavailable.
    return [
      '<svg class="capital-mask" viewBox="0 0 560 680" aria-hidden="true">',
      '<defs><radialGradient id="capitalSkin" cx="38%" cy="30%" r="72%"><stop stop-color="#f1e3d0"/><stop offset=".5" stop-color="#b8b19c"/><stop offset=".8" stop-color="#677163"/><stop offset="1" stop-color="#0d1712"/></radialGradient>',
      '<linearGradient id="capitalSuit" x2="0" y2="1"><stop stop-color="#343e32"/><stop offset="1" stop-color="#020704"/></linearGradient>',
      '<pattern id="capitalTeeth" width="23" height="70" patternUnits="userSpaceOnUse"><rect width="23" height="70" fill="#d9d8c2"/><path d="M3 0v70M8 0v70M19 0v70" stroke="#060b07" stroke-width="4"/></pattern></defs>',
      '<path d="M0 680 22 560 178 488 382 488 538 560 560 680" fill="url(#capitalSuit)" stroke="#61735a"/>',
      '<path d="m178 488 102 46 102-46-30 192H208Z" fill="#b6b6a0"/><path d="m255 535 25 18 25-18-11 39 22 106h-72l22-106Z" fill="#3a080c"/>',
      '<path d="m178 488 102 192-127-91 23-39-51-8Zm204 0L280 680l127-91-23-39 51-8Z" fill="#0a120c" stroke="#43523d"/>',
      '<path d="M129 127Q113 16 280 9q169 4 152 118l-7 169q-4 125-65 192-36 43-80 45-50-5-88-46-61-73-65-191Z" fill="url(#capitalSkin)" stroke="#a4ac93" stroke-width="2"/>',
      '<path d="M130 168q55-80 149-22 97-61 150 23l-8-70Q397 24 280 30 162 24 137 98Z" fill="#0b130e"/>',
      '<path d="M154 179q52-36 102 13l-17 52q-62 15-91-28Zm252 0q-52-36-102 13l17 52q62 15 91-28Z" fill="#010503"/>',
      '<ellipse cx="218" cy="211" rx="5" ry="12" fill="#cd5145"/><ellipse cx="342" cy="211" rx="5" ry="12" fill="#cd5145"/>',
      '<path d="m258 223-23 97 44 18 48-18-24-97M147 259l29 90M414 259l-29 90" fill="none" stroke="#515a49" stroke-width="9"/>',
      '<path d="M153 344q127 95 254 0l-28 92q-103 89-198 0Z" fill="#030704" stroke="#222e20" stroke-width="8"/>',
      '<path d="M171 361q109 70 218 0l-20 66q-91 61-178 0Z" fill="url(#capitalTeeth)"/>',
      '<path d="M167 397q112 79 226 0" fill="none" stroke="#030704" stroke-width="9"/>',
      '<path d="M165 117q115-36 230 0M201 470q79 46 158 0" fill="none" stroke="#3d4936" stroke-width="3"/>',
      '<text x="280" y="102" text-anchor="middle" fill="#c85448" font-family="monospace" font-size="18" letter-spacing="7">CAPITAL</text>',
      '</svg>'
    ].join('');
  },
  mount() {
    const dialog = document.createElement('dialog');
    dialog.id = 'capitalAlert';
    dialog.className = 'capital-alert';
    dialog.setAttribute('aria-labelledby', 'capitalAlertTitle');
    dialog.setAttribute('aria-describedby', 'capitalAlertLine');
    dialog.innerHTML = [
      '<div class="capital-scene"><div class="capital-static" aria-hidden="true"></div>',
      '<div class="capital-terms" aria-hidden="true"><span>风险承担方：你</span><span>服务费用：照常收取</span><span>你的明天：不在报表内</span><span>情绪估值：恐惧</span></div>',
      '<div class="capital-face">' + this.face() + '</div>',
      '<header class="capital-scene-header"><span>资本清算部 / CAPITAL DESK</span><span id="capitalAlertMode">虚构剧情 · 自动交易已暂停</span></header>',
      '<div class="capital-caption"><span id="capitalAlertTier" class="capital-tier"></span><h2 id="capitalAlertTitle"></h2><p id="capitalAlertLine"></p></div>',
      '<aside class="capital-receipt"><span>客户损益 / 非扣款通知</span><b id="capitalAlertLoss"></b><dl><dt>累计交易费用</dt><dd id="capitalAlertFees"></dd><dt>风险归属</dt><dd>玩家自负</dd><dt>人生补偿</dt><dd>不在服务范围内</dd></dl><div class="receipt-stamp">已 定 价</div><small>数字来自当前账户，剧情不会额外扣钱。</small></aside>',
      '<footer class="capital-controls"><span>5 秒后关闭 · Esc 立即退出</span><div><button type="button" id="disableCapitalAlert">关闭跳脸</button><button type="button" id="dismissCapitalAlert">把屏幕还给我 ↗</button></div></footer></div>'
    ].join('');
    document.body.appendChild(dialog);
    $('dismissCapitalAlert').onclick = () => this.dismiss();
    $('disableCapitalAlert').onclick = () => {
      try { LocalProfiles.update({ jumpscare: false }); this.pending = null; this.dismiss(); toast('亏损跳脸已关闭，可在设置中重新开启。'); }
      catch (error) { this.dismiss(); toast(error.message, true); }
    };
    dialog.addEventListener('cancel', e => { e.preventDefault(); this.dismiss(); });
    dialog.addEventListener('close', () => { if (!dialog.open) this.cleanup(); });
    document.addEventListener('keydown', e => {
      if (!dialog.open) return;
      e.stopImmediatePropagation();
      if (e.key === 'Escape') { e.preventDefault(); this.dismiss(); }
    }, true);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { this.pending = null; this.dismiss(); }
    });
    for (const d of document.querySelectorAll('dialog')) {
      d.addEventListener('close', () => this.schedule());
    }
    $('pressurePause').insertAdjacentHTML('beforebegin', '<button type="button" id="capitalLetter" class="capital-letter">资本来函 · 查看账单 ↗</button>');
    $('capitalLetter').onclick = () => this.letter();
    const ghost = document.createElement('div');
    ghost.className = 'capital-presence';
    ghost.innerHTML = this.face().replaceAll('capitalSkin', 'ghostSkin').replaceAll('capitalSuit', 'ghostSuit').replaceAll('capitalTeeth', 'ghostTeeth');
    $('roomEffects').appendChild(ghost);
  },
  show(event, preview, prefs = TerminalSettings.prefs()) {
    if (!this.allowed(prefs)) return;
    stopAuto();
    this.cleanup();
    RoomAtmosphere.silence();
    this.previewing = preview;
    const d = $('capitalAlert'), band = event.band;
    d.dataset.band = band;
    const still = !prefs.motion || matchMedia('(prefers-reduced-motion: reduce)').matches;
    d.classList.toggle('capital-still', still);
    d.classList.toggle('capital-no-flash', prefs.flash === false);
    d.dataset.phase = still ? 'settled' : 'blackout';
    d.classList.remove('capital-settled');
    $('capitalAlertMode').textContent = preview ? '效果预览 · 账户与剧情不变' : '虚构剧情 · 自动交易已暂停';
    $('capitalAlertTier').textContent = '0' + band + ' / ' + this.names[band];
    $('capitalAlertTitle').textContent = this.lines[band];
    $('capitalAlertLine').textContent = this.sublines[band];
    $('capitalAlertLoss').textContent = '− ¥ ' + money(event.loss);
    $('capitalAlertFees').textContent = '¥ ' + money(game.s.totalFees);
    document.body.classList.add('capital-visited');
    clearTimeout(this.shockTimer); clearTimeout(this.revealTimer);
    d.classList.remove('capital-reveal'); d.classList.add('capital-blackout');
    void d.offsetWidth;
    if (!d.open) d.showModal();
    // Cosmetic timing uses crypto, never the market or story RNG.
    const jitter = new Uint16Array(1);
    if (!still) crypto.getRandomValues(jitter);
    const delay = still ? 0 : 780 + jitter[0] % 541;
    const reveal = () => {
      if (!d.open || document.hidden) return;
      d.classList.remove('capital-blackout');
      d.dataset.phase = still ? 'settled' : 'impact';
      if (!still) d.classList.add('capital-reveal');
      this.hit(prefs.sound);
      this.revealTimer = setTimeout(() => {
        d.classList.remove('capital-reveal');
        d.classList.add('capital-settled');
        d.dataset.phase = 'settled';
      }, still ? 0 : 1100);
    };
    if (still) reveal();
    else this.shockTimer = setTimeout(reveal, delay);
    $('dismissCapitalAlert').focus({ preventScroll: true });
    clearTimeout(this.settleTimer); clearTimeout(this.timer);
    this.timer = setTimeout(() => this.dismiss(), 5000);
  },
  preview(prefs = TerminalSettings.prefs()) {
    if (!this.allowed(prefs)) return;
    this.show({ band: 2, loss: this.loss(), day: game.s.day }, true, prefs);
  },
  cleanup() {
    clearTimeout(this.timer); clearTimeout(this.settleTimer); clearTimeout(this.shockTimer); clearTimeout(this.revealTimer);
    this.timer = null; this.settleTimer = null; this.shockTimer = null; this.revealTimer = null; this.previewing = false;
    if ($('capitalAlert')) $('capitalAlert').classList.remove('capital-blackout','capital-reveal');
    document.body.classList.remove('capital-visited');
    if (this.hitGain && this.audio) {
      this.hitGain.gain.cancelScheduledValues(this.audio.currentTime);
      this.hitGain.gain.value = 0;
      this.hitGain.disconnect();
      this.hitGain = null;
    }
    for (const tone of this.hitTones.splice(0)) {
      tone.stop();
      tone.disconnect();
    }
  },
  dismiss() {
    this.cleanup();
    if ($('capitalAlert')?.open) $('capitalAlert').close();
  },
  hit(enabled) {
    if (!enabled) return;
    try {
      this.audio ||= new (window.AudioContext || window.webkitAudioContext)();
      this.audio.resume().catch(() => {});
      const t = this.audio.currentTime, gain = this.audio.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(.045, t + .012);
      gain.gain.exponentialRampToValueAtTime(.0001, t + .8);
      gain.connect(this.audio.destination);
      this.hitGain = gain;
      for (const f of [62, 127, 401]) {
        const tone = this.audio.createOscillator();
        tone.type = 'triangle'; tone.frequency.setValueAtTime(f * 2, t);
        tone.frequency.exponentialRampToValueAtTime(f, t + .2);
        tone.connect(gain); this.hitTones.push(tone); tone.start(t); tone.stop(t + .75);
        tone.onended = () => { tone.disconnect(); };
      }
      const buffer = this.audio.createBuffer(1, Math.floor(this.audio.sampleRate * .32), this.audio.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
        data[i] = ((x - Math.floor(x)) * 2 - 1) * .65;
      }
      const noise = this.audio.createBufferSource(), filter = this.audio.createBiquadFilter();
      noise.buffer = buffer; filter.type = 'bandpass'; filter.frequency.value = 1500; filter.Q.value = .7;
      noise.connect(filter); filter.connect(gain); noise.start(t); this.hitTones.push(noise);
      noise.onended = () => { noise.disconnect(); filter.disconnect(); };
      setTimeout(() => gain.disconnect(), 900);
    } catch { /* Audio is optional; the visual event is still playable. */ }
  },
  paint() {
    if (!$('capitalLetter')) return;
    const p = TerminalSettings.prefs(), loss = this.loss(), band = this.band(loss);
    const level = p.effects && p.atmosphere === 'intense' ? (RoomAtmosphere.draft ? 4 : band) : 0;
    document.body.dataset.capital = String(level);
    $('capitalLetter').hidden = !p.effects || p.atmosphere === 'off';
    if (band && p.effects && p.atmosphere !== 'off') {
      $('pressureCopy').textContent = '「' + this.lines[band] + '」 — 资本清算部';
      $('capitalLetter').textContent = '资本来函 · ' + this.names[band] + ' ↗';
    } else {
      $('capitalLetter').textContent = '资本来函 · 查看账单 ↗';
    }
    if (level) {
      $('roomWhisper').textContent = this.sublines[level].replace('资本清算部：', '');
      $('roomWhisper').hidden = false;
    } else if ($('roomWhisper').textContent !== RoomAtmosphere.lastWhisper) {
      $('roomWhisper').textContent = RoomAtmosphere.lastWhisper;
    }
    if (!this.allowed()) { this.pending = null; if (!this.previewing) this.dismiss(); }
  },
  letter() {
    const band = this.band(this.loss()), loss = this.loss();
    modal('资本来函', '<article class="capital-letter-sheet"><span class="terminal-kicker">虚构机构 / 资本清算部</span><h2>尊敬的流动性提供者：</h2><p>「' + this.lines[band] + '」</p><dl><dt>当前净亏损（含浮动盈亏）</dt><dd>¥ ' + money(loss) + '</dd><dt>累计实际交易费用</dt><dd>¥ ' + money(game.s.totalFees) + '</dd><dt>风险归属</dt><dd>你</dd><dt>你的睡眠与明天</dt><dd>不在估值模型内</dd></dl><p>我们把你的焦虑命名为活跃度，把你的犹豫标记为潜在成交。交易继续的时候，计费也会继续。</p><blockquote>报表不会替你感到疼。你可以停止向它证明什么。</blockquote><small>这是虚构剧情。不会发起委托、改变价格或额外扣款。</small><div class="modal-actions"><button class="btn" data-modal="close">拒绝被定价</button><button class="btn btn-dark" id="letterSettings">调整恐怖效果</button></div></article>');
    $('letterSettings').onclick = () => TerminalSettings.open();
  },
  init() {
    this.mount();
    const oldPressure = RoomAtmosphere.pressure;
    RoomAtmosphere.pressure = function () {
      const pressure = oldPressure.call(this);
      pressure.level = Math.max(pressure.level, Math.min(3, CapitalHorror.band(CapitalHorror.loss())));
      return pressure;
    };
    const oldAtmosphere = RoomAtmosphere.update;
    RoomAtmosphere.update = function () { oldAtmosphere.call(this); CapitalHorror.paint(); };
    const oldPreviewStop = RoomAtmosphere.stopPreview;
    RoomAtmosphere.stopPreview = function () { oldPreviewStop.call(this); CapitalHorror.schedule(); };
    const beforeSave = save;
    save = function () { CapitalHorror.observe(); return beforeSave(); };
    const beforeRender = render;
    render = function () {
      const changed = CapitalHorror.observe();
      beforeRender();
      if (changed) beforeSave();
    };
    this.observe();
    document.querySelector('.brand h1 span').textContent = 'V5.2';
    render();
  }
};
CapitalHorror.init();
