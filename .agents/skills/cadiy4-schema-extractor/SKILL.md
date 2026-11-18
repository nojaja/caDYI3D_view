---
name: cadiy4-schema-extractor
description: >-
  Extract, infer, and update the caDIY3D V4 (.cadiy4) JSON Schema definition
  (docs/spec/cadiy4format/cadiy4.schema.json) by manipulating objects via MCP
  and analyzing desktop autosave files.
---

# caDIY3D V4 (.cadiy4) スキーマ抽出・仕様更新スキル

本スキルは、**caDIY3D V4** のデスクトップ自動保存データ（`autosave`）および **MCP（Model Context Protocol）** のリアルタイム操作を活用して、`.cadiy4` プロジェクトファイル形式の仕様をリバース解析・推測し、`docs/spec/cadiy4format/cadiy4.schema.json`（および関連仕様書）を最新状態に更新・検証するための手順ガイドです。

---

## 1. 前提条件と環境構成

- **caDIY3D V4**: デスクトップアプリが起動していること。
- **Claude / MCP連携**: caDIY3D 設定画面で「Claude integration」が有効であること。
- **接続情報ファイル**:
  - Windows: `%APPDATA%\com.jpms.cadiy3d.desktop\mcp-connection.json`
  - macOS: `~/Library/Application Support/com.jpms.cadiy3d.desktop/mcp-connection.json`
  - 内容例: `{"port": 47823, "token": "<BEARER_TOKEN>", "url": "http://127.0.0.1:47823/mcp"}`
- **自動保存ディレクトリ**:
  - Windows: `%APPDATA%\com.jpms.cadiy3d.desktop\autosave\`
  - 内容: `unsaved__<timestamp>.cadiy4` または `<uuid>__<timestamp>.cadiy4`
- **対象スキーマ配置パス**:
  - `docs/spec/cadiy4format/cadiy4.schema.json`
  - `docs/spec/cadiy4format/README.md`

---

## 2. ワークフロー手順

### Step 1: MCP 接続情報の取得と疎通確認

1. `mcp-connection.json` から最新のポート番号と Bearer トークンを読み取ります。
2. MCP エンドポイント（`http://127.0.0.1:<PORT>/mcp`）に対して JSON-RPC リクエストを送信し、疎通と現在のシーン情報を取得します：
   ```powershell
   # 接続テスト (PowerShell)
   $token = (Get-Content "$env:APPDATA\com.jpms.cadiy3d.desktop\mcp-connection.json" | ConvertFrom-Json).token
   curl.exe -s -X POST -H "Authorization: Bearer $token" -H "Content-Type: application/json" `
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_scene","arguments":{}}}' `
     "http://127.0.0.1:47823/mcp"
   ```

### Step 2: 未知・未確認プロパティの探索（MCP 経由のオブジェクト操作）

スキーマで未定義または仕様が不明確なパーツタイプ（例: `waveBoard`, `tube`, `polygon`, `comment`, `protractor` 等）がある場合、MCP ツール（`add_objects`, `add_comments`, `add_protractors`, `add_parts` 等）を使用してシーンへ配置します。

これにより、caDIY3D 内部でオブジェクトが構築され、自動保存ファイルへのシリアライズ対象となります。

### Step 3: 自動保存（autosave）データの検出と差分解析

caDIY3D は編集操作後、一定間隔またはトリガーで自動保存領域に `.cadiy4`（JSON形式）を出力します。

同梱の解析スクリプトを実行して、最新の自動保存データと既存スキーマの差分（未定義プロパティ）を検出します：

```bash
node .agents/skills/cadiy4-schema-extractor/scripts/inspect-autosave.js
```

出力結果を確認し：
- 新規追加されたプロパティ（`* NEW / UNDEFINED in schema`）
- 各オブジェクトタイプ（`type`）の必須/任意フィールド
- 型（number, string, boolean, object, array）および値の範囲（enum, min/max）
を特定します。

### Step 4: `docs/spec/cadiy4format/cadiy4.schema.json` の更新

検出した差分に基づき、スキーマ定義を更新します：
1. `cadiy4.schema.json` の `definitions.SceneObject.properties` に新フィールドを追加。
2. 必要に応じて `type` の enum リストや関連オブジェクト定義（`Vector3`, `Quaternion`, `ColorRGB`, `ColorRGBA` 等）を補正。
3. `docs/spec/cadiy4format/README.md` に仕様解説（型、単位、役割、デフォルト値）を追記。

### Step 5: テストデータの生成とスキーマバリデーション

更新後のスキーマに準拠したテストプロジェクト（`.cadiy4`）を作成し、バリデーションスクリプトを実行します：

```bash
node .agents/skills/cadiy4-schema-extractor/scripts/validate-schema.js testdata/test_rack.cadiy4
```

### Step 6: caDIY3D での相互運用性検証

1. 生成した `.cadiy4` ファイルを caDIY3D 画面の「ファイル」>「開く」でロードします。
2. MCP ツール（`get_scene`, `get_cut_plan`, `capture_view`）を呼び出し、モデルが破損や欠落なく意図通りロードされたかを自動検証します：
   - 全パーツの座標、寸法、回転が一致しているか
   - 寸法線や看板のテキスト・計測値が正しくレンダリングされているか
   - 木取り図が正常に計算されているか

---

## 3. 同梱スクリプト

- **`scripts/inspect-autosave.js`**:
  `autosave` フォルダの最新 `.cadiy4` を自動検索し、全パーツタイプのプロパティ一覧とスキーマとの差分をレポートします。
- **`scripts/validate-schema.js`**:
  任意の `.cadiy4` ファイルを `docs/spec/cadiy4format/cadiy4.schema.json` に照らして必須項目・型の一致を検証します。
