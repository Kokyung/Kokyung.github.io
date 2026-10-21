import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
const [major,minor]=process.versions.node.split('.').map(Number);
let runtime=process.execPath;
if(major<22||(major===22&&minor<22)){
  const bundled=path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe');
  if(process.platform==='win32'&&existsSync(bundled))runtime=bundled;
  else{console.error('Astro requires Node.js 22.22+ or 24+. Install Node 24, then run this command again.');process.exit(1);}
}
const child=spawn(runtime,['node_modules/astro/bin/astro.mjs',...process.argv.slice(2)],{stdio:'inherit',env:process.env});
child.on('error',e=>{console.error(e.message);process.exit(1);});
child.on('exit',code=>process.exit(code??1));
