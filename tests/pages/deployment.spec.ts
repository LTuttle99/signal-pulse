import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.setItem('signal-pulse:v1',JSON.stringify({version:1,watchlist:[],categories:[],sections:['stories','markets','economy','companies','watchlist'],notes:'',compact:false,embeds:false}))) });
test('compiled project-prefix entry loads news without requesting a nonexistent API',async({page})=>{const api:string[]=[],snapshots:string[]=[];page.on('request',r=>{const url=new URL(r.url());if(url.pathname.startsWith('/api/'))api.push(url.pathname);if(url.pathname.endsWith('latest.json'))snapshots.push(url.pathname)});await page.goto('./');await expect(page.getByRole('heading',{name:'See the signal. Stay ahead.'})).toBeVisible();await expect(page.locator('.hero-story h3')).not.toHaveText('');await expect(page.locator('.hero-story h3')).toBeVisible();expect(snapshots).toContain('/signal-pulse/pulse/latest.json');expect(api).toEqual([]);expect(await page.locator('script[src]').first().getAttribute('src')).toMatch(/^\/signal-pulse\/assets\/.+\.js$/)});
test('hash routes survive refresh and lazy economic charts use prefixed assets',async({page})=>{await page.goto('./#/markets');await expect(page.getByRole('heading',{name:'The market, in focus.'})).toBeVisible();await page.reload();await expect(page.getByRole('heading',{name:'The market, in focus.'})).toBeVisible();await page.goto('./#/economy?series=UNRATE');await expect(page.getByRole('img',{name:'Unemployment rate historical observations'})).toBeVisible();await page.goto('./#/companies/NVDA');await expect(page.getByRole('heading',{name:'NVIDIA',exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)});

test('expanded symbols work in search, stock pages, chart selection and watchlists',async({page})=>{
 await page.goto('./#/companies');
 await page.getByLabel('Search companies',{exact:true}).fill('AMD');
 await expect(page.locator('.directory-row')).toHaveCount(1);
 await page.getByRole('link',{name:'Explore Advanced Micro Devices',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Advanced Micro Devices',exact:true})).toBeVisible();
 await expect(page.getByText('Not mapped',{exact:true})).toBeVisible();
 await page.goto('./#/stocks/VOO');
 await expect(page.getByRole('heading',{name:'Vanguard S&P 500 ETF',exact:true})).toBeVisible();
 await page.goto('./#/markets');
 await page.getByLabel('Chart symbol',{exact:true}).selectOption('NASDAQ:AMD');
 await expect(page.getByLabel('Chart symbol',{exact:true})).toHaveValue('NASDAQ:AMD');
 await page.goto('./#/watchlist');
 await page.getByLabel('Find a signal',{exact:true}).fill('Advanced Micro Devices');
 await page.getByRole('button',{name:'Watch Advanced Micro Devices · AMD',exact:true}).click();
 await expect(page.locator('.watchlist-grid')).toContainText('Advanced Micro Devices');
});
