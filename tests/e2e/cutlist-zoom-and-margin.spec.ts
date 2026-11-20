import { test, expect } from '@playwright/test';

test.describe('材料取り図 ズーム操作（ピンチ / Ctrl+スクロール）および SVG マージン検証', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?model=models/test_rack.cadiy4');
    await page.waitForFunction(() => (window as any).__VIEWER_READY__ === true, { timeout: 10000 });
    await page.click('#mode-btn-cutlist');
    await expect(page.locator('#cutlist-view-container')).toBeVisible();
  });

  test('PC環境: Ctrl＋スクロールで材料取り図が拡大・縮小し、通常のスクロールではズーム倍率が変化しないこと', async ({ page, isMobile }) => {
    test.skip(isMobile, 'PC環境専用のテスト');

    const container = page.locator('#cutlist-view-container');
    const sheets = page.locator('#cutlist-sheets-container');
    await expect(sheets).toBeVisible();

    // 1. 通常のホイール操作（Ctrlなし）ではズームが変化しないこと
    const initialTransform = await sheets.evaluate((el) => el.style.transform);
    await container.evaluate((el) => {
      const wheelEvent = new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        ctrlKey: false,
        deltaY: -100,
      });
      el.dispatchEvent(wheelEvent);
    });

    const transformAfterNormalWheel = await sheets.evaluate((el) => el.style.transform);
    expect(transformAfterNormalWheel).toBe(initialTransform);

    // 2. Ctrl＋ホイール上スクロール (deltaY < 0) で拡大されること
    await container.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const wheelEvent = new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        ctrlKey: true,
        deltaY: -120,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
      });
      el.dispatchEvent(wheelEvent);
    });

    const zoomedInTransform = await sheets.evaluate((el) => el.style.transform);
    expect(zoomedInTransform).toContain('scale(');
    const zoomInMatch = zoomedInTransform.match(/scale\(([\d.]+)\)/);
    expect(zoomInMatch).not.toBeNull();
    const zoomInVal = parseFloat(zoomInMatch![1]);
    expect(zoomInVal).toBeGreaterThan(1.0);

    // 拡大時にスペーサー要素が存在し、スクロール領域が拡張されていること
    const spacer = page.locator('#cutlist-zoom-spacer');
    await expect(spacer).toBeAttached();
    const spacerWidth = await spacer.evaluate((el) => parseFloat(el.style.width || '0'));
    expect(spacerWidth).toBeGreaterThan(0);

    // 3. Ctrl＋ホイール下スクロール (deltaY > 0) で縮小されること
    await container.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const wheelEvent = new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        ctrlKey: true,
        deltaY: 120,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
      });
      el.dispatchEvent(wheelEvent);
    });

    const zoomedOutTransform = await sheets.evaluate((el) => el.style.transform);
    const zoomOutMatch = zoomedOutTransform.match(/scale\(([\d.]+)\)/);
    expect(zoomOutMatch).not.toBeNull();
    const zoomOutVal = parseFloat(zoomOutMatch![1]);
    expect(zoomOutVal).toBeLessThan(zoomInVal);
  });

  test('スマホ環境: ピンチアウトで材料取り図が拡大され、ピンチインで縮小されること', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'スマホ環境専用のテスト');

    const container = page.locator('#cutlist-view-container');
    const sheets = page.locator('#cutlist-sheets-container');
    await expect(sheets).toBeVisible();

    // 1. 2本指のピンチアウト（拡大）シミュレーション
    await container.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      // 初期距離 100px
      const t1Start = new Touch({
        identifier: 1,
        target: el,
        clientX: cx - 50,
        clientY: cy,
      });
      const t2Start = new Touch({
        identifier: 2,
        target: el,
        clientX: cx + 50,
        clientY: cy,
      });

      const startEvent = new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        touches: [t1Start, t2Start],
        targetTouches: [t1Start, t2Start],
      });
      el.dispatchEvent(startEvent);

      // 移動後距離 180px (1.8倍にピンチアウト)
      const t1Move = new Touch({
        identifier: 1,
        target: el,
        clientX: cx - 90,
        clientY: cy,
      });
      const t2Move = new Touch({
        identifier: 2,
        target: el,
        clientX: cx + 90,
        clientY: cy,
      });

      const moveEvent = new TouchEvent('touchmove', {
        bubbles: true,
        cancelable: true,
        touches: [t1Move, t2Move],
        targetTouches: [t1Move, t2Move],
      });
      el.dispatchEvent(moveEvent);

      const endEvent = new TouchEvent('touchend', {
        bubbles: true,
        cancelable: true,
        touches: [],
        targetTouches: [],
      });
      el.dispatchEvent(endEvent);
    });

    const zoomedInTransform = await sheets.evaluate((el) => el.style.transform);
    expect(zoomedInTransform).toContain('scale(');
    const zoomInMatch = zoomedInTransform.match(/scale\(([\d.]+)\)/);
    expect(zoomInMatch).not.toBeNull();
    const zoomInVal = parseFloat(zoomInMatch![1]);
    expect(zoomInVal).toBeGreaterThan(1.4);

    // 2. ピンチイン（縮小）シミュレーション
    await container.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      // 初期距離 200px
      const t1Start = new Touch({
        identifier: 1,
        target: el,
        clientX: cx - 100,
        clientY: cy,
      });
      const t2Start = new Touch({
        identifier: 2,
        target: el,
        clientX: cx + 100,
        clientY: cy,
      });

      el.dispatchEvent(new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        touches: [t1Start, t2Start],
        targetTouches: [t1Start, t2Start],
      }));

      // 移動後距離 100px (縮小)
      const t1Move = new Touch({
        identifier: 1,
        target: el,
        clientX: cx - 50,
        clientY: cy,
      });
      const t2Move = new Touch({
        identifier: 2,
        target: el,
        clientX: cx + 50,
        clientY: cy,
      });

      el.dispatchEvent(new TouchEvent('touchmove', {
        bubbles: true,
        cancelable: true,
        touches: [t1Move, t2Move],
        targetTouches: [t1Move, t2Move],
      }));

      el.dispatchEvent(new TouchEvent('touchend', {
        bubbles: true,
        cancelable: true,
        touches: [],
        targetTouches: [],
      }));
    });

    const zoomedOutTransform = await sheets.evaluate((el) => el.style.transform);
    const zoomOutMatch = zoomedOutTransform.match(/scale\(([\d.]+)\)/);
    expect(zoomOutMatch).not.toBeNull();
    const zoomOutVal = parseFloat(zoomOutMatch![1]);
    expect(zoomOutVal).toBeLessThan(zoomInVal);
  });

  test('class="cutplan-svg-canvas" において、文字が見切れないようにviewBoxマージンおよびCSS余白が設けられていること', async ({ page }) => {
    const svgs = page.locator('svg.cutplan-svg-canvas');
    const svgCount = await svgs.count();
    expect(svgCount).toBeGreaterThan(0);

    for (let i = 0; i < svgCount; i++) {
      const svg = svgs.nth(i);
      const viewBoxStr = await svg.getAttribute('viewBox');
      expect(viewBoxStr).not.toBeNull();

      // viewBox="-${marginL} -${marginT} ${width + marginL + marginR} ${height + marginT + marginB}"
      const parts = viewBoxStr!.split(/\s+/).map((v) => parseFloat(v));
      expect(parts.length).toBe(4);
      const minX = parts[0];
      const minY = parts[1];

      // marginL, marginT は 0 未満の負のオフセットとして定義される
      const marginL = -minX;
      const marginT = -minY;

      // 上下左右に文字が見切れない十分なマージン（上マージン35以上、左マージン65以上）が設定されていること
      expect(marginT).toBeGreaterThanOrEqual(35);
      expect(marginL).toBeGreaterThanOrEqual(65);

      // CSS スタイルで overflow: visible が設定され、境界で見切れないこと
      const overflow = await svg.evaluate((el) => window.getComputedStyle(el).overflow);
      expect(overflow).toBe('visible');
    }
  });
});
