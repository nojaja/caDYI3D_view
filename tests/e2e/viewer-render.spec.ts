import { test, expect } from '@playwright/test';

test.describe('caDIY3D Web Viewer - 3D Render Verification', () => {
  test('PC環境で models/test_rack.cadiy4 が正常に3D描画されること', async ({ page }) => {
    // ページアクセス
    await page.goto('/?model=models/test_rack.cadiy4');

    // Canvas要素の存在確認
    const canvas = page.locator('canvas.webgl-canvas');
    await expect(canvas).toBeVisible();

    // モデル読み込み完了 (__VIEWER_READY__) を待機
    await page.waitForFunction(() => (window as any).__VIEWER_READY__ === true, { timeout: 10000 });

    // レンダリング安定化待機
    await page.waitForTimeout(1000);

    // 画面キャプチャを保存
    await page.screenshot({ path: 'tests/data/verification_capture.png' });

    // WebGL Canvas からピクセルデータを直接読み取り、パーツ（非背景色）が描画されているかを判定
    const renderStats = await page.evaluate(() => {
      const cvs = document.querySelector('canvas.webgl-canvas') as HTMLCanvasElement;
      if (!cvs) return { hasCanvas: false, nonEmptyPixelRatio: 0 };

      const gl = cvs.getContext('webgl2') || cvs.getContext('webgl');
      if (!gl) return { hasCanvas: true, hasGl: false, nonEmptyPixelRatio: 0 };

      const width = cvs.width;
      const height = cvs.height;
      const pixels = new Uint8Array(width * height * 4);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      // 背景色: #f4f6f8 (r: 244, g: 246, b: 248)
      let nonBgCount = 0;
      const totalPixels = width * height;
      const sampleStep = 8;
      let sampledTotal = 0;

      for (let i = 0; i < totalPixels; i += sampleStep) {
        sampledTotal++;
        const r = pixels[i * 4];
        const g = pixels[i * 4 + 1];
        const b = pixels[i * 4 + 2];
        const a = pixels[i * 4 + 3];

        const isBg = Math.abs(r - 244) < 15 && Math.abs(g - 246) < 15 && Math.abs(b - 248) < 15;
        if (!isBg && a > 0) {
          nonBgCount++;
        }
      }

      return {
        hasCanvas: true,
        hasGl: true,
        width,
        height,
        nonEmptyPixelRatio: nonBgCount / sampledTotal,
      };
    });

    console.log('レンダリング統計:', renderStats);
    expect(renderStats.hasCanvas).toBe(true);
    expect(renderStats.nonEmptyPixelRatio).toBeGreaterThan(0.01);
  });

  test('スマホ（iPhone）環境でUIが崩れず操作可能であること', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'スマホ環境専用のテスト');
    await page.goto('/?model=models/test_rack.cadiy4');

    const canvas = page.locator('canvas.webgl-canvas');
    await expect(canvas).toBeVisible();

    const bottomControls = page.locator('#bottom-controls');
    await expect(bottomControls).toBeHidden();

    const viewModeSelector = page.locator('#view-mode-selector');
    await expect(viewModeSelector).toBeVisible();

    // 材料取り図に切り替えて動作確認
    await page.click('#mode-btn-cutlist');
    await page.waitForTimeout(500);

    // 3Dviewに戻す
    await page.click('#mode-btn-3d');
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'tests/data/verification_iphone_capture.png' });
  });
});
