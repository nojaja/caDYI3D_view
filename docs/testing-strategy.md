# 3D描画におけるTDD（テスト駆動開発）および自動描画判定ガイド

- **文書バージョン**: 1.0.0
- **作成日**: 2026-11-18
- **対象システム**: caDYI3D Web Viewer

---

## 1. 目的と課題

### 1.1 背景
本プロジェクトでは開発手法として **TDD (テスト駆動開発)** を採用します。
しかし、一般的なWebシステム（入出力がテキストやDOM）と異なり、3Dグラフィックス（Three.js / WebGL）では **「画面に意図した形状・色・姿勢で立体が正しくレンダリングされたか」** をテストコードで自動検証することが技術的課題となります。

### 1.2 3Dテスト特有の課題
1. **GPU依存性**: WebGLは物理GPUまたはGPUエミュレータを必要とし、CI環境（GitHub Actions等のヘッドレスLinux）で描画失敗しやすい。
2. **ピクセル単位の環境差**: OS、GPUドライバ、アンチエイリアシングの差異により、全く同じコードでも数ピクセルの色味や境界値が異なる。
3. **テスト実行速度**: 毎回スクリーンショットを撮影・比較しているとフィードバックループ（TDDのテンポ）が極端に遅くなる。

---

## 2. 3D描画のTDDテストピラミッド

TDDを迅速に回しつつ、描画の完全性を自動判定するために、**4層のテスト戦略**を採用します。

```
        ▲
       / \         Layer 4: E2E インタラクションテスト (D&D, URL, 操作)
      /   \        -----------------------------------------------------
     /     \       Layer 3: ビジュアルリグレッションテスト (VRT / 画像差分)
    /       \      -----------------------------------------------------
   /         \     Layer 2: WebGLステート・非空描画検証 (Headless Browser)
  /           \    -----------------------------------------------------
 /             \   Layer 1: シーンツリー・幾何データテスト (Node / Headless JS)
-----------------
```

| レイヤー | 検証内容 | 判定方法 | 実行速度 | TDDサイクルでの役割 |
| :--- | :--- | :--- | :--- | :--- |
| **Layer 1: 幾何・シーンデータ** | メッシュ生成数、頂点座標、バウンディングボックス、マテリアル色、階層構造 | Three.js の `Scene`, `Mesh`, `BufferGeometry` オブジェクトのプロパティアサーション | **超高速** (~数ms) | **日常のTDDメインループ** (Red-Green-Refactor) |
| **Layer 2: WebGL描画整合性** | シェーダーエラーなし、WebGLエラー（`getError()`）なし、ドローコール発生、非空描画 | Playwright / Headless Chromium でのコンテキスト・Canvasピクセル検証 | **中速** (~1秒) | コンポーネント完成時の結合検証 |
| **Layer 3: 画像差分 (VRT)** | 期待される3Dレンダリング結果と完全一致（閾値内）しているか | Playwright `toHaveScreenshot()` + `pixelmatch` によるゴールデン画像比較 | **低速** (~数秒) | 描画品質の最終確認・デグレ防止 |
| **Layer 4: E2E操作** | D&Dでの読み込み、URLパラメータからの取得、OrbitControlsによる視点追従 | Playwright によるブラウザ自動操作 | **低速** (~数秒) | リリース前・CI自動回帰テスト |

---

## 3. 自動描画判定の具体的手法

3D描画が「成功した」と自動判定するための4つの判定基準を実装します。

### 手法A: 幾何・シーン構造アサーション (Layer 1)
Three.js は Node.js 環境（DOMエミュレーションあり）でもメッシュのメモリ構築やバウンディングボックス計算が可能です。
- **判定項目**:
  1. `scene.children` に期待するパーツ数と同数の `Mesh` が追加されているか。
  2. 各メッシュの `geometry.boundingBox`（寸法）が `.cadiy4` の `size` と一致しているか。
  3. 各メッシュの `position` / `quaternion` が指定通りセットされているか。
  4. 斜めカット適用後の頂点座標（端部Z座標など）が三角関数通りの位置に変形されているか。

### 手法B: 非空フレーム・カラーサンプリング判定 (Layer 2)
「画面が真っ白・真っ黒（未描画）で終わっていないか」「想定した色のピクセルが存在するか」を自動判定します。
- **判定項目**:
  1. **非空ピクセル比率 (Non-Empty Pixels)**:
     Canvasから `gl.readPixels()` または `canvas.toDataURL()` でピクセルバッファを取得し、背景色以外のピクセルが指定比率（例: 全体の5%以上）存在するかを判定。
  2. **プローブサンプリング (Color Probing)**:
     モデル中心付近のピクセルカラーを読み取り、背景色ではなく木材マテリアル色（RGBA）に近い値が得られているかを検証。

### 手法C: ビジュアルリグレッションテスト (VRT) (Layer 3)
Playwright のスクリーンショット比較機能を用い、事前に承認された基準画像（Baseline / Golden Image）と比較します。
- **判定項目**:
  - `pixelmatch` アルゴリズムによる差分ピクセル比率判定。
  - OSやアンチエイリアスの微差を許容するため、許容閾値（`threshold: 0.2`, `maxDiffPixelRatio: 0.01` (1%未満)）を設定。

---

## 4. 採用テストツールスタック

| 用途 | ツール | 選定理由 |
| :--- | :--- | :--- |
| **ユニット/結合テスト** | **Vitest** | Viteと完全同一設定で高速動作、ESM/TypeScriptネイティブ、モック機能が標準。 |
| **ブラウザ/E2E/VRT** | **Playwright** | Chromium / WebKit (Safari互換) をヘッドレスで安定起動可能。WebGLフラグ・CI対応が強力。標準で画像比較（`toHaveScreenshot`）を内蔵。 |
| **画像差分比較** | **Playwright Built-in (`pixelmatch`)** | 追加ライブラリ不要で、差分画像（Diff Image）のビジュアルレポートを自動出力可能。 |

