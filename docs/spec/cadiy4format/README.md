# caDIY3D V4 プロジェクトファイル形式 (`.cadiy4`) 仕様書

本書は、DIY家具・木工3D設計ソフトウェア **caDIY3D V4** のネイティブプロジェクトファイル形式（`.cadiy4`）の内部仕様書です。

対応 JSON スキーマ定義: [cadiy4.schema.json](./cadiy4.schema.json)

---

## 1. ファイル概要

- **拡張子**: `.cadiy4`
- **エンコーディング**: UTF-8 (BOMなし)
- **フォーマット**: JSON (JavaScript Object Notation)
- **単位系**:
  - **長さ・座標**: メートル (m)（※木取り図や一部UI表示のみ mm）
  - **角度**: 度数法 (deg) および 四元数 (Quaternion)
  - **色**: 正規化浮動小数点数 `0.0` 〜 `1.0`（RGB / RGBA）
  - **座標軸**:
    - `+Y`: 上方向 (Up) / 床面は `y = 0`
    - `+Z`: 正面手前方向 (Front)
    - `+X`: 右方向 (Right)

---

## 2. トップレベル構造

```json
{
  "version": 1,
  "thumbnail": "data:image/webp;base64,...",
  "camera": {
    "position": { "x": 2.677, "y": 2.408, "z": 2.620 },
    "target": { "x": 0.062, "y": 0.316, "z": 0.005 }
  },
  "objects": [ ... ],
  "layers": [ ... ],
  "snaps": [],
  "cutList": { ... },
  "polygonMeshTable": { ... }
}
```

| フィールド名 | 型 | 必須 | 説明 |
| :--- | :--- | :---: | :--- |
| `version` | `integer` | 必須 | ファイルフォーマットのバージョン番号。現在は `1`。 |
| `thumbnail` | `string` | 必須 | 3Dビューのサムネイル画像。WebP 形式の Base64 Data URL（空文字も可）。 |
| `camera` | `object` | 必須 | 3Dビューポートのカメラ視点座標 (`position`) と注視点 (`target`)。 |
| `objects` | `array` | 必須 | シーン内に配置されているすべてのパーツ、図形、注釈、寸法線のリスト。 |
| `layers` | `array` | 必須 | レイヤー（フォルダ）の階層構造定義。 |
| `snaps` | `array` | 任意 | スナップ機能の設定・拘束情報。通常は空配列 `[]`。 |
| `cutList` | `object` | 任意 | 木取り図の計算パラメータおよび原木へのパーツ配置情報。 |
| `polygonMeshTable` | `object` | 任意 | 既製パーツや3Dプリンタモデル等のポリゴン頂点・面定義テーブル。 |

---

## 3. オブジェクト (`objects[*]`) 仕様

### 3.1 共通フィールド
すべてのオブジェクト（木材、板材、寸法線、注釈など）が共通して持つフィールドです。

| フィールド名 | 型 | 説明 |
| :--- | :--- | :--- |
| `id` | `string` | 一意の識別子（UUID v4 または `legacy-XXX`）。 |
| `name` | `string` | オブジェクトの基本名称・規格名（例: `"SPF 2x2材"`, `"寸法線"`）。 |
| `partName` | `string` | オプション。ユーザーが付与した個別パーツ名（例: `"脚 (左前)"`, `"天板"`）。 |
| `position` | `Vector3` | ワールド座標系におけるパーツバウンディングボックスの中心位置 (`x, y, z`) [m]。 |
| `quaternion` | `Quaternion` | パーツの姿勢を表す四元数 (`x, y, z, w`)。 |
| `size` | `Vector3` | パーツのローカル座標系における寸法 (`x, y, z`) [m]。<br>・角材/円柱: `z` が長さ、`x, y` が断面寸法<br>・板材: `y` が板厚、`x` が幅、`z` が長さ |
| `visible` | `boolean` | 表示 / 非表示フラグ。 |
| `locked` | `boolean` | 編集ロックフラグ。 |
| `groupId` | `integer` | グループID（未グループ化は `0`）。 |
| `layerId` | `integer` | 所属するレイヤーの ID（ルートは `0`）。 |
| `color` | `ColorRGB` | 基本色 (`r, g, b` 各 0.0〜1.0)。 |
| `textureId` | `integer` | 木目などのテクスチャ番号（0: 単色、1: 木材木目、2: 板材木目 等）。 |
| `displayId` | `integer` | ユーザー画面に表示される識別番号（通し番号）。 |
| `type` | `string` | オブジェクトの種別（下記参照）。 |

---

### 3.2 オブジェクト種別 (`type`) と固有フィールド

#### 1. `lumber` (角材) / `board` (板材)
木工の基本材料です。木取り図（Cut Plan）の計算対象になります。
- `cutAngles`: 8要素の配列 `[0, 0, 0, 0, 0, 0, 0, 0]`（端部の斜めカット角度 [deg]）。
- `standardRef`: 材料規格参照オブジェクト（`setId`, `standardId`, `name`, `snapshotAt`）。
- `unitPrice`: 原木単価（円）。
- `specificGravity`: 比重（SPF材は約 `0.4`）。
- `remarks`: 規格備考（例: `"38×38×1820mm (6F)"`）。

#### 2. `cylinder` (円柱・丸棒) / `roundBoard` (円形板)
丸棒や丸板の材料です。
- `specificGravity`: 比重。

