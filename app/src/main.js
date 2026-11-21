'use strict';
/* Neon Coast editor wiring: state, controls, drag-to-pan cropping, uploads,
 * sample scenes, and PNG export. Photos are read on the user's own machine
 * (FileReader / local sample files) and never uploaded anywhere. */

(function () {
  const SAMPLES = { 1: 'samples/scene-boulevard.jpg', 2: 'samples/scene-pier.jpg', 3: 'samples/scene-beach.jpg' };
  const SIZES = { '1080x1080': [1080, 1080], '1080x1350': [1080, 1350], '1920x1080': [1920, 1080] };

  const state = {
    layout: 'strip',
    theme: 'sunset',
    size: '1080x1350',
    caption: 'NEON COAST',
    subtitle: 'VICE CITY \u2022 2026',
    photos: [null, null, null, null], // {img, zoom, ox, oy} per panel
    selected: 0,
  };

  const $ = function (id) { return document.getElementById(id); };
  const canvas = $('preview');
  const ctx = canvas.getContext('2d');
  const statusEl = $('status');

  function setStatus(msg) { statusEl.textContent = msg; }

  function panelCount() {
    return NeonCoastCover.layoutPanels(state.layout, 100, 100).length;
  }

  function render() {
    const dims = SIZES[state.size];
    const scale = Math.min(900 / dims[0], 900 / dims[1]);
    canvas.width = Math.round(dims[0] * scale);
    canvas.height = Math.round(dims[1] * scale);
    NeonCoastCover.drawCover(ctx, canvas.width, canvas.height, state, state.selected);
    buildPanelButtons();
    const zoom = $('zoom');
    const p = state.photos[state.selected];
    zoom.value = p ? p.zoom : 1;
  }

  function buildPanelButtons() {
    const wrap = $('panelBtns');
    const n = panelCount();
    if (wrap.childElementCount === n) {
      Array.prototype.forEach.call(wrap.children, function (b, i) {
        b.classList.toggle('on', i === state.selected);
      });
      return;
    }
    wrap.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = 'Panel ' + (i + 1);
      b.className = i === state.selected ? 'on' : '';
      b.addEventListener('click', function () { state.selected = i; render(); });
      wrap.appendChild(b);
    }
  }

  function photoFromImage(img) {
    return { img: img, zoom: 1, ox: 0, oy: 0 };
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      const img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = reject;
      img.src = src;
    });
  }

  function loadSample(n, target) {
    return loadImage(SAMPLES[n] || SAMPLES[1]).then(function (img) {
      if (target === 'all') {
        for (let i = 0; i < 4; i++) state.photos[i] = photoFromImage(img);
      } else {
        state.photos[state.selected] = photoFromImage(img);
      }
      render();
      setStatus('Sample scene loaded. Drag a panel to reposition it.');
    });
  }

  function loadSamplesShuffled() {
    const order = [1, 2, 3];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = order[i]; order[i] = order[j]; order[j] = t;
    }
    const jobs = order.map(function (n, i) {
      return loadImage(SAMPLES[n]).then(function (img) { state.photos[i] = photoFromImage(img); });
    });
    return Promise.all(jobs).then(function () {
      render();
      setStatus('Three sample scenes loaded, one per panel.');
    });
  }

  // --- controls ------------------------------------------------------------
  document.querySelectorAll('#layoutRow button').forEach(function (b) {
    b.addEventListener('click', function () {
      state.layout = b.dataset.layout;
      if (state.selected >= panelCount()) state.selected = 0;
      document.querySelectorAll('#layoutRow button').forEach(function (x) { x.classList.toggle('on', x === b); });
      render();
      setStatus('Layout: ' + b.textContent + '.');
    });
  });

  document.querySelectorAll('#themeRow button').forEach(function (b) {
    b.addEventListener('click', function () {
      state.theme = b.dataset.theme;
      document.querySelectorAll('#themeRow button').forEach(function (x) { x.classList.toggle('on', x === b); });
      render();
      setStatus('Theme: ' + b.textContent + '.');
    });
  });

  document.querySelectorAll('#sizeRow button').forEach(function (b) {
    b.addEventListener('click', function () {
      state.size = b.dataset.size;
      document.querySelectorAll('#sizeRow button').forEach(function (x) { x.classList.toggle('on', x === b); });
      render();
      setStatus('Export size: ' + b.dataset.size + '.');
    });
  });

  $('caption').addEventListener('input', function (e) { state.caption = e.target.value; render(); });
  $('subtitle').addEventListener('input', function (e) { state.subtitle = e.target.value; render(); });

  $('uploadBtn').addEventListener('click', function () { $('fileInput').click(); });
  $('fileInput').addEventListener('change', function (e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      loadImage(reader.result).then(function (img) {
        state.photos[state.selected] = photoFromImage(img);
        render();
        setStatus('Photo loaded into panel ' + (state.selected + 1) + '. Drag to position it.');
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  });

  $('fillAllBtn').addEventListener('click', function () {
    const src = state.photos[state.selected];
    if (!src || !src.img) { setStatus('Load a photo into the selected panel first.'); return; }
    for (let i = 0; i < 4; i++) state.photos[i] = photoFromImage(src.img);
    render();
    setStatus('One photo now fills every panel. Each panel crops independently.');
  });

  document.querySelectorAll('[data-sample]').forEach(function (b) {
    b.addEventListener('click', function () { loadSample(Number(b.dataset.sample), 'all'); });
  });
  $('swapBtn').addEventListener('click', loadSamplesShuffled);

  $('zoom').addEventListener('input', function (e) {
    const p = state.photos[state.selected];
    if (!p) { setStatus('Load a photo first — zoom crops the selected panel.'); return; }
    p.zoom = Number(e.target.value);
    render();
  });
  $('fitBtn').addEventListener('click', function () {
    const p = state.photos[state.selected];
    if (p) { p.zoom = 1; p.ox = 0; p.oy = 0; }
    render();
    setStatus('Crop reset for panel ' + (state.selected + 1) + '.');
  });

  // --- drag to pan the photo inside its panel ------------------------------
  let drag = null;
  function canvasPos(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * canvas.width / r.width,
      y: (e.clientY - r.top) * canvas.height / r.height,
    };
  }
  canvas.addEventListener('pointerdown', function (e) {
    const pos = canvasPos(e);
    const panels = NeonCoastCover.layoutPanels(state.layout, canvas.width, canvas.height);
    for (let i = 0; i < panels.length; i++) {
      const p = panels[i];
      if (pos.x >= p.x && pos.x <= p.x + p.w && pos.y >= p.y && pos.y <= p.y + p.h) {
        state.selected = i;
        drag = { panel: i, x: pos.x, y: pos.y };
        canvas.setPointerCapture(e.pointerId);
        render();
        break;
      }
    }
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!drag) return;
    const pos = canvasPos(e);
    const panels = NeonCoastCover.layoutPanels(state.layout, canvas.width, canvas.height);
    const rect = panels[drag.panel];
    const photo = state.photos[drag.panel];
    if (rect && photo && photo.img) {
      photo.ox += (pos.x - drag.x) / rect.w;
      photo.oy += (pos.y - drag.y) / rect.h;
      drag.x = pos.x;
      drag.y = pos.y;
      render();
    }
  });
  canvas.addEventListener('pointerup', function () { drag = null; });
  canvas.addEventListener('pointercancel', function () { drag = null; });

  // --- export ---------------------------------------------------------------
  function exportCover(sizeKey) {
    const dims = SIZES[sizeKey || state.size];
    const out = NeonCoastCover.renderToCanvas(state, dims[0], dims[1]);
    const name = 'neon-coast-' + dims[0] + 'x' + dims[1] + '.png';
    return new Promise(function (resolve) {
      out.toBlob(function (blob) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
        setStatus('Exported ' + name + ' (' + dims[0] + ' x ' + dims[1] + ').');
        resolve(name);
      }, 'image/png');
    });
  }
  $('exportBtn').addEventListener('click', function () { exportCover(state.size); });

  // Public handle for the shot helper (src/shots.js) and for testing.
  window.NeonCoast = {
    state: state,
    render: render,
    loadSample: loadSample,
    loadSamplesShuffled: loadSamplesShuffled,
    exportCover: exportCover,
    SIZES: SIZES,
  };

  render();
})();
