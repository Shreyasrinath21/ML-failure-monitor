import fs from 'node:fs';
import path from 'node:path';
const file=path.resolve('data/monitoring.json');
export function readStore(){try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch{return {predictions:[],alerts:[], feedback:[]}}}
export function writeStore(data){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(data,null,2));}
