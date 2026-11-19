import { test, expect } from '@playwright/test';

// すべてのレイヤーヘッダーを展開するヘルパー
async function expandAllLayers(page: any) {
  let hasMore = true;
  while (hasMore) {
    const unexpanded = page.locator('.layer-item-header:has(.layer-toggle-icon:text-is("▶"))').first();
    if (await unexpanded.count() > 0) {
      await unexpanded.click();
    } else {
      hasMore = false;
    }
  }
}

test.describe('インスペクター表示と材料取り図スクロール要件の検証', () => {
  test('1. スマホ表示時: cutlist-sheets-containerに画面半分の空白が設定され、画面半分までスクロール可能であること', async ({ page }, testInfo) => {
    const isMobile = testInfo.project.name.includes('mobile');
    if (!isMobile) {
      test.skip();
      return;
    }

    await page.goto('/');
    await page.waitForFunction(() => (window as any).__VIEWER_READY__ === true);

    // 材料取り図モードに切り替え
    await page.click('#mode-btn-cutlist');
    const cutlistView = page.locator('#cutlist-view-container');
    await expect(cutlistView).toBeVisible();

    // cutlist-sheets-container の padding-bottom が画面半分の高さ（約50vh）であることの確認
    const viewport = page.viewportSize()!;
    const halfScreenHeight = viewport.height / 2;

    const sheetsContainer = page.locator('#cutlist-sheets-container');
    const paddingBottom = await sheetsContainer.evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).paddingBottom);
    });

    // 許容誤差を考慮し、50vh 近傍 (±15px以内) であること
    expect(paddingBottom).toBeGreaterThanOrEqual(halfScreenHeight - 15);
    expect(paddingBottom).toBeLessThanOrEqual(halfScreenHeight + 15);

    // 実際にスクロールした際、スクロール可能な最大値が十分に存在すること
    const scrollInfo = await cutlistView.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
      return {
        scrollTop: el.scrollTop,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
      };
    });

    // 最大スクロール時、最下部コンテンツの下に余白が確保されていること
    expect(scrollInfo.scrollHeight - scrollInfo.clientHeight).toBeGreaterThanOrEqual(halfScreenHeight - 20);
  });

  test('2. スマホ表示時: inspector-cardは3Dタップ時には表示されず、layer-object-itemをタップした時だけ表示されること', async ({ page }, testInfo) => {
    const isMobile = testInfo.project.name.includes('mobile');
    if (!isMobile) {
      test.skip();
      return;
    }

    await page.goto('/');
    await page.waitForFunction(() => (window as any).__VIEWER_READY__ === true);

    const inspectorCard = page.locator('#inspector-card');

    // 初期状態は非表示
    await expect(inspectorCard).not.toHaveClass(/active/);

    // 3Dキャンバスの複数箇所をタップ
    const canvas = page.locator('#viewer-container canvas');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    await canvas.tap({ position: { x: box!.width * 0.5, y: box!.height * 0.3 } });
    await expect(inspectorCard).not.toHaveClass(/active/);

    await canvas.tap({ position: { x: box!.width * 0.5, y: box!.height * 0.6 } });
    await expect(inspectorCard).not.toHaveClass(/active/);

    // レイヤーパネルを展開
    await page.locator('.layer-panel-title').click();
    await expandAllLayers(page);

    // layer-object-item をタップした時だけ inspector-card が表示されること
    const firstObjectItem = page.locator('.layer-object-item').first();
    await expect(firstObjectItem).toBeVisible();
    const targetName = await firstObjectItem.textContent();
    await firstObjectItem.click();

    await expect(inspectorCard).toHaveClass(/active/);
    const inspectorTitle = page.locator('#inspector-title');
    await expect(inspectorTitle).toHaveText(targetName!.trim());
  });

  test('3. PC表示およびスマホ表示ともに layer-object-item をクリック/タップしたときにそのオブジェクトの詳細が表示されること', async ({ page, isMobile }) => {
    await page.goto('/');
    await page.waitForFunction(() => (window as any).__VIEWER_READY__ === true);

    if (isMobile) {
      await page.locator('.layer-panel-title').click();
    }

    // レイヤーを展開
    await expandAllLayers(page);

    const objectItems = page.locator('.layer-object-item');
    await expect(objectItems.first()).toBeVisible();

    const count = await objectItems.count();
    expect(count).toBeGreaterThan(0);

    // 最初の部材アイテムを選択
    const item0 = objectItems.nth(0);
    const name0 = (await item0.textContent())?.trim();
    await item0.click();

    const inspectorCard = page.locator('#inspector-card');
    await expect(inspectorCard).toHaveClass(/active/);
    await expect(page.locator('#inspector-title')).toHaveText(name0!);
    await expect(item0).toHaveClass(/selected/);

    // 別の部材アイテム（2番目）を選択
    if (count > 1) {
      const item1 = objectItems.nth(1);
      const name1 = (await item1.textContent())?.trim();
      await item1.click();

      await expect(inspectorCard).toHaveClass(/active/);
      await expect(page.locator('#inspector-title')).toHaveText(name1!);
      await expect(item1).toHaveClass(/selected/);
      await expect(item0).not.toHaveClass(/selected/);
    }
  });

  test('4. PC表示時: 3Dオブジェクトをクリックしたら、そのオブジェクト自身の詳細が inspector-card に正しく表示され、別の内容に化けないこと', async ({ page }, testInfo) => {
    const isMobile = testInfo.project.name.includes('mobile');
    if (isMobile) {
      test.skip();
      return;
    }

    await page.goto('/');
    await page.waitForFunction(() => (window as any).__VIEWER_READY__ === true);

    const canvas = page.locator('#viewer-container canvas');
    const inspectorCard = page.locator('#inspector-card');
    const inspectorTitle = page.locator('#inspector-title');

    // テスト対象部材（代表点pos付き）
    const targets = [
      { name: '天板 (上段)', pos: { x: 0.025, y: 0.466, z: 0 } },
      { name: '棚板 (下段)', pos: { x: 0.025, y: 0.243, z: 0 } },
      { name: '補強バー', pos: { x: 0.0235, y: 0.371, z: 0 } },
      { name: 'パイン集成材 18mm', pos: { x: 0.025, y: 0.009, z: 0 } },
      { name: '側板 (左)', pos: { x: -0.156, y: 0.35, z: 0 } },
      { name: '側板 (右)', pos: { x: 0.206, y: 0.35, z: 0 } },
    ];

    for (const target of targets) {
      const screenPos = await page.evaluate((t) => {
        const viewer = (window as any).__VIEWER__;
        return viewer.getObjectScreenPosition(t.name, t.pos);
      }, target);

      expect(screenPos).not.toBeNull();

      // 対象部材をクリック
      await canvas.click({ position: { x: Math.round(screenPos!.x), y: Math.round(screenPos!.y) } });

      // 正しい部材名が表示されていること（「天板 (上段)」などの別の部材に化けないこと）
      await expect(inspectorCard).toHaveClass(/active/);
      await expect(inspectorTitle).toHaveText(target.name);

      // レイヤーツリーの対応アイテムにも .selected が付与されていること
      const selectedItem = page.locator('.layer-object-item.selected');
      await expect(selectedItem).toBeVisible();
      await expect(selectedItem).toHaveText(target.name);
    }
  });
});
