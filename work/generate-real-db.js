const fs=require('fs');
const path='C:/Users/hanso/Downloads/nigumiao_hs300_plus_jianghuai_301.json';
const data=JSON.parse(fs.readFileSync(path,'utf8'));
const sectors=[
 {name:'银行与金融',short:'金融',vol:.013,beta:.65,pe:9,pb:.9,health:86,growth:38,attention:48,description:'银行、保险、证券与资产管理'},
 {name:'消费与食品饮料',short:'消费',vol:.019,beta:.75,pe:25,pb:3.6,health:82,growth:53,attention:60,description:'消费品牌、食品饮料、零售与出行'},
 {name:'医药与医疗',short:'医药',vol:.030,beta:.90,pe:34,pb:3.8,health:72,growth:74,attention:70,description:'医药、医疗器械与生物科技'},
 {name:'科技与半导体',short:'科技',vol:.040,beta:1.35,pe:45,pb:4.8,health:70,growth:80,attention:86,description:'半导体、软件、通信与数字基础设施'},
 {name:'新能源与汽车',short:'新能源',vol:.036,beta:1.25,pe:30,pb:3.3,health:69,growth:76,attention:82,description:'新能源、汽车、动力电池与智能制造'},
 {name:'工业制造与军工',short:'制造',vol:.025,beta:1.05,pe:24,pb:2.5,health:77,growth:62,attention:64,description:'工业设备、军工、机械与先进制造'},
 {name:'能源与资源',short:'资源',vol:.023,beta:.90,pe:14,pb:1.6,health:79,growth:44,attention:55,description:'能源、煤炭、石化、有色与公用事业'},
 {name:'建筑与地产',short:'地产',vol:.031,beta:1.15,pe:13,pb:1.0,health:55,growth:30,attention:50,description:'房地产、建筑、交通与城市基础设施'},
 {name:'传媒与互联网',short:'传媒',vol:.039,beta:1.35,pe:34,pb:3.8,health:67,growth:69,attention:80,description:'传媒、游戏、互联网与内容平台'},
 {name:'综合蓝筹',short:'蓝筹',vol:.018,beta:.82,pe:18,pb:1.9,health:80,growth:46,attention:52,description:'综合性龙头企业与其他沪深300成分股'}
];
const kw={0:['银行','证券','保险','资本','金服','财险','寿险'],1:['酒','乳','饮','食品','茅台','伊利','家居','机场','免','零售','商','服装','旅游','航空','国航','东航','铁路','物流','顺丰','海航'],2:['药','医','医疗','生物','眼科','诊断','白药','同仁堂'],3:['科技','通信','联通','电信','软件','电子','芯片','半导体','曙光','光电','卫星','中芯','华为','计算机','网络','数据','电路','云','富联','三六零','办公','微','芯','精密','信息'],4:['汽车','电池','能源','光伏','风电','锂','电气','比亚迪','宁德','隆基','通威','赛力斯','长城','广汽','上汽','江淮','电力'],5:['机械','重工','军','航','船','机载','沈飞','动力','设备','制造','中车','建筑','电机','液压','特钢','钢铁','电器','玻璃','智控'],6:['石油','石化','煤','铜','铝','黄金','矿','稀土','钨','有色','能源','水电','核电','电力','神华','油','化学'],7:['建筑','地产','置业','发展','机场','公路','铁路','交建','铁建','中铁','中建','基建','港','国电'],8:['传媒','游戏','网络','出版','影视','互联','东方财富','同花顺','分众','光线'],9:[]};
function hash(s){let h=2166136261;for(const ch of s){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function classify(s){const i=Object.entries(kw).find(([_,words])=>words.some(w=>s.name.includes(w)));return i?Number(i[0]):9;}
const stocks=data.stocks.map((r,id)=>{const sectorId=r.featured?4:classify(r),s=sectors[sectorId],h=hash(r.symbol),f=.78+(h%43)/100,priceCents=r.featured?2600:Math.max(500,Math.min(32000,600+(h%30000))),large=sectorId===0||sectorId===6||sectorId===7;const totalShares=(large?2500+(h%8500):180+(h%4200))*1e6;const floatShares=Math.round(totalShares*(.42+(h%46)/100)/100)*100;const pe=+(s.pe*f).toFixed(2),pb=+(s.pb*(.85+((h>>>8)%36)/100)).toFixed(2);return {id,name:r.name,symbol:r.symbol,code:r.symbol,exchange:r.exchange,sectorId,sector:s.name,initialPrice:priceCents,totalShares,floatShares,dailyVolume:Math.max(10000,Math.round(floatShares*(.004+((h>>>16)%30)/1000)/100)*100),volatility:+(s.vol*f*(r.featured?1.5:1)).toFixed(5),beta:+(s.beta*(.85+((h>>>12)%31)/100)).toFixed(3),eps:+((priceCents/100)/pe).toFixed(4),bookValue:+((priceCents/100)/pb).toFixed(4),financialHealth:Math.max(35,Math.min(98,s.health+((h>>>20)%19)-9)),growth:Math.max(20,Math.min(98,s.growth+((h>>>24)%23)-11)),attention:Math.max(20,Math.min(99,s.attention+((h>>>28)%17)-8)),sensitivity:+(.7+((h>>>4)%81)/100).toFixed(2),inCsi300:!!r.in_csi300,featured:!!r.featured,business:s.description,description:r.name+'（'+r.symbol+'）为真实市场简称；本地沙盒只使用其名称、代码和行业标签，价格与基本面为虚构模拟数据。'};});
const out="'use strict';\nconst StockDatabase="+JSON.stringify({snapshot:data.snapshot_checked_on,dataset:data.dataset,sectors,stocks},null,2)+";\nif(typeof module!=='undefined')module.exports=StockDatabase;\n";
fs.writeFileSync('work/v2/stock-database.js',out,'utf8');
console.log('generated',stocks.length);
