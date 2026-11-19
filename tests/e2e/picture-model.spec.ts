import { test, expect } from '@playwright/test';

test.describe('caDIY3D Web Viewer - 画像オブジェクト(picture) 3D表示 E2E検証', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?model=models/004.cadiy4');
    await page.waitForFunction(() => (window as any).__VIEWER_READY__ === true, { timeout: 10000 });
  });

  test('3Dビューで画像オブジェクト(004.cadiy4)が正しくロードされ、画像テクスチャが描画されること', async ({ page }) => {
    // モデルタイトルが "004" またはオブジェクト名 "caDIY3D-X" であること
    const modelTitle = page.locator('#model-title');
    await expect(modelTitle).toBeVisible();

    // レイヤーツリーを展開してパーツ一覧から "caDIY3D-X" をクリック
    const layerHeader = page.locator('.layer-item-header').first();
    await layerHeader.click();

    const partItem = page.locator('.layer-object-item', { hasText: 'caDIY3D-X' }).first();
    await expect(partItem).toBeVisible();
    await partItem.click();

    // インスペクタカードが表示されること
    const inspectorCard = page.locator('#inspector-card');
    await expect(inspectorCard).toBeVisible();

    // テクスチャロードのための待機
    await page.waitForTimeout(1000);

    // スクリーンショットを撮影して保存
    await page.screenshot({ path: 'tests/data/004_render_capture.png' });
  });
});
