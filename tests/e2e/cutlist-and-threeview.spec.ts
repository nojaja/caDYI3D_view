import { test, expect } from '@playwright/test';

test.describe('caDIY3D Web Viewer - 材料取り図 & 三面図 E2E検証', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?model=models/test_rack.cadiy4');
    await page.waitForFunction(() => (window as any).__VIEWER_READY__ === true, { timeout: 10000 });
  });

  test('材料取り図モードに切り替えた際、木取り図コンテナが表示されパーツ枠と寸法が描画されること', async ({ page }) => {
    // セグメントコントロールで「材料取り図」をクリック
    await page.click('#mode-btn-cutlist');

    // 材料取り図ビューのコンテナが表示されること
    const cutlistView = page.locator('#cutlist-view-container');
    await expect(cutlistView).toBeVisible();

    // 3D視点コントロールバーは非表示または木取り図用になること
    const bottomControls = page.locator('#bottom-controls');
    await expect(bottomControls).toBeHidden();

    // 材料シートカード(または木取り板枠)がレンダリングされていること
    const sheetItem = page.locator('.cutplan-sheet').first();
    await expect(sheetItem).toBeVisible();

    // 部材パーツ名および切断寸法テキストが表示されていること
    const partLabel = page.locator('.cutplan-part-label').first();
    await expect(partLabel).toBeVisible();

    // 鋸刃切り代幅(cutWidthMm)が表示されていること
    const cutWidthInfo = page.locator('.cutplan-cutwidth-info');
    await expect(cutWidthInfo).toBeVisible();

    // 材料取り図の画面キャプチャ保存
    await page.screenshot({ path: 'tests/data/cutlist_capture.png' });
  });

  test('三面図モードに切り替えた際、平面図・正面図・右側図の3分割固定ビューが表示されること', async ({ page }) => {
    // セグメントコントロールで「三面図」をクリック
    await page.click('#mode-btn-threeview');

    // 三面図コンテナが表示されること
    const threeViewContainer = page.locator('#threeview-container');
    await expect(threeViewContainer).toBeVisible();

    // 3つの図面ビューポート（Top:平面図, Front:正面図, Side:右側図）が存在すること
    const topView = page.locator('#threeview-top');
    const frontView = page.locator('#threeview-front');
    const sideView = page.locator('#threeview-side');

    await expect(topView).toBeVisible();
    await expect(frontView).toBeVisible();
    await expect(sideView).toBeVisible();

    // 各ビューポートにラベル（平面図、正面図、側面図）が表示されていること
    await expect(topView.locator('.view-label')).toContainText('平面図');
    await expect(frontView.locator('.view-label')).toContainText('正面図');
    await expect(sideView.locator('.view-label')).toContainText('側面図');

    // 三面図の画面キャプチャ保存
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'tests/data/threeview_capture.png' });
  });

  test('三面図から再度3Dviewに切り替えた際、3Dビューポートおよび視点コントロールが復帰すること', async ({ page }) => {
    // 三面図に切り替え
    await page.click('#mode-btn-threeview');
    await expect(page.locator('#threeview-container')).toBeVisible();

    // 3Dviewに戻す
    await page.click('#mode-btn-3d');
    await expect(page.locator('#threeview-container')).toBeHidden();

    // 3D用の視点コントロールが再度表示されること
    const bottomControls = page.locator('#bottom-controls');
    await expect(bottomControls).toBeVisible();
  });

  test('001.cadiy4 で材料取り図に5つの素材シートが表示され、木取り線が表示されること', async ({ page }) => {
    await page.goto('/?model=models/001.cadiy4');
    await page.waitForFunction(() => (window as any).__VIEWER_READY__ === true, { timeout: 10000 });

    await page.click('#mode-btn-cutlist');
    await expect(page.locator('#cutlist-view-container')).toBeVisible();

    // 5シート表示されること (SPF 2x2, SPF 1x3, 板材, 円柱, 丸棒)
    const sheets = page.locator('.cutplan-sheet');
    await expect(sheets).toHaveCount(5);

    // 木取り線 (のこ刃切り代マーク) が表示されていること
    const kerfLines = page.locator('.cutplan-kerf-line');
    expect(await kerfLines.count()).toBeGreaterThanOrEqual(2);

    // 原木長 (1820mm) がヘッダーに表示されていること
    const firstHeader = sheets.first().locator('.cutplan-sheet-header');
    await expect(firstHeader).toContainText('1820mm');
  });

  test('003.cadiy4 で材料取り図にdummy部材が除外され14個の素材が表示され、それぞれ木取り線が表示されること', async ({ page }) => {
    await page.goto('/?model=models/003.cadiy4');
    await page.waitForFunction(() => (window as any).__VIEWER_READY__ === true, { timeout: 10000 });

    await page.click('#mode-btn-cutlist');
    await expect(page.locator('#cutlist-view-container')).toBeVisible();

    // dummy部材(6個)が除外され、全部で14個の実素材シートが表示されること
    const sheets = page.locator('.cutplan-sheet');
    await expect(sheets).toHaveCount(14);

    // 木取り線 (のこ刃切り代マーク) が多数表示されていること
    const kerfLines = page.locator('.cutplan-kerf-line');
    expect(await kerfLines.count()).toBeGreaterThanOrEqual(10);

    // スクリーンショットを記録
    await page.screenshot({ path: 'tests/data/003_cutlist_capture.png' });
  });
});
