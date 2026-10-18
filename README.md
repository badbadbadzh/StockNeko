# 拟股喵喵（Stock Meow）

中文 A 股生存模拟游戏：本地登录、随机行情、交易终端、生活事件、久留美 NPC、资本压迫视觉和可选恐怖特效。

## 快速试玩

直接打开 `outputs/拟股喵喵-A股生存手记.html` 即可离线试玩。离线版本使用明确标记的 Demo Data，本地资料保存在浏览器中。

## 从源码重新构建

需要 Node.js 24 或更高版本：

```powershell
npm run build
```

构建结果写入 `outputs/拟股喵喵-A股生存手记.html`。

## 启动平台服务器

```powershell
Copy-Item .env.example .env
npm start
```

默认地址为 `http://127.0.0.1:8765`。服务器包含账户、好友、消息、挑战、排行榜、订单撮合和行情接口；本地开发默认使用 Demo Data，并在界面明确标注来源。

如需接入真实行情，需要自行申请并配置有权限的 Tushare Token：

```env
MARKET_PROVIDER=tushare
TUSHARE_TOKEN=你的Token
MARKET_DATA_LICENSED=true
```

实时日线、分钟线等接口受 Tushare 权限和授权范围限制，项目不会伪造真实行情。

## 检查

```powershell
npm test
npm run test:ui
```

仓库不提交 `.env`、SQLite 数据库、运行日志和生成截图。
