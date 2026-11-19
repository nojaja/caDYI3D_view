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

  test('001_tana.cadiy4 の3Dviewにて「補強バー」に塗料 (ブルー) の color プロパティが反映されること', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => (window as any).__VIEWER_READY__ === true, { timeout: 10000 });

    const filePath = 'tests/data/001_tana.cadiy4';
    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(filePath);

    // モデル読み込み完了待機
    const modelTitle = page.locator('#model-title');
    await expect(modelTitle).toContainText('001_tana', { timeout: 10000 });
    await page.waitForTimeout(500);

    // 3Dシーン内の「補強バー」および通常部材のマテリアルカラーを検証
    const colorInfo = await page.evaluate<{
      barColor: { r: number; g: number; b: number } | null;
      boardColor: { r: number; g: number; b: number } | null;
    } | null>(() => {
      const modelGroup = (window as any).__MODEL_GROUP__;
      if (!modelGroup) return null;

      let barColor: { r: number; g: number; b: number } | null = null;
      let boardColor: { r: number; g: number; b: number } | null = null;

      modelGroup.traverse((child: any) => {
        if (child.isMesh && child.userData?.cadiyObject) {
          const obj = child.userData.cadiyObject;
          const mat = child.material;
          if (obj.partName === '補強バー' || child.name === '補強バー') {
            barColor = { r: mat.color.r, g: mat.color.g, b: mat.color.b };
          } else if (obj.name?.includes('パイン集成材')) {
            boardColor = { r: mat.color.r, g: mat.color.g, b: mat.color.b };
          }
        }
      });

      return { barColor, boardColor };
    });

    if (!colorInfo?.barColor || !colorInfo?.boardColor) {
      throw new Error('Color info is missing');
    }
    const barColor = colorInfo.barColor;
    const boardColor = colorInfo.boardColor;

    // 補強バーは塗料（ブルー）の color: { r: 0.3098..., g: 0.3098..., b: 1 } が反映されていること
    expect(barColor.r).toBeCloseTo(0.31, 2);
    expect(barColor.g).toBeCloseTo(0.31, 2);
    expect(barColor.b).toBeCloseTo(1.0, 2);

    // パイン集成材は通常の木材色 (1.0, 1.0, 0.8) であること
    expect(boardColor.r).toBeCloseTo(1.0, 2);
    expect(boardColor.g).toBeCloseTo(1.0, 2);
    expect(boardColor.b).toBeCloseTo(0.8, 2);
  });
});
