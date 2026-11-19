import { test, expect } from '@playwright/test';

test.describe('caDIY3D Web Viewer - 形状加工(edgeCuts)付き合板 3D描画 & 材料取り図 E2E検証', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?model=models/002.cadiy4');
    await page.waitForFunction(() => (window as any).__VIEWER_READY__ === true, { timeout: 10000 });
  });

  test('3DビューでOSB合板モデルが正しくロードされ、インスペクタにエッジ加工情報が表示されること', async ({ page }) => {
    // モデルタイトルが "002" または "OSB合板" であること
    const modelTitle = page.locator('#model-title');
    await expect(modelTitle).toBeVisible();

    // レイヤーツリーのパーツ一覧から "OSB合板" をクリック
    const partItem = page.locator('.layer-object-item', { hasText: 'OSB合板' }).first();
    await expect(partItem).toBeVisible();
    await partItem.click();

    // インスペクタカードが表示されること
    const inspectorCard = page.locator('#inspector-card');
    await expect(inspectorCard).toBeVisible();

    // インスペクタの形状加工行に「エッジ加工」および寸法が表示されていること
    const inspectorDetail = page.locator('#inspector-detail');
    await expect(inspectorDetail).toContainText('エッジ加工');
    await expect(inspectorDetail).toContainText('792.5');
    await expect(inspectorDetail).toContainText('198.5');

    // 3D描画のスクリーンショットを撮影
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'tests/data/002_render_capture.png' });
  });

  test('材料取り図モードに切り替えた際、OSB合板の2Dシート(幅×長さ)と斜めカットが描画されること', async ({ page }) => {
    // 材料取り図ボタンをクリック
    await page.click('#mode-btn-cutlist');

    // 材料取り図ビューが表示されること
    const cutlistView = page.locator('#cutlist-view-container');
    await expect(cutlistView).toBeVisible();

    // 材料シート (OSB合板) が2D板材シートとして表示されること
    const sheetItem = page.locator('.cutplan-sheet-2d').first();
    await expect(sheetItem).toBeVisible();
    await expect(sheetItem).toContainText('OSB合板');
    // 原板寸法が表記されていること (910 × 1820 mm)
    await expect(sheetItem).toContainText('910');
    await expect(sheetItem).toContainText('1820');

    // 2D SVG キャンバスが描画されていること
    const svgCanvas = sheetItem.locator('.cutplan-svg-canvas');
    await expect(svgCanvas).toBeVisible();

    // SVG内に部材寸法 (910 × 1820 mm) が表記されていること
    await expect(svgCanvas).toContainText('910');
    await expect(svgCanvas).toContainText('1820');

    // SVG内に「斜めカット」の切断表記および寸法 (792.5 × 198.5mm) が表記されていること
    await expect(svgCanvas).toContainText('斜めカット');
    await expect(svgCanvas).toContainText('792.5');
    await expect(svgCanvas).toContainText('198.5');

    // 材料取り図のスクリーンショットを撮影
    await page.screenshot({ path: 'tests/data/002_cutlist_capture.png' });
  });
});
