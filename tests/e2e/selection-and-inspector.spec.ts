import { test, expect } from '@playwright/test';

test.describe('オブジェクト選択状態・ハイライト・長押しエフェクト・インスペクター表示の検証', () => {
  test('1. 3Dviewでオブジェクト選択時、カラーがRのみかつα(透明度)50%になり、選択解除で元に戻ること', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => (window as any).__VIEWER_READY__ === true);

    // 初期状態での特定メッシュのマテリアル状態を取得
    const targetObjId = 'legacy-9'; // 天板 (上段)
    const initialMat = await page.evaluate((id) => {
      const viewer = (window as any).__VIEWER__;
      const mesh = (viewer as any).findMeshByObjectId(id);
      return {
        r: mesh.material.color.r,
        g: mesh.material.color.g,
        b: mesh.material.color.b,
        opacity: mesh.material.opacity,
        transparent: mesh.material.transparent,
      };
    }, targetObjId);

    expect(initialMat.g).toBeGreaterThan(0); // 元は木材カラー (G > 0)
    expect(initialMat.opacity).toBe(1); // 元は不透明

    // オブジェクトを選択
    await page.evaluate((id) => {
      (window as any).__VIEWER__.selectObjectById(id);
    }, targetObjId);

    // 選択後のマテリアル状態を検証
    const selectedMat = await page.evaluate((id) => {
      const viewer = (window as any).__VIEWER__;
      const mesh = (viewer as any).findMeshByObjectId(id);
      return {
        r: mesh.material.color.r,
        g: mesh.material.color.g,
        b: mesh.material.color.b,
        opacity: mesh.material.opacity,
        transparent: mesh.material.transparent,
      };
    }, targetObjId);

    // カラー(RGB)をRのみにして、α(透明度)を50%
    expect(selectedMat.r).toBeGreaterThan(0);
    expect(selectedMat.g).toBe(0);
    expect(selectedMat.b).toBe(0);
    expect(selectedMat.opacity).toBeCloseTo(0.5, 2);
    expect(selectedMat.transparent).toBe(true);

    // 選択解除
    await page.evaluate(() => {
      (window as any).__VIEWER__.highlightObject(null);
    });

    // 元に戻ることを検証
    const restoredMat = await page.evaluate((id) => {
      const viewer = (window as any).__VIEWER__;
      const mesh = (viewer as any).findMeshByObjectId(id);
      return {
        r: mesh.material.color.r,
        g: mesh.material.color.g,
        b: mesh.material.color.b,
        opacity: mesh.material.opacity,
        transparent: mesh.material.transparent,
      };
    }, targetObjId);

    expect(restoredMat.g).toBeCloseTo(initialMat.g, 3);
    expect(restoredMat.b).toBeCloseTo(initialMat.b, 3);
    expect(restoredMat.opacity).toBe(initialMat.opacity);
    expect(restoredMat.transparent).toBe(initialMat.transparent);
  });

  test('2. PC表示およびスマホ表示ともに材料取り図でパーツをクリック/タップしたら選択状態になり、Rが強調されること', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => (window as any).__VIEWER_READY__ === true);

    // 材料取り図モードに切り替え
    await page.click('#mode-btn-cutlist');
    await expect(page.locator('#cutlist-view-container')).toBeVisible();

    // 材料取り図内の最初のパーツを取得
    const part = page.locator('.cutplan-svg-part').first();
    await expect(part).toBeVisible();

    // パーツに data-object-id が付与されていること
    const objId = await part.getAttribute('data-object-id');
    expect(objId).not.toBeNull();

    // パーツをクリック/タップ
    await part.click({ force: true });

    // 材料取り図上で .selected (R強調スタイル) が付与されること
    await expect(part).toHaveClass(/selected/);

    // 3Dviewに戻ると、そのオブジェクトが選択状態としてインスペクタが表示され、3Dハイライトも適用されていること
    await page.click('#mode-btn-3d');
    const inspectorCard = page.locator('#inspector-card');
    await expect(inspectorCard).toHaveClass(/active/);

    // 3Dviewでもハイライト(Rのみ、α50%)が適用されていること
    const isHighlighted = await page.evaluate((id) => {
      const viewer = (window as any).__VIEWER__;
      const mesh = (viewer as any).findMeshByObjectId(id);
      return mesh.material.color.g === 0 && mesh.material.opacity === 0.5;
    }, objId);
    expect(isHighlighted).toBe(true);
  });

  test('2-2. 002.cadiy4: 材料取り図で斜めカットされたpolygonパーツをクリックした際、選択状態になりRが強調されること', async ({ page }) => {
    await page.goto('/?model=models/002.cadiy4');
    await page.waitForFunction(() => (window as any).__VIEWER_READY__ === true, { timeout: 10000 });

    // 材料取り図モードに切り替え
    await page.click('#mode-btn-cutlist');
    await expect(page.locator('#cutlist-view-container')).toBeVisible();

    // 斜めカットされたポリゴンパーツ (polygon.cutplan-svg-part) を取得
    const diagPart = page.locator('polygon.cutplan-svg-part').first();
    await expect(diagPart).toBeVisible();

    // data-object-id が正しく付与されていること
    const objId = await diagPart.getAttribute('data-object-id');
    expect(objId).not.toBeNull();

    // 斜めカットパーツをクリック
    await diagPart.click({ force: true });

    // 材料取り図上で .selected (R強調スタイル) が付与されること
    await expect(diagPart).toHaveClass(/selected/);

    // 3Dviewに戻ると、そのオブジェクトが選択状態としてインスペクタが表示されること
    await page.click('#mode-btn-3d');
    const inspectorCard = page.locator('#inspector-card');
    await expect(inspectorCard).toHaveClass(/active/);
  });

  test('3. スマホ表示時: タップ開始でインジケータが表示され、長押しタップで選択状態になること', async ({ page }, testInfo) => {
    const isMobile = testInfo.project.name.includes('mobile');
    if (!isMobile) {
      test.skip();
      return;
    }

    await page.goto('/');
    await page.waitForFunction(() => (window as any).__VIEWER_READY__ === true);

    const canvas = page.locator('#viewer-container canvas');
    const indicator = page.locator('#long-press-indicator');
    const inspectorCard = page.locator('#inspector-card');

    // 「天板 (上段)」のスクリーン座標を計算
    const pos = { x: 0.025, y: 0.466, z: 0 };
    const screenPos = await page.evaluate((p) => {
      const viewer = (window as any).__VIEWER__;
      const camera = viewer.camera;
      const width = viewer.container.clientWidth;
      const height = viewer.container.clientHeight;

      const worldPos = camera.position.clone().set(p.x, p.y, p.z);
      const projected = worldPos.clone().project(camera);
      return {
        x: ((projected.x + 1) * width) / 2,
        y: ((-projected.y + 1) * height) / 2,
      };
    }, pos);

    // 短いタップ（100ms）では選択されないこと
    await canvas.tap({ position: { x: Math.round(screenPos.x), y: Math.round(screenPos.y) } });
    await expect(inspectorCard).not.toHaveClass(/active/);

    // タッチ開始（touchstart を手動ディスパッチしてエフェクト示唆を検証）
    await canvas.evaluate((el, pt) => {
      const touch = new Touch({
        identifier: 1,
        target: el,
        clientX: pt.x,
        clientY: pt.y,
        pageX: pt.x,
        pageY: pt.y,
      });
      el.dispatchEvent(new TouchEvent('touchstart', {
        touches: [touch],
        targetTouches: [touch],
        changedTouches: [touch],
        bubbles: true,
        cancelable: true,
      }));
    }, { x: Math.round(screenPos.x), y: Math.round(screenPos.y) });

    // エフェクト（インジケータ）が active になり長押し選択が示唆されること
    await expect(indicator).toHaveClass(/active/);

    // 550ms 待機して長押し完了
    await page.waitForTimeout(550);

    // 長押し成立によりオブジェクトが選択され、inspector-card が表示されること
    await expect(inspectorCard).toHaveClass(/active/);
    await expect(page.locator('#inspector-title')).toHaveText('天板 (上段)');
  });

  test('4. inspector-card が一度表示されたら閉じるボタン押下まで表示し続け、3Dview以外の時は一時非表示になり戻ると再表示されること', async ({ page }, testInfo) => {
    await page.goto('/');
    await page.waitForFunction(() => (window as any).__VIEWER_READY__ === true);

    const canvas = page.locator('#viewer-container canvas');
    const inspectorCard = page.locator('#inspector-card');
    const inspectorTitle = page.locator('#inspector-title');

    const isMobile = testInfo.project.name.includes('mobile');
    if (isMobile) {
      // スマホ表示時: レイヤー項目タップまたは selectObjectById でオブジェクトを選択してインスペクターを表示
      await page.evaluate(() => {
        (window as any).__VIEWER__.selectObjectById('legacy-9');
      });
    } else {
      // PC表示時: 3Dビュー上の「天板 (上段)」をクリックしてインスペクターを表示
      const pos = { x: 0.025, y: 0.466, z: 0 };
      const screenPos = await page.evaluate((p) => {
        const viewer = (window as any).__VIEWER__;
        const camera = viewer.camera;
        const width = viewer.container.clientWidth;
        const height = viewer.container.clientHeight;

        const worldPos = camera.position.clone().set(p.x, p.y, p.z);
        const projected = worldPos.clone().project(camera);
        return {
          x: ((projected.x + 1) * width) / 2,
          y: ((-projected.y + 1) * height) / 2,
        };
      }, pos);

      await canvas.click({ position: { x: Math.round(screenPos.x), y: Math.round(screenPos.y) } });
    }
    await expect(inspectorCard).toHaveClass(/active/);
    await expect(inspectorTitle).toHaveText('天板 (上段)');

    if (!isMobile) {
      // 別のオブジェクトのない空間（レイヤーパネルとインスペクターの間の上部中央領域）をクリックしても、カードは閉じずに表示され続けること
      await canvas.click({ position: { x: 450, y: 150 } });
      await expect(inspectorCard).toHaveClass(/active/);
    }

    // 材料取り図モードに切り替え
    await page.click('#mode-btn-cutlist');
    await expect(page.locator('#cutlist-view-container')).toBeVisible();

    // 3Dview以外（材料取り図）の時は一時的に非表示になっていること
    await expect(inspectorCard).not.toHaveClass(/active/);

    // 三面図モードに切り替え
    await page.click('#mode-btn-threeview');
    await expect(page.locator('#threeview-container')).toBeVisible();

    // 三面図でも一時的に非表示になっていること
    await expect(inspectorCard).not.toHaveClass(/active/);

    // 3Dviewモードに戻る
    await page.click('#mode-btn-3d');

    // 3Dviewに戻ると、inspector-card が再表示されること
    await expect(inspectorCard).toHaveClass(/active/);
    await expect(inspectorTitle).toHaveText('天板 (上段)');

    // id="btn-close-inspector" を押下
    await page.click('#btn-close-inspector');

    // 閉じるボタンが押されたら非表示になること
    await expect(inspectorCard).not.toHaveClass(/active/);
  });
});
