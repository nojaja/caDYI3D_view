# caDIY3D レガシー形式 (`.cadiy`) ファイルフォーマット仕様書および V4 移行設計

本書は、DIY家具・木工3D設計ソフトウェア **caDIY3D** の旧バージョン（V7系以前）で用いられていたXML形式プロジェクトファイル（`.cadiy`）の内部仕様、および現在の **caDIY3D V4**（`.cadiy4`）形式へのマッピング・変換仕様をまとめた技術資料です。

---

## 1. ファイル概要

- **拡張子**: `.cadiy`
- **エンコーディング**: UTF-8 (BOM付きまたはBOMなし)
- **フォーマット**: XML (Extensible Markup Language)
- **ルート要素**: `<_2xModel>`
- **旧バージョン番号**: `<Version>7.0</Version>` (内部バージョン)
- **単位系**:
  - **長さ・座標**: メートル (m)（文字列 `"x,y,z"` 形式）
  - **角度**: 度数法 (deg) および 四元数 (Quaternion `"x,y,z,w"` 形式)
  - **色**: カンマ区切り正規化浮動小数点数 `"r,g,b,a"` (各 0.0〜1.0) または 16進カラーコード (例: `"#FF4F80FF"`)
  - **座標軸**:
    - `+Y`: 上方向 (Up)
    - `+Z`: 正面手前方向 (Front)
    - `+X`: 右方向 (Right)
    ※ V4 と同一の右手系座標軸を採用。

---

## 2. トップレベル構造 (`<_2xModel>`)

```xml
<?xml version="1.0" encoding="utf-8"?>
<_2xModel>
  <Version>7.0</Version>
  <Thumbnail>Base64...</Thumbnail>
  <Camera>
    <Position>-1.03,0.79,1.33</Position>
    <Center>0.06,0.10,-0.01</Center>
    <viewMode>eViewPerspective</viewMode>
    <fov>20</fov>
    ...
  </Camera>
  <ObjectTextSize>e_TextSizeMedium</ObjectTextSize>
  <ObjectTextBillboard>false</ObjectTextBillboard>
  <ObjectTextStyle>Regular</ObjectTextStyle>
  <ObjectTextFont>Meiryo UI</ObjectTextFont>
  <Perspective>e_PersWeak</Perspective>
  <SceneDrawMode>eDrawFaceAndEdge</SceneDrawMode>
  <_2xLayer>
    <_2xLayerInfoItem>
      <LayerName>フォルダ1</LayerName>
      <LayerID>0</LayerID>
      <LayerVisible>true</LayerVisible>
      <LayerLocked>false</LayerLocked>
      <LayerColor>#FF4F80FF</LayerColor>
    </_2xLayerInfoItem>
  </_2xLayer>
  <_2xPaint></_2xPaint>
  <_2xBooleanMeshInfo>
    <_2xBooleanMeshInfo>
      <BooleanMeshInfoID>1</BooleanMeshInfoID>
      <MeshVertex>x,y,z/x,y,z/...</MeshVertex>
      <MeshFaceInfo>...</MeshFaceInfo>
    </_2xBooleanMeshInfo>
  </_2xBooleanMeshInfo>
  <_2xPictureImageInfos>
    <_2xPictureImageInfo>
      <ImageBase64ID>1</ImageBase64ID>
      <ImageBase64>...</ImageBase64>
    </_2xPictureImageInfo>
  </_2xPictureImageInfos>
  <_2xObject>
    <_2xBoard>...</_2xBoard>
    <_2xDimension>...</_2xDimension>
    <_2xBoolean>...</_2xBoolean>
    <_2xCylinder>...</_2xCylinder>
    <_2xPolygon>...</_2xPolygon>
    <_2xScrew>...</_2xScrew>
    <_2xDiyMaterial>...</_2xDiyMaterial>
    <_2xPicture>...</_2xPicture>
  </_2xObject>
  <CutList>
    <CutListPartsSeparator>...</CutListPartsSeparator>
    <CutListPartsBase>...</CutListPartsBase>
  </CutList>
</_2xModel>
```

