import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('caDIY3D Web Viewer - 旧バージョン (.cadiy) 読み込み E2E検証', () => {
  test('旧バージョン (.cadiy) ファイルを読み込んでモデルが正常に表示されること', async ({ page, isMobile }) => {
    // ページへ遷移
    await page.goto('/');
    await page.waitForFunction(() => (window as any).__VIEWER_READY__ === true, { timeout: 10000 });

    const cadiyFilePath = path.resolve('tests/data/008.cadiy');

    // ファイル入力（#file-input）に .cadiy をセット
    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(cadiyFilePath);

    // モデル名称が 008 に更新されること
    const modelTitle = page.locator('#model-title');
    await expect(modelTitle).toHaveText('008', { timeout: 10000 });

    // モバイル環境ではレイヤー一覧が初期折りたたみ状態のため開く
    if (isMobile) {
      await page.locator('.layer-panel-title').click();
    }

    // レイヤー一覧パネルにレイヤーが生成されていること
    const layerItems = page.locator('.layer-item');
    await expect(layerItems.first()).toBeVisible({ timeout: 10000 });

    // 材料取り図モードに切り替えて、旧モデルの木取り図が描画されること
    const modeCutList = page.locator('#mode-btn-cutlist');
    await modeCutList.click();
    await expect(modeCutList).toHaveClass(/active/);

    const cutplanSheets = page.locator('.cutplan-sheet');
    await expect(cutplanSheets.first()).toBeVisible({ timeout: 10000 });
  });
});
