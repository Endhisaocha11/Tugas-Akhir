import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

const shot = async (name) => {
  const p = `C:/Users/hp/AppData/Local/Temp/${name}.png`;
  await page.screenshot({ path: p, fullPage: false });
  console.log(`SCREENSHOT: ${p}`);
};

const check = async (label, selector) => {
  const el = await page.$(selector);
  console.log(`CHECK [${label}]: ${el ? 'FOUND' : 'MISSING'}`);
  return !!el;
};

try {
  // Preview bypass route
  await page.goto('http://localhost:3000/?preview=education', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(2000);
  await shot('02_edu_overview');

  const bodyText = await page.textContent('body');
  console.log('\nBODY_SAMPLE:', bodyText.slice(0, 400).replace(/\s+/g, ' '));

  // Check key elements
  await check('Edukasi heading', 'text="Edukasi & Penelitian"');
  await check('Stats bar 98.97%', 'text="98,97%"');
  await check('FLUTD card', 'text="FLUTD"');
  await check('Formula card', 'text="Formula Ilmiah"');
  await check('Akurasi card', 'text="Akurasi Perangkat"');
  await check('RER formula', 'text="RER = 70"');
  await check('Daftar Referensi button', 'text="Daftar Referensi Penelitian"');
  await check('4 jurnal stats', 'text="8"');

  // Scroll to see more
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(500);
  await shot('03_edu_stats_articles');

  await page.evaluate(() => window.scrollTo(0, 900));
  await page.waitForTimeout(500);
  await shot('04_edu_formula');

  await page.evaluate(() => window.scrollTo(0, 1600));
  await page.waitForTimeout(500);
  await shot('05_edu_accuracy');

  // Click first article card
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  const cards = await page.$$('.group.cursor-pointer');
  console.log('\nARTICLE_CARDS_COUNT:', cards.length);
  if (cards.length > 0) {
    await cards[0].click();
    await page.waitForTimeout(800);
    await shot('06_edu_modal_flutd');
    const modalText = await page.textContent('body');
    const hasJournalRef = modalText.includes('Naarden') || modalText.includes('DOI');
    console.log('MODAL_HAS_JOURNAL_REF:', hasJournalRef);
    // Close modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }

  // Click Daftar Referensi
  await page.evaluate(() => window.scrollTo(0, 99999));
  await page.waitForTimeout(600);
  const refButton = await page.$('button:has-text("Daftar Referensi")');
  if (refButton) {
    await refButton.click();
    await page.waitForTimeout(600);
    await shot('07_edu_refs_expanded');
    const refText = await page.textContent('body');
    console.log('REFS_HAS_NAARDEN:', refText.includes('Naarden'));
    console.log('REFS_HAS_HARTANTO:', refText.includes('Hartanto'));
    console.log('REFS_HAS_WSAVA:', refText.includes('WSAVA'));
  } else {
    console.log('REF_BUTTON: not found');
  }

} catch(e) {
  console.error('ERR:', e.message);
  console.error(e.stack);
} finally {
  await browser.close();
}
