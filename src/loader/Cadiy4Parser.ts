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

    // オブジェクトのID重複検出と正規化（legacy-0 等のレガシー重複IDの救済）
    const seenIds = new Set<string>();
    const duplicateIds = new Set<string>();
    for (const obj of data.objects) {
      if (obj && typeof obj.id === 'string') {
        if (seenIds.has(obj.id)) {
          duplicateIds.add(obj.id);
        } else {
          seenIds.add(obj.id);
        }
      }
    }

    if (duplicateIds.size > 0) {
      const usedIds = new Set<string>();
      for (let i = 0; i < data.objects.length; i++) {
        const obj = data.objects[i];
        if (!obj) continue;
        if (duplicateIds.has(obj.id) || !obj.id) {
          let newId = obj.displayId !== undefined ? `legacy-${obj.displayId}` : `${obj.id || 'obj'}-${i}`;
          if (usedIds.has(newId)) {
            newId = `${newId}-${i}`;
          }
          obj.id = newId;
        }
        usedIds.add(obj.id);
      }
    }

    return data as Cadiy4Data;
  }
}
