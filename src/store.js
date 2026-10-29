import fs from 'node:fs';
import path from 'node:path';
import {dataDir} from './data-path.js';
const file=path.join(dataDir,'monitoring.json');
export function readStore(){try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch{return {predictions:[],alerts:[], feedback:[]}}}
export function writeStore(data){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(data,null,2));}
