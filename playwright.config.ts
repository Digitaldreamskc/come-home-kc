import { defineConfig, devices } from '@playwright/test';
import fs from 'node:fs';
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const external = process.env.PLAYWRIGHT_BASE_URL;
export default defineConfig({
 testDir:'./tests/e2e', fullyParallel:false, workers:1, retries:0,
 reporter:[['list'],['json',{outputFile:'test-results/e2e.json'}]],
 use:{baseURL:external || 'http://127.0.0.1:3100',trace:'retain-on-failure',screenshot:'only-on-failure',launchOptions:process.env.PLAYWRIGHT_BROWSERS_PATH?{}:fs.existsSync(chrome)?{executablePath:chrome}:{}},
 projects:[{name:'desktop-chromium',use:{...devices['Desktop Chrome']}}],
 webServer:external?undefined:{command:'node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3100',url:'http://127.0.0.1:3100',reuseExistingServer:!process.env.CI,timeout:120000},
});
