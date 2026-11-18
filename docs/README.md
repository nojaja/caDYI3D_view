# caDIY3D Web Viewer ドキュメント一覧

本ディレクトリ（`docs/`）には、「caDIY3D Web 3Dモデルビューア」の設計・開発に関する仕様書・ドキュメントが格納されています。

---

## ドキュメント一覧

| ファイル | 文書名 | 概要 |
| :--- | :--- | :--- |
| [requirements.md](requirements.md) | **要件定義書** | システム概要、ユースケース、ファイル入力要件（D&D、ファイル選択、URL指定）、スマホ対応要件、機能・非機能要件、運用要件。 |
| [tech-stack.md](tech-stack.md) | **技術スタック検討・選定書** | 3Dエンジン比較（Three.js選定）、Vite + TypeScript、モジュールアーキテクチャ、木工プロシージャル描画、スマホ最適化戦略。 |
| [testing-strategy.md](testing-strategy.md) | **3D描画TDD・自動検証ガイド** | 3D描画テストピラミッド、Vitestによる幾何アサーション、Playwrightによる非空ピクセル検証・VRT（画像差分比較）、CI自動化手順。 |

---

## 関連仕様書

- [cadiy4format 仕様書](spec/cadiy4format/README.md): caDIY3D V4 プロジェクトファイル形式（`.cadiy4`）のスキーマ・データ仕様書
- [cadiy4.schema.json](spec/cadiy4format/cadiy4.schema.json): `.cadiy4` の JSON スキーマ定義
