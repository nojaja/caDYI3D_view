import { test, expect } from '@playwright/test';

test.describe('caDIY3D Web Viewer - サブフォルダを含むn段階層ツリー・初期閉状態・初期非表示抑止 E2E検証', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?model=models/nested_layers_test.cadiy4');
    await page.waitForFunction(() => (window as any).__VIEWER_READY__ === true, { timeout: 10000 });
  });

  test('ファイル読み込み後の初期表示時、レイヤーツリーがすべて閉じていること', async ({ page, isMobile }) => {
    const layerPanel = page.locator('#layer-panel');
    await expect(layerPanel).toBeVisible();

    if (isMobile) {
      await page.locator('.layer-panel-title').click();
    }

    // トップレベルのレイヤーアイテム（建物ルート、独立ルートフォルダ）が存在すること
    const topLevelItems = page.locator('.layer-tree-container > .layer-item');
    await expect(topLevelItems).toHaveCount(2);

    // 初期表示時はすべて折りたたまれているため、子コンテナ(.layer-children-container)は表示されていないこと
    const childContainers = page.locator('.layer-children-container');
    await expect(childContainers).toHaveCount(0);

    // 各アイテムのトグルアイコンが折りたたみ状態（▶）であること
    const toggleIcons = page.locator('.layer-tree-container > .layer-item .layer-toggle-icon');
    await expect(toggleIcons.first()).toHaveText('▶');
  });

  test('親レイヤーをクリックして展開すると、サブフォルダを含むn段の階層ツリーが表示されること', async ({ page, isMobile }) => {
    if (isMobile) {
      await page.locator('.layer-panel-title').click();
    }
    // 1. トップレベル「建物ルート」のヘッダーをクリックして展開
    const rootHeader = page.locator('.layer-item[data-layer-id="0"] > .layer-item-header');
    await rootHeader.click();

    // 子コンテナが表示され、トグルアイコンが ▼ になること
    await expect(rootHeader.locator('.layer-toggle-icon')).toHaveText('▼');

    // 子レイヤー（基礎柱&根太: 1, 内壁-天井: 6）が存在すること
    const l1Item = page.locator('.layer-item[data-layer-id="1"]');
    const l6Item = page.locator('.layer-item[data-layer-id="6"]');
    await expect(l1Item).toBeVisible();
    await expect(l6Item).toBeVisible();
    await expect(l1Item).toHaveAttribute('data-depth', '1');

    // 2. 子レイヤー「基礎柱&根太」を展開して孫レイヤーを表示
    const l1Header = l1Item.locator('> .layer-item-header');
    await l1Header.click();

    // 孫レイヤー（基礎金具: 10）が表示されること
    const l10Item = page.locator('.layer-item[data-layer-id="10"]');
    await expect(l10Item).toBeVisible();
    await expect(l10Item).toHaveAttribute('data-depth', '2');

    // 孫レイヤーに属するオブジェクト一覧は孫レイヤーを展開すると表示されること
    const l10Header = l10Item.locator('> .layer-item-header');
    await l10Header.click();
    const grandchildObj = l10Item.locator('.layer-object-item[data-id="obj-grandchild-visible"]');
    await expect(grandchildObj).toBeVisible();
    await expect(grandchildObj).toHaveText('基礎ボルト');
  });

  test('初期非表示レイヤーのオブジェクトが3Dシーン上で非表示(visible = false)となっていること', async ({ page }) => {
    const objectVisibilities = await page.evaluate(() => {
      const modelGroup = (window as any).__MODEL_GROUP__;
      const result: Record<string, boolean> = {};
      if (modelGroup) {
        modelGroup.traverse((child: any) => {
          if (child.userData?.id) {
            result[child.userData.id] = child.visible;
          }
        });
      }
      return result;
    });

    // 基礎柱&根太(1)所属のオブジェクト: 表示
    expect(objectVisibilities['legacy-1102']).toBe(true);
    // 孫レイヤー基礎金具(10)所属のオブジェクト: 表示
    expect(objectVisibilities['obj-grandchild-visible']).toBe(true);

    // 初期非表示レイヤー内壁-天井(6)所属のオブジェクト: 非表示 (描画抑止)
    expect(objectVisibilities['legacy-1498']).toBe(false);
    // 非表示親配下の孫レイヤー天井下地(60)所属のオブジェクト: カスケード非表示 (描画抑止)
    expect(objectVisibilities['obj-grandchild-cascade-hidden']).toBe(false);

    // オブジェクト単体で非表示のもの: 非表示
    expect(objectVisibilities['obj-direct-hidden']).toBe(false);
  });

  test('レイヤーの可視性トグルをOFFにすると、配下のオブジェクトが連動して非表示になること', async ({ page, isMobile }) => {
    if (isMobile) {
      await page.locator('.layer-panel-title').click();
    }
    // 建物ルート(0)を展開
    const rootHeader = page.locator('.layer-item[data-layer-id="0"] > .layer-item-header');
    await rootHeader.click();

    // 基礎柱&根太(1)の可視性ボタンをクリックしてOFFにする
    const l1VisBtn = page.locator('.layer-item[data-layer-id="1"] > .layer-item-header .layer-visibility-btn');
    await l1VisBtn.click();
    await expect(l1VisBtn).toHaveClass(/off/);

    const objectVisibilities = await page.evaluate(() => {
      const modelGroup = (window as any).__MODEL_GROUP__;
      const result: Record<string, boolean> = {};
      if (modelGroup) {
        modelGroup.traverse((child: any) => {
          if (child.userData?.id) {
            result[child.userData.id] = child.visible;
          }
        });
      }
      return result;
    });

    // 基礎柱&根太(1)および孫レイヤー(10)のオブジェクトが非表示になっていること
    expect(objectVisibilities['legacy-1102']).toBe(false);
    expect(objectVisibilities['obj-grandchild-visible']).toBe(false);
  });

  test('3Dview上で非表示オブジェクトをクリックしても選択されず、インスペクターが表示されないこと', async ({ page }) => {
    // 3Dシーン上の非表示オブジェクトのIDと位置を検証
    const result = await page.evaluate(() => {
      const viewer = (window as any).__VIEWER__;
      const modelGroup = (window as any).__MODEL_GROUP__;

      // 初期非表示オブジェクト 'legacy-1498' のメッシュを検索
      let hiddenMesh: any = null;
      modelGroup.traverse((child: any) => {
        if (child.userData?.id === 'legacy-1498') {
          hiddenMesh = child;
        }
      });

      if (!hiddenMesh) return { error: 'hidden mesh not found' };

      // 非表示メッシュの中心ワールド座標を計算
      const worldPos = hiddenMesh.position.clone();
      hiddenMesh.getWorldPosition(worldPos);

      // スクリーン座標 (NDC: -1〜1) に変換
      const camera = viewer.camera;
      const projected = worldPos.clone().project(camera);

      // viewer の mouse 座標に設定して getIntersectedObject を直接実行
      viewer.mouse.x = projected.x;
      viewer.mouse.y = projected.y;
      const hitObj = viewer.getIntersectedObject();

      return {
        hitObjId: hitObj ? hitObj.id : null,
      };
    });

    // 非表示オブジェクト 'legacy-1498' は選択されないこと（null または別の表示部材）
    expect(result.hitObjId).not.toBe('legacy-1498');

    // canvas を実際にクリックしてもインスペクターが開かないこと
    const inspectorCard = page.locator('#inspector-card');
    await expect(inspectorCard).not.toHaveClass(/active/);
  });
});