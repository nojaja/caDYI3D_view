import { Viewer } from '../core/Viewer';
import { Cadiy4Parser } from '../loader/Cadiy4Parser';
import { CadiyObject, Cadiy4Data } from '../types/cadiy4';
import { ViewModeManager, ViewMode } from '../core/ViewModeManager';
import { LayerManager } from '../core/LayerManager';
import { formatObjectProperties } from '../utils/propertyFormatter';
import { CutListCalculator } from '../core/CutListCalculator';

export class ViewerUI {
  private viewer: Viewer;
  private parser: Cadiy4Parser;
  private viewModeManager: ViewModeManager;
  private layerManager: LayerManager;
  private cutListCalculator: CutListCalculator;
  private currentData: Cadiy4Data | null = null;

  private loadingOverlay: HTMLElement;
  private inspectorCard: HTMLElement;
  private inspectorTitle: HTMLElement;
  private inspectorDetail: HTMLElement;
  private dropzoneOverlay: HTMLElement;
  private fileInput: HTMLInputElement;
  private modelTitle: HTMLElement;
  private layerTreeContainer: HTMLElement;
  private layerPanel: HTMLElement;
  private bottomControls: HTMLElement;

  private cutlistViewContainer: HTMLElement;
  private cutlistSheetsContainer: HTMLElement;
  private cutplanCutwidthVal: HTMLElement;
  private threeviewContainer: HTMLElement;

  private modeBtn3d: HTMLElement;
  private modeBtnCutList: HTMLElement;
  private modeBtnThreeView: HTMLElement;

  constructor(viewer: Viewer) {
    this.viewer = viewer;
    this.parser = new Cadiy4Parser();
    this.viewModeManager = new ViewModeManager();
    this.layerManager = new LayerManager();
    this.cutListCalculator = new CutListCalculator();

    this.loadingOverlay = document.getElementById('loading-overlay')!;
    this.inspectorCard = document.getElementById('inspector-card')!;
    this.inspectorTitle = document.getElementById('inspector-title')!;
    this.inspectorDetail = document.getElementById('inspector-detail')!;
    this.dropzoneOverlay = document.getElementById('dropzone-overlay')!;
    this.fileInput = document.getElementById('file-input') as HTMLInputElement;
    this.modelTitle = document.getElementById('model-title')!;
    this.layerTreeContainer = document.getElementById('layer-tree-container')!;
    this.layerPanel = document.getElementById('layer-panel')!;
    this.bottomControls = document.getElementById('bottom-controls')!;

    this.cutlistViewContainer = document.getElementById('cutlist-view-container')!;
    this.cutlistSheetsContainer = document.getElementById('cutlist-sheets-container')!;
    this.cutplanCutwidthVal = document.getElementById('cutplan-cutwidth-val')!;
    this.threeviewContainer = document.getElementById('threeview-container')!;

    this.modeBtn3d = document.getElementById('mode-btn-3d')!;
    this.modeBtnCutList = document.getElementById('mode-btn-cutlist')!;
    this.modeBtnThreeView = document.getElementById('mode-btn-threeview')!;

    this.initEvents();
    this.initLayerEvents();
    this.initViewModeEvents();
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

    // 4. インスペクタ閉じるボタン
    document.getElementById('btn-close-inspector')?.addEventListener('click', () => {
      this.hideInspector();
      this.layerManager.selectObject(null);
      this.updateSelectedLayerItem(null);
    });
  }

  private initViewModeEvents(): void {
    this.modeBtn3d.addEventListener('click', () => {
      this.viewModeManager.setMode('3d');
    });

    this.modeBtnCutList.addEventListener('click', () => {
      this.viewModeManager.setMode('cutList');
    });

    this.modeBtnThreeView.addEventListener('click', () => {
      this.viewModeManager.setMode('threeView');
    });

    this.viewModeManager.onModeChange((newMode) => {
      this.updateModeButtons(newMode);
      this.handleModeChanged(newMode);
    });

    // 三面図ビューポート上でのホイールズーム操作
    this.threeviewContainer.addEventListener('wheel', (e) => {
      e.preventDefault();
      const deltaFactor = e.deltaY > 0 ? 0.9 : 1.1;
      this.viewer.zoomThreeView(deltaFactor);
    }, { passive: false });
  }

  private handleModeChanged(mode: ViewMode): void {
    this.viewer.setViewMode(mode);

    if (mode === '3d') {
      this.cutlistViewContainer.style.display = 'none';
      this.threeviewContainer.style.display = 'none';
      this.bottomControls.style.display = 'flex';
      this.layerPanel.style.display = 'block';
    } else if (mode === 'cutList') {
      this.cutlistViewContainer.style.display = 'block';
      this.threeviewContainer.style.display = 'none';
      this.bottomControls.style.display = 'none';
      this.layerPanel.style.display = 'none';
      this.hideInspector();
      this.renderCutListView();
    } else if (mode === 'threeView') {
      this.cutlistViewContainer.style.display = 'none';
      this.threeviewContainer.style.display = 'block';
      this.bottomControls.style.display = 'none';
      this.layerPanel.style.display = 'none';
      this.hideInspector();
    }
  }

