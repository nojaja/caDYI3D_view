import { Cadiy4Data } from '../types/cadiy4';

export class Cadiy4Parser {
  /**
   * JSON文字列をパースし、Cadiy4Data として検証・返却する
   */
  public parse(jsonString: string): Cadiy4Data {
    let data: any;
    try {
      data = JSON.parse(jsonString);
    } catch (e: any) {
      throw new Error(`JSON構文エラー: ${e.message}`);
    }

    if (!data || typeof data !== 'object') {
      throw new Error('無効なデータ形式: JSONオブジェクトである必要があります。');
    }

    if (typeof data.version !== 'number') {
      throw new Error('フォーマットエラー: "version" フィールドが見つかりません。');
    }

    if (!data.camera || typeof data.camera !== 'object') {
      throw new Error('フォーマットエラー: "camera" フィールドが見つかりません。');
    }

    if (!Array.isArray(data.objects)) {
      throw new Error('フォーマットエラー: "objects" フィールドが見つかりません。');
    }

    return data as Cadiy4Data;
  }
}
