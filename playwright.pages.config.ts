import {defineConfig,devices} from '@playwright/test';
export default defineConfig({testDir:'tests/pages',timeout:30000,workers:1,reporter:'list',use:{baseURL:'http://127.0.0.1:4175/signal-pulse/',channel:'chrome'},projects:[{name:'pages-desktop',use:{...devices['Desktop Chrome']}},{name:'pages-mobile',use:{...devices['iPhone 13'],defaultBrowserType:'chromium'}}]});
