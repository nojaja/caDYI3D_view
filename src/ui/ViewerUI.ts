import { Viewer } from '../core/Viewer';
import { Cadiy4Parser } from '../loader/Cadiy4Parser';
import { CadiyObject } from '../types/cadiy4';

export class ViewerUI {
  private viewer: Viewer;
  private parser: Cadiy4Parser;
  private loadingOverlay: HTMLElement;
  private inspectorCard: HTMLElement;
  private inspectorTitle: HTMLElement;
  private inspectorDetail: HTMLElement;
  private dropzoneOverlay: HTMLElement;
  private fileInput: HTMLInputElement;

  constructor(viewer: Viewer) {
    this.viewer = viewer;
    this.parser = new Cadiy4Parser();

    this.loadingOverlay = document.getElementById('loading-overlay')!;
    this.inspectorCard = document.getElementById('inspector-card')!;
    this.inspectorTitle = document.getElementById('inspector-title')!;
    this.inspectorDetail = document.getElementById('inspector-detail')!;
    this.dropzoneOverlay = document.getElementById('dropzone-overlay')!;
    this.fileInput = document.getElementById('file-input') as HTMLInputElement;

    this.initEvents();
  }

  private initEvents(): void {
    // 1. ファイル選択ボタン
    const openFileBtn = document.getElementById('btn-open-file');
    if (openFileBtn && this.fileInput) {
      openFileBtn.addEventListener('click', () => {
        this.fileInput.click();
      });

      this.fileInput.addEventListener('change', (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          this.loadFile(file);
        }
      });
    }

    // 2. ドラッグ＆ドロップ (D&D)
    window.addEventListener('dragenter', (e) => {
      e.preventDefault();
      this.dropzoneOverlay.classList.add('drag-active');
    });

    window.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropzoneOverlay.classList.add('drag-active');
    });

    window.addEventListener('dragleave', (e) => {
      e.preventDefault();
      if (e.relatedTarget === null) {
        this.dropzoneOverlay.classList.remove('drag-active');
      }
    });

    window.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropzoneOverlay.classList.remove('drag-active');
      const file = e.dataTransfer?.files[0];
      if (file) {
        this.loadFile(file);
      }
    });

    // 3. 視点操作ボタン
    document.getElementById('btn-fit')?.addEventListener('click', () => {
      this.viewer.fitToModel();
    });
    document.getElementById('btn-iso')?.addEventListener('click', () => {
      this.viewer.setViewPreset('isometric');
    });
    document.getElementById('btn-top')?.addEventListener('click', () => {
      this.viewer.setViewPreset('top');
    });
    document.getElementById('btn-front')?.addEventListener('click', () => {
      this.viewer.setViewPreset('front');
    });
    document.getElementById('btn-side')?.addEventListener('click', () => {
      this.viewer.setViewPreset('side');
    });

    // 4. サンプルモデル切替ボタン (test_rack)
    document.getElementById('btn-sample')?.addEventListener('click', () => {
      this.loadFromUrl('models/test_rack.cadiy4');
    });

    // 5. インスペクタ閉じるボタン
    document.getElementById('btn-close-inspector')?.addEventListener('click', () => {
      this.hideInspector();
    });
  }

  /**
   * ローカルファイル (File オブジェクト) の読み込み
   */
  public async loadFile(file: File): Promise<void> {
    this.showLoading(true);
    try {
      const text = await file.text();
      const data = this.parser.parse(text);
      this.viewer.loadModel(data);
      this.hideInspector();
    } catch (err: any) {
      alert(`モデルの読み込みに失敗しました: ${err.message}`);
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * URL からのフェッチ読み込み (URLクエリパラメータ対応)
   */
  public async loadFromUrl(url: string): Promise<void> {
    this.showLoading(true);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      const text = await response.text();
      const data = this.parser.parse(text);
      this.viewer.loadModel(data);
      this.hideInspector();
    } catch (err: any) {
      console.error('URLロードエラー:', err);
      alert(`モデルの取得に失敗しました (${url}):\n${err.message}`);
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * パーツが選択された際のインスペクタカード表示
   */
  public handleObjectSelected(object: CadiyObject | null): void {
    if (!object) {
      this.hideInspector();
      return;
    }

    const title = object.partName || object.name;
    const sizeMm = `${Math.round(object.size.x * 1000)} × ${Math.round(object.size.y * 1000)} × ${Math.round(object.size.z * 1000)} mm`;
    let detailHtml = `
      <div><strong>種別:</strong> ${object.type}</div>
      <div><strong>規格/名称:</strong> ${object.name}</div>
      <div><strong>寸法:</strong> ${sizeMm}</div>
    `;

    if (object.remarks) {
      detailHtml += `<div><strong>備考:</strong> ${object.remarks}</div>`;
    }

    this.inspectorTitle.textContent = title;
    this.inspectorDetail.innerHTML = detailHtml;
    this.inspectorCard.classList.add('active');
  }

  private hideInspector(): void {
    this.inspectorCard.classList.remove('active');
  }

  private showLoading(show: boolean): void {
    if (show) {
      this.loadingOverlay.classList.add('active');
    } else {
      this.loadingOverlay.classList.remove('active');
    }
  }
}
