import { Viewer } from '../core/Viewer';
import { ModelLoader } from '../loader/ModelLoader';
import { CadiyObject, Cadiy4Data } from '../types/cadiy4';
import { ViewModeManager, ViewMode } from '../core/ViewModeManager';
import { LayerManager, LayerTreeNode } from '../core/LayerManager';
import { formatObjectProperties } from '../utils/propertyFormatter';
import { CutListCalculator, CutPlanSheet, CutPlanItem } from '../core/CutListCalculator';

export class ViewerUI {
  private viewer: Viewer;
  private modelLoader: ModelLoader;
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

  private isSelectingFrom3D = false;
  private isInspectorOpen = false;

  private cutlistTouchTimer: any = null;
  private cutlistTouchStartX = 0;
  private cutlistTouchStartY = 0;
  private isCutlistTouchDragging = false;

  constructor(viewer: Viewer) {
    this.viewer = viewer;
    this.modelLoader = new ModelLoader();
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
      // iOS (iPhone / iPad / iPod) では独自拡張子の accept 指定によって「ファイル」アプリで
      // グレーアウトして選択できなくなるため、iOS環境では accept 属性を解除して全ファイルを選択可能にする
      const isIOS =
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (isIOS) {
        this.fileInput.removeAttribute('accept');
      }

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
      this.isInspectorOpen = false;
      this.hideInspector();
      this.layerManager.selectObject(null);
      this.updateSelectedLayerItem(null);
    });

    // 5. レイヤーパネルタイトル開閉トグル
    const layerPanelTitle = document.querySelector('.layer-panel-title');
    layerPanelTitle?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.layerPanel.classList.toggle('expanded');
    });

    const layerPanelHeader = document.querySelector('.layer-panel-header');
    layerPanelHeader?.addEventListener('click', () => {
      this.layerPanel.classList.toggle('expanded');
    });

    // 6. ウィンドウリサイズ時に材料取り図のフォントサイズを追従調整
    window.addEventListener('resize', () => {
      if (this.viewModeManager.getCurrentMode() === 'cutList') {
        this.updateCutPlanFontSizes();
      }
    });

    // 7. 材料取り図内のパーツクリック/タップで選択状態にし、何もない箇所をクリック/長押しタップで解除する
    this.cutlistViewContainer.addEventListener('contextmenu', (e) => e.preventDefault());
    this.cutlistViewContainer.addEventListener('click', (e) => {
      if (this.isCutlistTouchDragging) return;
      const target = (e.target as HTMLElement).closest('[data-object-id]');
      if (target) {
        const objId = target.getAttribute('data-object-id');
        if (objId) {
          this.layerManager.selectObject(objId);
        }
      } else {
        // 何もない箇所をクリックした場合、選択解除
        this.layerManager.selectObject(null);
      }
    });

    // 材料取り図: スマホ長押しタップ判定 (何もない箇所の長押しタップで選択解除、パーツ長押しで選択)
    this.cutlistViewContainer.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) {
        this.cancelCutlistLongPress();
        return;
      }
      const touch = e.touches[0];
      this.cutlistTouchStartX = touch.clientX;
      this.cutlistTouchStartY = touch.clientY;
      this.isCutlistTouchDragging = false;

      this.cutlistTouchTimer = setTimeout(() => {
        this.completeCutlistLongPress(touch.clientX, touch.clientY);
      }, 500);
    }, { passive: true });

    this.cutlistViewContainer.addEventListener('touchmove', (e) => {
      if (!this.cutlistTouchTimer) return;
      if (e.touches.length !== 1) {
        this.cancelCutlistLongPress();
        return;
      }
      const touch = e.touches[0];
      const dx = touch.clientX - this.cutlistTouchStartX;
      const dy = touch.clientY - this.cutlistTouchStartY;
      if (Math.hypot(dx, dy) > 10) {
        this.isCutlistTouchDragging = true;
        this.cancelCutlistLongPress();
      }
    }, { passive: true });

    this.cutlistViewContainer.addEventListener('touchend', () => {
      this.cancelCutlistLongPress();
      setTimeout(() => {
        this.isCutlistTouchDragging = false;
      }, 300);
    }, { passive: true });

    this.cutlistViewContainer.addEventListener('touchcancel', () => {
      this.cancelCutlistLongPress();
      setTimeout(() => {
        this.isCutlistTouchDragging = false;
      }, 300);
    }, { passive: true });
  }

  private cancelCutlistLongPress(): void {
    if (this.cutlistTouchTimer) {
      clearTimeout(this.cutlistTouchTimer);
      this.cutlistTouchTimer = null;
    }
  }

  private completeCutlistLongPress(clientX: number, clientY: number): void {
    this.cancelCutlistLongPress();
    // iOS Safariでの長押し選択をクリア
    if (typeof window !== 'undefined' && window.getSelection) {
      window.getSelection()?.removeAllRanges();
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(40); } catch (_) {}
    }
    const el = document.elementFromPoint(clientX, clientY);
    const target = el ? el.closest('[data-object-id]') : null;
    if (target) {
      const objId = target.getAttribute('data-object-id');
      if (objId) {
        this.layerManager.selectObject(objId);
      }
    } else {
      this.layerManager.selectObject(null);
    }
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

      // 3Dview表示の時のみ inspector-card を再表示（閉じるボタンが押されるまでは維持）
      if (this.isInspectorOpen && this.layerManager.getSelectedObjectId()) {
        const obj = this.viewer.getObjectById(this.layerManager.getSelectedObjectId()!);
        if (obj) {
          this.renderInspectorContent(obj);
          this.inspectorCard.classList.add('active');
        }
      }
    } else if (mode === 'cutList') {
      this.cutlistViewContainer.style.display = 'block';
      this.threeviewContainer.style.display = 'none';
      this.bottomControls.style.display = 'none';
      this.layerPanel.style.display = 'none';
      // 3Dview以外の時は一時的に非表示（isInspectorOpen フラグは維持）
      this.hideInspector();
      this.renderCutListView();
    } else if (mode === 'threeView') {
      this.cutlistViewContainer.style.display = 'none';
      this.threeviewContainer.style.display = 'block';
      this.bottomControls.style.display = 'none';
      this.layerPanel.style.display = 'none';
      // 3Dview以外の時は一時的に非表示（isInspectorOpen フラグは維持）
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

    sheets.forEach((sheet, index) => {
      if (sheet.layout === '2d') {
        const sheetEl = this.render2DSheet(sheet, index);
        this.cutlistSheetsContainer.appendChild(sheetEl);
      } else {
        const sheetEl = this.render1DSheet(sheet, index);
        this.cutlistSheetsContainer.appendChild(sheetEl);
      }
    });

    // レンダリング後に画面サイズに合わせてフォントサイズを動的調整
    this.updateCutPlanFontSizes();

    // 選択中オブジェクトがあれば材料取り図上でもハイライト
    this.updateSelectedCutPlanPart(this.layerManager.getSelectedObjectId());
  }

  /**
   * 画面上にレンダリングされた SVG 木取り図内のフォントサイズを動的に調整
   * スケール後のサイズが常に class="cutplan-sheet-header"（13px）相当、スマホ表示時は -2 相当（11px）になるようにする
   */
  public updateCutPlanFontSizes(): void {
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    // PC表示時は 13px (class="cutplan-sheet-header" 相当)、スマホ表示時は 11px (現在のフォントサイズ -2 相当)
    const targetScreenFs = isMobile ? 11 : 13;

    const svgs = this.cutlistSheetsContainer.querySelectorAll<SVGSVGElement>('svg.cutplan-svg-canvas');
    svgs.forEach((svg) => {
      // ブラウザの実効スケーリング比率 (CTM.a) を取得。取得できない環境では viewBox と rect から算出
      const ctm = svg.getScreenCTM ? svg.getScreenCTM() : null;
      let scale = ctm ? ctm.a : 0;
      if (!scale || scale <= 0) {
        const viewBox = svg.viewBox.baseVal;
        const rect = svg.getBoundingClientRect();
        if (!rect.width || !viewBox.width) return;
        scale = Math.min(
          rect.width / viewBox.width,
          rect.height > 0 && viewBox.height > 0 ? rect.height / viewBox.height : rect.width / viewBox.width
        );
      }
      if (scale <= 0) return;

      // 画面上で PC: 13px、スマホ: 11px になるように SVG 座標系フォントサイズを同一ロジックで決定
      const svgFs = Math.max(targetScreenFs / scale, 2);

      // SVG 内のすべてのテキスト要素（端材, 斜めカット, 木取り線, 部材寸法, 部材名, 外寸等）のフォントサイズを同一ロジックで設定
      const textElements = svg.querySelectorAll<SVGTextElement>('text');
      textElements.forEach((el) => {
        el.setAttribute('font-size', svgFs.toFixed(1));
      });

      // 部材名と寸法のYオフセットをフォントサイズに合わせて調整（サイズは対象パーツの上下中央に配置）
      const labelGroups = svg.querySelectorAll<SVGGElement>('.cutplan-part-label');
      labelGroups.forEach((g) => {
        const nameEl = g.querySelector<SVGTextElement>('.cutplan-part-name');
        const sizeEl = g.querySelector<SVGTextElement>('.cutplan-part-size');
        if (sizeEl) {
          if (!g.hasAttribute('data-center-y')) {
            const y = parseFloat(sizeEl.getAttribute('y') || '0');
            g.setAttribute('data-center-y', String(y));
          }
          const centerY = parseFloat(g.getAttribute('data-center-y') || '0');
          // cutplan-part-size の表示位置はその対象 cutplan-svg-part の上下中央
          sizeEl.setAttribute('y', centerY.toFixed(1));
          sizeEl.setAttribute('dominant-baseline', 'central');

          if (nameEl) {
            const offsetY = Math.max(svgFs * 1.1, 4);
            nameEl.setAttribute('y', (centerY - offsetY).toFixed(1));
          }
        }
      });
    });
  }

  /**
   * 2D 板材・合板シートの材料取り図レンダリング
   */
  private render2DSheet(sheet: CutPlanSheet, index?: number): HTMLElement {
    const sheetEl = document.createElement('div');
    sheetEl.className = 'cutplan-sheet cutplan-sheet-2d';

    const header = document.createElement('div');
    header.className = 'cutplan-sheet-header';
    const displayNum = (index !== undefined ? index : sheet.baseId) + 1;
    header.innerHTML = `
      <span><strong>材料 #${displayNum}</strong> (${sheet.lumberName || '合板'}) - 原板: ${sheet.sheetWidthMm} × ${sheet.sheetLengthMm} mm</span>
      <span>使用: ${sheet.sheetWidthMm} × ${sheet.usedLengthMm.toFixed(0)} mm / 端材: ${sheet.remainingLengthMm.toFixed(0)} mm <span class="cutplan-yield">(歩留まり: ${sheet.yieldRatePercent.toFixed(1)}%)</span></span>
    `;

    const main = document.createElement('div');
    main.className = 'cutplan-canvas-main';
    main.innerHTML = ViewerUI.render2DSheetSvg(sheet);

    sheetEl.appendChild(header);
    sheetEl.appendChild(main);
    return sheetEl;
  }

  /**
   * 木取り図シートの基準長（1820mm）に対するスケーリング比率を計算する
   */
  public static calculateCutPlanScale(lengthMm: number): number {
    return Math.max(lengthMm / 1820, 0.15);
  }

  /**
   * 木取り図 SVG 内の基準フォントサイズを決定する共通処理
   * PC表示時はスケール後 13px（cutplan-sheet-header 相当）、
   * スマホ表示時はスケール後 11px（現在のフォントサイズ -2 相当）になるように決定する
   */
  public static calculateCutPlanFontSize(scale: number, isMobile: boolean = false): number {
    const baseFs = isMobile ? 24 : 28;
    return Math.max(Math.round(baseFs * scale), 3);
  }

  /**
   * 木取り図 SVG 内の外寸寸法線および寸法テキスト（class="cutplan-dim-x", class="cutplan-dim-y"）を生成
   * viewBox 幅に応じた scale に比例してフォントサイズや寸法線を調整する
   */
  public static renderSvgDimensions(
    width: number,
    height: number,
    dimXText: string,
    dimYText: string,
    scale: number = 1.0,
    isMobile: boolean = false
  ): string {
    const dimFs = ViewerUI.calculateCutPlanFontSize(scale, isMobile);
    const guideL = 35 * scale;
    const lineX = 25 * scale;
    const textX = 40 * scale;

    const guideB = 35 * scale;
    const lineY = 25 * scale;
    const textY = 58 * scale;
    const strokeW = Math.max(1.5 * scale, 0.8);

    return `
      <!-- 縦外寸 (Y方向) -->
      <path d="M 0 0 h -${guideL} M 0 ${height} h -${guideL} M -${lineX} 0 v ${height}" stroke="#9ca3af" stroke-width="${strokeW}" fill="none" class="cutplan-dim-guide" />
      <text x="-${textX}" y="${height / 2}" class="cutplan-dim-y" text-anchor="middle" dominant-baseline="middle" transform="rotate(-90 -${textX} ${height / 2})" font-size="${dimFs}" font-weight="bold" fill="#4b5563">${dimYText}</text>

      <!-- 横外寸 (X方向) -->
      <path d="M 0 ${height} v ${guideB} M ${width} ${height} v ${guideB} M 0 ${height + lineY} h ${width}" stroke="#9ca3af" stroke-width="${strokeW}" fill="none" class="cutplan-dim-guide" />
      <text x="${width / 2}" y="${height + textY}" class="cutplan-dim-x" text-anchor="middle" font-size="${dimFs}" font-weight="bold" fill="#4b5563">${dimXText}</text>
    `;
  }

  /**
   * 木取り図に表示する寸法・サイズ数値をフォーマットする
   * 有効桁数は小数点第2までとするが、小数点が無い桁（末尾の不要なゼロ・小数点）は表示しない
   */
  public static formatCutPlanSize(val: number): string {
    return parseFloat(val.toFixed(2)).toString();
  }

  /**
   * 部材のラベル情報（部材名・サイズ文字列）を共通取得する
   * class="cutplan-part-size" には「寸法:」等の接頭辞や単位「mm」を含めず数値のみを返す
   * 有効桁数は小数点第2位まで
   */
  public static getPartLabelInfo(item: CutPlanItem, is2D: boolean = false): { partName: string; sizeText: string } {
    const partName = item.object.partName || item.object.name;
    const sizeText = is2D
      ? `${ViewerUI.formatCutPlanSize(item.widthMm)} × ${ViewerUI.formatCutPlanSize(item.lengthMm)}`
      : `${ViewerUI.formatCutPlanSize(item.lengthMm)}`;
    return { partName, sizeText };
  }

  /**
   * 斜めカットのラベルSVG要素を生成する
   * 斜め線と同じ角度で回転し、単位 mm なしで描画する（有効桁数: 小数点第2位）
   */
  public static renderDiagonalCutLabel(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    cutA: number,
    cutB: number,
    fsText: number,
    isTopCorner: boolean
  ): string {
    // 常に左から右へ向かうベクトルに正規化して文字が反転しないようにする
    let sx1 = x1, sy1 = y1, sx2 = x2, sy2 = y2;
    if (sx1 > sx2) {
      sx1 = x2; sy1 = y2; sx2 = x1; sy2 = y1;
    }
    const dx = sx2 - sx1;
    const dy = sy2 - sy1;
    const angleDeg = Math.atan2(dy, dx) * 180 / Math.PI;
    const midX = (sx1 + sx2) / 2;
    const midY = (sy1 + sy2) / 2;
    // 上側コーナーは線の外側(上)に-0.4em、下側コーナーは線の外側(下)に1.2emオフセット
    const dyAttr = isTopCorner ? '-0.4em' : '1.2em';

    return `<text x="${midX.toFixed(1)}" y="${midY.toFixed(1)}" transform="rotate(${angleDeg.toFixed(1)}, ${midX.toFixed(1)}, ${midY.toFixed(1)})" dy="${dyAttr}" class="cutplan-diag-cut-label" font-size="${fsText}" font-weight="bold" fill="#b91c1c" text-anchor="middle" pointer-events="none" style="pointer-events: none;">✂ 斜めカット: ${ViewerUI.formatCutPlanSize(cutA)} × ${ViewerUI.formatCutPlanSize(cutB)}</text>`;
  }

  /**
   * 2D 板材・合板シートの材料取り図 SVG 文字列を生成
   */
  public static render2DSheetSvg(sheet: CutPlanSheet): string {
    const svgWidth = sheet.sheetLengthMm;
    const svgHeight = sheet.sheetWidthMm;

    // viewBox の幅（基準1820mm）に応じたスケーリング比率を計算し、フォントサイズや寸法線を連動
    const scale = ViewerUI.calculateCutPlanScale(svgWidth);
    const fsText = ViewerUI.calculateCutPlanFontSize(scale, false);
    const offsetY = Math.max(fsText * 1.1, 4);

    let svgInner = '';

    // 定義 (パターン等)
    svgInner += `
      <defs>
        <pattern id="scrap-hatch-${sheet.baseId}" width="20" height="20" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="20" stroke="#cbd5e1" stroke-width="3" />
        </pattern>
      </defs>
    `;

    // 原板枠（背景・端材下地）
    svgInner += `<rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" fill="url(#scrap-hatch-${sheet.baseId})" stroke="#94a3b8" stroke-width="2" rx="0" />`;

    // 1. 各パーツ本体を描画
    for (const item of sheet.items) {
      const px = item.positionMm.z;
      const py = item.positionMm.x;
      const pw = item.lengthMm;
      const ph = item.widthMm;

      const edgeCuts = item.edgeCuts || [];
      const cutCuts = edgeCuts.filter((c: any) => c.mode === 'cut');
      const cut7 = cutCuts.find((c: any) => c.edgeIndex === 7);
      const cut4 = cutCuts.find((c: any) => c.edgeIndex === 4);
      const cut5 = cutCuts.find((c: any) => c.edgeIndex === 5);
      const cut6 = cutCuts.find((c: any) => c.edgeIndex === 6);

      if (cut7) {
        // 斜めカット (右上角: Corner 7)
        const cutA = cut7.faceADist * 1000;
        const cutB = cut7.faceBDist * 1000;

        const polyPoints = [
          `${px},${py}`,
          `${px + pw - cutB},${py}`,
          `${px + pw},${py + cutA}`,
          `${px + pw},${py + ph}`,
          `${px},${py + ph}`,
        ].join(' ');

        const scrapPoints = [
          `${px + pw - cutB},${py}`,
          `${px + pw},${py}`,
          `${px + pw},${py + cutA}`,
        ].join(' ');

        svgInner += `<polygon points="${scrapPoints}" fill="#fee2e2" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4,4" />`;
        svgInner += `<polygon points="${polyPoints}" class="cutplan-svg-part" data-object-id="${item.object.id}" fill="#fde68a" stroke="#d97706" stroke-width="2" />`;
        svgInner += `<line x1="${px + pw - cutB}" y1="${py}" x2="${px + pw}" y2="${py + cutA}" class="cutplan-kerf-line" stroke="#dc2626" stroke-width="2.5" pointer-events="none" style="pointer-events: none;" />`;
        svgInner += ViewerUI.renderDiagonalCutLabel(
          px + pw - cutB, py,
          px + pw, py + cutA,
          cutA, cutB, fsText, true
        );
      } else if (cut4) {
        // 斜めカット (Corner 4: 木取り図上はパーツ左端のカット)
        const cutA = cut4.faceADist * 1000;
        const cutB = cut4.faceBDist * 1000;

        const polyPoints = [
          `${px},${py}`,
          `${px + pw},${py}`,
          `${px + pw},${py + ph}`,
          `${px + cutB},${py + ph}`,
          `${px},${py + ph - cutA}`,
        ].join(' ');

        const scrapPoints = [
          `${px},${py + ph - cutA}`,
          `${px},${py + ph}`,
          `${px + cutB},${py + ph}`,
        ].join(' ');

        svgInner += `<polygon points="${scrapPoints}" fill="#fee2e2" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4,4" />`;
        svgInner += `<polygon points="${polyPoints}" class="cutplan-svg-part" data-object-id="${item.object.id}" fill="#fde68a" stroke="#d97706" stroke-width="2" />`;
        svgInner += `<line x1="${px + cutB}" y1="${py + ph}" x2="${px}" y2="${py + ph - cutA}" class="cutplan-kerf-line" stroke="#dc2626" stroke-width="2.5" pointer-events="none" style="pointer-events: none;" />`;
        svgInner += ViewerUI.renderDiagonalCutLabel(
          px, py + ph - cutA,
          px + cutB, py + ph,
          cutA, cutB, fsText, false
        );
      } else if (cut5) {
        // 斜めカット (Corner 5: 木取り図上はパーツ右端のカット)
        const cutA = cut5.faceADist * 1000;
        const cutB = cut5.faceBDist * 1000;

        const polyPoints = [
          `${px},${py}`,
          `${px + pw},${py}`,
          `${px + pw},${py + ph - cutA}`,
          `${px + pw - cutB},${py + ph}`,
          `${px},${py + ph}`,
        ].join(' ');

        const scrapPoints = [
          `${px + pw},${py + ph - cutA}`,
          `${px + pw},${py + ph}`,
          `${px + pw - cutB},${py + ph}`,
        ].join(' ');

        svgInner += `<polygon points="${scrapPoints}" fill="#fee2e2" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4,4" />`;
        svgInner += `<polygon points="${polyPoints}" class="cutplan-svg-part" data-object-id="${item.object.id}" fill="#fde68a" stroke="#d97706" stroke-width="2" />`;
        svgInner += `<line x1="${px + pw - cutB}" y1="${py + ph}" x2="${px + pw}" y2="${py + ph - cutA}" class="cutplan-kerf-line" stroke="#dc2626" stroke-width="2.5" pointer-events="none" style="pointer-events: none;" />`;
        svgInner += ViewerUI.renderDiagonalCutLabel(
          px + pw - cutB, py + ph,
          px + pw, py + ph - cutA,
          cutA, cutB, fsText, false
        );
      } else if (cut6) {
        // 斜めカット (左上角: Corner 6)
        const cutA = cut6.faceADist * 1000;
        const cutB = cut6.faceBDist * 1000;

        const polyPoints = [
          `${px + cutB},${py}`,
          `${px + pw},${py}`,
          `${px + pw},${py + ph}`,
          `${px},${py + ph}`,
          `${px},${py + cutA}`,
        ].join(' ');

        const scrapPoints = [
          `${px},${py}`,
          `${px + cutB},${py}`,
          `${px},${py + cutA}`,
        ].join(' ');

        svgInner += `<polygon points="${scrapPoints}" fill="#fee2e2" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4,4" />`;
        svgInner += `<polygon points="${polyPoints}" class="cutplan-svg-part" data-object-id="${item.object.id}" fill="#fde68a" stroke="#d97706" stroke-width="2" />`;
        svgInner += `<line x1="${px + cutB}" y1="${py}" x2="${px}" y2="${py + cutA}" class="cutplan-kerf-line" stroke="#dc2626" stroke-width="2.5" pointer-events="none" style="pointer-events: none;" />`;
        svgInner += ViewerUI.renderDiagonalCutLabel(
          px, py + cutA,
          px + cutB, py,
          cutA, cutB, fsText, true
        );
      } else {
        // 通常の長方形パーツ (border-radius廃止: rx="0")
        svgInner += `<rect x="${px}" y="${py}" width="${pw}" height="${ph}" class="cutplan-svg-part" data-object-id="${item.object.id}" fill="#fde68a" stroke="#d97706" stroke-width="2" rx="0" />`;
      }

      // パーツ名・寸法ラベル (cutplan-part-size はパーツの上下中央 labelY に配置)
      const labelX = px + pw / 2;
      const labelY = py + ph / 2;
      const { partName, sizeText } = ViewerUI.getPartLabelInfo(item, true);
      svgInner += `
        <g class="cutplan-part-label" data-object-id="${item.object.id}" data-center-y="${labelY}" pointer-events="none" style="pointer-events: none;">
          <text x="${labelX}" y="${labelY - offsetY}" class="cutplan-part-name" font-size="${fsText}" font-weight="bold" fill="#92400e" text-anchor="middle" pointer-events="none">${partName}</text>
          <text x="${labelX}" y="${labelY}" class="cutplan-part-size" font-size="${fsText}" font-weight="bold" fill="#78350f" text-anchor="middle" dominant-baseline="central" pointer-events="none">${sizeText}</text>
        </g>
      `;
    }

    // 2. 各パーツの木取り線（切断線）を描画
    for (const item of sheet.items) {
      const px = item.positionMm.z;
      const py = item.positionMm.x;
      const pw = item.lengthMm;
      const ph = item.widthMm;

      // 縦の切断線 (パーツ右端):
      // 原板端(切り代不要)の場合は切断線を引かない。
      // 切断線はそのパーツの高さ範囲 [py, py + ph] にのみ引き、他パーツの領域を貫通させない。
      if (px + pw < svgWidth - 1) {
        const cutX = px + pw;
        svgInner += `
          <line x1="${cutX}" y1="${py}" x2="${cutX}" y2="${py + ph}" class="cutplan-kerf-line" stroke="#dc2626" stroke-width="2.5" stroke-dasharray="6,4" />
        `;
        // パーツ右側の端材ラベル
        const scrapWidth = svgWidth - cutX;
        if (scrapWidth >= 50 * scale) {
          svgInner += `
            <text x="${cutX + scrapWidth / 2}" y="${py + ph / 2}" class="cutplan-scrap-label" font-size="${fsText}" font-weight="600" fill="#94a3b8" text-anchor="middle" dominant-baseline="middle">
              端材 (${ViewerUI.formatCutPlanSize(scrapWidth)})
            </text>
          `;
        }
      }

      // 横の切断線 (パーツ下端):
      // 原板下端ではない場合、パーツ下端に水平の木取り線を引く
      if (py + ph < svgHeight - 1) {
        const cutY = py + ph;
        svgInner += `
          <line x1="${px}" y1="${cutY}" x2="${px + pw}" y2="${cutY}" class="cutplan-kerf-line-h" stroke="#dc2626" stroke-width="2.5" stroke-dasharray="6,4" />
        `;
      }
    }

    // 3. 縦横外寸 (class="cutplan-dim-x", class="cutplan-dim-y") を描画
    svgInner += ViewerUI.renderSvgDimensions(
      svgWidth,
      svgHeight,
      `${sheet.sheetLengthMm}`,
      `${sheet.sheetWidthMm}`,
      scale,
      false
    );

    const marginL = 70 * scale;
    const marginT = 10 * scale;
    const marginR = 20 * scale;
    const marginB = 80 * scale;

    return `
      <svg viewBox="-${marginL} -${marginT} ${svgWidth + marginL + marginR} ${svgHeight + marginT + marginB}" class="cutplan-svg-canvas" preserveAspectRatio="xMidYMid meet">
        ${svgInner}
      </svg>
    `;
  }

  /**
   * 1D 角材シートの材料取り図 SVG 文字列を生成
   */
  public static render1DSheetSvg(sheet: CutPlanSheet): string {
    const totalLen = sheet.sheetLengthMm > 0
      ? sheet.sheetLengthMm
      : Math.max(sheet.usedLengthMm + sheet.remainingLengthMm, 1);
    const boardWidth = totalLen;
    const boardHeight = 120;
    const actualThick = sheet.sheetWidthMm || 89;

    // viewBox の幅（基準1820mm）に応じたスケーリング比率を計算し、フォントサイズや寸法線を連動
    const scale = ViewerUI.calculateCutPlanScale(boardWidth);
    const fsText = ViewerUI.calculateCutPlanFontSize(scale, false);
    const offsetY1 = Math.max(fsText * 1.1, 4);

    let svgInner = '';

    // 定義 (パターン等)
    svgInner += `
      <defs>
        <pattern id="scrap-hatch-${sheet.baseId}" width="20" height="20" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="20" stroke="#cbd5e1" stroke-width="3" />
        </pattern>
      </defs>
    `;

    // 原木枠背景
    svgInner += `<rect x="0" y="0" width="${boardWidth}" height="${boardHeight}" fill="#fdf8f0" stroke="#d97706" stroke-width="2" rx="0" />`;

    let curX = 0;
    for (let i = 0; i < sheet.items.length; i++) {
      const item = sheet.items[i];
      const pw = item.lengthMm;
      const { partName, sizeText } = ViewerUI.getPartLabelInfo(item, false);

      // パーツ本体および斜めカット (edgeCuts) の反映
      const edgeCuts = item.edgeCuts || [];
      const cutCuts = edgeCuts.filter((c: any) => c.mode === 'cut');
      const cut6 = cutCuts.find((c: any) => c.edgeIndex === 6);
      const cut4 = cutCuts.find((c: any) => c.edgeIndex === 4);
      const cut7 = cutCuts.find((c: any) => c.edgeIndex === 7);
      const cut5 = cutCuts.find((c: any) => c.edgeIndex === 5);

      if (cut6 || cut4) {
        // 右端 (+Z 端) の斜めカット (側板上端斜めカット等)
        const cut = (cut6 || cut4)!;
        const cutA = cut.faceADist * 1000;
        const cutB = cut.faceBDist * 1000;

        const polyPoints = [
          `${curX},0`,
          `${curX + pw - cutB},0`,
          `${curX + pw},${boardHeight}`,
          `${curX},${boardHeight}`,
        ].join(' ');

        const scrapPoints = [
          `${curX + pw - cutB},0`,
          `${curX + pw},0`,
          `${curX + pw},${boardHeight}`,
        ].join(' ');

        svgInner += `<polygon points="${scrapPoints}" fill="#fee2e2" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4,4" />`;
        svgInner += `<polygon points="${polyPoints}" class="cutplan-svg-part" data-object-id="${item.object.id}" fill="#fde68a" stroke="#d97706" stroke-width="2" />`;
        svgInner += `<line x1="${curX + pw - cutB}" y1="0" x2="${curX + pw}" y2="${boardHeight}" class="cutplan-kerf-line" stroke="#dc2626" stroke-width="2.5" pointer-events="none" style="pointer-events: none;" />`;
        svgInner += ViewerUI.renderDiagonalCutLabel(
          curX + pw - cutB, 0,
          curX + pw, boardHeight,
          cutA, cutB, fsText, true
        );
      } else if (cut7 || cut5) {
        // 左端 (-Z 端) の斜めカット
        const cut = (cut7 || cut5)!;
        const cutA = cut.faceADist * 1000;
        const cutB = cut.faceBDist * 1000;

        const polyPoints = [
          `${curX + cutB},0`,
          `${curX + pw},0`,
          `${curX + pw},${boardHeight}`,
          `${curX},${boardHeight}`,
        ].join(' ');

        const scrapPoints = [
          `${curX},0`,
          `${curX + cutB},0`,
          `${curX},${boardHeight}`,
        ].join(' ');

        svgInner += `<polygon points="${scrapPoints}" fill="#fee2e2" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4,4" />`;
        svgInner += `<polygon points="${polyPoints}" class="cutplan-svg-part" data-object-id="${item.object.id}" fill="#fde68a" stroke="#d97706" stroke-width="2" />`;
        svgInner += `<line x1="${curX}" y1="${boardHeight}" x2="${curX + cutB}" y2="0" class="cutplan-kerf-line" stroke="#dc2626" stroke-width="2.5" pointer-events="none" style="pointer-events: none;" />`;
        svgInner += ViewerUI.renderDiagonalCutLabel(
          curX, boardHeight,
          curX + cutB, 0,
          cutA, cutB, fsText, true
        );
      } else {
        // 通常パーツ
        svgInner += `<rect x="${curX}" y="0" width="${pw}" height="${boardHeight}" class="cutplan-svg-part" data-object-id="${item.object.id}" fill="#fde68a" stroke="#d97706" stroke-width="2" rx="0" />`;
      }

      // パーツラベル & サイズ (cutplan-part-size はパーツの上下中央 boardHeight / 2 に配置)
      const midX = curX + pw / 2;
      const midY = boardHeight / 2;
      svgInner += `
        <g class="cutplan-part-label" data-object-id="${item.object.id}" data-center-y="${midY}" pointer-events="none" style="pointer-events: none;">
          <text x="${midX}" y="${midY - offsetY1}" class="cutplan-part-name" font-size="${fsText}" font-weight="bold" fill="#92400e" text-anchor="middle" pointer-events="none">${partName}</text>
          <text x="${midX}" y="${midY}" class="cutplan-part-size" font-size="${fsText}" font-weight="bold" fill="#78350f" text-anchor="middle" dominant-baseline="central" pointer-events="none">${sizeText}</text>
        </g>
      `;

      // 木取り線（切り代）
      const isLast = i === sheet.items.length - 1;
      if (!isLast || sheet.remainingLengthMm > 0) {
        const kerfWidth = Math.max(sheet.cutWidthMm * 4 * scale, 12 * scale);
        svgInner += `
          <rect x="${curX + pw}" y="0" width="${kerfWidth}" height="${boardHeight}" fill="#fee2e2" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="4,4" class="cutplan-kerf-line" />
          <text x="${curX + pw + kerfWidth / 2}" y="${boardHeight / 2}" class="cutplan-kerf-mark" font-size="${fsText}" font-weight="bold" fill="#dc2626" text-anchor="middle" dominant-baseline="middle">✂</text>
        `;
        curX += pw + kerfWidth;
      } else {
        curX += pw;
      }
    }

    // 端材領域
    if (sheet.remainingLengthMm > 0 && curX < boardWidth) {
      const remWidth = boardWidth - curX;
      svgInner += `
        <rect x="${curX}" y="0" width="${remWidth}" height="${boardHeight}" fill="url(#scrap-hatch-${sheet.baseId})" stroke="#cbd5e1" stroke-width="1.5" rx="0" class="cutplan-remaining-block" />
        <text x="${curX + remWidth / 2}" y="${boardHeight / 2}" class="cutplan-scrap-label" font-size="${fsText}" font-weight="600" fill="#64748b" text-anchor="middle" dominant-baseline="middle">端材 (${ViewerUI.formatCutPlanSize(sheet.remainingLengthMm)})</text>
      `;
    }

    // 縦横外寸を描画
    svgInner += ViewerUI.renderSvgDimensions(
      boardWidth,
      boardHeight,
      `${totalLen.toFixed(0)}`,
      `${actualThick}`,
      scale,
      false
    );

    const marginL = 70 * scale;
    const marginT = 10 * scale;
    const marginR = 20 * scale;
    const marginB = 80 * scale;

    return `
      <svg viewBox="-${marginL} -${marginT} ${boardWidth + marginL + marginR} ${boardHeight + marginT + marginB}" class="cutplan-svg-canvas" preserveAspectRatio="xMidYMid meet">
        ${svgInner}
      </svg>
    `;
  }

  /**
   * 1D 角材シートの材料取り図レンダリング
   */
  private render1DSheet(sheet: CutPlanSheet, index?: number): HTMLElement {
    const sheetEl = document.createElement('div');
    sheetEl.className = 'cutplan-sheet cutplan-sheet-1d';

    const totalLen = sheet.sheetLengthMm > 0
      ? sheet.sheetLengthMm
      : Math.max(sheet.usedLengthMm + sheet.remainingLengthMm, 1);

    const header = document.createElement('div');
    header.className = 'cutplan-sheet-header';
    const displayNum = (index !== undefined ? index : sheet.baseId) + 1;
    header.innerHTML = `
      <span><strong>材料 #${displayNum}</strong> (${sheet.lumberName || '角材'}) - 原木長: ${totalLen.toFixed(0)}mm</span>
      <span>使用長: ${sheet.usedLengthMm.toFixed(0)}mm / 端材: ${sheet.remainingLengthMm.toFixed(0)}mm <span class="cutplan-yield">(歩留まり: ${sheet.yieldRatePercent.toFixed(1)}%)</span></span>
    `;

    const main = document.createElement('div');
    main.className = 'cutplan-canvas-main';
    main.innerHTML = ViewerUI.render1DSheetSvg(sheet);

    sheetEl.appendChild(header);
    sheetEl.appendChild(main);
    return sheetEl;
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
    this.layerManager.onVisibilityChange(() => {
      this.viewer.syncVisibility((objId) => this.layerManager.isObjectVisible(objId));
      this.renderLayerTree();
    });

    this.layerManager.onSelect((objectId) => {
      // 1. 3Dviewのハイライト (カラーRGBのRのみ、α50%)
      this.viewer.highlightObject(objectId);

      // 2. 材料取り図のハイライト (R強調)
      this.updateSelectedCutPlanPart(objectId);

      // 3. レイヤー一覧の選択状態
      this.renderLayerTree();
      this.updateSelectedLayerItem(objectId);

      if (this.isSelectingFrom3D) return;

      if (objectId) {
        const obj = this.viewer.getObjectById(objectId);
        this.handleObjectSelected(obj, 'layerTree');
      } else {
        this.hideInspector();
        this.isInspectorOpen = false;
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
      const fileName = file.name.replace(/\.[^/.]+$/, '');
      const data = this.modelLoader.load(text, fileName);
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

      const urlParts = url.split('/');
      const lastPart = urlParts[urlParts.length - 1] || 'model';
      const fileName = lastPart.replace(/\.[^/.]+$/, '');

      const data = this.modelLoader.load(text, fileName);

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

    // レイヤーマネージャを先に初期化し、初期可視性を Viewer に渡して構築
    this.layerManager.init(data.layers, data.objects);
    this.viewer.loadModel(data, (objId) => this.layerManager.isObjectVisible(objId));
    this.renderLayerTree();
    this.hideInspector();

    if (this.viewModeManager.getCurrentMode() === 'cutList') {
      this.renderCutListView();
    }
  }

  /**
   * レイヤーツリーのHTMLレンダリング（n段再帰対応）
   */
  private renderLayerTree(): void {
    const tree = this.layerManager.getTree();
    this.layerTreeContainer.innerHTML = '';

    for (const node of tree) {
      this.layerTreeContainer.appendChild(this.renderLayerNode(node));
    }
  }

  private renderLayerNode(node: LayerTreeNode): HTMLElement {
    const layerItem = document.createElement('div');
    layerItem.className = 'layer-item';
    layerItem.dataset.layerId = String(node.layer.id);
    layerItem.dataset.depth = String(node.depth);

    const isExpanded = node.isExpanded;
    const isVisible = node.layer.visible;
    const isEffectivelyVisible = this.layerManager.isLayerEffectivelyVisible(node.layer.id);

    // ヘッダー行
    const header = document.createElement('div');
    header.className = 'layer-item-header';
    if (node.depth > 0) {
      header.style.paddingLeft = `calc(12px + ${node.depth * 14}px)`;
    }

    const left = document.createElement('div');
    left.className = 'layer-header-left';

    const hasChildren = node.children.length > 0 || node.objects.length > 0;
    const toggleIcon = document.createElement('span');
    toggleIcon.className = 'layer-toggle-icon';
    toggleIcon.textContent = hasChildren ? (isExpanded ? '▼' : '▶') : '・';

    const layerName = document.createElement('span');
    layerName.className = `layer-name ${isEffectivelyVisible ? '' : 'layer-name-hidden'}`;
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

    // 配下（子レイヤーおよびオブジェクト一覧）
    if (isExpanded) {
      const contentContainer = document.createElement('div');
      contentContainer.className = 'layer-children-container';

      // 1. 子レイヤー（サブフォルダ）
      for (const childNode of node.children) {
        contentContainer.appendChild(this.renderLayerNode(childNode));
      }

      // 2. 当該レイヤーに所属するオブジェクト一覧
      if (node.objects.length > 0) {
        const objList = document.createElement('div');
        objList.className = 'layer-object-list';

        for (const obj of node.objects) {
          const objItem = document.createElement('div');
          objItem.className = 'layer-object-item';
          objItem.dataset.id = obj.id;
          if (node.depth > 0) {
            objItem.style.paddingLeft = `calc(32px + ${node.depth * 14}px)`;
          }
          if (this.layerManager.getSelectedObjectId() === obj.id) {
            objItem.classList.add('selected');
          }
          objItem.textContent = obj.partName || obj.name;

          objItem.addEventListener('click', () => {
            this.layerManager.selectObject(obj.id);
          });

          objList.appendChild(objItem);
        }

        contentContainer.appendChild(objList);
      }

      layerItem.appendChild(contentContainer);
    }

    return layerItem;
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
   * 材料取り図 (Cut List) 上の選択中パーツのハイライト表示を更新する
   * 要件: カラー(RGB)でRを強調して選択されていることがわかるようにする。解除時は元に戻る。
   */
  public updateSelectedCutPlanPart(selectedId: string | null): void {
    const parts = this.cutlistSheetsContainer.querySelectorAll('.cutplan-svg-part');
    parts.forEach((el) => {
      const part = el as SVGElement;
      if (selectedId && part.dataset.objectId === selectedId) {
        part.classList.add('selected');
      } else {
        part.classList.remove('selected');
      }
    });
  }

  /**
   * インスペクターの詳細コンテンツをレンダリングする
   */
  private renderInspectorContent(object: CadiyObject): void {
    const props = formatObjectProperties(object);
    this.inspectorTitle.textContent = props.name;

    const priceText = props.price !== null ? `¥${props.price.toLocaleString()}` : '未設定';
    const weightText = props.weightKg !== null ? `${props.weightKg.toFixed(2)} kg` : '未設定';
    const posText = `${props.positionMm.x.toFixed(1)}, ${props.positionMm.y.toFixed(1)}, ${props.positionMm.z.toFixed(1)} mm`;
    const sizeText = `${props.sizeMm.x.toFixed(1)} × ${props.sizeMm.y.toFixed(1)} × ${props.sizeMm.z.toFixed(1)} mm`;
    const rotText = `X: ${props.rotationDeg.x}°, Y: ${props.rotationDeg.y}°, Z: ${props.rotationDeg.z}°`;

    const detailHtml = `
      <div class="inspector-row inspector-row-standard">
        <span class="inspector-label">規格:</span>
        <span class="inspector-value">${props.standardName}</span>
      </div>
      <div class="inspector-row inspector-row-weight">
        <span class="inspector-label">重量:</span>
        <span class="inspector-value">${weightText}</span>
      </div>
      <div class="inspector-row inspector-row-price">
        <span class="inspector-label">価格:</span>
        <span class="inspector-value">${priceText}</span>
      </div>
      <div class="inspector-row inspector-row-position">
        <span class="inspector-label">位置:</span>
        <span class="inspector-value">${posText}</span>
      </div>
      <div class="inspector-row inspector-row-size">
        <span class="inspector-label">サイズ:</span>
        <span class="inspector-value">${sizeText}</span>
      </div>
      <div class="inspector-row inspector-row-rotation">
        <span class="inspector-label">傾き:</span>
        <span class="inspector-value">${rotText}</span>
      </div>
      <div class="inspector-row inspector-row-processing">
        <span class="inspector-label">形状加工:</span>
        <span class="inspector-value">${props.processingInfo}</span>
      </div>
    `;

    this.inspectorDetail.innerHTML = detailHtml;
  }

  /**
   * パーツが選択された際の詳細ビュー (インスペクタ) 表示
   * @param object 選択対象のオブジェクト (null で選択解除)
   * @param source 選択の発生元 ('viewer3d': 3Dキャンバスからのクリック/長押しタップ, 'layerTree': レイヤーツリーからのタップ/クリック)
   */
  public handleObjectSelected(object: CadiyObject | null, source: 'viewer3d' | 'layerTree' = 'viewer3d'): void {
    if (!object) {
      // 選択解除時: インスペクターを閉じ、選択状態をリセット
      this.hideInspector();
      this.isInspectorOpen = false;
      if (source === 'viewer3d') {
        this.isSelectingFrom3D = true;
        try {
          this.layerManager.selectObject(null);
        } finally {
          this.isSelectingFrom3D = false;
        }
      }
      return;
    }

    // 3Dビューからの選択の場合、レイヤーマネージャーの選択状態も同期
    if (source === 'viewer3d') {
      this.isSelectingFrom3D = true;
      try {
        this.layerManager.selectObject(object.id);
      } finally {
        this.isSelectingFrom3D = false;
      }
    }

    // インスペクター表示状態フラグをON
    this.isInspectorOpen = true;

    // 詳細情報をレンダリング
    this.renderInspectorContent(object);

    // 要件: 表示するのは3Dview表示の時のみで、それ以外の時(材料取り図や三面図)は一時的に非表示（3Dviewに戻ると再表示）
    if (this.viewModeManager.getCurrentMode() === '3d') {
      this.inspectorCard.classList.add('active');
    } else {
      this.hideInspector();
    }
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
