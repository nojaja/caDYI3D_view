# caDIY3D Web 3Dモデルビューア 技術スタック検討・選定書

- **文書バージョン**: 1.0.0
- **作成日**: 2026-11-18
- **対象システム**: caDIY3D Web Viewer (仮称)

---

## 1. はじめに

本書は、「caDIY3D Web 3Dモデルビューア」の要件（Web完結動作、ファイル選択/D&D/URL指定、スマホ・iPhone最適化、TypeScript + Vite、GitHub Pages配信）を満たすための最適な技術スタックを比較・評価し、選定結果をまとめた技術選定書です。

---

## 2. 3Dグラフィックスエンジンの選定・比較

### 2.1 候補ライブラリの比較

Web上で3Dレンダリングを行うための主要ライブラリ・エンジンを比較・検討しました。

| 項目 | Three.js (推奨・選定) | Babylon.js | PlayCanvas | @google/model-viewer |
| :--- | :--- | :--- | :--- | :--- |
| **特徴** | 最も広く利用されているWeb 3Dライブラリ。軽量・シンプル・エコシステムが巨大。 | 多機能・フル機能の3Dゲーム/アプリエンジン。GUIや物理演算が同梱。 | WebGL/WebGPU対応のゲームエンジン。専用エディタ統合が中心。 | Web Components形式のglTF/GLB専用3Dモデルビューア。 |
| **独自モデル (`.cadiy4`) との親和性** | **◎ 非常に高い**<br>Box/Cylinder等のプロシージャル生成、動的ジオメトリ構築、カスタムマテリアルが素直に書ける。 | **◯ 高い**<br>プロシージャルメッシュ生成可能だが、APIがゲーム寄りでやや複雑。 | **△ 普通**<br>独自エディタなしでのコード主導ビルドにはややオーバースペック。 | **× 不適合**<br>glTF/GLB/USDZの固定ファイル表示に特化しており、独自JSONからの動的メッシュ生成や寸法線描画は極めて困難。 |
| **バンドルサイズ (gzip後)** | **約 150KB 〜 200KB**<br>(Tree-shaking可能) | 約 700KB 〜 1MB+<br>(多機能な分重量級) | 約 300KB 〜 500KB | 約 250KB |
| **モバイル / iPhone性能** | **◎ 優秀**<br>軽量でWebGL2/WebGPU対応。OrbitControlsのタッチ・ピンチジェスチャーが洗練。 | **◯ 良好**<br>高機能だが初期ロードとモバイル低スペック端末でやや重い。 | **◎ 優秀** | **◎ 優秀** |
| **寸法線・テキスト注釈** | **◎ 豊富**<br>`LineSegments`, `CSS2DRenderer`, `troika-three-text` など選択肢が多数。 | **◯ 良好**<br>Babylon GUI の 3D コントロールで対応可能。 | **△ 限定的** | **× 非対応** (Hotspotのみ) |
| **TypeScript 親和性** | **◎ 非常に高い** (`@types/three`) | **◎ 非常に高い** (TS製) | **◯ 良好** | **◯ 良好** |

### 2.2 選定結果: Three.js

**選定理由**:
1. **独自JSONフォーマットからのプロシージャル生成**:
   `.cadiy4` は glTF などの標準メッシュではなく、木材の寸法（厚み・幅・長さ）や回転四元数、斜めカット（角度情報）を保持する独自構造です。Three.js は `BoxGeometry` や `CylinderGeometry`、カスタム頂点操作（斜めカット等のCSG演算や頂点変形）を最も軽量かつ直感的に記述できます。
2. **圧倒的な軽量性とロード速度**:
   GitHub Pages経由かつスマートフォン（4G/5G回線）でのアクセスを想定する場合、初期バンドルサイズは極めて重要です。Three.js は ES Modules のツリーシェイキングが効き、必要なコンポーネント（Renderer, Scene, PerspectiveCamera, OrbitControls, MeshStandardMaterial）のみを取り込むことで初期ロードを最小化できます。
