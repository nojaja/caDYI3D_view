import './styles/main.css';
import { Viewer } from './core/Viewer';
import { ViewerUI } from './ui/ViewerUI';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('viewer-container');
  if (!container) {
    console.error('#viewer-container が見つかりません。');
    return;
  }

  let ui: ViewerUI;

  const viewer = new Viewer({
    container,
    onObjectSelected: (object) => {
      if (ui) {
        ui.handleObjectSelected(object);
      }
    },
  });

  ui = new ViewerUI(viewer);

  // URLパラメータのチェック (?model=... または ?url=...)
  const params = new URLSearchParams(window.location.search);
  const modelUrl = params.get('model') || params.get('url');

  if (modelUrl) {
    ui.loadFromUrl(modelUrl);
  } else {
    // デフォルトで models/test_rack.cadiy4 をロード
    ui.loadFromUrl('models/test_rack.cadiy4');
  }
});
