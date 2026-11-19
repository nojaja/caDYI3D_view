import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Polygon 3D描画検証', () => {
  test('009.cadiy4 の polygon オブジェクト群が正常にロードされ描画されること', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => (window as any).__VIEWER_READY__ === true, { timeout: 10000 });

    const filePath = path.resolve('tests/data/009.cadiy4');
    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(filePath);

    const modelTitle = page.locator('#model-title');
    await expect(modelTitle).toHaveText('009', { timeout: 15000 });

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // 描画が安定するまで少し待機してスクリーンショットを撮影
    await page.waitForTimeout(1000);
    const isMobile = page.viewportSize()?.width! < 600;
    const captureName = isMobile ? 'tests/data/009_polygon_render_iphone.png' : 'tests/data/009_polygon_render_desktop.png';
    await page.screenshot({ path: captureName });
  });

  test('旧形式 009.cadiy の polygon オブジェクト群が正常にロードされ描画されること', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => (window as any).__VIEWER_READY__ === true, { timeout: 10000 });

    const filePath = path.resolve('tests/data/009.cadiy');
    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(filePath);

    const modelTitle = page.locator('#model-title');
    await expect(modelTitle).toHaveText('009', { timeout: 15000 });

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    await page.waitForTimeout(1000);
    const isMobile = page.viewportSize()?.width! < 600;
    const captureName = isMobile ? 'tests/data/009_legacy_polygon_render_iphone.png' : 'tests/data/009_legacy_polygon_render_desktop.png';
    await page.screenshot({ path: captureName });
  });
});
