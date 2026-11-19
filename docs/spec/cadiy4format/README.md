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
  - **座標軸**: **完全な右手系 (Right-handed System, OpenGL/Three.js準拠)**
    - `+Y`: 上方向 (Up) / 床面は `y = 0`
    - `+Z`: 正面手前方向 (Front)
    - `+X`: 右方向 (Right)
    - 外積関係: $\vec{X} \times \vec{Y} = \vec{Z}$ (右ねじの法則に従い正の角度は反時計回り)
    - 詳細解説: [coordinate-and-cut-specs.md](./coordinate-and-cut-specs.md)

---

## 2. トップレベル構造

```json
{
  "version": 1,
  "thumbnail": "data:image/webp;base64,...",
  "revision": 1795010275186,
  "camera": {
    "position": { "x": 2.677, "y": 2.408, "z": 2.620 },
    "target": { "x": 0.062, "y": 0.316, "z": 0.005 }
  },
  "objects": [ ... ],
  "layers": [ ... ],
  "activeLayerId": 1,
  "selectedIds": [ "d43a3488-4b42-4b4e-93c7-7cc5ac65bf40" ],
  "snaps": [],
  "cutList": { ... },
  "polygonMeshTable": [ ... ]
}
```

| フィールド名 | 型 | 必須 | 説明 |
| :--- | :--- | :---: | :--- |
| `version` | `integer` | 必須 | ファイルフォーマットのバージョン番号。現在は `1`。 |
| `thumbnail` | `string` | 必須 | 3Dビューのサムネイル画像。WebP 形式の Base64 Data URL（空文字も可）。 |
| `revision` | `integer` / `number` | 任意 | シーン編集のリビジョン番号または更新タイムスタンプ。 |
| `camera` | `object` | 必須 | 3Dビューポートのカメラ視点座標 (`position`) と注視点 (`target`)。 |
| `objects` | `array` | 必須 | シーン内に配置されているすべてのパーツ、図形、金具、画像、注釈、寸法線のリスト。 |
| `layers` | `array` | 必須 | レイヤー（フォルダ）の階層構造定義。 |
| `activeLayerId` | `integer` | 任意 | 現在編集対象としてアクティブになっているレイヤーID。 |
| `selectedIds` | `array<string>` | 任意 | ビューポート上で現在選択状態にあるオブジェクトのUUID配列。 |
| `snaps` | `array` | 任意 | スナップ機能の設定・拘束情報。通常は空配列 `[]`。 |
| `cutList` | `object` | 任意 | 木取り図の計算パラメータおよび原木へのパーツ配置情報。 |
| `polygonMeshTable` | `array` / `object` | 任意 | 既製パーツや3Dプリンタモデル等のポリゴン頂点・面定義テーブル（配列またはオブジェクト辞書）。 |
| `paint` | `object` | 任意 | 塗料・仕上げ設定のスナップショット（`snapshot.paints` 配下に各塗料の定義を保持）。 |

---

## 3. オブジェクト (`objects[*]`) 仕様

### 3.1 共通フィールド
すべてのオブジェクト（木材、板材、寸法線、金具、画像、注釈など）が共通して持つ基本フィールドです。

