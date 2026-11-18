# caDIY3D 旧バージョンモデル（`.cadiy`）対応 要件定義書

- **文書バージョン**: 1.0.0
- **改訂日**: 2026-11-19
- **対象システム**: caDIY3D Web Viewer
- **作成理由**: caDIY3D 旧バージョン（V7系以前）のXMLプロジェクトファイル（`.cadiy`）の読み込み・表示対応、およびV4（`.cadiy4`）への内部変換・フォールトトレラント処理の要件定義

---

## 1. プロジェクト概要

### 1.1 背景と目的
DIY家具・木工3D設計ソフトウェア「caDIY3D」は、過去のバージョン（V7系等）においてXML形式の `.cadiy` ファイルを採用していました。現在のWebビューアは最新の JSON 形式（`.cadiy4`）にネイティブ対応していますが、ユーザーコミュニティには過去に設計された膨大な `.cadiy` 形式の木工設計資産が存在します。

本要件の目的は、Webビューアの対応モデルとして旧形式（`.cadiy`）を追加し、デスクトップ版の旧アプリを起動することなく、Webブラウザ上でシームレスに旧モデルを閲覧・確認できるようにすることです。

### 1.2 基本方針
1. **V4内部変換パイプライン方式**:
   - ビューアのコアレンダラー（Three.js）、表示モードマネージャー（3Dview / 材料取り図 / 三面図）、レイヤーマネージャー、プロパティインスペクタは、すべて V4 形式（`Cadiy4Data`）を共通データ基盤として動作しています。
   - したがって、旧バージョン（XML）が入力された場合、内部メモリ上で **旧形式から新形式（V4）へオンザフライで変換し、既存のV4ローダーパイプラインに受け渡す方式** を採用します。これにより、レンダリングおよびUIロジックの二重実装を防ぎ、既存の高度な表示機能を100%活用します。
2. **フォールトトレラント性（エラー時の処理継続）**:
   - 旧形式のモデルには、カスタム加工部材、外部金物メッシュ、特殊な寸法線など多種多様なデータが含まれます。一部のオブジェクトやプロパティの変換に失敗した場合でも、**モデル全体の読み込みを中断（クラッシュやエラー中断）させず、失敗した箇所とその理由を `console.log` に詳細出力した上で処理を継続** します。
   - ユーザーは読み込み可能な部材をそのままWeb上で確認でき、閲覧不能になるリスクを最小化します。
3. **完全クライアントサイド動作**:
   - バックエンドの変換サーバーや外部APIを一切介さず、ブラウザの標準機能（`DOMParser` 等）とTypeScript変換モジュールのみで完結します。

---

## 2. システムアーキテクチャ・処理フロー

```
[ユーザー入力]
  ├── ファイル選択ボタン (ダイアログ: .cadiy4, .cadiy, .json)
  ├── ドラッグ＆ドロップ (.cadiy / .cadiy4)
  └── URLクエリパラメータ (?model=...cadiy)
       │
       ▼
[ファイル判別 & ロード処理]
  ├─ 入力形式判定 (.cadiy / XMLルート: <_2xModel>)
  │     ├─ V4 (.cadiy4 / JSON) ──► Cadiy4Parser ──┐
  │     └─ Legacy (.cadiy / XML) ──► [新設] LegacyCadiyLoader ─┐
  │                                                            │
  │   ┌────────────────────────────────────────────────────────┘
  │   ▼
  │ [LegacyCadiyLoader 内部処理]
  │   1. DOMParser による XML パース
  │   2. LegacyCadiyProject オブジェクト構築
  │   3. [新設] LegacyToV4Converter による V4 (Cadiy4Data) 変換
  │      ├─ メタ情報・カメラ (Camera) 変換
  │      ├─ レイヤー階層 (Layer) 変換
  │      ├─ オブジェクト (Board, Cylinder, Screw, Polygon, Dimension等) 変換
  │      │     └─ ※ 変換エラー発生時:
  │      │          console.log("[LegacyConverter] エラー詳細", { target, reason, err }) 出力
  │      │          該当部材をフォールバック/スキップして継続
  │      ├─ 木取り図 (CutList) 変換
  │      └─ メッシュテーブル (BooleanMeshInfo) 変換
  │
  ▼   ▼ (生成された Cadiy4Data)
[共通ビューアレンダラー & UI]
  ├── 3Dview (Three.js シーン描画)
  ├── レイヤー一覧ツリー (フォルダ開閉・表示トグル)
  ├── オブジェクト詳細インスペクタ (規格・サイズ・価格・傾き等)
  ├── 材料取り図 (木取り図の切断配置・歩留まり計算)
  └── 三面図 (直交投影マルチビューポート)
```

