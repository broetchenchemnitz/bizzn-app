const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3001/sushi/menu?table=3&mode=kiosk', {waitUntil: 'networkidle0'});
  await page.screenshot({path: 'sushi_menu_404.png'});
  await browser.close();
})();