3. **寸法線・注釈のハイブリッド表示**:
   Three.js には `CSS2DRenderer`（3D空間の座標にHTML/CSS要素を正確に追従させる仕組み）や `LineSegments` が標準で用意されており、寸法線の数値やパーツラベルをRetina/高解像度スマホ画面でも文字ボケせず美しく描画できます。

---

## 3. 主要技術スタック一覧

| 区分 | 選定技術 | バージョン | 選定理由・役割 |
| :--- | :--- | :--- | :--- |
| **言語** | **TypeScript** | `^5.6` | 厳格な型定義 (`strict: true`) による `.cadiy4` スキーマの整合性保証、安全なリファクタリング。 |
| **ビルドツール** | **Vite** | `^6.0` | 高速なローカル開発環境（HMR）、ESBuild / Rollup による最適化された単一または少数の静的バンドル出力。 |
| **3D描画ライブラリ** | **Three.js** | `^0.170` | 3Dシーン、カメラ、ライティング、プロシージャルメッシュ、マテリアル、テクスチャ描画。 |
| **カメラ制御** | **three/addons/controls/OrbitControls** | (Three.js同梱) | PCのマウス操作およびモバイルの1本指回転・2本指パン・ピンチズームに標準対応。 |
| **注釈・テキスト描画** | **three/addons/renderers/CSS2DRenderer** | (Three.js同梱) | 寸法線テキストやパーツラベルをHTML/CSSで高解像度レンダリング。 |
| **UIフレームワーク** | **Vanilla TypeScript** (CSS Modules / Plain CSS) | - | 依存関係を最小限に抑え、軽量・最速のロードを実現。状態管理もシンプルなObservableパターンで十分対応可能。 |
| **アイコン** | **Lucide Icons** (SVG inline) | `^0.460` | モバイルでも明瞭に視認できる軽量なオープンソースアイコン。 |
| **バリデーション** | **Zod** (オプション検討) | `^3.23` | 読み込まれた外部JSONの安全性検証と型付け。 |
| **ホスティング & CI/CD** | **GitHub Pages + GitHub Actions** | - | リポジトリへのプッシュを契機に自動ビルド＆静的ホスティング配信（サーバー維持費ゼロ）。 |

---

## 4. アーキテクチャ設計・モジュール構成

全体は密結合を避け、3Dレンダリングエンジンと入力/UIを分離したモジュール構造とします。

```
src/
├── main.ts                    # エントリーポイント・アプリケーション全体の初期化
├── config/                    # 定数・初期設定・カラーパレット
│   └── constants.ts
├── types/                     # 型定義 (.cadiy4 スキーマに完全準拠)
│   ├── cadiy4.d.ts            # cadiy4.schema.json から生成したTypeScript型
│   └── viewer.d.ts            # ビューア内部用の状態・イベント型
├── core/                      # 3Dシーンの中核ロジック
│   ├── Viewer.ts              # Three.js シーン、レンダラー、リサイズ、アニメーションループ
│   ├── CameraManager.ts       # カメラ配置、OrbitControls、視点プリセット制御
│   ├── LightManager.ts        # 環境光・太陽光・シャドウ設定
│   └── Environment.ts         # 床面グリッド、作業台、背景スカイボックス
├── loader/                    # データ読み込み・パース層
│   ├── Cadiy4Parser.ts        # .cadiy4 JSONのパース・整合性検証
│   ├── DataLoader.ts          # File, Drag&Drop, URL Fetch の共通抽象化インターフェース
│   └── UrlParamResolver.ts    # URLクエリパラメータ解析 (?model=, ?url=)
├── builder/                   # 3Dオブジェクト生成層
│   ├── ModelBuilder.ts        # 全オブジェクトの構築オーケストレーション
│   ├── LumberMeshFactory.ts   # 角材・板材（BoxGeometry + 斜めカット変形）の生成
│   ├── CylinderMeshFactory.ts # 丸棒・円形板の生成
│   ├── MaterialFactory.ts     # 木目テクスチャ・カラー・PBRマテリアル管理
│   └── DimensionBuilder.ts    # 寸法線・矢印・テキストラベルの生成
├── ui/                        # ユーザーインターフェース層
│   ├── DropZone.ts            # D&Dオーバーレイ管理
│   ├── LoadingIndicator.ts    # 読み込みスピナー・プログレスバー
│   ├── ToolBar.ts             # 視点切替、全体表示、ファイルオープンボタン
│   ├── InspectorModal.ts      # パーツタップ時の情報表示パネル
│   └── ErrorToast.ts          # エラーメッセージ通知
└── styles/
    └── main.css               # レスポンシブスタイル・モバイル最適化CSS
```

