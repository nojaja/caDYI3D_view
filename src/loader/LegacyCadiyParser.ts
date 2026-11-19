import { LegacyCadiyProject } from '../types/cadiy-legacy';

/**
 * caDIY3D 旧形式 (.cadiy) XMLパーサー
 * ブラウザおよびNode.js (テスト環境) の双方で依存ゼロで高速動作する自己完結型XMLパーサー
 */
export class LegacyCadiyParser {
  /**
   * XML文字列をパースし、LegacyCadiyProject オブジェクトを返す
   */
  public parse(xmlString: string): LegacyCadiyProject {
    const trimmed = xmlString.trim();
    if (!trimmed.startsWith('<')) {
      throw new Error('XML構文エラー: 有効なXMLテキストではありません。');
    }

    const obj = this.xmlToJs(trimmed);
    if (!obj || typeof obj !== 'object' || !obj._2xModel) {
      throw new Error('フォーマットエラー: ルート要素 <_2xModel> が見つかりません。');
    }

    return obj as LegacyCadiyProject;
  }

  /**
   * XML文字列を再帰的にパースして JavaScript オブジェクトへ変換する
   */
  private xmlToJs(xml: string): any {
    // 宣言 <?xml ...?> やコメント <!-- ... --> を除去
    const cleanXml = xml
      .replace(/<\?xml[\s\S]*?\?>/g, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .trim();

    // トークン正規表現: タグまたはテキスト
    // グループ1: 終了タグ名 (例: /_2xModel)
    // グループ2: 自己終了タグ名 (例: Remarks />)
    // グループ3: 開始タグ名 (例: _2xModel)
    const tagRegex = /<(?:\/([a-zA-Z0-9_]+)|([a-zA-Z0-9_]+)\s*\/>|([a-zA-Z0-9_]+))>/g;

    interface StackItem {
      tag: string;
      obj: Record<string, any>;
      text: string;
    }

    const root: Record<string, any> = {};
    const stack: StackItem[] = [{ tag: '__ROOT__', obj: root, text: '' }];

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = tagRegex.exec(cleanXml)) !== null) {
      const matchIndex = match.index;
      // タグの直前のテキストを取得
      const textBetween = cleanXml.slice(lastIndex, matchIndex).trim();
      if (textBetween && stack.length > 0) {
        stack[stack.length - 1].text += (stack[stack.length - 1].text ? ' ' : '') + textBetween;
      }
      lastIndex = tagRegex.lastIndex;

      const closeTag = match[1];
      const selfCloseTag = match[2];
      const openTag = match[3];

      if (selfCloseTag) {
        // 空要素タグ <Tag />
        const current = stack[stack.length - 1];
        this.addChild(current.obj, selfCloseTag, '');
      } else if (openTag) {
        // 開始タグ <Tag>
        const newItem: StackItem = {
          tag: openTag,
          obj: {},
          text: '',
        };
        stack.push(newItem);
      } else if (closeTag) {
        // 終了タグ </Tag>
        if (stack.length <= 1) {
          throw new Error(`XML構文エラー: 予期しない閉じタグ </${closeTag}> です。`);
        }
        const popped = stack.pop()!;
        if (popped.tag !== closeTag) {
          throw new Error(`XML構文エラー: タグの対応が不正です (<${popped.tag}> と </${closeTag}>)`);
        }

        // 子要素がある場合は popped.obj、なければテキスト（無ければ空文字）
        const hasChildren = Object.keys(popped.obj).length > 0;
        const val = hasChildren ? popped.obj : this.decodeXmlEntities(popped.text);

        const parent = stack[stack.length - 1];
        this.addChild(parent.obj, popped.tag, val);
      }
    }

    return root;
  }

  /**
   * XML実体参照 (&amp;, &lt;, &gt;, &quot;, &apos;) をデコードする
   */
  private decodeXmlEntities(str: string): string {
    if (!str.includes('&')) return str;
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  }

  /**
   * 親オブジェクトに子プロパティを追加する。すでに同名プロパティがあれば配列化する。
   */
  private addChild(parent: Record<string, any>, key: string, value: any): void {
    if (key in parent) {
      if (Array.isArray(parent[key])) {
        parent[key].push(value);
      } else {
        parent[key] = [parent[key], value];
      }
    } else {
      parent[key] = value;
    }
  }
}
