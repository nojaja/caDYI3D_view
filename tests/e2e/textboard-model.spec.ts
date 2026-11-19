import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('TextBoard 3D描画検証', () => {
  test('001_tana.cadiy4 の textBoard (contentRotation: 90) が正常に描画されること', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => (window as any).__VIEWER_READY__ === true, { timeout: 10000 });

    const filePath = path.resolve('tests/data/001_tana.cadiy4');
    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(filePath);

    const modelTitle = page.locator('#model-title');
    await expect(modelTitle).toHaveText('001_tana', { timeout: 10000 });

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
  });

  test('test_rack.cadiy4 の textBoard (contentRotation: 0) が正常に描画されること', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => (window as any).__VIEWER_READY__ === true, { timeout: 10000 });

    const filePath = path.resolve('tests/data/test_rack.cadiy4');
    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(filePath);

    const modelTitle = page.locator('#model-title');
    await expect(modelTitle).toHaveText('test_rack', { timeout: 10000 });

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
  });
});