  private renderCutListView(): void {
    const sheets = this.cutListCalculator.calculate(
      this.currentData?.cutList,
      this.currentData?.objects
    );

    this.cutplanCutwidthVal.textContent = String(this.currentData?.cutList?.cutWidthMm || 3);
    this.cutlistSheetsContainer.innerHTML = '';

    if (sheets.length === 0) {
      this.cutlistSheetsContainer.innerHTML = '<div style="color: #6b7280; font-size: 13px; text-align: center; padding: 30px;">材料取り図データ (cutList) が存在しません</div>';
      return;
    }

    for (const sheet of sheets) {
      const sheetEl = document.createElement('div');
      sheetEl.className = 'cutplan-sheet';

      const header = document.createElement('div');
      header.className = 'cutplan-sheet-header';
      header.innerHTML = `
        <span><strong>材料 #${sheet.baseId + 1}</strong> (${sheet.lumberName || '角材'})</span>
        <span>使用長: ${sheet.usedLengthMm.toFixed(0)}mm / 端材: ${sheet.remainingLengthMm.toFixed(0)}mm (歩留まり: ${sheet.yieldRatePercent.toFixed(1)}%)</span>
      `;

      const canvas = document.createElement('div');
      canvas.className = 'cutplan-board-canvas';

      const totalLen = sheet.usedLengthMm + sheet.remainingLengthMm;

      for (const item of sheet.items) {
        const block = document.createElement('div');
        block.className = 'cutplan-part-block';
        const widthPct = (item.lengthMm / totalLen) * 100;
        block.style.width = `${Math.max(widthPct, 4)}%`;

        const label = document.createElement('div');
        label.className = 'cutplan-part-label';
        label.textContent = `${item.object.partName || item.object.name} (${item.lengthMm.toFixed(0)}mm)`;
        block.appendChild(label);

        canvas.appendChild(block);
      }

      if (sheet.remainingLengthMm > 0) {
        const remaining = document.createElement('div');
        remaining.className = 'cutplan-remaining-block';
        remaining.textContent = `端材 (${sheet.remainingLengthMm.toFixed(0)}mm)`;
        canvas.appendChild(remaining);
      }

      sheetEl.appendChild(header);
      sheetEl.appendChild(canvas);
      this.cutlistSheetsContainer.appendChild(sheetEl);
    }
  }

  private updateModeButtons(activeMode: ViewMode): void {
    this.modeBtn3d.classList.toggle('active', activeMode === '3d');
    this.modeBtn3d.setAttribute('aria-selected', String(activeMode === '3d'));

    this.modeBtnCutList.classList.toggle('active', activeMode === 'cutList');
    this.modeBtnCutList.setAttribute('aria-selected', String(activeMode === 'cutList'));

    this.modeBtnThreeView.classList.toggle('active', activeMode === 'threeView');
    this.modeBtnThreeView.setAttribute('aria-selected', String(activeMode === 'threeView'));
  }

