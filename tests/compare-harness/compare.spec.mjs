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
        await expect(page.locator('.pdp-cmp__card--compact-video')).toHaveCSS('border-radius', '28px');
        await expect(partial).toHaveCSS('border-radius', '28px');
        await expect(partialHero).toHaveText('3.6extra');
        const partialNumber = partialHero.locator(':scope > .pdp-cmp__compact-partial-number');
        const partialExtra = partialHero.locator(':scope > .pdp-cmp__compact-partial-extra');
        await expect(partialNumber).toHaveText('3.6');
        await expect(partialExtra).toHaveText('extra');
        await expect(partialNumber).toHaveCSS('display', 'block');
        await expect(partialExtra).toHaveCSS('display', 'block');
        await expect(partialNumber).toHaveCSS('font-weight', '400');
        await expect(partialExtra).toHaveCSS('font-weight', '400');
        await expect(partialNumber).toHaveCSS('color', 'rgb(19, 19, 22)');
        await expect(partialNumber).toHaveCSS('background-image', 'none');
        await expect(partialNumber).toHaveCSS('letter-spacing', '-1.26px');
        await expect(partialExtra).toHaveCSS(
          'background-image',
          'linear-gradient(to top, rgb(98, 114, 131) 0%, rgb(23, 23, 25) 100%)'
        );
        await expect(partial.locator('.pdp-cmp__sub')).toHaveText('20% to 80% charges');
        const partialLayout = await partial.evaluate((card) => {
          const cardRect = card.getBoundingClientRect();
          const read = (selector) => {
            const rect = card.querySelector(selector).getBoundingClientRect();
            return { top: rect.top - cardRect.top, width: rect.width, height: rect.height };
          };
          return {
            height: cardRect.height,
            eyebrow: read(':scope > .pdp-cmp__eyebrow'),
            hero: read(':scope > .pdp-cmp__compact-partial-main'),
            descriptor: read(':scope > .pdp-cmp__sub'),
            descriptorStyle: (() => {
              const descriptor = card.querySelector(':scope > .pdp-cmp__sub');
              const style = getComputedStyle(descriptor);
              return {
                color: style.color,
                fontSize: style.fontSize,
                letterSpacing: style.letterSpacing,
                lineHeight: style.lineHeight,
                whiteSpace: style.whiteSpace,
                scrollWidth: descriptor.scrollWidth,
                clientWidth: descriptor.clientWidth
              };
            })(),
            eyebrowStyle: (() => {
              const eyebrow = card.querySelector(':scope > .pdp-cmp__eyebrow');
              const style = getComputedStyle(eyebrow);
              return {
                color: style.color,
                fontSize: style.fontSize,
                letterSpacing: style.letterSpacing,
                lineHeight: style.lineHeight
              };
            })()
          };
        });
        const videoLayout = await page.locator('.pdp-cmp__card--compact-video').evaluate((card) => {
          const cardRect = card.getBoundingClientRect();
          const eyebrow = card.querySelector(':scope > .pdp-cmp__eyebrow');
          const battery = card.querySelector(':scope > .pdp-cmp__compact-battery');
          const eyebrowRect = eyebrow.getBoundingClientRect();
          const batteryStyle = getComputedStyle(battery);
          return {
            eyebrowTop: eyebrowRect.top - cardRect.top,
            eyebrowStyle: {
              color: getComputedStyle(eyebrow).color,
              fontFamily: getComputedStyle(eyebrow).fontFamily,
              fontSize: getComputedStyle(eyebrow).fontSize,
              fontWeight: getComputedStyle(eyebrow).fontWeight,
              letterSpacing: getComputedStyle(eyebrow).letterSpacing,
              lineHeight: getComputedStyle(eyebrow).lineHeight
            },
            batteryTop: batteryStyle.top,
            batteryPosition: batteryStyle.position
          };
        });
        expect(Math.abs(partialLayout.hero.top - (partialLayout.height / 2 - 45))).toBeLessThanOrEqual(1);
        expect(Math.abs(partialLayout.descriptor.top - (partialLayout.height / 2 + 23))).toBeLessThanOrEqual(1);
        expect(partialLayout.hero.height).toBeCloseTo(64, 0);
        expect(partialLayout.descriptor.height).toBeCloseTo(18, 0);
        expect(partialLayout.height / partialLayout.hero.width).toBeCloseTo(192 / 159.125, 2);
        expect(partialLayout.descriptorStyle).toMatchObject({
          color: 'rgb(96, 111, 127)',
          fontSize: '14px',
          letterSpacing: '-0.224px',
          lineHeight: '18px',
          whiteSpace: 'nowrap'
        });
        expect(partialLayout.eyebrowStyle).toMatchObject({
          color: 'rgb(115, 125, 139)',
          fontSize: '14px',
          letterSpacing: 'normal',
          lineHeight: '15.12px'
        });
        expect(partialLayout.descriptorStyle.scrollWidth).toBeLessThanOrEqual(partialLayout.descriptorStyle.clientWidth);
        expect(Math.abs(partialLayout.eyebrow.top - videoLayout.eyebrowTop)).toBeLessThanOrEqual(1);
        expect(videoLayout.eyebrowStyle).toMatchObject({
          color: partialLayout.eyebrowStyle.color,
          fontSize: partialLayout.eyebrowStyle.fontSize,
          fontWeight: '400',
          letterSpacing: partialLayout.eyebrowStyle.letterSpacing,
          lineHeight: partialLayout.eyebrowStyle.lineHeight
        });
        expect(videoLayout.batteryPosition).toBe('relative');
        expect(videoLayout.batteryTop).toBe('-5px');
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

