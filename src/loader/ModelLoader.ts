import { Cadiy4Data } from '../types/cadiy4';
import { Cadiy4Parser } from './Cadiy4Parser';
import { LegacyCadiyParser } from './LegacyCadiyParser';
import { LegacyToV4Converter } from './LegacyToV4Converter';

/**
 * 統合モデルローダー
 * 入力データが新形式 (JSON / .cadiy4) か旧形式 (XML / .cadiy) かを自動判別し、
 * 常に統一された Cadiy4Data として返却する
 */
export class ModelLoader {
  private cadiy4Parser: Cadiy4Parser;
  private legacyParser: LegacyCadiyParser;
  private legacyConverter: LegacyToV4Converter;

  constructor() {
    this.cadiy4Parser = new Cadiy4Parser();
    this.legacyParser = new LegacyCadiyParser();
    this.legacyConverter = new LegacyToV4Converter();
  }

  /**
   * テキストデータ (JSON または XML) をパース・変換して Cadiy4Data を返す
   */
  public load(text: string, modelName: string = 'モデル'): Cadiy4Data {
    const trimmed = text.trim();

    if (this.isLegacyXml(trimmed)) {
      // 旧バージョン (.cadiy / XML)
      const legacyProject = this.legacyParser.parse(trimmed);
      return this.legacyConverter.convert(legacyProject, modelName);
    } else {
      // 新バージョン (.cadiy4 / JSON)
      try {
        return this.cadiy4Parser.parse(trimmed);
      } catch (err: any) {
        // もし先頭にBOMや空白があって誤判定された場合の救済
        if (trimmed.includes('<_2xModel>')) {
          const legacyProject = this.legacyParser.parse(trimmed);
          return this.legacyConverter.convert(legacyProject, modelName);
        }
        throw err;
      }
    }
  }

  /**
   * 旧形式のXMLファイルかどうかを判定する
   */
  public isLegacyXml(text: string): boolean {
    const trimmed = text.trim();
    return trimmed.startsWith('<') || trimmed.includes('<_2xModel>');
  }
}
