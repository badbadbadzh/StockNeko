# 拟股喵喵 v2.0 平台服务

默认的 `outputs/拟股喵喵-A股生存手记.html` 仍可直接打开，使用本地 Demo Data 与 IndexedDB 存档。需要服务端行情、账号隔离、受保护模拟撮合、好友与七日对战时，从项目根目录执行：

```powershell
Copy-Item .env.example .env
npm start
```

服务默认监听 `http://127.0.0.1:8765`。首次运行会在 `data/stock-meow.sqlite` 建立 SQLite 数据库。`.env` 中 `MARKET_PROVIDER=demo` 时，所有页面明确标记 Demo Data，不会伪装为实时行情；只配置 Tushare Token、已确认许可和接口权限后，才使用 `MARKET_PROVIDER=tushare`。

Tushare Pro Token 只在服务端环境变量中读取，浏览器不会收到 Token。服务使用 `stock_basic`（全市场股票名单）、`trade_cal`（交易日历）、`rt_k` 或 `daily`（日线快照）、可选 `rt_min`（分钟线）和 `rt_idx_k`（指数）接口。`rt_k` 与 `rt_min` 是单独权限，个人 Token 的数据使用范围需要按照数据商协议确认，不能把个人授权当作公开再分发许可。

服务端会做缓存、请求去重、指数退避、每分钟限频、股票状态校验、交易时段校验、行情最大年龄校验、涨跌停校验、T+1、手续费、幂等委托和 SQLite 事务。撮合假设为：限价单只能在服务收到的最新一档买卖盘价格满足时成交；每个账户每次只使用该档可见量的 10% 作为模拟成交上限；不模拟真实排队，因此页面会明确说明“模拟撮合”。缺少可靠报价时订单拒绝，不回退到 Demo Data。

## 账号与接口

服务账号是可选的服务端账号，与原有浏览器本地玩家档案并存。服务 API 使用 HttpOnly Cookie、SameSite、CSRF token 和用户隔离的账户键。主要接口包括：

- `POST /api/auth/register`、`POST /api/auth/login`、`GET /api/me`
- `GET /api/market/status|search|detail|history|financials|events`
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
