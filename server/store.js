'use strict';
const {DatabaseSync}=require('node:sqlite'),fs=require('node:fs'),path=require('node:path');
class Store {
 constructor(file){if(file!==':memory:')fs.mkdirSync(path.dirname(file),{recursive:true});this.db=new DatabaseSync(file);this.db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS records(bucket TEXT NOT NULL,key TEXT NOT NULL,value TEXT NOT NULL,PRIMARY KEY(bucket,key)); CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,username TEXT NOT NULL UNIQUE COLLATE NOCASE,password TEXT NOT NULL,created INTEGER NOT NULL);');}
 get(bucket,key,fallback=null){const r=this.db.prepare('SELECT value FROM records WHERE bucket=? AND key=?').get(bucket,key);return r?JSON.parse(r.value):fallback;}
 put(bucket,key,value){this.db.prepare('INSERT INTO records VALUES(?,?,?) ON CONFLICT(bucket,key) DO UPDATE SET value=excluded.value').run(bucket,key,JSON.stringify(value));return value;}
 remove(bucket,key){this.db.prepare('DELETE FROM records WHERE bucket=? AND key=?').run(bucket,key);}
 all(bucket){return this.db.prepare('SELECT key,value FROM records WHERE bucket=?').all(bucket).map(r=>({key:r.key,...JSON.parse(r.value)}));}
 tx(fn){this.db.exec('BEGIN IMMEDIATE');try{const result=fn();this.db.exec('COMMIT');return result;}catch(e){this.db.exec('ROLLBACK');throw e;}}
 close(){this.db.close();}
}
module.exports=Store;
