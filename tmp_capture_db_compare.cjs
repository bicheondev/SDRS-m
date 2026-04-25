const { chromium } = require('playwright');

async function capture(url, outMain, outFilter) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
  page.setDefaultTimeout(30000);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);
  const inputs = page.locator('input');
  await inputs.nth(0).fill('a');
  await inputs.nth(1).fill('a');
  await page.getByRole('button', { name: '로그인' }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: outMain, timeout: 0 });
  await page.getByRole('button', { name: '전체 항포구' }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: outFilter, timeout: 0 });
  await browser.close();
}

(async () => {
  await capture('http://127.0.0.1:4175/', '/tmp/current-db-main.png', '/tmp/current-db-filter.png');
  await capture('http://127.0.0.1:4174/', '/tmp/original-db-main.png', '/tmp/original-db-filter.png');
})();
