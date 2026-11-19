import { test, expect } from '@playwright/test';

test.describe('caDIY3D Web Viewer - ヘッダ・表示モード・レイヤー・インスペクタ E2E検証', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?model=models/test_rack.cadiy4');
    await page.waitForFunction(() => (window as any).__VIEWER_READY__ === true, { timeout: 10000 });
  });

  test('ヘッダ領域のレイアウトと要素が要件通り配置されていること', async ({ page }) => {
    // 1. 左側: brand-title
    const brandTitle = page.locator('.brand-title');
    await expect(brandTitle).toBeVisible();

    // 2. 中央: 表示中モデル名称
    const modelTitle = page.locator('#model-title');
    await expect(modelTitle).toBeVisible();
    await expect(modelTitle).toContainText('test_rack');

    // 3. 中央右: セグメントコントロール (3Dview, 材料取り図, 三面図)
    const segmentControl = page.locator('#view-mode-selector');
    await expect(segmentControl).toBeVisible();

    const mode3d = page.locator('#mode-btn-3d');
    const modeCutList = page.locator('#mode-btn-cutlist');
    const modeThreeView = page.locator('#mode-btn-threeview');

    await expect(mode3d).toBeVisible();
    await expect(modeCutList).toBeVisible();
    await expect(modeThreeView).toBeVisible();

    // 初期状態は 3Dview がアクティブ
    await expect(mode3d).toHaveClass(/active/);

    // 4. 右側: ファイルを開くボタン
    const btnOpenFile = page.locator('#btn-open-file');
    await expect(btnOpenFile).toBeVisible();

    // 5. 廃止確認: btn-sample が存在しないこと
    const btnSample = page.locator('#btn-sample');
    await expect(btnSample).toHaveCount(0);
  });

  test('セグメントコントロールで表示モードを切り替えられること', async ({ page }) => {
    const mode3d = page.locator('#mode-btn-3d');
    const modeCutList = page.locator('#mode-btn-cutlist');
    const modeThreeView = page.locator('#mode-btn-threeview');

    // 材料取り図モードに切替
    await modeCutList.click();
    await expect(modeCutList).toHaveClass(/active/);
    await expect(mode3d).not.toHaveClass(/active/);

    // 三面図モードに切替
    await modeThreeView.click();
    await expect(modeThreeView).toHaveClass(/active/);
    await expect(modeCutList).not.toHaveClass(/active/);

    // 3Dviewモードに戻す
    await mode3d.click();
    await expect(mode3d).toHaveClass(/active/);
  });

  test('画面左側にレイヤー一覧が表示され、開閉と表示ON/OFFができること', async ({ page }) => {
    const layerPanel = page.locator('#layer-panel');
    await expect(layerPanel).toBeVisible();

    // 画面左側に配置されていることの検証 (left が設定されている)
    const box = await layerPanel.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      // 画面左側 (x座標がウィンドウ幅の半分より左)
      expect(box.x).toBeLessThan(300);
    }

    // レイヤーアイテムが表示されていること
    const layerHeader = page.locator('.layer-item-header').first();
    await expect(layerHeader).toBeVisible();

    // 初期状態では閉じているため、オブジェクト一覧は非表示
    const objectList = page.locator('.layer-object-list').first();
    await expect(objectList).toHaveCount(0);

    // ヘッダーをクリックして展開するとオブジェクト一覧が表示されること
    await layerHeader.click();
    await expect(objectList).toBeVisible();

    // 可視性トグルボタンが存在すること
    const visibilityBtn = page.locator('.layer-visibility-btn').first();
    await expect(visibilityBtn).toBeVisible();
  });

  test('オブジェクト選択時に画面右側に詳細ビュー(インスペクタ)が表示され、プロパティが網羅されていること', async ({ page }) => {
    // レイヤーを展開
    const layerHeader = page.locator('.layer-item-header').first();
    await layerHeader.click();

    // レイヤー内の部材アイテムをクリックして選択
    const firstObjectItem = page.locator('.layer-object-item').first();
    await firstObjectItem.click();

    // 詳細ビューが表示されること
    const inspectorCard = page.locator('#inspector-card');
    await expect(inspectorCard).toHaveClass(/active/);

    // 画面右側に配置されていることの検証
    const box = await inspectorCard.boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    if (box && viewport && viewport.width >= 1024) {
      // PC環境では画面右側 (x座標 + 幅 がウィンドウ右端近傍)
      expect(box.x + box.width).toBeGreaterThan(viewport.width - 100);
    }

    // 必須プロパティ（規格、重量、価格、名称、位置、サイズ、傾き、形状加工）が表示されていること
    const inspectorDetail = page.locator('#inspector-detail');
    await expect(inspectorDetail).toContainText('名称');
    await expect(inspectorDetail).toContainText('規格');
    await expect(inspectorDetail).toContainText('重量');
    await expect(inspectorDetail).toContainText('価格');
    await expect(inspectorDetail).toContainText('位置');
    await expect(inspectorDetail).toContainText('サイズ');
    await expect(inspectorDetail).toContainText('傾き');
    await expect(inspectorDetail).toContainText('形状加工');
  });
});