---

## 3. 機能要件

### 3.1 ファイル受付・判定要件

| No | 要件項目 | 仕様・動作詳細 |
| :--- | :--- | :--- |
| F-101 | ファイル選択ダイアログ拡張 | ヘッダの「開く」ボタン（`#btn-open-file`）に紐づく `<input type="file">` の `accept` 属性に `.cadiy` を追加。<br>変更後: `accept=".cadiy,.cadiy4,application/json"` |
| F-102 | ドラッグ＆ドロップ対応 | 全画面ドロップゾーンにて、拡張子 `.cadiy` のファイルドロップを正式に受付・処理する。 |
| F-103 | URLパラメータ対応 | `?model=...` または `?url=...` に `.cadiy` ファイルのURLが指定された場合、fetch後に旧形式として自動変換・ロードする。 |
| F-104 | 自動フォーマット判定 | 拡張子だけでなく、ファイル先頭の文字列（`<?xml` や `<_2xModel>`）または JSON 構文チェックにより、誤った拡張子であっても形式を自動判別して適切なローダーへ振り分ける。 |
| F-105 | モデル名称表示 | `.cadiy` ファイルを読み込んだ際、拡張子を除いたファイル名（例: `NASケース`）をヘッダ中央の `#model-title` に正しく反映する。 |

---

### 3.2 変換マッピング要件（Legacy XML -> V4 JSON）

`docs/spec/cadiylegacy/README.md` および `cadiy-legacy.schema.json` に準拠し、以下の要素を変換します。

#### 1. プロジェクト基本・カメラ情報 (`<Camera>`)
- **バージョン**: V4 の `"version": 1` を設定。
- **サムネイル**: `<Thumbnail>`（Base64文字列）を保持、またはデータURL形式へマッピング。
- **カメラ座標**:
  - `<Camera><Position>` (`"x,y,z"`) -> `camera.position`: `{ x, y, z }` (メートル単位の浮動小数点数)
  - `<Camera><Center>` (`"x,y,z"`) -> `camera.target`: `{ x, y, z }` (メートル単位の浮動小数点数)
  - パース失敗時はデフォルト視点（アイソメ視点）にフォールバック。

#### 2. レイヤー構成 (`<_2xLayer>`)
- **ルートレイヤーの自動生成**:
  - V4 の仕様に則り、プロジェクト名（ファイル名）を冠したルートレイヤー（`id: 0`, `parentId: null`, `visible: true`）を生成。
- **旧レイヤー一覧の変換**:
  - `id`: `parseInt(LayerID) + 1`（ルートレイヤーと重複しないようIDシフト）
  - `parentId`: `0`（すべてルート配下の第1階層として配置）
  - `name`: `<LayerName>`
  - `visible`: `<LayerVisible> !== "false"`
  - `locked`: `<LayerLocked> === "true"`
  - `color`: 16進カラーコード（`#AARRGGBB` / `#RRGGBB`）を正規化 `{ r, g, b }` (0.0〜1.0) に変換。

#### 3. オブジェクト構成 (`<_2xObject>`)
旧形式の各部材タグを V4 の `type` およびプロパティ構造に変換します。

