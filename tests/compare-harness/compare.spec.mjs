import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const baseUrl = 'http://127.0.0.1:41735/';
const repoRoot = resolve(import.meta.dirname, '..', '..');

const source = (path) => readFile(resolve(repoRoot, path), 'utf8');

const cardKind = (classes) => {
  const names = [
    'magnet', 'charge', 'video', 'partial-image', 'fade',
    'compact-video', 'compact-partial', 'compact-full'
  ];
  const named = names.find((name) => classes.includes(`pdp-cmp__card--${name}`));
  return named || 'full';
};

async function visibleCardRows(page) {
  return page.locator('.pdp-cmp__grid > .pdp-cmp__card').evaluateAll((cards) => {
    const visible = cards
      .filter((card) => {
        const style = getComputedStyle(card);
        const rect = card.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      })
      .map((card) => {
        const rect = card.getBoundingClientRect();
        return { classes: [...card.classList], top: rect.top, left: rect.left };
      })
      .sort((a, b) => Math.abs(a.top - b.top) > 2 ? a.top - b.top : a.left - b.left);
    const rows = [];
    for (const card of visible) {
      const row = rows.find((candidate) => Math.abs(candidate[0].top - card.top) <= 2);
      if (row) row.push(card);
      else rows.push([card]);
    }
    return rows;
  });
}

test.describe('source contracts', () => {
  test('preserves structural, breakpoint, generated-output, and editor state contracts', async () => {
    const [compare, css, editor, section] = await Promise.all([
      source('theme-draft/snippets/pdp-compare-inline.liquid'),
      source('theme-draft/assets/voltical-pdp-bold.css'),
      source('theme-draft/snippets/pdp-canva-editor.liquid'),
      source('theme-draft/sections/main-product.liquid')
    ]);

    expect(section).toMatch(/render 'pdp-compare-inline'[\s\S]*render 'pdp-canva-editor'/);
    expect(css.indexOf('CANVA-BAKED-START')).toBeGreaterThan(-1);
    expect(css.indexOf('CANVA-BAKED-END')).toBeGreaterThan(css.indexOf('CANVA-BAKED-START'));
    expect(css).toContain('@media (max-width: 899px)');
    expect(css).toContain('@media (min-width: 900px)');
    expect(editor).toContain("var LKEY = 'volt-canva-layout-4'");
    expect(editor).toContain("var HKEY = 'volt-canva-history-4'");
    expect(editor).toContain("matchMedia('(min-width:900px)')");
    expect(compare.match(/\sdata-calc-full-num(?=[\s>])/g)).toHaveLength(2);
    expect(compare.match(/\sdata-calc-partial-num(?=[\s>])/g)).toHaveLength(2);
    expect(compare.match(/\sdata-calc-video-num(?=[\s>])/g)).toHaveLength(1);
  });
});

