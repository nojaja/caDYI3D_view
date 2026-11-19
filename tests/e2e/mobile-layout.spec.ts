import { test, expect } from '@playwright/test';

test.describe('caDIY3D Web Viewer - スマホ表示UI E2E検証', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?model=models/test_rack.cadiy4');
    await page.waitForFunction(() => (window as any).__VIEWER_READY__ === true, { timeout: 10000 });
  });

  test('スマホ表示時: brand, model-title, bottom-controls が非表示であること', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'スマホ環境専用のテスト');

    const brand = page.locator('.brand');
    await expect(brand).toBeHidden();

    const modelTitle = page.locator('#model-title');
    await expect(modelTitle).toBeHidden();

    const bottomControls = page.locator('#bottom-controls');
    await expect(bottomControls).toBeHidden();
  });

  test('スマホ表示時: view-mode-selector が下部中央に配置されていること', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'スマホ環境専用のテスト');

    const selector = page.locator('#view-mode-selector');
    await expect(selector).toBeVisible();

    const box = await selector.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      const viewport = page.viewportSize()!;
      // 画面下部にあること (box.y + box.height が画面下部付近)
      expect(box.y + box.height).toBeGreaterThan(viewport.height - 100);
      // 水平方向中央付近にあること
      const centerX = box.x + box.width / 2;
      expect(Math.abs(centerX - viewport.width / 2)).toBeLessThan(30);
    }
  });

  test('スマホ表示時: layer-panel が一番左上に配置され、layer-panel-title の開閉で配下の layer-item が表示/非表示されること', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'スマホ環境専用のテスト');

    const layerPanel = page.locator('#layer-panel');
    await expect(layerPanel).toBeVisible();

    // 1. 一番左上に配置されていること (class="brand" があった場所)
    const box = await layerPanel.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.x).toBeLessThanOrEqual(24);
      expect(box.y).toBeLessThanOrEqual(60);
    }

    // 2. 初期状態では配下の layer-item は非表示 (折りたたみ状態)
    const layerTreeContainer = page.locator('#layer-tree-container');
    await expect(layerTreeContainer).toBeHidden();

    // 3. layer-panel-title をクリックすると展開され、配下の layer-item が表示される
    const panelTitle = page.locator('.layer-panel-title');
    await panelTitle.click();

    await expect(layerTreeContainer).toBeVisible();
    const layerItems = page.locator('.layer-item');
    await expect(layerItems.first()).toBeVisible();

    // 4. 再度クリックすると折りたたまれて非表示になること
    await panelTitle.click();
    await expect(layerTreeContainer).toBeHidden();
  });

  test('PC表示時: brand, model-title, bottom-controls が表示され、デスクトップ配置を維持していること', async ({ page, isMobile }) => {
    test.skip(isMobile, 'PC環境専用のテスト');

    const brand = page.locator('.brand');
    await expect(brand).toBeVisible();

    const modelTitle = page.locator('#model-title');
    await expect(modelTitle).toBeVisible();

    const bottomControls = page.locator('#bottom-controls');
    await expect(bottomControls).toBeVisible();

    const selector = page.locator('#view-mode-selector');
    await expect(selector).toBeVisible();

    const layerTreeContainer = page.locator('#layer-tree-container');
    await expect(layerTreeContainer).toBeVisible();
  });
});