| 旧XMLタグ | V4 `type` | 固有変換ルール・要件 |
| :--- | :--- | :--- |
| `<_2xBoard>` | `board` | 木材（板材・角材）。<br>・`size`: `<Size>` (`"x,y,z"`)<br>・`legacyStandardSize`: `<StandardSize>` (`"x,y,z"`)<br>・`cutAngles`: `<CutValue>` (8要素の切断角度配列 [c1..c8])<br>・`unitPrice`, `specificGravity`, `remarks` を抽出 |
| `<_2xCylinder>` | `cylinder` | 円柱・丸棒。`<Size>` の直径・長さをパース |
| `<_2xDiyMaterial>` | `steelProfile` | 金物・アングル・フラットバー。`<Thickness>` を板厚にマッピング |
| `<_2xBoolean>` | `boolean` または `polygon` | ブーリアン・加工部材。`<MeshInfoID>` を参照しメッシュテーブルと連携 |
| `<_2xPolygon>` | `polygon` | 外部3Dパーツ・金物（dmesh）。`<ModelName>` からパス抽出 |
| `<_2xScrew>` | `screw` | ビス・木ネジ。`<ScrewLength>`, `<ScrewDiameter>` 等を抽出 |
| `<_2xPicture>` | `picture` | 看板・注釈画像。`<ImageBase64ID>` を元に画像データを関連付け |
| `<_2xDimension>` | `dimension` | 3D寸法線。<br>・`lineWidth`, `arrowType`, `textVisible`, `valuePosition`, `symbol` を抽出 |

- **共通プロパティの正規化**:
  - `id`: 木材等は `"legacy-" + UniqueID`、その他はUUIDまたは一意な文字列。
  - `displayId`: `parseInt(UniqueID)`
  - `name`: `<CommentText>`（空なら部材種別名）
  - `partName`: `<SubPartsName>` または `<LinkedCutPartsText>`
  - `position`: `<Location>` (`"x,y,z"`) をパース
  - `quaternion`: `<Quaternion>` (`"x,y,z,w"`) をパース
  - `color`: `<Diffuse>` (`"r,g,b,a"`) を正規化 `{ r, g, b }` に変換
  - `visible`: `<Hide> !== "true"`
  - `groupId`: `parseInt(GroupID)` (未グループ化は `0`)
  - `layerId`: `parseInt(Layer) + 1` (レイヤーIDシフトに同期)

#### 4. 木取り図 (`<CutList>`)
- `<CutListPartsBase>` および `<Parts.CutParts>` の配置座標 (`Location: "z,x"`)、参照部材 (`CutID`) を V4 の `cutList.layouts`（`baseId`, `partsId`, `x`, `z`）へ変換。
- ノコ刃切り代（`cutWidthMm`）を規定値（3mm）または旧データから抽出して設定。
- これにより、旧バージョンのファイルであっても「材料取り図」モードで切断配置図と歩留まりを完全表示可能とする。

#### 5. メッシュテーブル (`<_2xBooleanMeshInfo>`)
- `<MeshVertex>` (`"x,y,z/x,y,z/..."`) の頂点座標群をパースし、`polygonMeshTable.vertices` に展開。
- `<MeshFaceInfo>`（面定義）をインデックス化し、`polygonMeshTable.faces` に展開。

---

### 3.3 エラーハンドリング・コンソールログ出力要件

「変換に失敗した場合は失敗した個所とその理由をconsole.logに出力して、処理は継続してください」という要件を満たすため、以下の堅牢化設計を義務付けます。

#### 1. ログ出力仕様
- **出力先**: `console.log`（または警告レベルとして `console.warn` / `console.error` を併用しつつ必ず `console.log` にログを残す）
- **出力フォーマット**:
  ```javascript
  console.log(`[LegacyConverter] 変換警告/スキップ: [${targetLocation}] ${reason}`, {
    xmlNode: nodeName,
    uniqueId: uniqueId,
    error: err
  });
  ```
- **必須出力項目**:
  1. `targetLocation`: 失敗した箇所（例: `Object(UniqueID=12, Tag=_2xBoard)`, `Layer(ID=2)`, `CutList.Layout(PartID=5)`, `Camera.Position`）
  2. `reason`: 失敗の理由（例: `"座標文字列 'invalid,coords' のパースに失敗しました"`, `"未知のオブジェクトタグ <_2xUnknown> です"`, `"必須フィールド UniqueID が欠落しています"`）
  3. 捕捉した例外オブジェクト（スタックトレース等）

