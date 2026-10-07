import {defineConfig,devices} from '@playwright/test';
// Tests exercise the production React build against a real PostgreSQL WASM fixture.
export default defineConfig({
 testDir:'./browser',fullyParallel:false,workers:1,timeout:30000,
 use:{baseURL:'http://127.0.0.1:4000',trace:'retain-on-failure'},
 reporter:[['list'],['html',{open:'never'}]],
 projects:[{name:'chromium',use:{...devices['Desktop Chrome']}}],
 webServer:{command:'npm run build && node server/scripts/test-server.mjs',url:'http://127.0.0.1:4000/api/health',reuseExistingServer:false,timeout:120000},
});