---

## 5. TDD 実践ワークフロー（作業手順）

日常の開発において、TDDサイクルをどのように進めるかの手順です。

### ステップ 1: 【RED】幾何データ生成のテストを作成 (Vitest)
まず、画面描画を伴わないシーンツリー・メッシュ構造のテストを書きます。

```typescript
// tests/unit/LumberMeshFactory.test.ts
import { describe, it, expect } from 'vitest';
import { LumberMeshFactory } from '../../src/builder/LumberMeshFactory';
import * as THREE from 'three';

describe('LumberMeshFactory', () => {
  it('指定されたサイズで直方体メッシュを生成すること', () => {
    const factory = new LumberMeshFactory();
    const lumberData = {
      id: 'test-1',
      type: 'lumber',
      size: { x: 0.038, y: 0.038, z: 0.5 }, // 38x38x500mm
      position: { x: 0, y: 0, z: 0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      color: { r: 0.8, g: 0.6, b: 0.4 },
      cutAngles: [0, 0, 0, 0, 0, 0, 0, 0]
    };

    const mesh = factory.create(lumberData);

    expect(mesh).toBeInstanceOf(THREE.Mesh);
    mesh.geometry.computeBoundingBox();
    const bb = mesh.geometry.boundingBox!;
    
    // バウンディングボックスのサイズが指定値と一致するか
    expect(bb.max.x - bb.min.x).toBeCloseTo(0.038);
    expect(bb.max.y - bb.min.y).toBeCloseTo(0.038);
    expect(bb.max.z - bb.min.z).toBeCloseTo(0.5);
  });
});
```

### ステップ 2: 【GREEN】最小限の実装
テストをパスさせる最小限の `LumberMeshFactory.ts` を実装し、Vitest をパスさせます。

### ステップ 3: 【REFACTOR】リファクタリング
コードのクリーンアップ、不要コードの削除、定数化を行います。

### ステップ 4: 【統合検証】自動描画判定テストの追加 (Playwright)
新しいモデル形状やフィーチャーが組み合わさった段階で、ブラウザでの実描画テストを実行します。

```typescript
// tests/e2e/render-verification.spec.ts
import { test, expect } from '@playwright/test';

test.describe('3D Rendering Automatic Verification', () => {
  test('001.cadiy4 が正常にWebGLレンダリングされ、非空フレームであること', async ({ page }) => {
    // URLパラメータでテストモデルをロード
    await page.goto('/?model=testdata/001.cadiy4');

    // 描画キャンバスの存在確認
    const canvas = page.locator('canvas.webgl-canvas');
    await expect(canvas).toBeVisible();

    // 描画完了イベント (window.__VIEWER_RENDERED__) を待機
    await page.waitForFunction(() => (window as any).__VIEWER_READY__ === true);

    // 1. 自動判定: Canvasが単色や空白ではなく、パーツが描画されているか（カラープローブ）
    const isRendered = await page.evaluate(() => {
      const canvas = document.querySelector('canvas.webgl-canvas') as HTMLCanvasElement;
      const ctx = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!ctx) return false;
      
      // 中央付近ピクセルのサンプリング（背景色ではないピクセルが存在するか判定）
      const pixel = new Uint8Array(4);
      ctx.readPixels(canvas.width / 2, canvas.height / 2, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, pixel);
      // 背景色(例: #f0f0f0 -> 240, 240, 240) と異なれば描画成功
      return pixel[3] > 0 && !(pixel[0] === 240 && pixel[1] === 240 && pixel[2] === 240);
    });
    expect(isRendered).toBe(true);

    // 2. 自動判定: ゴールデン画像とのビジュアル比較 (VRT)
    await expect(page).toHaveScreenshot('001-cadiy4-golden.png', {
      maxDiffPixelRatio: 0.02, // 2%以内の微差を許容
      threshold: 0.2,
    });
  });
});
```

---

## 6. CI (GitHub Actions) での自動実行手順

GitHub ActionsのLinuxコンテナ環境には物理ディスプレイ・GPUが存在しないため、ソフトウェアレンダラ（Mesa / SwiftShader）を用いてヘッドレスWebGLテストを実行します。

### 6.1 GitHub Actions 設定例 (`.github/workflows/test.yml`)

```yaml
name: Test & Visual Regression

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run Unit Tests (Layer 1)
        run: npm run test:unit

      - name: Install Playwright Browsers with dependencies
        run: npx playwright install --with-deps chromium

      - name: Build static site
        run: npm run build

      - name: Run E2E & Visual Regression Tests (Layer 2 & 3)
        run: npx playwright test
        env:
          # ソフトウェアWebGLエミュレーションの有効化
          LIBGL_ALWAYS_SOFTWARE: "1"

      - name: Upload Test Report & Diff Images
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 7. まとめと開発時のチェックリスト

- [ ] **高頻度ループ（数秒ごと）**: Vitest による Layer 1（メッシュ構造・計算ロジック）テストを実行しながらコードを実装する。
- [ ] **中間チェック（機能追加ごと）**: 非空ピクセル・Webエラー検知テスト（Layer 2）でブラウザ上の描画失敗がないか確認する。
- [ ] **最終確認（コミット/PR時）**: Playwright の `toHaveScreenshot()`（Layer 3）を実行し、差分がないことを自動判定する。基準画像更新時は `-u` (`npx playwright test -u`) で承認更新する。
