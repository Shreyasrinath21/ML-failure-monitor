import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const sourceDataDir=path.join(projectRoot,'data');
export const dataDir=process.env.VERCEL?path.join(os.tmpdir(),'modelguard-data'):sourceDataDir;

if(process.env.VERCEL&&!fs.existsSync(path.join(dataDir,'model.json'))){
  fs.mkdirSync(dataDir,{recursive:true});
  fs.cpSync(sourceDataDir,dataDir,{recursive:true});
}