test.describe('responsive render', () => {
  for (const viewport of [
    { name: 'mobile-390', width: 390, height: 844, mobile: true },
    { name: 'mobile-boundary-899', width: 899, height: 900, mobile: true },
    { name: 'desktop-boundary-900', width: 900, height: 900, mobile: false },
    { name: 'desktop-1440', width: 1440, height: 1000, mobile: false }
  ]) {
    test(`${viewport.name} has the intended visible cards without horizontal overflow`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(`${baseUrl}?frame=1`);
      await expect(page.locator('[data-calc-time]')).not.toHaveText('—');
      await expect(page.locator('.pdp-cmp__grid > .pdp-cmp__card')).toHaveCount(9);

      const rows = await visibleCardRows(page);
      const kinds = rows.map((row) => row.map((card) => cardKind(card.classes)));
      if (viewport.mobile) {
        expect(kinds).toEqual([
          ['video'], ['magnet'], ['charge'],
          ['compact-video', 'compact-partial'], ['compact-full']
        ]);
        const partial = page.locator('.pdp-cmp__card--compact-partial');
        const partialHero = partial.locator('.pdp-cmp__compact-partial-main');
        await expect(partialHero).toHaveText('3.6extra');
        await expect(partialHero.locator('br')).toHaveCount(1);
        await expect(partial.locator('.pdp-cmp__sub')).toHaveText('20% to 80% charges');
        await expect(partialHero).toHaveCSS(
          'background-image',
          'linear-gradient(0deg, rgb(122, 143, 164), rgb(29, 29, 31) 50%)'
        );
        const partialLayout = await partial.evaluate((card) => {
          const cardRect = card.getBoundingClientRect();
          const read = (selector) => {
            const rect = card.querySelector(selector).getBoundingClientRect();
            return { top: rect.top - cardRect.top, height: rect.height };
          };
          return {
            height: cardRect.height,
            eyebrow: read(':scope > .pdp-cmp__eyebrow'),
            hero: read(':scope > .pdp-cmp__compact-partial-main'),
            descriptor: read(':scope > .pdp-cmp__sub')
          };
        });
        expect(Math.abs(partialLayout.eyebrow.top - (partialLayout.height / 2 - 54))).toBeLessThanOrEqual(1);
        expect(Math.abs(partialLayout.hero.top - (partialLayout.height / 2 - 32))).toBeLessThanOrEqual(1);
        expect(Math.abs(partialLayout.descriptor.top - (partialLayout.height / 2 + 36))).toBeLessThanOrEqual(1);
        expect(partialLayout.eyebrow.height).toBeCloseTo(18, 0);
        expect(partialLayout.hero.height).toBeCloseTo(64, 0);
        expect(partialLayout.descriptor.height).toBeCloseTo(18, 0);
      } else {
        expect(kinds.flat()).toEqual(['video', 'fade', 'partial-image', 'magnet', 'charge', 'full']);
        await expect(page.locator('.pdp-cmp__card--compact-stat').first()).toBeHidden();
      }

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
      if (viewport.mobile) {
        await expect(page.locator('.pdp-cmp')).toHaveScreenshot(`${viewport.name}.png`, {
          animations: 'disabled',
          caret: 'hide',
          maxDiffPixelRatio: 0.002
        });
      } else {
        const grid = await page.locator('.pdp-cmp__grid').boundingBox();
        expect(grid).not.toBeNull();
        const padding = 90;
        const screenshot = await page.screenshot({
          clip: {
            x: Math.max(0, grid.x - padding),
            y: Math.max(0, grid.y - padding),
            width: Math.min(viewport.width, grid.width + padding * 2),
            height: grid.height + padding * 2
          },
          animations: 'disabled',
          caret: 'hide'
        });
        expect(screenshot).toMatchSnapshot(`${viewport.name}.png`, { maxDiffPixelRatio: 0.002 });
      }
    });
  }
});

test('calculator keeps source and compact duplicate stats synchronized', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseUrl);
  await expect(page.locator('[data-calc-time]')).not.toHaveText('—');

  const readStats = () => page.evaluate(() => ({
    time: document.querySelector('[data-calc-time]').textContent,
    full: [...document.querySelectorAll('[data-calc-full-num]')].map((el) => el.textContent),
    partial: [...document.querySelectorAll('[data-calc-partial-num]')].map((el) => el.textContent),
    video: [...document.querySelectorAll('[data-calc-video-num]')].map((el) => el.textContent)
  }));

  const initial = await readStats();
  expect(new Set(initial.full).size).toBe(1);
  expect(new Set(initial.partial).size).toBe(1);
  expect(new Set(initial.video).size).toBe(1);

  await page.selectOption('#pdp-cmp-select', { label: 'iPhone X' });
  const changedPhone = await readStats();
  expect(changedPhone).not.toEqual(initial);
  expect(new Set(changedPhone.full).size).toBe(1);
  expect(new Set(changedPhone.partial).size).toBe(1);
  expect(new Set(changedPhone.video).size).toBe(1);

  await page.locator('input[value="5000 mAh"]').evaluate((input) => {
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  const changedCapacity = await readStats();
  expect(changedCapacity.full[0]).not.toBe(changedPhone.full[0]);
  expect(new Set(changedCapacity.full).size).toBe(1);
});