| XMLタグ | 型 | 説明 | V4 (`.cadiy4`) マッピング先 |
| :--- | :--- | :--- | :--- |
| `Version` | `string` | 旧バージョン番号（`"7.0"`） | `"version": 1` へ変換 |
| `Thumbnail` | `string` | Base64バイナリ | `"thumbnail"` (Data URL形式または保持) |
| `Camera` | 要素 | カメラ視点情報 | `"camera": { "position", "target" }` |
| `_2xLayer` | 要素コンテナ | レイヤー（フォルダ）一覧 | `"layers": [...]` |
| `_2xObject` | 要素コンテナ | シーン内オブジェクト一覧 | `"objects": [...]` |
| `_2xBooleanMeshInfo` | 要素コンテナ | ブーリアン・カスタム形状の頂点/面 | `"polygonMeshTable": [...]` |
| `_2xPictureImageInfos` | 要素コンテナ | 画像オブジェクトの画像データ | `"objects[*].imageBase64Id"` 参照先 |
| `CutList` | 要素コンテナ | 木取り図の計算結果・配置情報 | `"cutList": { ... }` |
| `ObjectText*` | 文字列 | 寸法線・注釈のデフォルトフォント設定 | 共通スタイル設定 |
| `SceneDrawMode` | 文字列 | 描画モード（面＋エッジ等） | 描画パラメータ |

---

## 3. カメラ (`Camera`) のマッピング

| XML要素 | 説明 | V4 プロパティ | 変換内容 |
| :--- | :--- | :--- | :--- |
| `Position` | カメラ座標 `"x,y,z"` | `camera.position` | カンマ分割して `{ x, y, z }` (数値) |
| `Center` | 注視点 `"x,y,z"` | `camera.target` | カンマ分割して `{ x, y, z }` (数値) |
| `fov` | 視野角 (度) | (内部設定) | 必要に応じて利用 |

---

## 4. レイヤー (`_2xLayer`) のマッピング

旧形式では `LayerID` が `0` から始まるフラットなリストですが、V4では階層構造を持ち、**ルートレイヤー（`id: 0`）がプロジェクト名**として配置されます。

- **ルートレイヤー**: 自動生成（`id: 0`, `name: プロジェクト名`, `parentId: null`）
- **旧レイヤー要素**:
  - `id`: `parseInt(LayerID) + 1`
  - `parentId`: `0`
  - `name`: `LayerName`
  - `visible`: `LayerVisible === "true"`
  - `locked`: `LayerLocked === "true"`
  - `color`: `#AARRGGBB` または `#RRGGBB` を `{ r, g, b }` (0.0〜1.0) に変換

---

## 5. オブジェクト (`_2xObject`) の仕様とマッピング

### 5.1 オブジェクト種別タグと V4 `type` の対応

| XMLタグ | 説明 | V4 `type` | V4 `id` 命名規則 |
| :--- | :--- | :--- | :--- |
| `<_2xBoard>` | 木材（板材・角材） | `"board"` (板厚により `"lumber"`) | `"legacy-" + UniqueID` |
| `<_2xCylinder>` | 円柱材・丸棒・針金 | `"cylinder"` | `"legacy-" + UniqueID` |
| `<_2xDiyMaterial>` | 金属材（フラットバー、アングル等） | `"steelProfile"` | `"legacy-" + UniqueID` |
| `<_2xBoolean>` | ブーリアン・削り加工部材 | `"boolean"` または `"polygon"` | UUID v4 (または legacy-ID) |
| `<_2xPolygon>` | 金物・外部3Dパーツ (dmesh) | `"polygon"` | UUID v4 |
| `<_2xScrew>` | ビス・木ネジ | `"screw"` | UUID v4 |
| `<_2xPicture>` | 画像・図面・看板テキスト | `"picture"` | UUID v4 |
| `<_2xDimension>` | 寸法線 | `"dimension"` | UUID v4 |

### 5.2 共通プロパティマッピング