#### 2. フォールトトレラント処理方針（Graceful Degradation）

| 失敗箇所 | 発生ケース | ログ出力内容 | 継続処理（フォールバック） |
| :--- | :--- | :--- | :--- |
| **単一部材 (Object)** | 必須タグの欠損、座標・回転数値の不正、未知の部材タグ | 失敗した部材のタグ、UniqueID、理由を出力 | 当該部材のみ変換をスキップし、他の部材の変換・表示を継続。 |
| **一部プロパティ** | 色（Diffuse）やサイズ、角度のフォーマット異常 | 対象プロパティ名、部材ID、理由を出力 | 該当プロパティにデフォルト値（例: デフォルト木材色、回転なしクォータニオン）を適用して部材を生成。 |
| **レイヤー (Layer)** | レイヤーID重複、カラーパース異常 | レイヤーID、理由を出力 | ルートレイヤー（ID: 0）またはデフォルトレイヤーへ自動所属させ、処理を継続。 |
| **カメラ (Camera)** | 視点座標のパース失敗 | エラー理由を出力 | デフォルトカメラ位置・ターゲットを適用して継続。 |
| **木取り図 (CutList)** | 木取り情報の構文異常、対象部材不整合 | CutListの処理箇所、理由を出力 | 木取り図の当該配置のみスキップ、または `cutList: null` としてモデル全体の3D表示を継続。 |
| **XMLルート異常** | XML構文エラー、<_2xModel> 要素が存在しない | パースエラー詳細を出力 | この場合のみ全体ロード不可とし、ユーザーに明確なアラートを表示。 |

---

## 4. 非機能要件

### 4.1 パフォーマンス・レスポンス
- 数百点におよぶ部材を含む大規模旧モデル（例: `重箱式巣箱.cadiy` 約1MB等）であっても、ブラウザのメインスレッドを長時間ブロックせず、1秒以内に変換を完了すること。
- 文字列分割（カンマ区切り、スラッシュ区切り）の処理効率を高め、無駄なオブジェクト生成・正規表現オーバーヘッドを抑える。

### 4.2 互換性・保守性
- **TypeScript 型安全**: `src/types/cadiy-legacy.ts` および `src/types/cadiy4.ts` を用いて、入力XMLと出力JSONの双方で静的型チェックを担保する。
- **モジュール分離**: 変換ロジックは単一の巨大関数にせず、`LegacyCadiyParser`（XML解析）と `LegacyToV4Converter`（マッピング・フォールトトレラント変換）に疎結合化する。

---

## 5. テスト・検証要件

### 5.1 実モデルによる結合検証
プロジェクト内の `migration/` ディレクトリに存在する実データをテストベッドとして使用し、検証を実施する。

1. **`migration/NASケース.cadiy`**:
   - 板材、図形パーツ（polygon）、多数の寸法線（dimension）、木取り図（CutList）を含む代表的家具モデル。
   - 変換後、既存の `migration/NASケース.cadiy4` と比較し、部材点数、位置・寸法、木取り図の整合性を検証する。
2. **`migration/重箱式巣箱.cadiy`**:
   - 1MBを超える大規模構造モデル。
   - 大量部材の変換負荷、メモリ消費、変換完了速度を検証する。

### 5.2 異常系・フォールトトレラント検証
- 意図的に一部の `<Location>` や `<Diffuse>` を不正値に改変したテスト用 `.cadiy` データを作成。
- 該当部材がスキップまたはフォールバックされ、`console.log` に期待通りのエラー詳細が出力された上で、正常に3Dシーンが表示されることを確認する。

---

## 6. 改訂履歴

| 日付 | バージョン | 改訂内容 | 作成者 |
| :--- | :--- | :--- | :--- |
| 2026-11-19 | 1.0.0 | 初版作成。旧形式（`.cadiy`）の対応要件、V4内部変換方式、エラー時のconsole.log出力と処理継続（フォールトトレラント）仕様を規定。 | caDIY3D Agent Team |
