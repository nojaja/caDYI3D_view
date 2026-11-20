---
name: test-model-generator
description: >-
  Create and manage minimal test-case and reproduction models (.cadiy4) exclusively under tests/data/.
  Use when authoring or updating tests to enforce referencing tests/data/ models, match test names,
  and keep test models lean and free of unnecessary elements.
---

# caDIY3D テスト用事象再現モデル生成・配置スキル (`test-model-generator`)

本スキルは、caDIY3D 関連機能の単体テスト（`tests/unit/`）および E2E テスト（`tests/e2e/`）用のテストモデル（`.cadiy4` / `.cadiy`）を作成・管理するための標準手順および強制ルールです。

テストコード作成時に **`testdata/` や外部の一時データ、機密・大容量モデルを直接参照することを防止し、テストに必要な最小限の要素のみで構成された軽量モデルを `tests/data/` 配下に作成・配置すること** を目的とします。

---

## 1. 遵守すべき基本原則（強制ルール）

テストコードおよびテストデータを作成する際は、以下のルールを厳格に適用します：

### ① モデル配置場所の強制 (`tests/data/`)
- テストコードから参照するモデルファイルは、**必ず `tests/data/` 配下に配置** してください。
- `testdata/` や `sample/`、ワークスペース外の絶対パス、コミット不可なモデルファイルをテストコードから直接参照してはなりません。
- 既存のテストコードに `testdata/` への参照を発見した場合は、本スキルの手順に従って `tests/data/` 配下のミニマルモデル参照へ是正します。

### ② ミニマル設計（テストに必要な要素のみ組み込む）
- 作成するモデルは、**検証対象の機能・事象（バグ再現、特定パーツ種別、レイヤー可視性、木取り計算、切削加工等）に必要な最小限の要素のみ** を含めてください。
- 数百〜数千個の無関係なパーツ、巨大なサムネイル画像（Base64 WebP）、無関係な注釈やレイヤーなどの余分なデータはすべて排除し、軽量・高速に実行できる状態を維持します。

### ③ 命名規則の統一（テスト名との一致）
- テストデータのファイル名は、**対応するテストコードのテスト名（テストファイル名またはテストスイート名）と一致** させてください。
  - テストファイル: `tests/unit/PuzzleReproduce.test.ts`
    → モデル配置: `tests/data/puzzle_reproduce.cadiy4`
  - テストファイル: `tests/unit/CutListCalculator.test.ts`
    → モデル配置: `tests/data/cut_list_calculator.cadiy4`
  - キャメルケース（`PuzzleReproduce.cadiy4`）またはスネークケース（`puzzle_reproduce.cadiy4`）で一対一に対応させます。

### ④ バージョン管理（Git コミット）の安全性
- `testdata/` 配下などの巨大なモデルや実案件データは著作権や容量の観点から Git コミット不可（`.gitignore` 対象）であることが多いです。
- `tests/data/` 配下のモデルは、テストスイートの一部としてリポジトリに安全にコミットできるよう、完全に自給自足（自己完結）可能でクリーンなデータでなければなりません。

---

## 2. ワークフロー手順

### Step 1: テスト観点と検証要素の特定

テストしたい事象や仕様を整理し、モデルに必要な最小限の構成要素を洗い出します：
- **検証したい機能**: 例）「レイヤーの可視性判定」「同一 ID の重複耐性」「`boolean` パーツの描画」「木取り図（`cutList`）の歩留まり計算」「マイター/ベベル角の反映」など
- **必要最小限の構成**:
  - レイヤー数（例: 表示用 1 つ、非表示用 1 つ）
  - 部材数（例: 対象部材 1〜2 個、対比用部材 1 個）
  - 属性（例: `cutAngles`, `vertices`/`faces`, `cutList.layouts` など）

### Step 2: テスト用ミニマルモデルの作成

モデルの作成には、以下のいずれかの方法を使用します：

#### 方法 A: 同梱ジェネレータスクリプトの実行（最速・推奨）
同梱のミニマルモデル生成スクリプトを使って `tests/data/<test_name>.cadiy4` を自動生成し、必要なプロパティをカスタマイズします：

```bash
# 基本モデルの生成
node .agents/skills/test-model-generator/scripts/generate-test-model.js <test_name>

# オプション指定（ブーリアンパーツやレイヤー構成を含む場合）
node .agents/skills/test-model-generator/scripts/generate-test-model.js <test_name> --layers --boolean --cutlist
```

