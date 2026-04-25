const { chromium } = require('playwright');

async function capture(url, out) {
  console.log('open', url);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
  page.setDefaultTimeout(15000);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  const inputs = page.locator('input');
  await inputs.nth(0).fill('a');
  await inputs.nth(1).fill('a');
  await page.getByRole('button', { name: '로그인' }).click();
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: '데이터 관리' }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: '선박 DB 편집하기' }).click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: out, fullPage: false });
  console.log('saved', out);
  await browser.close();
}

(async () => {
  try {
    await capture('http://127.0.0.1:4175/', '/tmp/current-manage-edit.png');
    await capture('http://127.0.0.1:4174/', '/tmp/original-manage-edit.png');
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
})();