| XMLタグ | 型 | V4 フィールド | 変換ロジック |
| :--- | :--- | :--- | :--- |
| `UniqueID` | 数値文字列 | `displayId` / `id` | `displayId: parseInt(UniqueID)`<br>木材等は `id: "legacy-" + UniqueID` |
| `CommentText` | 文字列 | `name` | オブジェクト名称（例: `"SPF 2x4材"`, `"263"`） |
| `SubPartsName` | 文字列 | `partName` | 部材名（空でない場合のみ設定） |
| `LinkedCutPartsText` | 文字列 | `partName` | 木取り連動テキスト（SubPartsName が空の場合） |
| `Location` | `"x,y,z"` | `position` | `{ x, y, z }` (浮動小数点数) |
| `Quaternion` | `"x,y,z,w"` | `quaternion` | `{ x, y, z, w }` (浮動小数点数) |
| `Size` | `"x,y,z"` | `size` | `{ x, y, z }` (ローカル寸法 [m]) |
| `StandardSize` | `"x,y,z"` | `legacyStandardSize` | `{ x, y, z }` (原木規格寸法 [m]) |
| `Diffuse` | `"r,g,b,a"` | `color` | `{ r, g, b }` (0.0〜1.0) |
| `UnitPrice` | 数値文字列 | `unitPrice` | `parseFloat(UnitPrice)` (円) |
| `SpecificGravity` | 数値文字列 | `specificGravity` | `parseFloat(SpecificGravity)` |
| `Remarks` | 文字列 | `remarks` | 備考（例: `"コメリ価格"`） |
| `Hide` | `"true"`/`"false"` | `visible` | `Hide !== "true"` (論理値反転) |
| `GroupID` | 数値文字列 | `groupId` | `parseInt(GroupID)` (未グループ化は `0`) |
| `Layer` | 数値文字列 | `layerId` | `parseInt(Layer) + 1` |
| `Texture` | 数値文字列 | `textureId` | `parseInt(Texture)` |
| `NoAggregated` | `"true"`/`"false"` | `noAggregated` | `NoAggregated === "true"` |

### 5.3 各オブジェクト固有プロパティ

#### 1. 木材 (`_2xBoard`)
- `CutValue`: カンマ区切り8要素 `"c1,c2,c3,c4,c5,c6,c7,c8"`
  - V4: `cutAngles: [c1, c2, c3, c4, c5, c6, c7, c8]` (度数法)
- `RoundValue`: 4隅の角丸半径 `"r1,r2,r3,r4"`
- `RoundModes`: 角丸モード `"m1,m2,m3,m4"`

#### 2. 寸法線 (`_2xDimension`)
- `LinePattern1`, `LinePattern2`: 線種（実線・破線など） -> `linePattern`, `auxLinePattern`
- `LineWidth`: 線幅 -> `lineWidth`
- `LineEndType`: `"eEndArrowInside"` -> `arrowType: "inside"`, `"eEndArrowOutside"` -> `arrowType: "outside"`
- `TextVisibled`: `"true"` -> `textVisible: true`
- `PosDimensionValue`: `"Top"` -> `valuePosition: "top"`
- `DimensionSymbol`: プレフィックス記号 -> `symbol`

#### 3. ビス (`_2xScrew`)
- `ScrewLength`: ネジ長 [m] -> `screwLength`
- `ScrewDiameter`: 直径 [m] -> `diameterIndex` (標準径インデックスにマップ)
- `ScrewLayout`: `"eScrewLayout1"` -> `layout: "layout1"`
- `ScrewColor`, `LineColor`: カラー -> `screwColor`, `lineColor` (HEX)
- `DispDimension`: `"true"` -> `showDimension: true`
- `ScrewPosition`: 配置オフセット -> `screwPosition`

#### 4. DIY金物 (`_2xDiyMaterial`)
- `DiyMaterialType`: `"diyMatTypeSteelMaterial2"` -> `shape: "flatBar"`, `material: "steel"`
- `Thickness`: 板厚 [m] -> `thickness`

#### 5. 画像・注釈 (`_2xPicture`)
- `ImageBase64ID`: `_2xPictureImageInfos` 内の画像ID -> `imageBase64Id`
- `ImagePath`: 画像パスから MIME タイプ（`image/jpeg`, `image/png` 等）を判定 -> `imageMimeType`
- `AspectRatio`, `AspectRatioFixed` -> `aspectRatio`, `aspectRatioFixed`
- `ForeColor`, `BackColor`: 文字色・背景色

#### 6. ポリゴン・金物 (`_2xPolygon`)
- `ModelName`: 内部モデルパス（例: `"Hinge\SubParts\Hinge 32mm-Sub.dmesh"`） -> `modelName: "Hinge/SubParts/Hinge 32mm-Sub.dmesh"`
- `meshRef`: `"パーツ名|サイズ|モデルパス"` 形式の参照キー