---

## 5. 木工特化機能の技術的アプローチ

### 5.1 木材の斜めカット (`cutAngles`) の実装方針
`.cadiy4` の角材・板材は、端部に角度をつけて切断する `cutAngles`（8要素の角度配列）を持ちます。
- **アプローチ A (頂点変形 - 採用)**:
  `BoxGeometry` の端部頂点（X, Y, Z）を切断角度に応じて三角関数で座標シフトする。
  - **メリット**: 非常に軽量、描画負荷が極小、モバイルでも高速動作。
- **アプローチ B (CSG - 将来拡張)**:
  複雑な斜め二重カットや欠き取りが必要な場合、`three-bvh-csg` 等のCSG（Constructive Solid Geometry）ライブラリを組み合わせる。

### 5.2 木目テクスチャの表現
- **プロシージャル・キャンバステクスチャ**:
  外部画像ファイルを多数読み込む代わりに、HTML5 Canvas 2D を用いて木目模様（Perlin Noise や年輪・導管パターン）をランタイムで軽量生成し、Three.js の `CanvasTexture` として適用する。
  - **効果**: ネットワーク通信量ゼロ、解像度自由、初期表示の高速化。
- **木材色・光沢**:
  `MeshStandardMaterial` を採用し、`roughness: 0.6〜0.8`, `metalness: 0.0` とすることで、木材特有のしっとりとした質感を表現。

### 5.3 寸法線と数値テキストの描画
- **線分**: Three.js の `LineSegments` を使用し、端点および引き出し線を構築。
- **矢印**: 三角形コーンメッシュ（`ConeGeometry`）または線分による矢印ヘッド。
- **数値テキスト**: `CSS2DObject`（Three.js CSS2DRenderer）を採用。
  - 3D空間の寸法線中央位置にバインドされたHTML `<span>` 要素としてレンダリング。
  - スマートフォンのRetinaディスプレイでも文字が一切にじまず、鮮明に「1820 mm」などの寸法値を視認可能。

---

## 6. スマートフォン（iPhone/Android）最適化戦略

1. **タッチジェスチャーの最適化**:
   - `OrbitControls` のタッチ設定を最適化：
     - `touches: { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }`
   - iOS Safari での意図しない画面スクロール・バウンスを防ぐため、ビューポート canvas に対して `touch-action: none` を適用。
2. **Device Pixel Ratio (DPR) の制御**:
   - iPhone 等の 3x Retina 画面でそのままレンダリングすると GPU 負荷が過大になりバッテリー消費・発熱の原因となるため、`renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))` として上限を 2 に制限。
3. **UIのSafeArea対応**:
   - iPhone のノッチ（Dynamic Island）やホームバーとUIが重ならないよう、CSS の `env(safe-area-inset-top)` / `env(safe-area-inset-bottom)` を適用。

---

## 7. GitHub Pages 配布・ビルド構成

Vite の設定（`vite.config.ts`）において、GitHub Pages のリポジトリパス配下でもそのまま動作するように相対ベースパスを設定します。

```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // 相対パスでのアセット解決（GitHub Pages必須要件）
  build: {
    target: 'esnext',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
  },
  server: {
    open: true,
    port: 3000,
  }
});
```

GitHub Actions を導入し、`main` ブランチ更新時に自動ビルド・デプロイを行うワークフローを用意することで、リポジトリの更新だけで最新版のビューアが即座に公開されます。