  private initLayerEvents(): void {
    this.layerManager.onVisibilityChange((layerId, visible) => {
      this.viewer.setLayerVisibility(layerId, visible);
      this.renderLayerTree();
    });

    this.layerManager.onSelect((objectId) => {
      this.updateSelectedLayerItem(objectId);
      if (objectId) {
        const obj = this.viewer.getObjectById(objectId);
        this.handleObjectSelected(obj);
      } else {
        this.hideInspector();
      }
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
      const fileName = file.name.replace(/\.[^/.]+$/, '');
      this.onModelLoaded(data, fileName);
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

      const urlParts = url.split('/');
      const lastPart = urlParts[urlParts.length - 1] || 'model';
      const fileName = lastPart.replace(/\.[^/.]+$/, '');

      this.onModelLoaded(data, fileName);
    } catch (err: any) {
      console.error('URLロードエラー:', err);
      alert(`モデルの取得に失敗しました (${url}):\n${err.message}`);
    } finally {
      this.showLoading(false);
    }
  }

  private onModelLoaded(data: Cadiy4Data, modelName: string): void {
    this.currentData = data;
    this.modelTitle.textContent = modelName;
    this.modelTitle.title = modelName;

    this.viewer.loadModel(data);
    this.layerManager.init(data.layers, data.objects);
    this.renderLayerTree();
    this.hideInspector();

    if (this.viewModeManager.getCurrentMode() === 'cutList') {
      this.renderCutListView();
    }
  }

  /**
   * レイヤーツリーのHTMLレンダリング
   */
  private renderLayerTree(): void {
    const tree = this.layerManager.getTree();
    this.layerTreeContainer.innerHTML = '';

    for (const node of tree) {
      const layerItem = document.createElement('div');
      layerItem.className = 'layer-item';

      const isExpanded = node.isExpanded;
      const isVisible = node.layer.visible;

      // ヘッダー行
      const header = document.createElement('div');
      header.className = 'layer-item-header';

      const left = document.createElement('div');
      left.className = 'layer-header-left';

      const toggleIcon = document.createElement('span');
      toggleIcon.className = 'layer-toggle-icon';
      toggleIcon.textContent = isExpanded ? '▼' : '▶';

      const layerName = document.createElement('span');
      layerName.className = 'layer-name';
      layerName.textContent = node.layer.name;

      left.appendChild(toggleIcon);
      left.appendChild(layerName);

      // 可視性トグルボタン
      const visBtn = document.createElement('button');
      visBtn.className = `layer-visibility-btn ${isVisible ? 'on' : 'off'}`;
      visBtn.title = isVisible ? 'レイヤーを非表示' : 'レイヤーを表示';
      visBtn.innerHTML = isVisible
        ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>'
        : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m2 2 20 20M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path></svg>';

      visBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.layerManager.setLayerVisibility(node.layer.id, !isVisible);
      });

      header.appendChild(left);
      header.appendChild(visBtn);

      // 開閉トグル
      header.addEventListener('click', () => {
        this.layerManager.toggleLayerExpanded(node.layer.id);
        this.renderLayerTree();
      });

      layerItem.appendChild(header);

      // 配下オブジェクト一覧
      if (isExpanded) {
        const objList = document.createElement('div');
        objList.className = 'layer-object-list';

        for (const obj of node.objects) {
          const objItem = document.createElement('div');
          objItem.className = 'layer-object-item';
          objItem.dataset.id = obj.id;
          if (this.layerManager.getSelectedObjectId() === obj.id) {
            objItem.classList.add('selected');
          }
          objItem.textContent = obj.partName || obj.name;

          objItem.addEventListener('click', () => {
            this.layerManager.selectObject(obj.id);
          });

          objList.appendChild(objItem);
        }

        layerItem.appendChild(objList);
      }

      this.layerTreeContainer.appendChild(layerItem);
    }
  }

  private updateSelectedLayerItem(selectedId: string | null): void {
    const items = this.layerTreeContainer.querySelectorAll('.layer-object-item');
    items.forEach((item) => {
      const el = item as HTMLElement;
      if (selectedId && el.dataset.id === selectedId) {
        el.classList.add('selected');
      } else {
        el.classList.remove('selected');
      }
    });
  }

  /**
   * パーツが選択された際の詳細ビュー (インスペクタ) 表示
   */
  public handleObjectSelected(object: CadiyObject | null): void {
    if (!object) {
      this.hideInspector();
      return;
    }

    const props = formatObjectProperties(object);
    this.inspectorTitle.textContent = props.name;

    const priceText = props.price !== null ? `¥${props.price.toLocaleString()}` : '未設定';
    const weightText = props.weightKg !== null ? `${props.weightKg.toFixed(2)} kg` : '未設定';
    const posText = `${props.positionMm.x.toFixed(1)}, ${props.positionMm.y.toFixed(1)}, ${props.positionMm.z.toFixed(1)} mm`;
    const sizeText = `${props.sizeMm.x.toFixed(1)} × ${props.sizeMm.y.toFixed(1)} × ${props.sizeMm.z.toFixed(1)} mm`;
    const rotText = `X: ${props.rotationDeg.x}°, Y: ${props.rotationDeg.y}°, Z: ${props.rotationDeg.z}°`;

    const detailHtml = `
      <div class="inspector-row">
        <span class="inspector-label">名称:</span>
        <span class="inspector-value">${props.name}</span>
      </div>
      <div class="inspector-row">
        <span class="inspector-label">規格:</span>
        <span class="inspector-value">${props.standardName}</span>
      </div>
      <div class="inspector-row">
        <span class="inspector-label">重量:</span>
        <span class="inspector-value">${weightText}</span>
      </div>
      <div class="inspector-row">
        <span class="inspector-label">価格:</span>
        <span class="inspector-value">${priceText}</span>
      </div>
      <div class="inspector-row">
        <span class="inspector-label">位置:</span>
        <span class="inspector-value">${posText}</span>
      </div>
      <div class="inspector-row">
        <span class="inspector-label">サイズ:</span>
        <span class="inspector-value">${sizeText}</span>
      </div>
      <div class="inspector-row">
        <span class="inspector-label">傾き:</span>
        <span class="inspector-value">${rotText}</span>
      </div>
      <div class="inspector-row">
        <span class="inspector-label">形状加工:</span>
        <span class="inspector-value">${props.processingInfo}</span>
      </div>
    `;

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
