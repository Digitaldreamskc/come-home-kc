// Explicit local process modes; never a deploy command.
import {spawn} from 'node:child_process';
const mode=process.argv[2]||'back2kc';
const ports={back2kc:3100,kcnow:3101,showcase:3102};
if(!ports[mode])throw Error('Choose back2kc, kcnow, or showcase');
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(ports[mode])],{stdio:'inherit',env:{...process.env,APP_MODE:mode,ENABLE_LOCAL_DEMO:'1',ENABLE_CIVIC_DEMO:mode==='kcnow'?'1':'0',ENABLE_PLATFORM_SHOWCASE:mode==='showcase'?'1':'0'}});
child.on('exit',code=>process.exit(code||0));
