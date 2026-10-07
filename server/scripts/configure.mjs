import {copyFile,chmod,constants} from 'node:fs/promises';
// Exclusive copy preserves all existing credentials and settings.
try{await copyFile(new URL('../../.env.example',import.meta.url),new URL('../../.env',import.meta.url),constants.COPYFILE_EXCL);await chmod(new URL('../../.env',import.meta.url),0o600);console.log('Created root .env. Replace DATABASE_URL with your Neon connection string.');}catch(error){if(error.code==='EEXIST')console.log('.env already exists; no settings were overwritten.');else{console.error('Configuration failed:',error.code||'unknown');process.exitCode=1;}}
