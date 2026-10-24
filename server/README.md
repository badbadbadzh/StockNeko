# 拟股喵喵 v2.0 平台服务

默认的 `outputs/拟股喵喵-A股生存手记.html` 仍可直接打开，使用本地 Demo Data 与 IndexedDB 存档。需要服务端行情、账号隔离、受保护模拟撮合、好友与七日对战时，从项目根目录执行：

```powershell
Copy-Item .env.example .env
npm start
```

服务默认监听 `http://127.0.0.1:8765`。首次运行会在 `data/stock-meow.sqlite` 建立 SQLite 数据库。`.env` 中 `MARKET_PROVIDER=demo` 时，所有页面明确标记 Demo Data，不会伪装为实时行情；只配置 Tushare Token、已确认许可和接口权限后，才使用 `MARKET_PROVIDER=tushare`。

Tushare Pro Token 只在服务端环境变量中读取，浏览器不会收到 Token。服务使用 `stock_basic`（全市场股票名单）、`trade_cal`（交易日历）、`rt_k` 或 `daily`（日线快照）、可选 `rt_min`（分钟线）和 `rt_idx_k`（指数）接口。`rt_k` 与 `rt_min` 是单独权限，个人 Token 的数据使用范围需要按照数据商协议确认，不能把个人授权当作公开再分发许可。

服务端会做缓存、请求去重、指数退避、每分钟限频、股票状态校验、交易时段校验、行情最大年龄校验、涨跌停校验、T+1、手续费、幂等委托和 SQLite 事务。撮合假设为：限价单只能在服务收到的最新一档买卖盘价格满足时成交；每个账户每次只使用该档可见量的 10% 作为模拟成交上限；不模拟真实排队，因此页面会明确说明“模拟撮合”。缺少可靠报价时订单拒绝，不回退到 Demo Data。

## 真实日汇率与虚拟兑换

外汇代理使用 [Frankfurter v1 公共接口](https://frankfurter.dev/v1/)，无需注册或 API Key。直接执行 `npm start` 即可使用；无需为外汇配置 Tushare 或任何 AI 服务密钥。股票继续使用原有模拟行情，外汇兑换仍只改变本地虚拟资金。Frankfurter 提供工作日更新的参考汇率，不是盘中实时成交价。

进入游戏的「外汇市场」，在走势图上方将「随机模拟」切换为「真实日汇率」。切换前需将已有外币换回人民币，防止在两套不同价格之间制造收益。支持十种货币的双向兑换和近一周、一月、三月、一年的历史日汇率；真实模式不会生成盘中波动。两种模式共用原有本地存档和人民币现金，股票模式保持模拟。没有 npm 时，可用 Node.js 24 执行 `node server/index.js` 启动。

GitHub Pages 或直接打开成品 HTML 时，浏览器会直接请求 Frankfurter 的公开接口；本地服务优先使用带缓存的代理。两条路径均无需密钥。断网时显示最近一次成功数据及其时间，过期后停止兑换。

- `GET /api/fx/latest`：最新可用日汇率。
- `GET /api/fx/history?days=30`：真实历史日汇率，可选 `7`、`30`、`90`、`365`，默认 `30`。保留周末和假期的数据空缺，不生成价格或补造 K 线。

两个接口均公开只读，不需要登录。成功响应仍使用 `{ok:true,data:...}` 外层格式。最新汇率的 `data` 包含 `source:'Frankfurter'`、`kind:'daily'`、`date`、`fetchedAt`、`rates`、`cached` 和 `stale`；历史汇率以 `points:[{date,rates}]` 代替 `date` 和 `rates`，其余字段相同。`fetchedAt` 是 UTC ISO 时间，`date` 是数据发布日期。`rates` 始终包含 CNY、USD、EUR、JPY、GBP、HKD、AUD、CAD、CHF、SGD，值统一表示「每单位该货币折合多少人民币」，其中 CNY 为 1。从 A 兑换为 B 的比率为 `rates[A] / rates[B]`。

最新数据缓存 1 小时，历史数据缓存 6 小时，保存在 SQLite 的 `fx-cache` 中。上游超时或数据不合法时，返回最近一次有效缓存，并用 `cached:true` 和 `message` 说明；原始 `date`、`fetchedAt` 不会被刷新。发布日期超过 7 个 UTC 日，或最后一次成功获取超过 24 小时，均标记 `stale:true`，前端必须禁止兑换，只保留查看。没有有效缓存时返回 HTTP 503 和通用错误 `FX_UNAVAILABLE`。同类请求合并、超时限制为 10 秒，失败后等待 30 秒再尝试上游；代理不能接受任意上游地址。

静态文件只开放 `/`、`/index.html`、`/docs/index.html` 和成品 HTML 路径。图片、字体和 CSS 只允许放在 `assets/`、`docs/assets/`、`outputs/assets/` 内。服务不会提供项目源码、环境文件、数据库或任意 JavaScript 文件，目录穿越和指向非公开目录的链接也会拒绝。

## 账号与接口

服务账号是可选的服务端账号，与原有浏览器本地玩家档案并存。服务 API 使用 HttpOnly Cookie、SameSite、CSRF token 和用户隔离的账户键。主要接口包括：

- `POST /api/auth/register`、`POST /api/auth/login`、`GET /api/me`
- `GET /api/market/status|search|detail|history|financials|events`
- `GET /api/fx/latest`、`GET /api/fx/history?days=30`
- `GET /api/account`、`POST /api/account/order|cancel|watch|alert|predict|activity|risk`
- `GET/POST /api/friends`、`GET/POST /api/friends/messages`
- `GET/POST /api/battles`、`GET /api/leaderboard`

好友战绩只有对方授权后可查看；比赛成员必须使用同一数据源和规则快照。市场事件只读行情并生成提示，不能修改真实报价。预测使用下一交易日收盘数据结算，不能用盘中价格提前结算。

## 开发检查

```powershell
npm test
npm run build
node work/tests/platform.browser.test.js
```

服务未配置真实数据商时，使用前端的离线单文件版本即可体验所有原有模式、挑战、预测、猫咪中心和市场事件练习。
