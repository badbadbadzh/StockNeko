const fs=require('fs');
let p='work/v2/save-manager.js',s=fs.readFileSync(p,'utf8');
s=s.replace("if(old[k]!==undefined)s[k]=old[k];","if(old[k]!==undefined)s[k]=old[k];s.finished=false;s.config.mode='endless';");
s=s.replace("(['stop','take'].includes(o.type)&&!integer(o.trigger,1))","(o.status!=='rejected'&&['stop','take'].includes(o.type)&&!integer(o.trigger,1))");
fs.writeFileSync(p,s);
p='work/engine.js';s=fs.readFileSync(p,'utf8');s=s.replace("if(typeof module!=='undefined'){","if(typeof module!=='undefined'){global.pako=require('./v2/pako.min');");
s=s.replace("if(typeof EventManager!=='undefined')EventManager.endDay(this);","if(this.s.config.challenge&&this.s.day===20&&!this.s.challengeResult)this.s.challengeResult=Analytics.challenge(this);\n    if(typeof EventManager!=='undefined')EventManager.endDay(this);");
fs.writeFileSync(p,s);