| フィールド名 | 型 | 説明 |
| :--- | :--- | :--- |
| `id` | `string` | 一意の識別子（UUID v4 または `legacy-XXX`）。 |
| `name` | `string` | オブジェクトの基本名称・規格名（例: `"SPF 2x2材"`, `"寸法線"`, `"蝶番32mm"`）。 |
| `partName` | `string` | オプション。ユーザーが付与した個別パーツ名（例: `"脚 (左前)"`, `"天板"`）。 |
| `position` | `Vector3` | ワールド座標系におけるパーツバウンディングボックスの中心位置 (`x, y, z`) [m]。 |
| `quaternion` | `Quaternion` | パーツの姿勢を表す四元数 (`x, y, z, w`)。 |
| `size` | `Vector3` | パーツのローカル座標系における寸法 (`x, y, z`) [m]。<br>・角材/円柱: `z` が長さ、`x, y` が断面寸法<br>・板材: `y` が板厚、`x` が幅、`z` が長さ<br>・画像: `y` が0、`x` が幅、`z` が高さ |
| `rotationDeg` | `Vector3` | パーツのオイラー角回転度数 (`x, y, z`) [deg]。 |
| `worldBounds` | `BoundingBox3D` | ワールド座標系における軸平行境界ボックス (`min, max`) [m]。 |
| `visible` | `boolean` | 表示 / 非表示フラグ。 |
| `locked` | `boolean` | 編集ロックフラグ。 |
| `groupId` | `integer` | グループID（未グループ化は `0`）。 |
| `layerId` | `integer` | 所属するレイヤーの ID（ルートは `0`）。 |
| `color` | `ColorRGB` | 基本色 (`r, g, b` 各 0.0〜1.0)。 |
| `textureId` | `integer` | 木目などのテクスチャ番号（0: 単色、1: 木材木目、2: 板材木目 等）。 |
| `displayId` | `integer` | ユーザー画面に表示される識別番号（通し番号）。 |
| `noAggregated` | `boolean` | 材料取り図（木取り図）やBOM集計対象から除外するかどうかのフラグ。 |
| `type` | `string` | オブジェクトの種別（下記参照）。 |

---

### 3.2 オブジェクト種別 (`type`) と固有フィールド

#### 1. `lumber` (角材) / `board` (板材)
木工の基本材料です。木取り図（Cut Plan）の計算対象になります。
- `cutAngles`: 8要素の配列 `[c0, c1, c2, c3, c4, c5, c6, c7]`（端部および端縁の斜めカット角度 [deg]）。
  - 角材（lumber）: `[0]`=始端(-Z)マイター(Y軸周り), `[1]`=始端(-Z)ベベル(X軸周り), `[2]`=終端(+Z)マイター(Y軸周り), `[3]`=終端(+Z)ベベル(X軸周り)。
  - 板材（board）: `[4..7]`=外周4辺（妻壁・屋根勾配等）の傾斜カット角。
  - 詳細は [coordinate-and-cut-specs.md](./coordinate-and-cut-specs.md) を参照。
- `edgeCuts`: 形状加工（角の斜めカット・面取り・R加工）の定義配列（後述）。
- `standardRef`: 材料規格参照オブジェクト（`setId`, `standardId`, `name`, `snapshotAt`）。
- `unitPrice`: 原木単価（円）。
- `specificGravity`: 比重（SPF材は約 `0.4`）。
- `remarks`: 規格備考（例: `"38×38×1820mm (6F)"`）。
- `legacyStandardSize`: 旧バージョン規格寸法 (`Vector3`)。

##### 形状加工 (`edgeCuts[*]`) 仕様
角材・合板のエッジ（辺）に対して適用される斜めカット（面取り）およびコーナーR加工のパラメータです。
```json
{
  "edgeIndex": 7,
  "mode": "cut",
  "faceADist": 0.7925,
  "faceBDist": 0.1985
}
```
| フィールド名 | 型 | 説明 |
| :--- | :--- | :--- |
| `edgeIndex` | `integer` | 加工対象となるバウンディングボックスの辺番号（`0` 〜 `11`）。<br>・`0..3`: 底面4辺（Y-側）<br>・`4..7`: 垂直4辺（Y軸平行。4: 手前右 X+Z+, 5: 奥右 X+Z-, 6: 手前左 X-Z+, 7: 奥左 X-Z-。板材のコーナー加工に使用）<br>・`8..11`: 上面4辺（Y+側） |
| `mode` | `string` | 加工モード。`"cut"`（直線斜めカット/面取り）または `"round"`（R面取り/フィレット）。 |
| `faceADist` | `number` | エッジに隣接する面A（板材の場合はローカル $X$ 軸/幅方向）に沿った切り落とし距離 [m]。 |
| `faceBDist` | `number` | エッジに隣接する面B（板材の場合はローカル $Z$ 軸/長さ方向）に沿った切り落とし距離 [m]。 |
| `radius` | `number` | オプション。R面取り（フィレット）時の曲率半径 [m]。 |

※ 幾何配置や実データ検証の詳細は [coordinate-and-cut-specs.md](./coordinate-and-cut-specs.md) を参照してください。