#### 方法 B: MCP ツール経由でのモデル構築と抽出
caDIY3D デスクトップアプリが起動している場合、MCP ツールを使ってパーツやフォルダを作成し、最小構成のシーンデータを生成します：
1. `create_folders` で検証用レイヤーを作成
2. `add_objects` / `add_parts` で必要な部材を配置
3. （必要に応じて）`boolean_objects` でブーリアン結合を実行
4. `get_scene` で現在のシーン JSON を取得し、不要なメタデータを取り除いて `tests/data/<test_name>.cadiy4` に保存

#### 方法 C: JSON スクリプトによる直接生成
Node.js スクリプト等を用いて、必要なオブジェクトのみを持つ `.cadiy4` を直接構築・出力します：

```javascript
// 例: tests/data/puzzle_reproduce.cadiy4 生成例
const model = {
  version: 1,
  thumbnail: "", // 空文字でOK
  camera: {
    position: { x: 0.5, y: 0.5, z: 0.5 },
    target: { x: 0, y: 0, z: 0 },
    fov: 20,
    isOrthographic: false
  },
  layers: [
    { id: 0, name: "ルート", visible: true, locked: false, color: { r: 0.3, g: 0.5, b: 1 }, parentId: null },
    { id: 1, name: "表示レイヤー", visible: true, locked: false, color: { r: 0.3, g: 0.5, b: 1 }, parentId: 0 },
    { id: 2, name: "非表示レイヤー", visible: false, locked: false, color: { r: 1, g: 0.3, b: 0.3 }, parentId: 0 }
  ],
  objects: [
    // テストに必要な部材のみを定義
    {
      id: "legacy-0",
      name: "SPF 1x1材",
      position: { x: 0, y: 0, z: 0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      size: { x: 0.019, y: 0.019, z: 0.057 },
      visible: true,
      locked: false,
      groupId: 0,
      layerId: 1,
      color: { r: 1, g: 1, b: 0.8 },
      textureId: 1,
      displayId: 101,
      type: "lumber"
    }
  ]
};
```

### Step 3: スキーマバリデーションの実行

作成したモデルファイルが `docs/spec/cadiy4format/cadiy4.schema.json` に準拠しているかを検証します：

```bash
node .agents/skills/cadiy4-schema-extractor/scripts/validate-schema.js tests/data/<test_name>.cadiy4
```

出力が `Validation PASSED!` となり、エラーがないことを確認します。

### Step 4: テストコードの実装と参照是正

テストコード（`tests/unit/<TestName>.test.ts` 等）で `tests/data/<test_name>.cadiy4` を読み込みます：

```typescript
import * as fs from 'fs';
import * as path from 'path';
import { ModelLoader } from '../../src/loader/ModelLoader';

describe('<TestName> Test', () => {
  const modelPath = path.resolve(__dirname, '../data/<test_name>.cadiy4');

  it('verifies expected behavior', () => {
    const raw = fs.readFileSync(modelPath, 'utf-8');
    const project = new ModelLoader().load(raw);
    expect(project).toBeDefined();
    // テスト検証ロジック...
  });
});
```

### Step 5: 既存参照の是正（リファクタリング時）

テストコード内に `testdata/` や `models/` への直接参照が存在する場合：
1. テストが実際にアサートしているプロパティ（オブジェクト数、寸法、カット角度、レイヤーなど）を分析
2. そのアサートを満たす最小限のモデルを `tests/data/` 配下に作成
3. テストの読み込みパスを `tests/data/<test_name>.cadiy4` に書き換えてテストがパスすることを確認

---

## 3. ミニマルモデル 雛形（テンプレート）

`tests/data/` に配置する `.cadiy4` の最小構成テンプレートです：

```json
{
  "version": 1,
  "thumbnail": "",
  "camera": {
    "position": { "x": 0.5, "y": 0.5, "z": 0.5 },
    "target": { "x": 0.0, "y": 0.0, "z": 0.0 }
  },
  "layers": [
    {
      "id": 0,
      "name": "デフォルトレイヤー",
      "visible": true,
      "locked": false,
      "color": { "r": 0.3, "g": 0.5, "b": 1.0 },
      "parentId": null
    }
  ],
  "objects": [],
  "cutList": {
    "cutWidthMm": 3,
    "packingMode": "adjacent",
    "layouts": []
  }
}
```

必要に応じて、検証対象の要素（`snaps`, `polygonMeshTable`, `paint`, `objects` の各パーツ等）をここに追加して利用します。

---

## 4. 同梱スクリプト

- **`scripts/generate-test-model.js`**:
  指定されたテスト名に一致する `.cadiy4` ファイルを `tests/data/` 配下に最小構成で自動生成します。フラグ（`--layers`, `--boolean`, `--cutlist`）により基本的な機能構成を含めることができます。