#### 7. ブーリアン・カスタム形状 (`_2xBoolean`)
- `MeshInfoID`: `_2xBooleanMeshInfo` 内のメッシュIDを参照
- `OriginalModelType`: 元のモデル種別（`eModelTypePolygon` または `eModelTypePineBoard` 等）
  - `eModelTypePolygon` の場合、V4 では `polygon` として登録されることが多い。
  - `eModelTypePineBoard` の場合、V4 では `boolean` として登録される。

---

## 6. 木取り図 (`CutList`) のマッピング

- **旧構造**:
  - `CutListPartsSeparator`: 規格材（木材種別）のヘッダー
  - `CutListPartsBase`: 原木単位の情報
    - `Parts.CutParts`: 配置された各部材
      - `CutID`: オブジェクトの `UniqueID` に一致
      - `Location`: `"z,x"` (原木上の配置座標)
- **V4 構造**:
  - `cutList.cutWidthMm`: ノコ刃幅 (通常 `3` mm)
  - `cutList.packingMode`: `"adjacent"` 等
  - `cutList.layouts`:
    - `baseId`: 原木インデックス
    - `partsId`: V4オブジェクトの `id`（UUID または `legacy-CutID`）
    - `x`, `z`: 配置座標

---

## 7. メッシュ情報 (`_2xBooleanMeshInfo` -> `polygonMeshTable`)

旧バージョンのメッシュ定義は、スラッシュ区切り・カンマ区切りのテキスト形式です。

- `MeshVertex`: `"x,y,z/x,y,z/..."`
  - 旧XMLでは単位は **メートル [m]** です。
  - V4 の `polygonMeshTable.vertices`: `[{ x, y, z }, ...]`（※ V4 内部データは **センチメートル [cm]** 単位のため、各成分に `100` を乗算して格納します）。
- `MeshFaceInfo`: 面定義
  - 形式: `頂点数#Smooth#MaterialID#頂点インデックス#エッジフラグ#頂点法線#面法線`
    - 例: `3#True#1#0,1,2#2,2,1#0.9799604,-0.007948555,-0.1990334/0.9995764,0.003448055,-0.02890001/0.994722,-0.01164163,0.1019442#0.9973274,-0.02186139,-0.06971414`
  - V4 の `polygonMeshTable.faces`: `[{ indices: [0, 1, 2], vertexNormals: [{x, y, z}, ...] }, ...]`
- メッシュ識別子 (`meshId` / `meshRef`):
  - `_2xBoolean.MeshInfoID` (例: `"1"`) が `BooleanMeshInfo.BooleanMeshInfoID` (`"1"`) と紐づく。
  - V4 変換時、`meshId` に `"1"`（またはパーツ名/サイズ）を付与し、オブジェクト側の `meshRef` を同一キーに設定することで、`PolygonBuilder` が確実に解決できるように連携する。

---

## 8. スキーマ定義および次ステップのローダー設計方針

### 8.1 スキーマ定義フォーマットの選定判断
**結論: JSON Schema + TypeScript型定義を採用**

1. **実用性とエコシステム**:
   - TypeScript/Webフロントエンド環境（Vite + Three.js）では、XSD（XML Schema Definition）を用いたバリデーションはライブラリの肥大化や処理性能の面で実用的ではありません。
   - 一方、XMLを中間JSオブジェクトにパースし、それを **JSON Schema** および **TypeScript型定義（`src/types/cadiy-legacy.ts`）** で型安全に扱うアプローチは、極めて軽量かつ堅牢です。
2. **2段階の変換アーキテクチャ**:
   - **Step 1 (XML Parser)**: `.cadiy` (XML文字列) をパースし、XMLのタグ構造を反映した `LegacyCadiyProject` オブジェクトを構築。
   - **Step 2 (Migration Mapper)**: `LegacyCadiyProject` を現在の `Cadiy4Project`（V4形式）へ変換（プロパティのマッピング、座標・クォータニオン文字列のパース、レイヤーIDのシフト、木取り図の再構築）。
   - **Step 3 (Three.js Scene Loader)**: 変換後の `Cadiy4Project` を既存の V4 ローダーに渡すことで、レンダリングおよび既存機能との100%の互換性を実現。