test('charge-range emphasis stays phrase-scoped and canonical through Canva restore', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}?edit=1`);

  const chargeCaption = page.locator('.pdp-cmp__card--charge .pdp-cmp__sub--range');
  const chargeLead = chargeCaption.locator(':scope > .pdp-cmp__mobile-copy > .pdp-cmp__charge-range-lead');
  const magnetLead = page.locator('.pdp-cmp__card--magnet .pdp-cmp__magnet-lead');

  await expect(chargeLead).toHaveCount(1);
  await expect(chargeLead).toHaveText('20% to 80%');
  const mobileChargeCopy = chargeCaption.locator(':scope > .pdp-cmp__mobile-copy');
  await expect(mobileChargeCopy).toHaveText('Quick, reliable chargingfrom 20% to 80% with Core.');
  expect(await mobileChargeCopy.locator('br').count()).toBe(2);
  await expect(chargeCaption.locator(':scope > .pdp-cmp__desktop-copy')).toHaveText('Charging time from 20% to 80% with Core for quick, reliable everyday power');
  await expect(page.locator('.pdp-cmp__card--partial-image .pdp-cmp__charge-range-lead')).toHaveCount(0);

  const styles = await page.evaluate(() => {
    const chargeCaptionEl = document.querySelector('.pdp-cmp__card--charge .pdp-cmp__sub--range');
    const chargeLeadEl = chargeCaptionEl.querySelector(':scope > .pdp-cmp__mobile-copy > .pdp-cmp__charge-range-lead');
    const magnetLeadEl = document.querySelector('.pdp-cmp__card--magnet .pdp-cmp__magnet-lead');
    const captionStyle = getComputedStyle(chargeCaptionEl);
    const chargeStyle = getComputedStyle(chargeLeadEl);
    const magnetStyle = getComputedStyle(magnetLeadEl);
    return {
      captionWeight: captionStyle.fontWeight,
      chargeWeight: chargeStyle.fontWeight,
      chargeFamily: chargeStyle.fontFamily,
      chargeColor: chargeStyle.color,
      magnetWeight: magnetStyle.fontWeight,
      magnetFamily: magnetStyle.fontFamily,
      magnetColor: magnetStyle.color
    };
  });
  expect(styles.chargeWeight).toBe(styles.magnetWeight);
  expect(styles.chargeFamily).toBe(styles.magnetFamily);
  expect(styles.chargeColor).toBe(styles.magnetColor);
  expect(styles.captionWeight).not.toBe(styles.chargeWeight);

  await page.evaluate(() => {
    localStorage.setItem('volt-canva-layout-4', JSON.stringify({
      ':nth-child(2)>:nth-child(2)>:nth-child(4)': {
        text: 'Charging time from 20% to 80% with Core for quick, reliable everyday power<br>'
      }
    }));
    location.reload();
  });
  await page.waitForLoadState('load');

  await expect(chargeLead).toHaveCount(1);
  await expect(chargeLead).toHaveText('20% to 80%');
  const restored = await page.evaluate(() => JSON.parse(localStorage.getItem('volt-canva-layout-4') || '{}'));
  expect(restored[':nth-child(2)>:nth-child(2)>:nth-child(4)']).toBeUndefined();

  await chargeCaption.dblclick();
  const historyBeforeNoopEdit = await page.evaluate(() => JSON.parse(localStorage.getItem('volt-canva-history-4') || '[]').length);
  await chargeCaption.click();
  await expect(chargeCaption).toHaveAttribute('contenteditable', 'true');
  await page.locator('.pdp-cmp__select-heading').click();
  await expect(chargeCaption).toHaveAttribute('contenteditable', 'false');
  const historyAfterNoopEdit = await page.evaluate(() => JSON.parse(localStorage.getItem('volt-canva-history-4') || '[]').length);
  expect(historyAfterNoopEdit).toBe(historyBeforeNoopEdit);
  await expect(chargeLead).toHaveCount(1);
});

test('Canva Refresh keeps undo history and Reset all is one undoable action', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}?edit=1`);
  await expect(page.locator('html')).toHaveClass(/cv-editing/);
  await expect(page.locator('.cv-tb')).toBeVisible();

  await page.evaluate(() => {
    localStorage.setItem('volt-canva-layout-4', JSON.stringify({
      ':nth-child(2)>:nth-child(2)>:nth-child(4)': { dx: 12, dy: 8 }
    }));
    location.reload();
  });
  await page.waitForLoadState('load');

  const resetAll = page.getByRole('button', { name: 'Reset all' });
  await resetAll.click();
  await resetAll.click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('volt-canva-layout-4'))).toBe('{}');

  await Promise.all([
    page.waitForEvent('load'),
    page.getByRole('button', { name: 'Refresh' }).click()
  ]);
  await page.getByRole('button', { name: 'Undo' }).click();
  const restored = await page.evaluate(() => JSON.parse(localStorage.getItem('volt-canva-layout-4') || '{}'));
  expect(restored[':nth-child(2)>:nth-child(2)>:nth-child(4)']).toMatchObject({ dx: 12, dy: 8 });
});

