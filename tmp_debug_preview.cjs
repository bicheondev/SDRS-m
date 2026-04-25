const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 393, height: 852 } });
  page.on('console', (msg) => console.log('console', msg.type(), msg.text()));
  page.on('pageerror', (err) => console.log('pageerror', err.message));
  await page.goto('http://127.0.0.1:4175/', { waitUntil: 'networkidle', timeout: 30000 });
  console.log('title', await page.title());
  console.log('body', await page.locator('body').innerText());
  console.log('html', await page.locator('#root').innerHTML());
  await page.screenshot({ path: '/tmp/current-preview-debug.png' });
  await browser.close();
})();