#### 2. `cylinder` (円柱・丸棒) / `roundBoard` (円形板)
丸棒や丸板の材料です。
- `unitPrice`: 原木単価（円）。
- `specificGravity`: 比重。
- `remarks`: 備考。

#### 3. `picture` (画像・参考写真)
3D空間上に配置される下絵・設計参考写真・テクスチャボードです。
- `imageBase64Id`: プロジェクトルートの `pictureImageTable` 内のエントリを参照する数値ID。
- `imageBase64`: Base64エンコードされた画像バイナリデータ文字列（オブジェクト直接保持時）。なお画像テーブル内のデータは通常 zlib (deflate) 圧縮されたバイナリが base64 化されています。
- `imageMimeType`: 画像のMIME形式（`"image/jpeg"`, `"image/png"`, `"image/webp"` 等）。
- `aspectRatioFixed`: 縦横比固定フラグ（`boolean`）。
- `aspectRatio`: 画像の縦横比（`width / height`）。
- `dispPattern`: 表示パターンフラグ（`0`: 片面表示, `1`: 両面表示）。
- `contentRotation`: 画像の時計回り回転角度（`0, 90, 180, 270`）。

#### 4. `boolean` (ブーリアン加工パーツ)
切削・差分・結合加工が行われた立体パーツです。
- `vertices`: 加工後の頂点リスト (`Vector3[]` または数値配列)。
- `faces`: 加工後の面構成データ (`PolygonFace[]` または数値配列)。
- `sourceMaterials`: 加工元の母材定義（`type`, `standardSize`, `color`, `commentText`, `specificGravity`, `textureId`）。

#### 5. `screw` (ビス・木ネジ・接合金具)
木材同士を接合するためのコーススレッドやビスです。
- `diameterIndex`: ビスの呼び径インデックス（例: `6`=3.8mm, `8`=4.2mm）。
- `screwLength`: ネジの長さ [m]（例: `0.04`=40mm）。
- `layout`: ネジ配置パターン（`"layout1"`, `"layout2"`, `"layout3A"`, `"layout4"` 等）。
- `orientation`: 配置方向（`"horizontal"`, `"vertical"`）。
- `screwType`: ファスナー種別（`"screw"`, `"bolt"` 等）。
- `showDimension`: 寸法線表示の有無（`boolean`）。
- `screwColor`: ネジ頭/本体のカラーコード（例: `"#c0c0c0"`）。
- `lineColor`: 補助線カラーコード（例: `"#000000"`）。
- `linePattern1`, `linePattern2`: 軸線および補助線の線種。
- `lineWidth`: 線の太さ。
- `screwPosition`: ビス位置オフセット。

#### 6. `steelProfile` (鋼材・形鋼・アングル・フラットバー)
金属製フレームや金具部材です。
- `shape`: 断面形状（`"flatBar"`, `"angle"`, `"squarePipe"`, `"roundPipe"` 等）。
- `material`: 材質（`"steel"`, `"alumi"`, `"stainless"` 等）。
- `thickness`: 板厚 [m]（例: `0.003`=3mm）。

#### 7. `dimension` (寸法線)
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
- `measure`: 詳細測定パラメータ (`start`, `end`, `side`, `offset`, `valueMm`)。

#### 8. `textBoard` (看板・タイトル板)
平面プレート上にテキストを表示する注釈です。
- `text`: 表示文字列。
- `fontSize`: フォントサイズ。
- `fontFamily`: フォント名（例: `"Meiryo UI"`）。
- `bold` / `italic`: 太字 / 斜体。
- `backgroundColor`: 背景色 (`r, g, b, a`)。
- `frameVisible`: 外枠線の表示フラグ。
- `contentRotation`: 文字の回転角度（`0, 90, 180, 270`）。

#### 9. `comment` (吹き出し)
特定箇所を矢印で指す引き出し注釈です。
- `text`: コメント文字列。
- `arrowPoint`: 矢印の先端が指す座標 (`Vector3`)。
- `fontSize`: フォントサイズ。
- `backgroundColor`: 背景色 (`ColorRGBA`)。
- `billboard`: カメラ追従フラグ。

