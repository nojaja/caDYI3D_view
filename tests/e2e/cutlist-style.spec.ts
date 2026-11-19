import { test, expect } from '@playwright/test';

test.describe('caDIY3D Web Viewer - 材料取り図 SVG統一・外寸SVG・枠線非表示 E2E検証', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?model=models/test_rack.cadiy4');
    await page.waitForFunction(() => (window as any).__VIEWER_READY__ === true, { timeout: 10000 });
    // 材料取り図モードに切り替え
    await page.click('#mode-btn-cutlist');
    await expect(page.locator('#cutlist-view-container')).toBeVisible();
  });

  test('共通要件 (1D角材): cutplan-canvas-main の枠線が非表示で、木取り図および縦横外寸が cutplan-svg-canvas 内にSVGで描画されること', async ({ page }) => {
    // 1. cutplan-canvas-main の枠線非表示確認
    const canvasMain = page.locator('.cutplan-canvas-main').first();
    await expect(canvasMain).toBeVisible();

    const borderInfo = await canvasMain.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        borderWidth: style.borderWidth,
        borderStyle: style.borderStyle,
      };
    });
    expect(borderInfo.borderStyle === 'none' || borderInfo.borderWidth === '0px').toBe(true);

    // 2. 1D角材でも木取り図が cutplan-svg-canvas (SVG) で描画されていること
    const svgCanvas = canvasMain.locator('svg.cutplan-svg-canvas');
    await expect(svgCanvas).toBeVisible();

    // 3. 外寸表示の cutplan-dim-x, cutplan-dim-y が div ではなく cutplan-svg-canvas 内のSVG要素として描画されていること
    // (div.cutplan-dim-x, div.cutplan-dim-y は存在しないこと)
    const divDimX = page.locator('div.cutplan-dim-x');
    await expect(divDimX).toHaveCount(0);
    const divDimY = page.locator('div.cutplan-dim-y');
    await expect(divDimY).toHaveCount(0);

    const svgDimX = svgCanvas.locator('.cutplan-dim-x');
    const svgDimY = svgCanvas.locator('.cutplan-dim-y');
    await expect(svgDimX).toBeVisible();
    await expect(svgDimY).toBeVisible();
    // 単位 mm が付いていないこと
    await expect(svgDimX).not.toContainText('mm');
    await expect(svgDimY).not.toContainText('mm');
  });

  test('共通要件 (2D合板): cutplan-canvas-main の枠線が非表示で、外寸が cutplan-svg-canvas 内にSVGで描画されること', async ({ page }) => {
    await page.goto('/?model=models/002.cadiy4');
    await page.waitForFunction(() => (window as any).__VIEWER_READY__ === true, { timeout: 10000 });
    await page.click('#mode-btn-cutlist');

    const canvasMain = page.locator('.cutplan-canvas-main').first();
    await expect(canvasMain).toBeVisible();

    const borderInfo = await canvasMain.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        borderWidth: style.borderWidth,
        borderStyle: style.borderStyle,
      };
    });
    expect(borderInfo.borderStyle === 'none' || borderInfo.borderWidth === '0px').toBe(true);

    const svgCanvas = canvasMain.locator('svg.cutplan-svg-canvas');
    await expect(svgCanvas).toBeVisible();

    // 外寸表示が SVG 内の要素であること
    const svgDimX = svgCanvas.locator('.cutplan-dim-x');
    const svgDimY = svgCanvas.locator('.cutplan-dim-y');
    await expect(svgDimX).toBeVisible();
    await expect(svgDimY).toBeVisible();
    // 単位 mm が付いていないこと
    await expect(svgDimX).not.toContainText('mm');
    await expect(svgDimY).not.toContainText('mm');
  });

  test('スマホ表示時: cutplan-part-size にサイズのみ表記され、歩留まりが非表示であること', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'スマホ環境専用のテスト');

    const svgCanvas = page.locator('svg.cutplan-svg-canvas').first();
    await expect(svgCanvas).toBeVisible();

    // 1. cutplan-part-size にサイズのみ表記 (単位mmなし、寸法: なし)
    const partSize = svgCanvas.locator('.cutplan-part-size').first();
    await expect(partSize).toBeVisible();
    await expect(partSize).not.toContainText('mm');
    await expect(partSize).not.toContainText('寸法:');

    // スマホ時は部材名 (.cutplan-part-name) は非表示
    const partName = svgCanvas.locator('.cutplan-part-name').first();
    if (await partName.count() > 0) {
      await expect(partName).toBeHidden();
    }

    // 2. cutplan-sheet-header で歩留まりは非表示
    const yieldElem = page.locator('.cutplan-sheet-header .cutplan-yield').first();
    await expect(yieldElem).toBeHidden();
  });

  test('PC表示時: cutplan-part-label に部材名が表示され、歩留まりが表示されること', async ({ page, isMobile }) => {
    test.skip(isMobile, 'PC環境専用のテスト');

    const svgCanvas = page.locator('svg.cutplan-svg-canvas').first();
    await expect(svgCanvas).toBeVisible();

    // 1. cutplan-part-label に部材名が表示される
    const partName = svgCanvas.locator('.cutplan-part-name').first();
    await expect(partName).toBeVisible();

    const partSize = svgCanvas.locator('.cutplan-part-size').first();
    await expect(partSize).toBeVisible();
    await expect(partSize).not.toContainText('寸法:');

    // 2. cutplan-sheet-header で歩留まりが表示される
    const yieldElem = page.locator('.cutplan-sheet-header .cutplan-yield').first();
    await expect(yieldElem).toBeVisible();
    await expect(yieldElem).toContainText('歩留まり');
  });

  test('フォントサイズ統一: cutplan-part-size, cutplan-part-name, cutplan-dim-y, cutplan-dim-x のフォントサイズが一致し、cutplan-sheet-header 相当であること', async ({ page, isMobile }) => {
    const sheetHeader = page.locator('.cutplan-sheet-header').first();
    const headerFontSize = await sheetHeader.evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).fontSize);
    });
    expect(headerFontSize).toBe(13);

    // 全てのシート（材料 #1, #2, #3）を検証
    const sheets = page.locator('.cutplan-sheet');
    const sheetCount = await sheets.count();
    console.log(`検証対象シート数: ${sheetCount} (isMobile: ${isMobile})`);

    for (let i = 0; i < sheetCount; i++) {
      const sheet = sheets.nth(i);
      const svgCanvas = sheet.locator('svg.cutplan-svg-canvas');

      const partSize = svgCanvas.locator('.cutplan-part-size').first();
      const dimY = svgCanvas.locator('.cutplan-dim-y').first();
      const dimX = svgCanvas.locator('.cutplan-dim-x').first();

      const [partSizeFs, dimYFs, dimXFs] = await Promise.all([
        partSize.evaluate((el) => parseFloat(window.getComputedStyle(el).fontSize)),
        dimY.evaluate((el) => parseFloat(window.getComputedStyle(el).fontSize)),
        dimX.evaluate((el) => parseFloat(window.getComputedStyle(el).fontSize)),
      ]);

      if (!isMobile) {
        const partName = svgCanvas.locator('.cutplan-part-name').first();
        const partNameFs = await partName.evaluate((el) => parseFloat(window.getComputedStyle(el).fontSize));
        expect(partNameFs).toBe(dimYFs);
      }

      console.log(`Sheet #${i + 1} SVG font-sizes:`, { partSizeFs, dimYFs, dimXFs });

      // 1. 同一シート内の各要素（部材寸法、部材名、外寸Y、外寸X、端材等）のフォントサイズが完全一致すること
      expect(partSizeFs).toBe(dimYFs);
      expect(dimXFs).toBe(dimYFs);

      const scrapLabel = svgCanvas.locator('.cutplan-scrap-label').first();
      if (await scrapLabel.count() > 0) {
        const scrapFs = await scrapLabel.evaluate((el) => parseFloat(window.getComputedStyle(el).fontSize));
        expect(scrapFs).toBe(dimYFs);
      }

      // 2. 画面上の実効サイズ（getBoundingClientRect での高さ/スケーリング後サイズ）の検証
      // PC表示時は 13px (class="cutplan-sheet-header" 相当)、スマホ表示時は 11px (現在のフォントサイズ -2 相当)
      const targetScreenFs = isMobile ? 11 : 13;
      const actualScreenFs = await partSize.evaluate((el) => {
        const svg = (el as SVGElement).ownerSVGElement!;
        const ctm = svg.getScreenCTM()!;
        const fs = parseFloat(window.getComputedStyle(el).fontSize);
        return fs * ctm.a;
      });

      console.log(`Sheet #${i + 1} 画面上の実効フォントサイズ (scale後): ${actualScreenFs.toFixed(2)}px (目標: ${targetScreenFs}px)`);
      expect(Math.abs(actualScreenFs - targetScreenFs)).toBeLessThanOrEqual(0.6);
    }
  });

  test('002.cadiy4 (斜めカット・木取り線・端材) のすべてのテキストが同一ロジックで決定され、スケール後サイズが揃っていること、および木取り線テキスト削除・斜めカット角度・mm表記なしの検証', async ({ page, isMobile }) => {
    await page.goto('/?model=models/002.cadiy4');
    await page.waitForFunction(() => (window as any).__VIEWER_READY__ === true, { timeout: 10000 });
    await page.click('#mode-btn-cutlist');
    await expect(page.locator('#cutlist-view-container')).toBeVisible();

    const targetScreenFs = isMobile ? 11 : 13;

    // 「✂ 木取り線」テキストが cutplan-canvas-main 内に存在しないこと
    const kerfLabel = page.locator('.cutplan-canvas-main .cutplan-kerf-label');
    await expect(kerfLabel).toHaveCount(0);
    const canvasMainText = await page.locator('.cutplan-canvas-main').allInnerTexts();
    for (const t of canvasMainText) {
      expect(t).not.toContain('✂ 木取り線');
    }

    // 斜めカットや端材を含むシートを検証
    const svgList = page.locator('svg.cutplan-svg-canvas');
    const svgCount = await svgList.count();
    expect(svgCount).toBeGreaterThan(0);

    for (let i = 0; i < svgCount; i++) {
      const svg = svgList.nth(i);
      const textElements = svg.locator('text');
      const textCount = await textElements.count();
      expect(textCount).toBeGreaterThan(0);

      const firstFs = await textElements.first().evaluate((el) => parseFloat(window.getComputedStyle(el).fontSize));

      for (let j = 0; j < textCount; j++) {
        const textEl = textElements.nth(j);
        // スマホ時に非表示の要素は除外
        if (await textEl.evaluate((el) => window.getComputedStyle(el).display === 'none')) {
          continue;
        }
        const fs = await textEl.evaluate((el) => parseFloat(window.getComputedStyle(el).fontSize));
        expect(fs).toBe(firstFs);

        const actualScreenFs = await textEl.evaluate((el) => {
          const s = (el as SVGElement).ownerSVGElement!;
          const ctm = s.getScreenCTM()!;
          return parseFloat(window.getComputedStyle(el).fontSize) * ctm.a;
        });
        expect(Math.abs(actualScreenFs - targetScreenFs)).toBeLessThanOrEqual(0.6);

        // 各種サイズ表記に単位 mm が付いていないことの検証
        const textContent = await textEl.textContent();
        if (textContent) {
          expect(textContent).not.toMatch(/\d+\s*mm/);
        }
      }

      // 斜めカットラベルがある場合、斜め線と同じ角度（rotate）で描画されていること
      const diagLabels = svg.locator('.cutplan-diag-cut-label');
      const diagCount = await diagLabels.count();
      for (let k = 0; k < diagCount; k++) {
        const diag = diagLabels.nth(k);
        const transform = await diag.getAttribute('transform');
        expect(transform).not.toBeNull();
        expect(transform).toMatch(/rotate\([\d.-]+,\s*[\d.-]+,\s*[\d.-]+\)/);
      }
    }
  });
});
