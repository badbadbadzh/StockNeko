'use strict';
/*
 * 第一阶段心理系统：所有字段都属于本地存档的可选扩展，旧存档会在第一次渲染时迁移。
 * 它只观察账户和交易记录，不会替玩家下单，也不会改变行情随机数。
 */
const TradingPsychology = {
  advisors: [
    { id: 'risk', name: '林岚', role: '风险观察员', mark: 'R', line: '先把“我想回本”写下来，再决定是否还要看盘。' },
    { id: 'flow', name: '周序', role: '资金流研究员', mark: 'F', line: '每一次加仓都要回答：如果明天没有反弹，你还能承受吗？' },
    { id: 'quiet', name: '白栖', role: '情绪教练', mark: 'Q', line: '屏幕上的红绿不是命令。你可以让下一笔交易晚一点发生。' },
    { id: 'audit', name: '顾砚', role: '复盘审计师', mark: 'A', line: '把结果和理由分开，市场才不会替你编故事。' }
  ],
  stages: [
    { name: '平稳', copy: '数字在变化，但还没有接管你的注意力。' },
    { name: '警觉', copy: '你开始频繁确认价格。每一次刷新都像是在寻找许可。' },
    { name: '磨损', copy: '亏损被写进身体。回本念头会把风险伪装成机会。' },
    { name: '崩解', copy: '你正在用下一笔交易替上一笔辩护。' },
    { name: '失焦', copy: '屏幕仍然亮着，判断却已经交给了恐惧。' }
  ],
  watchedGame: null,
  scheduled: false,
  demonTimer: null,
  phantomTimer: null,
  lastStats: null,
  clamp(v, min, max) { return Math.max(min, Math.min(max, v)); },
  ensure(g = game) {
    const s = g.s;
    if (!s.psychology || typeof s.psychology !== 'object') {
      s.psychology = {
        version: 1, stress: 20, stage: 1, lastStage: 1, highWatermark: s.initialCash,
        recoveryAmount: 0, recoveryRate: 0, realizedLoss: 0, unrealizedLoss: 0,
        lossStreak: 0, tradeBurst: 0, concentration: 0, history: [], trauma: [],
        demon: { enabled: true, seen: 0, responses: [] },
        phantom: { enabled: true, seen: 0 }, advisor: 'quiet', relationships: {}
      };
    }
    const p = s.psychology;
    p.version = 1;
    p.history ||= [];
    p.trauma ||= [];
    p.demon ||= { enabled: true, seen: 0, responses: [] };
    p.demon.responses ||= [];
    p.phantom ||= { enabled: true, seen: 0 };
    p.relationships ||= {};
    if (!this.advisors.some(x => x.id === p.advisor)) p.advisor = 'quiet';
    return p;
  },
  values(g = game) {
    const s = g.s, p = this.ensure(g);
    const equity = Math.max(0, g.equity), initial = Math.max(1, s.initialCash);
    const high = Math.max(initial, s.peak || initial, p.highWatermark || initial);
    const drawdown = this.clamp((high - equity) / high, 0, 1);
    const loss = this.clamp((initial - equity) / initial, 0, 1);
    let portfolio = { unrealized: 0, concentration: 0, exposure: 0 };
    try { portfolio = Analytics.portfolio(g); } catch { /* old or partially loaded saves */ }
    const realizedLoss = Math.max(0, -(s.realized || 0));
    const unrealizedLoss = Math.max(0, -(portfolio.unrealized || 0));
    const lossStreak = Math.max(0, Number(s.stats?.lossStreak || 0));
    const tradeBurst = (s.trades || []).filter(t => t.day === s.day).length;
    const concentration = this.clamp(Number(portfolio.concentration || 0), 0, 1);
    const stress = this.clamp(Math.round(12 + loss * 74 + drawdown * 42 + lossStreak * 7 + concentration * 13 + Math.min(15, tradeBurst * 1.5)), 0, 100);
    const stage = stress >= 80 ? 4 : stress >= 60 ? 3 : stress >= 40 ? 2 : stress >= 20 ? 1 : 0;
    return {
      equity, initial, high, loss, drawdown, realizedLoss, unrealizedLoss, lossStreak,
      tradeBurst, concentration, exposure: Number(portfolio.exposure || 0), stress, stage,
      recoveryAmount: Math.max(0, high - equity),
      recoveryRate: equity > 0 ? Math.max(0, (high - equity) / equity) : 1
    };
  },
  remember(p, stats, kind, text) {
    p.history.push({ day: game.s.day, tick: game.s.tick, kind, stage: stats.stage, stress: stats.stress, equity: stats.equity, text });
    if (p.history.length > 40) p.history.splice(0, p.history.length - 40);
  },
  sync() {
    if (typeof game === 'undefined' || !game || !game.s) return null;
    if (this.watchedGame !== game) { this.watchedGame = game; this.lastStats = null; this.lastStage = null; this.lastLossStreak = null; clearTimeout(this.demonTimer); clearTimeout(this.phantomTimer); }
    const fresh = !game.s.psychology, p = this.ensure(), stats = this.values();
    // Keep the live pressure calculation out of the serialized game state. This makes
    // cosmetic pressure updates and jump-scare previews byte-stable for old save tests.
    this.live = stats;
    if (fresh) {
      p.stress = stats.stress; p.stage = stats.stage; p.highWatermark = stats.high;
      p.recoveryAmount = stats.recoveryAmount; p.recoveryRate = stats.recoveryRate;
      p.realizedLoss = stats.realizedLoss; p.unrealizedLoss = stats.unrealizedLoss;
      p.lossStreak = stats.lossStreak; p.tradeBurst = stats.tradeBurst; p.concentration = stats.concentration;
      this.lastStage = stats.stage;
      this.lastStats = stats;
      return stats;
    }
    if (this.lastStage === null) this.lastStage = Number.isFinite(p.stage) ? p.stage : stats.stage;
    const oldStage = this.lastStage;
    if (oldStage !== stats.stage && (stats.stage > oldStage || stats.stage === 0)) {
      this.remember(p, stats, 'stage', '压力进入「' + this.stages[stats.stage].name + '」：' + this.stages[stats.stage].copy);
      if (stats.stage >= 3 && stats.loss > 0.1) this.addTrauma('压力达到第 ' + stats.stage + ' 阶段，账户回撤 ' + (stats.drawdown * 100).toFixed(1) + '%。', stats);
    }
    if (this.lastLossStreak === null) this.lastLossStreak = Number(p.lastLossStreak || 0);
    if (stats.lossStreak >= 2 && stats.lossStreak !== this.lastLossStreak) {
      this.remember(p, stats, 'loss-streak', '连续亏损 ' + stats.lossStreak + ' 次，回本恶魔开始寻找入口。');
      this.lastLossStreak = stats.lossStreak;
    }
    this.lastStage = stats.stage;
    this.lastStats = stats;
    if (stats.stage >= 2 && stats.stage > oldStage && p.demon.enabled !== false) this.scheduleDemon(stats);
    if (stats.stage >= 3 && stats.stress >= 60 && p.phantom.enabled !== false && !p.phantom.seen) this.schedulePhantom(stats);
    return stats;
  },
  effectAllowed() {
    try { const p = TerminalSettings.prefs(); return p.effects && p.atmosphere !== 'off' && p.motion && !document.hidden; }
    catch { return false; }
  },
  scheduleDemon(stats) {
    if (this.scheduled || this.demonTimer || !this.effectAllowed()) return;
    this.scheduled = true;
    this.demonTimer = setTimeout(() => { this.scheduled = false; this.demonTimer = null; if (!document.querySelector('dialog[open]')) this.showDemon(stats); }, 420);
  },
  schedulePhantom(stats) {
    if (this.phantomTimer || !this.effectAllowed()) return;
    this.phantomTimer = setTimeout(() => { this.phantomTimer = null; if (!document.querySelector('dialog[open]')) this.showPhantom(stats); }, 760);
  },
  showDemon(stats = this.lastStats || this.values()) {
    const p = this.ensure();
    this.remember(p, stats, 'demon', '回本恶魔出现：它把历史高点伪装成下一次买入理由。');
    p.demon.seen = (p.demon.seen || 0) + 1;
    modal('回本恶魔 / REVENGE TRADING', `<article class="psy-demon"><div class="psy-demon-face" aria-hidden="true"><i></i><i></i><b></b></div><span class="terminal-kicker">行为监测 · 不是交易信号</span><h2>你只差 ¥ ${money(stats.recoveryAmount)}。</h2><p>从现在的 ¥ ${money(stats.equity)} 回到历史高点 ¥ ${money(stats.high)}，还需要上涨 <b>${(stats.recoveryRate * 100).toFixed(1)}%</b>。恶魔会把“还差一点”说成“再买一次”。</p><div class="psy-metrics"><span>连续亏损 <b>${stats.lossStreak} 次</b></span><span>当前压力 <b>${stats.stress}/100</b></span><span>浮动亏损 <b>¥ ${money(stats.unrealizedLoss)}</b></span></div><blockquote>“你不是在追价格。你是在追一个已经不存在的自己。”</blockquote><div class="modal-actions"><button class="btn" id="psyDemonPause">暂停十分钟</button><button class="btn" id="psyDemonArchive">写入创伤档案</button><button class="btn btn-dark" id="psyDemonContinue">我知道，但我仍要观察</button></div><small class="muted">本段只记录心理状态，不会替你买卖股票。</small></article>`);
    $('psyDemonPause').onclick = () => this.demonChoice('pause', stats);
    $('psyDemonArchive').onclick = () => this.demonChoice('archive', stats);
    $('psyDemonContinue').onclick = () => this.demonChoice('continue', stats);
  },
  demonChoice(choice, stats) {
    const p = this.ensure(); p.demon.responses.push({ day: game.s.day, choice, stress: stats.stress });
    if (p.demon.responses.length > 30) p.demon.responses.shift();
    this.remember(p, stats, 'choice', choice === 'pause' ? '你暂停了屏幕。' : choice === 'archive' ? '你把这次冲动写入档案。' : '你选择继续观察。');
    if (choice === 'archive') this.addTrauma('回本冲动：连续亏损 ' + stats.lossStreak + ' 次时仍想加仓。', stats);
    save(); closeModal(); render(); toast(choice === 'pause' ? '已记录暂停。让下一笔交易晚一点。' : choice === 'archive' ? '已写入交易创伤档案。' : '已记录：继续观察，不代表必须下单。');
  },
  showPhantom(stats = this.lastStats || this.values()) {
    const p = this.ensure(); p.phantom.seen = 1; this.addTrauma('幻觉收益覆盖了当前亏损：历史高点 ¥' + money(stats.high) + ' 被误认为即将回来的价格。', stats);
    const overlay = document.createElement('div'); overlay.className = 'phantom-profit'; overlay.innerHTML = `<div class="phantom-card"><span class="terminal-kicker">心理回忆 / 非实时行情</span><b>+¥${money(stats.recoveryAmount)}</b><strong>回本了。</strong><p>这不是成交回报。当前账户仍为 ¥${money(stats.equity)}，距离历史高点还差 ¥${money(stats.recoveryAmount)}。</p><button type="button" class="btn btn-dark" id="closePhantom">我看见了</button></div>`; document.body.appendChild(overlay); requestAnimationFrame(() => overlay.classList.add('is-visible')); const close = () => { overlay.classList.remove('is-visible'); setTimeout(() => overlay.remove(), 260); }; $('closePhantom').onclick = close; setTimeout(() => { if (overlay.isConnected) close(); }, 4300);
  },
  addTrauma(text, stats = this.lastStats || this.values()) {
    const p = this.ensure(); p.trauma.push({ day: game.s.day, tick: game.s.tick, text, stress: stats.stress, loss: Math.max(0, stats.initial - stats.equity), recoveryAmount: stats.recoveryAmount }); if (p.trauma.length > 30) p.trauma.shift();
  },
  archive() {
    const p = this.ensure(), stats = this.lastStats || this.values();
    modal('交易创伤档案 / MEMORY ARCHIVE', `<div class="psy-archive"><p class="muted">这里保存你在本局里看到过的压力节点。数字来自当前存档，档案不会自动做出交易决定。</p><div class="psy-archive-head"><span>当前压力</span><b>${stats.stress}/100 · ${this.stages[stats.stage].name}</b><span>需回到高点</span><b>¥${money(stats.recoveryAmount)} / ${(stats.recoveryRate * 100).toFixed(1)}%</b></div><h4>创伤记录</h4>${p.trauma.slice().reverse().map(x => `<article><small>第 ${x.day} 日 · 压力 ${x.stress}/100</small><p>${esc(x.text)}</p><span>当时距离高点还差 ¥${money(x.recoveryAmount)}</span></article>`).join('') || '<p class="muted">还没有记录。市场会留下第一条。</p>'}<h4>最近的选择</h4>${p.demon.responses.slice().reverse().slice(0,8).map(x => `<p class="archive-choice">第 ${x.day} 日 · ${x.choice === 'pause' ? '暂停十分钟' : x.choice === 'archive' ? '写入档案' : '继续观察'}</p>`).join('') || '<p class="muted">尚未回应回本恶魔。</p>'}<div class="modal-actions"><button class="btn" id="psyArchiveClear">清空本局档案</button><button class="btn btn-dark" data-modal="close">回到交易室</button></div></div>`);
    $('psyArchiveClear').onclick = () => { p.trauma = []; p.history = []; save(); closeModal(); render(); toast('本局心理档案已清空。'); };
  },
  advisorsPage() {
    const p = this.ensure();
    modal('顾问室 / ADVISORY ROOM', `<div class="advisors-grid">${this.advisors.map(a => `<button class="advisor-card ${p.advisor === a.id ? 'active' : ''}" data-advisor="${a.id}"><span class="advisor-mark">${a.mark}</span><b>${a.name}</b><small>${a.role}</small><p>${a.line}</p><em>关系 ${p.relationships[a.id] || 0}/5</em></button>`).join('')}</div><p class="muted advisor-note">顾问只提供观察角度，不会替你下单，也不会预测下一根 K 线。</p><div class="modal-actions"><button class="btn btn-dark" data-modal="close">离开顾问室</button></div>`);
    document.querySelectorAll('[data-advisor]').forEach(el => el.onclick = () => { const id = el.dataset.advisor; p.advisor = id; p.relationships[id] = Math.min(5, (p.relationships[id] || 0) + 1); this.remember(p, this.lastStats || this.values(), 'advisor', '你与 ' + this.advisors.find(a => a.id === id).name + ' 进行了第 ' + p.relationships[id] + ' 次交流。'); save(); closeModal(); render(); toast('已选择 ' + this.advisors.find(a => a.id === id).name + ' 作为当前顾问。'); });
  },
  paint(stats = this.lastStats || this.values()) {
    const p = this.ensure(); document.body.dataset.psyStage = String(stats.stage); document.body.dataset.psyStress = String(stats.stress);
    const panel = $('psyPanel'); if (!panel) return;
    panel.dataset.stage = String(stats.stage); $('psyStressValue').textContent = stats.stress + '/100'; $('psyStressFill').style.width = stats.stress + '%'; $('psyStressStage').textContent = this.stages[stats.stage].name; $('psyStressCopy').textContent = this.stages[stats.stage].copy; $('psyRecovery').textContent = '还需 ¥' + money(stats.recoveryAmount) + ' · +' + (stats.recoveryRate * 100).toFixed(1) + '%'; $('psyStreak').textContent = stats.lossStreak + ' 次'; $('psyAdvisorName').textContent = this.advisors.find(x => x.id === p.advisor)?.name || '白栖';
  },
  mount() {
    const side = document.querySelector('.side'); if (!side || $('psyPanel')) return;
    side.insertAdjacentHTML('beforeend', '<section class="psy-panel" id="psyPanel"><div class="psy-panel-head"><span class="micro-label">心理账户 / PSYCH MONITOR</span><span id="psyStressStage">平稳</span></div><div class="psy-stress-row"><b id="psyStressValue">20/100</b><span class="psy-stress-track"><i id="psyStressFill"></i></span></div><p id="psyStressCopy">数字在变化，但还没有接管你的注意力。</p><div class="psy-quick"><span>距历史高点 <b id="psyRecovery">¥0 · +0.0%</b></span><span>连续亏损 <b id="psyStreak">0 次</b></span></div><div class="psy-actions"><button type="button" id="psyArchive">创伤档案</button><button type="button" id="psyAdvisors">顾问室</button></div><small>当前顾问：<b id="psyAdvisorName">白栖</b> · 只观察，不代替你交易</small></section>');
    $('psyArchive').onclick = () => this.archive(); $('psyAdvisors').onclick = () => this.advisorsPage();
  },
  init() {
    this.mount();
    const beforeRender = render;
    render = () => { beforeRender(); const stats = this.sync(); this.paint(stats || this.values()); };
    this.sync(); this.paint(); render();
  }
};
TradingPsychology.init();
