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
    const screenPos = await page.evaluate(() => {
      const viewer = (window as any).__VIEWER__;
      return viewer.getObjectScreenPosition('天板 (上段)');
    });
    expect(screenPos).not.toBeNull();

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

    // 長押し時に全選択や選択範囲が発生していないこと（iPhone長押し全選択対策）
    const selectionText = await page.evaluate(() => window.getSelection()?.toString() || '');
    expect(selectionText).toBe('');

    // canvas に touch-action: none, user-select: none が適用されていること
    const touchAction = await canvas.evaluate((el) => window.getComputedStyle(el).touchAction);
    expect(touchAction).toBe('none');
  });

  test('4. inspector-cardの表示要件（名称行削除、スマホで高さ半分・価格/位置/傾き非表示、モード切替時の一時非表示）の検証', async ({ page }, testInfo) => {
    await page.goto('/');
    await page.waitForFunction(() => (window as any).__VIEWER_READY__ === true);

    const canvas = page.locator('#viewer-container canvas');
    const inspectorCard = page.locator('#inspector-card');
    const inspectorTitle = page.locator('#inspector-title');
    const inspectorDetail = page.locator('#inspector-detail');

    const isMobile = testInfo.project.name.includes('mobile');
    if (isMobile) {
      // スマホ表示時: オブジェクトを選択してインスペクターを表示
      await page.evaluate(() => {
        (window as any).__VIEWER__.selectObjectById('legacy-9');
      });
    } else {
      // PC表示時: 3Dビュー上の「天板 (上段)」をクリックしてインスペクターを表示
      const screenPos = await page.evaluate(() => {
        const viewer = (window as any).__VIEWER__;
        return viewer.getObjectScreenPosition('天板 (上段)');
      });
      expect(screenPos).not.toBeNull();

      await canvas.click({ position: { x: Math.round(screenPos.x), y: Math.round(screenPos.y) } });
    }
    await expect(inspectorCard).toHaveClass(/active/);
    await expect(inspectorTitle).toHaveText('天板 (上段)');

    // 要件: PC表示・スマホ表示ともに「名称」行が削除されていること
    await expect(inspectorDetail).not.toContainText('名称:');

    if (isMobile) {
      // 要件: スマホ表示時は inspector-card の高さが半分 (max-height: 110px)
      const maxHeight = await inspectorCard.evaluate((el) => window.getComputedStyle(el).maxHeight);
      expect(maxHeight).toBe('110px');

      // 要件: スマホ表示時は「価格」「位置」「傾き」行が表示されないこと (display: none)
      const priceDisplay = await page.locator('.inspector-row-price').evaluate((el) => window.getComputedStyle(el).display);
      const posDisplay = await page.locator('.inspector-row-position').evaluate((el) => window.getComputedStyle(el).display);
      const rotDisplay = await page.locator('.inspector-row-rotation').evaluate((el) => window.getComputedStyle(el).display);
      expect(priceDisplay).toBe('none');
      expect(posDisplay).toBe('none');
      expect(rotDisplay).toBe('none');
    } else {
      // PC表示時は「価格」「位置」「傾き」行が表示されていること
      const priceDisplay = await page.locator('.inspector-row-price').evaluate((el) => window.getComputedStyle(el).display);
      const posDisplay = await page.locator('.inspector-row-position').evaluate((el) => window.getComputedStyle(el).display);
      const rotDisplay = await page.locator('.inspector-row-rotation').evaluate((el) => window.getComputedStyle(el).display);
      expect(priceDisplay).not.toBe('none');
      expect(posDisplay).not.toBe('none');
      expect(rotDisplay).not.toBe('none');
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

  test('5. 3Dviewで何もない箇所をクリック（PC）、もしくは長押しタップ（スマホ）で選択状態が解除されること', async ({ page }, testInfo) => {
    await page.goto('/');
    await page.waitForFunction(() => (window as any).__VIEWER_READY__ === true);

    const canvas = page.locator('#viewer-container canvas');
    const inspectorCard = page.locator('#inspector-card');

    // まずオブジェクトを選択
    await page.evaluate(() => {
      (window as any).__VIEWER__.selectObjectById('legacy-9');
    });
    await expect(inspectorCard).toHaveClass(/active/);

    const isMobile = testInfo.project.name.includes('mobile');
    if (isMobile) {
      // スマホ表示時: 何もない箇所（右上空き領域）を長押しタップ（550ms）して解除
      const emptyPos = { x: 300, y: 150 };
      await canvas.evaluate((el, pt) => {
        const touch = new Touch({
          identifier: 2,
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
      }, emptyPos);

      await page.waitForTimeout(550);
      await canvas.evaluate((el, pt) => {
        const touch = new Touch({
          identifier: 2,
          target: el,
          clientX: pt.x,
          clientY: pt.y,
          pageX: pt.x,
          pageY: pt.y,
        });
        el.dispatchEvent(new TouchEvent('touchend', {
          touches: [],
          targetTouches: [],
          changedTouches: [touch],
          bubbles: true,
          cancelable: true,
        }));
      }, emptyPos);
    } else {
      // PC表示時: 何もない空間（上部中央）をクリックして解除
      await canvas.click({ position: { x: 450, y: 150 } });
    }

    // 選択状態が解除され、inspector-card が非表示になること
    await expect(inspectorCard).not.toHaveClass(/active/);

    // 3Dハイライトも解除されていること
    const isHighlighted = await page.evaluate(() => {
      const viewer = (window as any).__VIEWER__;
      const mesh = (viewer as any).findMeshByObjectId('legacy-9');
      return mesh.material.opacity === 0.5;
    });
    expect(isHighlighted).toBe(false);
  });

  test('6. 材料取り図で何もない箇所をクリック（PC）、もしくは長押しタップ（スマホ）で選択状態が解除されること', async ({ page }, testInfo) => {
    await page.goto('/');
    await page.waitForFunction(() => (window as any).__VIEWER_READY__ === true);

    // 材料取り図モードに切り替え
    await page.click('#mode-btn-cutlist');
    await expect(page.locator('#cutlist-view-container')).toBeVisible();

    // 最初のパーツをクリックして選択
    const part = page.locator('.cutplan-svg-part').first();
    await part.click({ force: true });
    await expect(part).toHaveClass(/selected/);

    const isMobile = testInfo.project.name.includes('mobile');
    const cutlistContainer = page.locator('#cutlist-sheets-container');

    if (isMobile) {
      // スマホ表示時: パーツ以外の余白部分を長押しタップ（550ms）
      const box = await cutlistContainer.boundingBox();
      const emptyPt = box ? { x: Math.round(box.x + box.width - 20), y: Math.round(box.y + box.height - 50) } : { x: 300, y: 500 };

      await cutlistContainer.evaluate((el, pt) => {
        const touch = new Touch({
          identifier: 3,
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
      }, emptyPt);

      await page.waitForTimeout(550);
      await cutlistContainer.evaluate((el, pt) => {
        const touch = new Touch({
          identifier: 3,
          target: el,
          clientX: pt.x,
          clientY: pt.y,
          pageX: pt.x,
          pageY: pt.y,
        });
        el.dispatchEvent(new TouchEvent('touchend', {
          touches: [],
          targetTouches: [],
          changedTouches: [touch],
          bubbles: true,
          cancelable: true,
        }));
      }, emptyPt);
    } else {
      // PC表示時: 何もないコンテナ余白部分（ヘッダー余白等）をクリック
      await page.click('.cutlist-title');
    }

    // 材料取り図上のパーツの .selected が解除されていること
    await expect(part).not.toHaveClass(/selected/);
  });
});