#### 3. `dimension` (寸法線)
3D空間上に配置される測定寸法線です。
- `linePattern`: 寸法線の線種（`0`: 実線）。
- `auxLinePattern`: 補助引き出し線の線種（`0`: 実線）。
- `lineWidth`: 線の太さ（ピクセル、例: `1.5`）。
- `arrowType`: 矢印形状（`"inside"` または `"outside"`）。
- `textVisible`: 数値テキストの表示フラグ。
- `valuePosition`: 寸法値の位置（`"top"` 等）。
- `symbol`: 寸法値のプレフィックス記号（例: `""`, `"φ"`, `"R"`）。
- `fontSize`: フォントサイズ（例: `24`）。
- `billboard`: 常にカメラ方向を向くかどうかのフラグ。

#### 4. `textBoard` (看板・タイトル板)
平面プレート上にテキストを表示する注釈です。
- `text`: 表示文字列。
- `fontSize`: フォントサイズ。
- `fontFamily`: フォント名（例: `"Meiryo UI"`）。
- `bold` / `italic`: 太字 / 斜体。
- `backgroundColor`: 背景色 (`r, g, b, a`)。
- `frameVisible`: 外枠線の表示フラグ。
- `contentRotation`: 文字の回転角度（`0, 90, 180, 270`）。

#### 5. `comment` (吹き出し)
特定箇所を矢印で指す引き出し注釈です。
- `text`: コメント文字列。
- `arrowPoint`: 矢印の先端が指す座標 (`Vector3`)。
- `fontSize`: フォントサイズ。
- `backgroundColor`: 背景色 (`ColorRGBA`)。
- `billboard`: カメラ追従フラグ。

#### 6. `protractor` (分度器)
角度を表示する注釈です。
- `angle`: 計測された角度（度数法、例: `90`）。
- `linePattern`, `lineWidth`, `arrowType`, `textVisible`, `fontSize`, `billboard`。

#### 7. `waveBoard` (波板) / `tube` (パイプ)
DIY特殊素材です。
- `thickness`: 素材の厚み [m]。
- `subType`: サブタイプ識別子（波板: `"sineSmall"` 等、パイプ: `"pvc"` 等）。

#### 8. `polygon` (既製パーツ・3Dモデル)
金具（丁番・L字金具）や人形、3Dプリンタパーツなどです。
- `modelName`: 参照モデルファイル名。
- `meshRef`: `polygonMeshTable` 内のキー。
- `weightG`: 重量 [g]。

---

## 4. レイヤー (`layers[*]`) 仕様

```json
{
  "id": 0,
  "name": "001",
  "visible": true,
  "locked": false,
  "color": { "r": 0.31, "g": 0.50, "b": 1.0 },
  "colorMode": false,
  "parentId": null
}
```

- `id`: レイヤーID。`0` はルートレイヤー。
- `name`: レイヤー名。
- `visible`: 表示/非表示。
- `locked`: ロック状態。
- `color`: レイヤー識別カラー。
- `colorMode`: レイヤー色強制適用フラグ。
- `parentId`: 親レイヤーID（階層フォルダ構造）。最上位は `null`。

---

## 5. 材料取り図（木取り図）データ (`cutList`) 仕様

caDIY3D の画面上で「材料取り図」を一度でも表示・計算すると、プロジェクトファイル内にパーツの配置レイアウト結果が `cutList` として保存されます。（未計算時は `layouts: []` となります）

```json
{
  "cutWidthMm": 3,
  "packingMode": "adjacent",
  "layouts": [
    {
      "baseId": 0,
      "partsId": "34dd0f3b-8134-4ccd-8a8d-d8215683b313",
      "x": 0,
      "z": 0
    },
    {
      "baseId": 0,
      "partsId": "1795e008-a0c7-491e-9053-a2c8e7e929bd",
      "x": 0,
      "z": 0.435
    }
  ]
}
```

### 5.1 フィールド一覧

| フィールド名 | 型 | 必須 | 説明 |
| :--- | :--- | :---: | :--- |
| `cutWidthMm` | `number` | 必須 | ノコ刃の切り代（Kerf 幅）[mm]。デフォルトは `3`。 |
| `packingMode` | `string` | 必須 | 母材へのパーツ詰め込み・パッキング方式（例: `"adjacent"` 隣接配置）。 |
| `layouts` | `array` | 必須 | 母材への各パーツ配置情報のリスト。 |

### 5.2 レイアウト情報 (`layouts[*]`)

| フィールド名 | 型 | 必須 | 説明 |
| :--- | :--- | :---: | :--- |
| `baseId` | `integer` | 必須 | 同一材料規格・断面グループにおける母材（原木・定尺材）のインデックス（`0` 始まり）。複数本の母材に分かれる場合、`0, 1, 2...` となります。 |
| `partsId` | `string` | 必須 | 配置対象オブジェクトの ID（`objects[*].id` を参照する UUID）。 |
| `x` | `number` | 必須 | 母材上の X 軸オフセット座標 [m]。角材や丸棒等の 1D レイアウト時は `0`、板材等の 2D レイアウト時は幅方向の配置位置。 |
| `z` | `number` | 必須 | 母材上の Z 軸オフセット座標（長手方向の配置位置）[m]。前のパーツの長さ＋切り代（`cutWidthMm`）の累積オフセット。 |