test('mobile reference migration clears only the compact-partial text layout and history', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}?edit=1`);
  await page.locator('.pdp-cmp__card--compact-partial').waitFor();

  const keys = await page.evaluate(() => {
    const getKey = (selector) => document.querySelector(selector)?.__cvKey;
    return {
      eyebrow: getKey('.pdp-cmp__card--compact-partial > .pdp-cmp__eyebrow'),
      number: getKey('.pdp-cmp__card--compact-partial > .pdp-cmp__compact-partial-main > .pdp-cmp__compact-partial-number'),
      extra: getKey('.pdp-cmp__card--compact-partial > .pdp-cmp__compact-partial-main > .pdp-cmp__compact-partial-extra'),
      descriptor: getKey('.pdp-cmp__card--compact-partial > .pdp-cmp__sub'),
      control: getKey('.pdp-cmp__card--compact-video > .pdp-cmp__sub')
    };
  });
  expect(Object.values(keys).every(Boolean)).toBeTruthy();
  await Promise.all([
    page.waitForEvent('load'),
    page.evaluate((savedKeys) => {
      localStorage.setItem('volt-canva-layout-4', JSON.stringify({
        [savedKeys.eyebrow]: { dx: 18, dy: -11, s: 1.7 },
        [savedKeys.number]: { dx: -9, dy: 14, s: 1.4 },
        [savedKeys.extra]: { dx: 4, dy: -6, s: 1.1 },
        [savedKeys.descriptor]: { dx: 7, dy: 5, text: 'old compact copy' },
        [savedKeys.control]: { dx: 3, dy: 2 }
      }));
      localStorage.setItem('volt-canva-history-4', JSON.stringify([[
        { key: savedKeys.eyebrow, prev: { dx: 4, dy: 6 } },
        { key: savedKeys.number, prev: { s: 1.2 } },
        { key: savedKeys.extra, prev: { dx: 2 } },
        { key: savedKeys.descriptor, prev: { text: 'older compact copy' } },
        { key: savedKeys.control, prev: { dx: 1 } }
      ]]));
      localStorage.removeItem('volt-canva-compact-partial-reference-v1');
      location.reload();
    }, keys)
  ]);

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('volt-canva-layout-4') || '{}'));
  expect(saved[keys.eyebrow]).toBeUndefined();
  expect(saved[keys.number]).toBeUndefined();
  expect(saved[keys.extra]).toBeUndefined();
  expect(saved[keys.descriptor]).toBeUndefined();
  expect(saved[keys.control]).toMatchObject({ dx: 3, dy: 2 });
  await expect(page.locator('.pdp-cmp__card--compact-partial > .pdp-cmp__sub')).toHaveText('20% to 80% charges');
  const savedHistory = await page.evaluate(() => JSON.parse(localStorage.getItem('volt-canva-history-4') || '[]'));
  expect(savedHistory.flat().map((entry) => entry.key)).toEqual([keys.control]);
  await expect.poll(() => page.evaluate(() => {
    const leftCard = document.querySelector('.pdp-cmp__card--compact-video');
    const rightCard = document.querySelector('.pdp-cmp__card--compact-partial');
    const leftCardRect = leftCard.getBoundingClientRect();
    const rightCardRect = rightCard.getBoundingClientRect();
    const leftEyebrowRect = leftCard.querySelector(':scope > .pdp-cmp__eyebrow').getBoundingClientRect();
    const rightEyebrowRect = rightCard.querySelector(':scope > .pdp-cmp__eyebrow').getBoundingClientRect();
    return Math.abs((leftEyebrowRect.top - leftCardRect.top) - (rightEyebrowRect.top - rightCardRect.top));
  })).toBeLessThanOrEqual(1);
});

test('mobile eyebrow-height reset preserves the compact partial number and extra', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}?edit=1`);
  const keys = await page.evaluate(() => ({
    eyebrow: document.querySelector('.pdp-cmp__card--compact-partial > .pdp-cmp__eyebrow').__cvKey,
    number: document.querySelector('.pdp-cmp__card--compact-partial > .pdp-cmp__compact-partial-main > .pdp-cmp__compact-partial-number').__cvKey,
    extra: document.querySelector('.pdp-cmp__card--compact-partial > .pdp-cmp__compact-partial-main > .pdp-cmp__compact-partial-extra').__cvKey
  }));
  await Promise.all([
    page.waitForEvent('load'),
    page.evaluate((savedKeys) => {
      localStorage.setItem('volt-canva-layout-4', JSON.stringify({
        [savedKeys.eyebrow]: { dx: 18, dy: -11 },
        [savedKeys.number]: { dx: -9, dy: 14, s: 1.4 },
        [savedKeys.extra]: { dx: 4, dy: -6 }
      }));
      localStorage.setItem('volt-canva-history-4', JSON.stringify([[{
        key: savedKeys.eyebrow, prev: { dx: 4, dy: 6 }
      }, {
        key: savedKeys.number, prev: { s: 1.2 }
      }]]));
      localStorage.setItem('volt-canva-compact-partial-reference-v1', '1');
      localStorage.setItem('volt-canva-compact-partial-eyebrow-align-v1', '1');
      localStorage.removeItem('volt-canva-compact-partial-eyebrow-height-v2');
      location.reload();
    }, keys)
  ]);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('volt-canva-layout-4') || '{}'));
  expect(saved[keys.eyebrow]).toBeUndefined();
  expect(saved[keys.number]).toMatchObject({ dx: -9, dy: 14, s: 1.4 });
  expect(saved[keys.extra]).toMatchObject({ dx: 4, dy: -6 });
  const savedHistory = await page.evaluate(() => JSON.parse(localStorage.getItem('volt-canva-history-4') || '[]'));
  expect(savedHistory.flat().map((entry) => entry.key)).toEqual([keys.number]);
});

