'use strict';
/* 独立扩展玩法：虚拟 FX、契约、噩梦、漫画相册、人生路线和新闻调查。
 * 这些状态与 A 股现货账户隔离，所有数值只服务于剧情模拟。 */
const Phase1Extensions = {
  careers: [
    ['retail', '普通散户', '从小额资金重新学会边界。'],
    ['analyst', '金融研究员', '解锁更多研究与复盘角度。'],
    ['pro', '职业交易员', '进入高难度的风险管理挑战。'],
    ['journalist', '金融记者', '调查消息来源，辨别真假传闻。'],
    ['retired', '隐退者', '把时间还给生活与关系。']
  ],
  contracts: [
    { id: 'double', name: 'Double or Nothing', cn: '孤注合约', text: '纯剧情回合内，虚拟盈亏放大；A 股账户不受影响。', goal: '虚拟收益达到 +12%，或承受一次 -12%。' },
    { id: 'last', name: 'The Last Chance', cn: '最后一次机会', text: '连续三次观察后才可结算，拒绝用一笔交易证明自己。', goal: '完成三次观察并在压力阶段低于 60。' },
    { id: 'leverage', name: 'Forbidden Leverage', cn: '禁忌杠杆', text: '只在虚拟 FX 实验室启用 10 倍杠杆，触及维持率即强平。', goal: '在虚拟 FX 中平仓离场。' }
  ],
  rumorData: [
    { id: 'rumor-001', title: '神秘投资即将落地？', source: '匿名群聊 / 游戏虚构来源', time: '第 3 日 08:41', evidence: ['公司公告栏没有对应文件。', '两家媒体引用的是同一段匿名文字。', '股价先涨后回落，但价格不能单独证明消息真假。'], answer: '存疑', note: '来源单一且无法交叉验证，合理结论是存疑，不应直接当成虚假。' }
  ],
  ensure() {
    const s = game.s;
    if (!s.virtualFX) s.virtualFX = { version: 1, balance: 1000000, position: null, history: [], risk: 0 };
    if (!s.devilContracts) s.devilContracts = { active: null, completed: [], history: [] };
    if (!s.nightmare) s.nightmare = { version: 1, active: false, chapter: 0, choices: [], outcome: null };
    if (!s.mangaAlbum) s.mangaAlbum = [];
    if (!s.secondLife) s.secondLife = { career: null, unlocked: [], runs: 0 };
    if (!s.rumorCases) s.rumorCases = { records: [], solved: [] };
    return s;
  },
  fxMark() {
    const s = this.ensure(), pos = s.virtualFX.position, quote = game.s.stocks[pos?.stock ?? selected]?.price || 0;
    if (!pos) return { quote, equity: s.virtualFX.balance, pnl: 0, margin: 0, ratio: Infinity, distance: 1, danger: 0 };
    const units = pos.margin * pos.leverage / Math.max(1, pos.entry);
    const pnl = Math.round((quote - pos.entry) * units * pos.direction);
    const equity = s.virtualFX.balance + pos.margin + pnl;
    const ratio = equity / Math.max(1, pos.margin), maintenance = .25;
    const liquidation = pos.entry * (1 - pos.direction * (1 / pos.leverage - maintenance));
    const distance = Math.abs(quote - liquidation) / Math.max(1, pos.entry);
    const danger = ratio <= 1 ? 3 : ratio < 1.25 ? 2 : ratio < 1.6 ? 1 : 0;
    return { quote, equity, pnl, margin: pos.margin, ratio, distance, liquidation, danger };
  },
  openFX(direction, leverage, margin) {
    const s = this.ensure(), v = s.virtualFX;
    if (v.position) return toast('虚拟 FX 已有持仓，请先平仓。', true);
    margin = Math.max(10000, Math.min(v.balance - 10000, Math.round(Number(margin) || 100000)));
    if (margin <= 0) return toast('虚拟保证金不足。', true);
    v.balance -= margin; v.position = { stock: selected, entry: game.s.stocks[selected].price, direction: direction === 'short' ? -1 : 1, leverage: Math.max(2, Math.min(10, Number(leverage) || 5)), margin, day: game.s.day };
    v.history.push({ type: 'open', stock: game.s.stocks[selected].name, day: game.s.day, margin, leverage: v.position.leverage });
    save(); render(); this.fxModal(); toast('虚拟 FX 仓位已建立，A 股现货账户没有变化。');
  },
  closeFX() {
    const s = this.ensure(), v = s.virtualFX, mark = this.fxMark(); if (!v.position) return;
    v.balance = Math.max(0, v.balance + v.position.margin + mark.pnl); v.history.push({ type: 'close', stock: game.s.stocks[v.position.stock].name, day: game.s.day, pnl: mark.pnl, ratio: mark.ratio }); v.position = null; save(); render(); this.fxModal(); toast('虚拟 FX 已平仓，盈亏只写入虚拟实验室。');
  },
  fxModal() {
    const s = this.ensure(), v = s.virtualFX, mark = this.fxMark(), pos = v.position, stock = game.s.stocks[pos?.stock ?? selected];
    const risk = pos ? `<div class="fx-risk ${mark.danger?'danger-'+mark.danger:''}"><span>虚拟保证金维持率</span><b>${isFinite(mark.ratio) ? (mark.ratio * 100).toFixed(1) + '%' : '—'}</b><i style="width:${Math.min(100,Math.max(0,mark.ratio === Infinity ? 100 : mark.ratio / 2 * 100))}%"></i><small>${mark.danger >= 3 ? '已达到强平线，虚拟仓位将被关闭。' : '距强平价格 ' + (mark.distance * 100).toFixed(2) + '% · 不虚构倒计时'}</small></div><p>方向：${pos.direction > 0 ? '做多' : '做空'} · 杠杆 ${pos.leverage}× · 开仓 ¥${money(pos.entry)} · 当前 ¥${money(mark.quote)} · 浮动 ${money(mark.pnl, true)}</p><button class="btn btn-dark" id="fxClose">平掉虚拟仓位</button>` : `<p class="muted">当前没有虚拟仓位。选择方向与保证金后开始一段与 A 股隔离的演练。</p><div class="fx-form"><label>方向<select id="fxDirection"><option value="long">做多</option><option value="short">做空</option></select></label><label>杠杆<select id="fxLeverage"><option>5</option><option>10</option><option>2</option></select></label><label>保证金（虚拟）<input id="fxMargin" type="number" value="100000" min="10000" step="10000"></label></div><button class="btn btn-dark" id="fxOpen">建立虚拟仓位</button>`;
    modal('虚拟 FX 实验室 / ISOLATED RISK', `<div class="extension-kicker">独立模拟账户 · 与 A 股现货完全隔离</div><h2>保证金只在这里承担风险。</h2><p>虚拟余额 ¥${money(v.balance)} · 当前标的 ${esc(stock.name)} · 报价 ¥${money(mark.quote)}</p>${risk}<small class="muted">普通沪深 A 股没有杠杆强平。这里不接入真实资金、不产生真实订单。</small><div class="modal-actions"><button class="btn" id="fxBack">返回扩展玩法</button><button class="btn btn-dark" data-modal="close">离开实验室</button></div>`);
    if ($('fxOpen')) $('fxOpen').onclick = () => this.openFX($('fxDirection').value, $('fxLeverage').value, $('fxMargin').value); if ($('fxClose')) $('fxClose').onclick = () => this.closeFX(); if ($('fxBack')) $('fxBack').onclick = () => this.expansion();
  },
  contractsModal() {
    const s = this.ensure(), active = s.devilContracts.active;
    modal('恶魔契约 / DEVIL CONTRACTS', `<div class="extension-kicker">剧情模拟 · 不改变普通账户</div><p>契约只使用独立的剧情状态与虚拟结果。接受前会显示目标和风险，不会扣除现金。</p>${active ? `<div class="contract-active"><b>当前契约：${esc(active.cn)}</b><p>${esc(active.goal)}</p><small>已观察 ${active.observed || 0} / 3 次 · 合约状态：进行中</small><button class="btn btn-dark" id="contractObserve">记录一次观察</button></div>` : `<div class="contract-list">${this.contracts.map(c => `<article><span class="contract-seal">✦</span><b>${c.cn}</b><small>${c.name}</small><p>${c.text}</p><em>${c.goal}</em><button class="btn" data-contract="${c.id}">阅读并确认</button></article>`).join('')}</div>`}<div class="modal-actions"><button class="btn" id="contractBack">返回扩展玩法</button><button class="btn btn-dark" data-modal="close">离开契约室</button></div>`);
    if ($('contractBack')) $('contractBack').onclick = () => this.expansion();
    if ($('contractObserve')) $('contractObserve').onclick = () => { active.observed = (active.observed || 0) + 1; if (active.observed >= 3) { s.devilContracts.completed.push({ id: active.id, day: game.s.day }); s.devilContracts.active = null; toast('契约完成：你选择了观察。'); } save(); this.contractsModal(); };
    document.querySelectorAll('[data-contract]').forEach(el => el.onclick = () => { const c = this.contracts.find(x => x.id === el.dataset.contract); modal('确认契约：' + c.cn, `<p>${c.text}</p><div class="contract-terms"><b>条款</b><p>${c.goal}</p><p>所有盈亏均为虚拟剧情记录；A 股现货现金、订单和收益不会改变。</p></div><div class="modal-actions"><button class="btn" id="contractThink">我再想想</button><button class="btn btn-dark" id="acceptContract">接受这份契约</button></div>`); $('contractThink').onclick = () => this.contractsModal(); $('acceptContract').onclick = () => { s.devilContracts.active = { ...c, observed: 0, day: game.s.day }; s.devilContracts.history.push({ id: c.id, day: game.s.day }); save(); this.contractsModal(); }; });
  },
  nightmare() {
    const s = this.ensure(), n = s.nightmare, chapters = [{t:'希望',p:'屏幕很亮，数字还没有学会伤害你。'}, {t:'贪婪',p:'上涨把每一次加仓都伪装成勇气。'}, {t:'否认',p:'行情反转。终端开始重复同一条提醒。'}, {t:'绝望',p:'巨大的亏损数字遮住了所有解释。'}, {t:'接受',p:'你可以离开，也可以承认自己想要回本。'}];
    if (!n.active && !n.outcome) { n.active = true; n.chapter = 0; n.choices = []; }
    const c = chapters[n.chapter] || chapters[4], end = n.chapter >= 4;
    modal('噩梦交易日 / NIGHTMARE SESSION', `<div class="nightmare-frame"><span class="extension-kicker">独立虚拟场景 · 不影响普通存档资金</span><div class="nightmare-page"><small>CHAPTER ${n.chapter + 1} / 5</small><h2>${c.t}</h2><p>${c.p}</p><div class="nightmare-glyph">${n.chapter === 3 ? '¥ 00,000,000' : '▂▅▇▃▆'}</div></div>${end ? `<p>结局由你的选择组成：${n.choices.join(' · ') || '没有选择'}</p><div class="nightmare-outcome"><b>${n.choices.includes('离开') ? '理性退出结局' : n.choices.includes('加注') ? '侥幸与代价结局' : '接受结局'}</b><small>这是虚构心理演出，不会读取或修改真实行情。</small></div>` : `<div class="nightmare-choices"><button data-night="观察">观察盘口</button><button data-night="加注">加注虚拟头寸</button><button data-night="离开">离开屏幕</button></div>`}<div class="modal-actions"><button class="btn" id="nightmareSkip">${end ? '重新开始' : '跳过当前章节'}</button><button class="btn btn-dark" data-modal="close">返回交易终端</button></div></div>`);
    document.querySelectorAll('[data-night]').forEach(el => el.onclick = () => { n.choices.push(el.dataset.night); n.chapter = Math.min(4, n.chapter + 1); if (n.chapter >= 4) n.outcome = true; save(); this.nightmare(); });
    $('nightmareSkip').onclick = () => { if (end) { n.active = false; n.outcome = null; n.chapter = 0; n.choices = []; } else { n.chapter = Math.min(4, n.chapter + 1); } save(); this.nightmare(); };
  },
  manga() {
    const s = this.ensure(), stats = TradingPsychology.lastStats || TradingPsychology.values();
    modal('漫画相册 / MANGA ALBUM', `<div class="manga-album">${s.mangaAlbum.slice().reverse().map(m => `<article class="manga-strip"><b>${esc(m.title)}</b><span>¥${money(m.equity)} · 压力 ${m.stress}</span><p>${esc(m.line)}</p></article>`).join('') || '<p class="muted">重大盈亏、契约和剧情结算会在这里留下分镜。</p>'}</div><div class="manga-preview"><i>┌ 账户数字仍然准确 ┐</i><b>${money(stats.equity, true)}</b><span>「${esc(TradingPsychology.stages[stats.stage].name)}」</span></div><div class="modal-actions"><button class="btn" id="mangaCapture">把这一刻收进相册</button><button class="btn btn-dark" data-modal="close">返回交易终端</button></div>`); $('mangaCapture').onclick = () => { s.mangaAlbum.push({ day: game.s.day, title: '第 ' + game.s.day + ' 日 · ' + TradingPsychology.stages[stats.stage].name, equity: stats.equity, stress: stats.stress, line: TradingPsychology.stages[stats.stage].copy }); if (s.mangaAlbum.length > 24) s.mangaAlbum.shift(); save(); this.manga(); toast('分镜已保存到本局相册。'); };
  },
  secondLife() {
    const s = this.ensure(); modal('多周目人生 / SECOND LIFE', `<p>新的职业路线只解锁剧情、档案和玩法入口，不提高真实行情预测准确率。</p><div class="career-list">${this.careers.map(c => `<button data-career="${c[0]}" class="${s.secondLife.career === c[0] ? 'active' : ''}"><b>${c[1]}</b><span>${c[2]}</span></button>`).join('')}</div><p class="muted">当前路线：${s.secondLife.career ? this.careers.find(c => c[0] === s.secondLife.career)[1] : '尚未选择'} · 已开启 ${s.secondLife.unlocked.length} 项内容</p><div class="modal-actions"><button class="btn btn-dark" data-modal="close">回到终端</button></div>`); document.querySelectorAll('[data-career]').forEach(el => el.onclick = () => { s.secondLife.career = el.dataset.career; if (!s.secondLife.unlocked.includes(el.dataset.career)) s.secondLife.unlocked.push(el.dataset.career); save(); this.secondLife(); });
  },
  rumors() {
    const s = this.ensure(), c = this.rumorData[0], record = s.rumorCases.records.find(x => x.id === c.id), solved = s.rumorCases.solved.includes(c.id);
    modal('新闻调查 / RUMOR DETECTIVE', `<div class="extension-kicker">预置原创案例 · 与真实新闻分开</div><h2>${c.title}</h2><p><b>来源：</b>${c.source}<br><b>时间：</b>${c.time}</p><div class="evidence-list">${c.evidence.map((x,i) => `<button data-evidence="${i}">证据 ${i + 1}<span>${x}</span></button>`).join('')}</div>${solved ? `<div class="investigation-result"><b>已完成：${record.answer}</b><p>${c.note}</p></div>` : `<div class="rumor-answers"><span>你的判断</span>${['可信','存疑','虚假','证据不足'].map(x => `<button data-answer="${x}">${x}</button>`).join('')}</div>`}<div class="modal-actions"><button class="btn" id="rumorBack">返回扩展玩法</button><button class="btn btn-dark" data-modal="close">回到市场</button></div>`); if ($('rumorBack')) $('rumorBack').onclick = () => this.expansion(); document.querySelectorAll('[data-evidence]').forEach(el => el.onclick = () => el.classList.toggle('seen')); document.querySelectorAll('[data-answer]').forEach(el => el.onclick = () => { const answer = el.dataset.answer; s.rumorCases.records.push({ id: c.id, day: game.s.day, answer, correct: answer === c.answer }); if (!s.rumorCases.solved.includes(c.id)) s.rumorCases.solved.push(c.id); save(); this.rumors(); });
  },
  expansion() {
    this.ensure(); modal('扩展玩法 / OTHER ROOMS', `<div class="extension-grid"><button id="openFX"><b>虚拟 FX 实验室</b><span>保证金、维持率、强平价格</span></button><button id="openContracts"><b>恶魔契约</b><span>纯剧情虚拟合约与目标</span></button><button id="openNightmare"><b>噩梦交易日</b><span>五章独立心理恐怖场景</span></button><button id="openManga"><b>漫画相册</b><span>保存重大时刻的分镜</span></button><button id="openSecondLife"><b>多周目人生</b><span>职业路线与长期解锁</span></button><button id="openRumors"><b>新闻调查</b><span>证据、来源与真假判断</span></button></div><p class="muted">扩展房间只写入本地剧情状态。普通 A 股现金、订单、行情和历史收益不会被契约或强平改写。</p><div class="modal-actions"><button class="btn btn-dark" data-modal="close">回到交易终端</button></div>`); $('openFX').onclick = () => this.fxModal(); $('openContracts').onclick = () => this.contractsModal(); $('openNightmare').onclick = () => this.nightmare(); $('openManga').onclick = () => this.manga(); $('openSecondLife').onclick = () => this.secondLife(); $('openRumors').onclick = () => this.rumors();
  },
  paint() { const s = this.ensure(), mark = this.fxMark(); document.body.dataset.fxRisk = String(mark.danger); const b = $('psyExpansion'); if (b) b.textContent = mark.danger ? '扩展玩法 · 风险' : '扩展玩法'; },
  init() {
    this.ensure(); const panel = $('psyPanel'); if (panel) { panel.querySelector('.psy-actions').insertAdjacentHTML('beforeend', '<button type="button" id="psyExpansion">扩展玩法</button>'); $('psyExpansion').onclick = () => this.expansion(); }
    const before = render; render = () => { before(); this.ensure(); this.paint(); }; this.paint(); render();
  }
};
Phase1Extensions.init();