#### 10. `protractor` (分度器)
角度を表示する注釈です。
- `angle`: 計測された角度（度数法、例: `90`）。
- `linePattern`, `lineWidth`, `arrowType`, `textVisible`, `fontSize`, `billboard`。

#### 11. `waveBoard` (波板) / `tube` (パイプ)
DIY特殊素材です。
- `thickness`: 素材の厚み [m]。
- `subType`: サブタイプ識別子（波板: `"sineSmall"` 等、パイプ: `"pvc"` 等）。

#### 12. `polygon` (既製パーツ・3Dモデル)
金具（丁番・L字金具）や人形、3Dプリンタパーツなどです。
- `modelName`: 参照モデルファイル名。
- `meshRef`: `polygonMeshTable` 内のキー。
- `weightG`: 重量 [g]。
- `unitPrice`: 金具単価（円）。
- `snapVertices`: スナップ点頂点座標リスト (`Vector3[]`)。
- `vertices`, `faces`: インラインメッシュ頂点・面データ。

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

## 5. ポリゴンメッシュテーブル (`polygonMeshTable`) 仕様

3Dパーツのポリゴン形状データを保持します。`.cadiy4` では以下の2通りの形式を許容します。

### 配列形式（実 autosave 形式）:
```json
[
  {
    "meshId": "羽子板付 沓石 240|230 x 240 x 230|Concrete/Base-Stone With Paddle 240.dmesh",
    "vertices": [
      { "x": -5.4432, "y": 11.1263, "z": 6.3432 },
      { "x": 5.4432, "y": 11.1263, "z": 6.3432 }
    ],
    "faces": [
      {
        "indices": [ 4, 1, 2, 7 ],
        "vertexNormals": [
          { "x": 0, "y": 1, "z": 0 },
          { "x": 0, "y": 1, "z": 0 }
        ]
      },
      {
        "indices": [ 0, 1, 2 ]
      }
    ]
  }
]
```

- `meshId`: メッシュ識別文字列（モデル名、外形寸法、dmeshファイルパス等で構成）。`objects[*].meshRef` と紐づきます。
- `vertices`: 頂点座標の配列（`Vector3[]` 形式。旧仕様・エクスポート形式ではフラットな数値配列 `number[]` も許容）。
- `faces`: 面ポリゴン情報オブジェクトの配列（`PolygonMeshFace[]` 形式）。
  - `indices`: 面を構成する頂点インデックスの配列（三角形だけでなく四角形や多角形を含む）。
  - `vertexNormals`（任意）: 各頂点の法線ベクトル配列（`Vector3[]`）。

### オブジェクト辞書形式:
```json
{
  "mesh_uuid_or_name": {
    "vertices": [ ... ],
    "faces": [ ... ]
  }
}
```

---

## 6. 材料取り図（木取り図）データ (`cutList`) 仕様

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

### 6.1 フィールド一覧

| フィールド名 | 型 | 必須 | 説明 |
| :--- | :--- | :---: | :--- |
| `cutWidthMm` | `number` | 必須 | ノコ刃の切り代（Kerf 幅）[mm]。デフォルトは `3`。 |
| `packingMode` | `string` | 必須 | 母材へのパーツ詰め込み・パッキング方式（例: `"adjacent"` 隣接配置）。 |
| `layouts` | `array` | 必須 | 母材への各パーツ配置情報のリスト。 |

### 6.2 レイアウト情報 (`layouts[*]`)

| フィールド名 | 型 | 必須 | 説明 |
| :--- | :--- | :---: | :--- |
| `baseId` | `integer` | 必須 | 同一材料規格・断面グループにおける母材（原木・定尺材）のインデックス（`0` 始まり）。複数本の母材に分かれる場合、`0, 1, 2...` となります。 |
| `partsId` | `string` | 必須 | 配置対象オブジェクトの ID（`objects[*].id` を参照する UUID）。 |
| `x` | `number` | 必須 | 母材上の X 軸オフセット座標 [m]。角材や丸棒等の 1D レイアウト時は `0`、板材等の 2D レイアウト時は幅方向の配置位置。 |
| `z` | `number` | 必須 | 母材上の Z 軸オフセット座標（長手方向の配置位置）[m]。前のパーツの長さ＋切り代（`cutWidthMm`）の累積オフセット。 |
