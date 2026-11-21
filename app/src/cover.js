'use strict';
/* Neon Coast cover renderer.
 * Draws a GTA-style multi-panel poster onto any canvas: photo panels with a
 * Vice City sunset / neon colour grade, thin poster borders, and a bold
 * italic caption band across the bottom. Original art only — every gradient,
 * skyline and letterform here is drawn in code; no game assets are used. */

const NeonCoastCover = (function () {
  const THEMES = {
    sunset: { grade: ['#ff9a3d', '#ff5e7a', '#7b2ff7'], band: '#1b0b2e', accent: '#ffb347', ink: '#160a24' },
    neon: { grade: ['#ff2ea6', '#7b2ff7', '#00e5ff'], band: '#0b0620', accent: '#00e5ff', ink: '#0b0620' },
    teal: { grade: ['#00e5a0', '#00b3ff', '#1b2a6b'], band: '#06222e', accent: '#7dffd4', ink: '#06222e' },
    gold: { grade: ['#ffd76a', '#ff8a3d', '#8a2b3d'], band: '#241203', accent: '#ffe9a8', ink: '#241203' },
  };

  // Panel fractions [x, y, w, h] inside the poster, before margin/gutter.
  const LAYOUTS = {
    strip: { panels: [[0, 0, 1, 0.56], [0, 0.58, 0.49, 0.42], [0.51, 0.58, 0.49, 0.42]] },
    grid: { panels: [[0, 0, 0.49, 0.49], [0.51, 0, 0.49, 0.49], [0, 0.51, 0.49, 0.49], [0.51, 0.51, 0.49, 0.49]] },
    duo: { panels: [[0, 0, 0.6, 1], [0.62, 0, 0.38, 0.49], [0.62, 0.51, 0.38, 0.49]] },
  };

  function layoutPanels(layout, W, H) {
    const def = LAYOUTS[layout] || LAYOUTS.strip;
    const m = Math.round(W * 0.02); // outer margin
    const g = Math.round(W * 0.015); // gutter between panels
    const innerW = W - m * 2;
    const innerH = H - m * 2;
    return def.panels.map(function (p) {
      const x = m + p[0] * innerW + (p[0] > 0 ? g / 2 : 0);
      const y = m + p[1] * innerH + (p[1] > 0 ? g / 2 : 0);
      const w = p[2] * innerW - (p[0] > 0 ? g / 2 : 0) - (p[0] + p[2] < 1 ? g / 2 : 0);
      const h = p[3] * innerH - (p[1] > 0 ? g / 2 : 0) - (p[1] + p[3] < 1 ? g / 2 : 0);
      return { x: x, y: y, w: w, h: h };
    });
  }

  // Cover-fit draw of one photo into a panel, with zoom and pan offsets
  // (ox, oy in fractions of the panel size, clamped so the photo still covers).
  function drawPhoto(ctx, img, rect, zoom, ox, oy) {
    const s = Math.max(rect.w / img.width, rect.h / img.height) * zoom;
    const dw = img.width * s;
    const dh = img.height * s;
    const maxOx = Math.max(0, (dw - rect.w) / 2 / rect.w);
    const maxOy = Math.max(0, (dh - rect.h) / 2 / rect.h);
    const cx = Math.max(-maxOx, Math.min(maxOx, ox));
    const cy = Math.max(-maxOy, Math.min(maxOy, oy));
    ctx.drawImage(img, rect.x + (rect.w - dw) / 2 + cx * rect.w, rect.y + (rect.h - dh) / 2 + cy * rect.h, dw, dh);
  }

  // Placeholder art for an empty panel: sunset gradient, sun disc, skyline.
  function drawPlaceholder(ctx, rect, theme) {
    const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    g.addColorStop(0, theme.grade[2]);
    g.addColorStop(0.55, theme.grade[1]);
    g.addColorStop(1, theme.grade[0]);
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    const sunR = rect.w * 0.16;
    ctx.fillStyle = 'rgba(255, 240, 200, 0.95)';
    ctx.beginPath();
    ctx.arc(rect.x + rect.w * 0.68, rect.y + rect.h * 0.38, sunR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(10, 4, 24, 0.85)';
    let bx = rect.x;
    let seed = 7;
    while (bx < rect.x + rect.w) {
      seed = (seed * 16807) % 2147483647;
      const bw = rect.w * (0.08 + (seed % 100) / 100 * 0.12);
      const bh = rect.h * (0.22 + (seed % 70) / 100 * 0.3);
      ctx.fillRect(bx, rect.y + rect.h - bh, bw, bh);
      bx += bw + rect.w * 0.015;
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = 'italic 900 ' + Math.round(rect.h * 0.09) + 'px "Arial Black", Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ADD PHOTO', rect.x + rect.w / 2, rect.y + rect.h * 0.52);
  }

  // Sunset / neon colour grade: warm overlay wash plus a vignette. Kept light
  // (0.22 / 0.34) so the photo keeps its own colour — the first run washed
  // the pier sample magenta at 0.28 / 0.42.
  function applyGrade(ctx, W, H, theme) {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, theme.grade[0]);
    g.addColorStop(0.5, theme.grade[1]);
    g.addColorStop(1, theme.grade[2]);
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(8,2,20,0.34)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }

  function drawCaptionBand(ctx, W, H, state, theme) {
    // Taller band than the first run (0.20 vs 0.17): the rule floated over
    // busy panel art in the grid portrait, and the subtitle sat tight to the
    // bottom edge. The fade now starts above the rule, and the title gets a
    // soft drop shadow so it reads over bright photos, not just its outline.
    const bandH = H * 0.2;
    const bandY = H - bandH;
    const g = ctx.createLinearGradient(0, bandY, 0, H);
    g.addColorStop(0, 'rgba(10,4,24,0)');
    g.addColorStop(0.35, theme.band + 'cc');
    g.addColorStop(1, theme.band);
    ctx.fillStyle = g;
    ctx.fillRect(0, bandY, W, bandH);
    ctx.fillStyle = theme.accent;
    ctx.fillRect(W * 0.04, bandY + bandH * 0.18, W * 0.92, Math.max(2, H * 0.004));

    // Title: shrink to fit, heavy italic, dark outline, gradient fill.
    const title = (state.caption || 'NEON COAST').toUpperCase();
    let size = Math.round(H * 0.088);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    let tw;
    do {
      ctx.font = 'italic 900 ' + size + 'px "Arial Black", Impact, "Arial Bold", sans-serif';
      tw = ctx.measureText(title).width;
      size -= 2;
    } while (tw > W * 0.92 && size > 10);
    size += 2;
    ctx.font = 'italic 900 ' + size + 'px "Arial Black", Impact, "Arial Bold", sans-serif';
    const tx = W * 0.04;
    const ty = bandY + bandH * 0.6;
    const fill = ctx.createLinearGradient(0, ty - size, 0, ty);
    fill.addColorStop(0, '#ffffff');
    fill.addColorStop(1, theme.accent);
    ctx.lineJoin = 'round';
    ctx.save();
    ctx.shadowColor = 'rgba(10,4,24,0.85)';
    ctx.shadowBlur = Math.round(size * 0.08);
    ctx.shadowOffsetY = Math.round(size * 0.03);
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = Math.max(3, size * 0.09);
    ctx.strokeText(title, tx, ty);
    ctx.fillStyle = fill;
    ctx.fillText(title, tx, ty);
    ctx.restore();

    // Subtitle: letterspaced, accent colour.
    const sub = (state.subtitle || '').toUpperCase();
    if (sub) {
      const ss = Math.max(10, Math.round(H * 0.026));
      ctx.font = '700 ' + ss + 'px "Arial Bold", Arial, sans-serif';
      try { ctx.letterSpacing = Math.round(ss * 0.32) + 'px'; } catch (e) { /* older canvas: no letterSpacing */ }
      ctx.fillStyle = theme.accent;
      ctx.fillText(sub, tx, ty + ss * 1.7);
      try { ctx.letterSpacing = '0px'; } catch (e) { /* ignore */ }
    }
  }

  // Draw the whole cover onto ctx at W x H. state: {layout, theme, caption,
  // subtitle, photos:[{img, zoom, ox, oy}...]}. selected is the panel index
  // highlighted in the editor preview (ignored on export, pass -1).
  function drawCover(ctx, W, H, state, selected) {
    const theme = THEMES[state.theme] || THEMES.sunset;
    ctx.save();
    ctx.fillStyle = theme.ink;
    ctx.fillRect(0, 0, W, H);
    const panels = layoutPanels(state.layout, W, H);
    panels.forEach(function (rect, i) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(rect.x, rect.y, rect.w, rect.h);
      ctx.clip();
      const photo = state.photos[i];
      if (photo && photo.img) {
        drawPhoto(ctx, photo.img, rect, photo.zoom || 1, photo.ox || 0, photo.oy || 0);
      } else {
        drawPlaceholder(ctx, rect, theme);
      }
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = Math.max(1, W * 0.002);
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      if (selected === i) {
        ctx.strokeStyle = theme.accent;
        ctx.lineWidth = Math.max(3, W * 0.006);
        ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      }
    });
    applyGrade(ctx, W, H, theme);
    drawCaptionBand(ctx, W, H, state, theme);
    ctx.restore();
    return panels;
  }

  function renderToCanvas(state, W, H) {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    drawCover(canvas.getContext('2d'), W, H, state, -1);
    return canvas;
  }

  return {
    THEMES: THEMES,
    LAYOUTS: LAYOUTS,
    layoutPanels: layoutPanels,
    drawCover: drawCover,
    renderToCanvas: renderToCanvas,
  };
})();

if (typeof window !== 'undefined') window.NeonCoastCover = NeonCoastCover;
