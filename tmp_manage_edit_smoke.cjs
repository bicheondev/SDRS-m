const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 393, height: 852 } });
  page.setDefaultTimeout(30000);
  await page.goto('http://127.0.0.1:4175/', { waitUntil: 'networkidle', timeout: 30000 });
  const inputs = page.locator('input');
  await inputs.nth(0).fill('a');
  await inputs.nth(1).fill('a');
  await page.getByRole('button', { name: '로그인' }).click();
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: '데이터 관리' }).click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: '선박 DB 편집하기' }).click();
  await page.waitForTimeout(1200);
  console.log(await page.locator('body').innerText());
  await browser.close();
})();