test('mobile extra blank-state repair restores authored copy without moving its box', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}?edit=1`);
  const key = await page.locator('.pdp-cmp__card--compact-partial > .pdp-cmp__compact-partial-main > .pdp-cmp__compact-partial-extra').evaluate((el) => el.__cvKey);
  await Promise.all([
    page.waitForEvent('load'),
    page.evaluate((extraKey) => {
      localStorage.setItem('volt-canva-layout-4', JSON.stringify({
        [extraKey]: { dx: 4, dy: -6, s: 1.2, text: '' }
      }));
      localStorage.setItem('volt-canva-compact-partial-reference-v1', '1');
      localStorage.setItem('volt-canva-compact-partial-eyebrow-align-v1', '1');
      localStorage.setItem('volt-canva-compact-partial-extra-restore-v1', '1');
      location.reload();
    }, key)
  ]);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('volt-canva-layout-4') || '{}'));
  expect(saved[key]).toMatchObject({ dx: 4, dy: -6, s: 1.2 });
  expect(saved[key].text).toBeUndefined();
  await expect(page.locator('.pdp-cmp__card--compact-partial > .pdp-cmp__compact-partial-main > .pdp-cmp__compact-partial-extra')).toHaveText('extra');
});

test('mobile extra visibility repair removes a stale zero-scale Canva state', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}?edit=1`);
  const keys = await page.evaluate(() => ({
    extra: document.querySelector('.pdp-cmp__card--compact-partial > .pdp-cmp__compact-partial-main > .pdp-cmp__compact-partial-extra').__cvKey,
    control: document.querySelector('.pdp-cmp__card--compact-video > .pdp-cmp__sub').__cvKey
  }));
  await Promise.all([
    page.waitForEvent('load'),
    page.evaluate((savedKeys) => {
      localStorage.setItem('volt-canva-layout-4', JSON.stringify({
        [savedKeys.extra]: { dx: 8, dy: -4, s: 0, text: 'extra' },
        [savedKeys.control]: { dx: 3, dy: 2 }
      }));
      localStorage.setItem('volt-canva-history-4', JSON.stringify([[{
        key: savedKeys.extra, prev: { s: 0 }
      }, {
        key: savedKeys.control, prev: { dx: 1 }
      }]]));
      localStorage.setItem('volt-canva-compact-partial-reference-v1', '1');
      localStorage.setItem('volt-canva-compact-partial-eyebrow-align-v1', '1');
      localStorage.setItem('volt-canva-compact-partial-extra-restore-v1', '1');
      localStorage.removeItem('volt-canva-compact-partial-extra-visibility-v2');
      location.reload();
    }, keys)
  ]);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('volt-canva-layout-4') || '{}'));
  expect(saved[keys.extra]).toBeUndefined();
  expect(saved[keys.control]).toMatchObject({ dx: 3, dy: 2 });
  const savedHistory = await page.evaluate(() => JSON.parse(localStorage.getItem('volt-canva-history-4') || '[]'));
  expect(savedHistory.flat().map((entry) => entry.key)).toEqual([keys.control]);
  await expect(page.locator('.pdp-cmp__card--compact-partial > .pdp-cmp__compact-partial-main > .pdp-cmp__compact-partial-extra')).toHaveText('extra');
});

test('Canva exposes the compact partial live stat for moving and resizing', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}?edit=1`);

  const number = page.locator('.pdp-cmp__card--compact-partial > .pdp-cmp__compact-partial-main > .pdp-cmp__compact-partial-number');
  const extra = page.locator('.pdp-cmp__card--compact-partial > .pdp-cmp__compact-partial-main > .pdp-cmp__compact-partial-extra');
  await number.scrollIntoViewIfNeeded();
  await number.dblclick();
  await expect(page.locator('.cv-tag')).toHaveText('stat');
  await expect(number).not.toHaveAttribute('contenteditable', 'true');
  await expect(number).toHaveText('3.6');
  await extra.dblclick();
  await expect(page.locator('.cv-tag')).toHaveText('text');
  await expect(extra).toHaveText('extra');
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
