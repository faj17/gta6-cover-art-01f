'use strict';
/* Shot helper: drives the editor from the URL so the maker can take
 * screenshots and capture real exports without clicking.
 *
 *   ?shot=editor&sample=1&layout=strip
 *       Opens the editor with a sample scene loaded in every panel.
 *   ?shot=export&size=1080x1350&sample=2&layout=grid
 *       Loads a sample scene, renders the cover at the requested size and
 *       downloads the PNG the app itself writes, then sets
 *       window.__exportDone so an automated check can wait for it.
 * No network is used: samples are local files under app/samples/. */

(function () {
  const q = new URLSearchParams(location.search);
  const mode = q.get('shot');
  if (!mode || !window.NeonCoast) return;

  const sample = Number(q.get('sample') || 1);
  const layout = q.get('layout');
  const theme = q.get('theme');
  const size = q.get('size') || '1080x1350';
  const app = window.NeonCoast;

  if (layout) {
    app.state.layout = layout;
    document.querySelectorAll('#layoutRow button').forEach(function (b) {
      b.classList.toggle('on', b.dataset.layout === layout);
    });
  }
  if (theme) {
    app.state.theme = theme;
    document.querySelectorAll('#themeRow button').forEach(function (b) {
      b.classList.toggle('on', b.dataset.theme === theme);
    });
  }
  if (app.SIZES[size]) {
    app.state.size = size;
    document.querySelectorAll('#sizeRow button').forEach(function (b) {
      b.classList.toggle('on', b.dataset.size === size);
    });
  }

  app.loadSample(sample, 'all').then(function () {
    if (mode === 'editor') {
      window.__editorReady = true;
      document.title = 'Neon Coast — editor ready';
    } else if (mode === 'export') {
      return app.exportCover(size).then(function () {
        window.__exportDone = true;
        document.title = 'Neon Coast — export done';
      });
    }
    return undefined;
  }).catch(function (err) {
    document.title = 'Neon Coast — shot failed: ' + err;
  });
})();
