import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
// Spawn Node directly rather than shelling out to npm: works on Windows and POSIX.
const children=[spawn(process.execPath,['--watch','server/src/index.mjs'],{cwd:root,stdio:'inherit'}),spawn(process.execPath,[fileURLToPath(new URL('../../node_modules/vite/bin/vite.js',import.meta.url)),'--host','127.0.0.1'],{cwd:fileURLToPath(new URL('../../web/',import.meta.url)),stdio:'inherit'})];
// Vite is hoisted in the npm workspace installation.
let stopping=false;function stop(code=0){if(stopping)return;stopping=true;for(const child of children)child.kill();process.exitCode=code;}
for(const child of children){child.on('error',error=>{console.error('Could not start development process:',error.message);stop(1)});child.on('exit',code=>stop(code||0));}
process.once('SIGINT',()=>stop());process.once('SIGTERM',()=>stop());