test.describe('touch behavior', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    colorScheme: 'light'
  });

  test('selected drag previews before the old threshold and stops exactly at lift', async ({ page, context }) => {
    const cdp = await context.newCDPSession(page);
    try {
      await page.goto(`${baseUrl}?edit=1`);

      const image = page.locator('.pdp-cmp__card--video .pdp-cmp__img--video-crop');
      await image.scrollIntoViewIfNeeded();
      const point = await image.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const left = Math.max(0, rect.left + 2);
        const right = Math.min(innerWidth - 1, rect.right - 2);
        const top = Math.max(0, rect.top + 2);
        const bottom = Math.min(innerHeight - 1, rect.bottom - 2);
        for (let y = top; y <= bottom; y += 10) {
          for (let x = left; x <= right; x += 10) {
            if (document.elementFromPoint(x, y) === element) return { x, y };
          }
        }
        return null;
      });
      expect(point).not.toBeNull();
      const { x, y } = point;

      const touch = async (type, px, py) => cdp.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: type === 'touchEnd' ? [] : [{ x: px, y: py, id: 1, radiusX: 1, radiusY: 1 }]
      });
      const tap = async () => {
        await touch('touchStart', x, y);
        await touch('touchEnd', x, y);
      };

      await tap();
      await tap();
      await expect(page.locator('.cv-tag')).toHaveText('image');

      const before = await image.boundingBox();
      await touch('touchStart', x, y);
      await touch('touchMove', x + 2, y + 1);
      await page.evaluate(() => new Promise(requestAnimationFrame));
      const preview = await image.boundingBox();
      expect(Math.abs((preview.x - before.x) - 2)).toBeLessThanOrEqual(1.5);

      await touch('touchMove', x + 24, y + 12);
      await touch('touchEnd', x + 24, y + 12);
      await page.waitForTimeout(50);
      const atLift = await image.boundingBox();
      await page.waitForTimeout(250);
      const settled = await image.boundingBox();
      expect(Math.abs((atLift.x - before.x) - 24)).toBeLessThanOrEqual(1.5);
      expect(Math.abs((atLift.y - before.y) - 12)).toBeLessThanOrEqual(1.5);
      expect(Math.abs(settled.x - atLift.x)).toBeLessThanOrEqual(0.2);
      expect(Math.abs(settled.y - atLift.y)).toBeLessThanOrEqual(0.2);
    } finally {
      await cdp.detach();
    }
  });
});
