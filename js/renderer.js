/**
 * Overlay Canvas Renderer (v2.0 Pro Studio)
 * High-performance HTML5 Canvas rendering engine for social running overlays.
 * Supports freeform drag & drop, interactive resizing, custom texts & stickers,
 * and 6-7 distinct design variants for every widget.
 */

// Color themes with high-contrast accessibility presets
export const THEMES = {
  volt: {
    id: 'volt',
    name: 'Electric Volt',
    accent: '#ccff00',
    accentSecondary: '#10b981',
    text: '#ffffff',
    textMuted: '#94a3b8',
    cardBg: 'rgba(18, 18, 24, 0.78)',
    cardBorder: 'rgba(204, 255, 0, 0.25)',
  },
  cyan: {
    id: 'cyan',
    name: 'Tokyo Neon',
    accent: '#00f0ff',
    accentSecondary: '#ec4899',
    text: '#ffffff',
    textMuted: '#a5f3fc',
    cardBg: 'rgba(10, 15, 30, 0.78)',
    cardBorder: 'rgba(0, 240, 255, 0.28)',
  },
  coral: {
    id: 'coral',
    name: 'Hot Coral',
    accent: '#ff3366',
    accentSecondary: '#f43f5e',
    text: '#ffffff',
    textMuted: '#fecdd3',
    cardBg: 'rgba(20, 10, 18, 0.78)',
    cardBorder: 'rgba(255, 51, 102, 0.28)',
  },
  white: {
    id: 'white',
    name: 'Minimal White',
    accent: '#ffffff',
    accentSecondary: '#e2e8f0',
    text: '#ffffff',
    textMuted: '#94a3b8',
    cardBg: 'rgba(0, 0, 0, 0.65)',
    cardBorder: 'rgba(255, 255, 255, 0.2)',
  },
  gold: {
    id: 'gold',
    name: 'Champion Gold',
    accent: '#fbbf24',
    accentSecondary: '#f59e0b',
    text: '#ffffff',
    textMuted: '#fde68a',
    cardBg: 'rgba(20, 18, 10, 0.78)',
    cardBorder: 'rgba(251, 191, 36, 0.3)',
  },
};

// Aspect ratio pixel specifications
export const ASPECT_RATIOS = {
  '9:16': { width: 1080, height: 1920, label: '9:16 Story / Reels / TikTok' },
  '1:1': { width: 1080, height: 1080, label: '1:1 Square Post' },
  '4:5': { width: 1080, height: 1350, label: '4:5 Portrait Post' },
  '16:9': { width: 1920, height: 1080, label: '16:9 Landscape' },
};

export class OverlayRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.bgImage = null; // HTMLImageElement
    this.widgetBounds = {}; // Track bounding boxes of all rendered widgets for interactive selection/drag
  }

  setBgImage(image) {
    this.bgImage = image;
  }

  recordBounds(key, name, x, y, width, height) {
    if (!this.widgetBounds) this.widgetBounds = {};
    this.widgetBounds[key] = {
      id: key,
      name: name,
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(width),
      height: Math.round(height),
    };
  }

  getWidgetPos(config, key, defaultX, defaultY, defaultW, defaultH) {
    if (config && config.widgetPositions && config.widgetPositions[key]) {
      const p = config.widgetPositions[key];
      return {
        x: p.x !== undefined ? p.x : defaultX,
        y: p.y !== undefined ? p.y : defaultY,
        width: p.width !== undefined ? p.width : defaultW,
        height: p.height !== undefined ? p.height : defaultH,
        isCustom: true,
      };
    }
    return {
      x: defaultX,
      y: defaultY,
      width: defaultW,
      height: defaultH,
      isCustom: false,
    };
  }

  getWidgetBgBounds(config, widgetKey, x, y, width, height) {
    const bgCustom = (config && config.widgetBgStyles && config.widgetBgStyles[widgetKey]) || {};
    const offsetX = typeof bgCustom.offsetX === 'number' ? bgCustom.offsetX : 0;
    const offsetY = typeof bgCustom.offsetY === 'number' ? bgCustom.offsetY : 0;
    const widthDelta = typeof bgCustom.widthDelta === 'number' ? bgCustom.widthDelta : 0;
    const heightDelta = typeof bgCustom.heightDelta === 'number' ? bgCustom.heightDelta : 0;
    const customW = typeof bgCustom.width === 'number' ? bgCustom.width : (width + widthDelta);
    const customH = typeof bgCustom.height === 'number' ? bgCustom.height : (height + heightDelta);
    const bgX = x + offsetX;
    const bgY = y + offsetY;
    const bgW = Math.max(20, customW);
    const bgH = Math.max(16, customH);
    const radius = typeof bgCustom.radius === 'number' ? bgCustom.radius : (config.cardRadius || 16);
    const borderWidth = typeof bgCustom.borderWidth === 'number' ? bgCustom.borderWidth : 1;
    const borderColor = bgCustom.borderColor || null;
    const fillColor = bgCustom.fillColor || null;
    const z = typeof bgCustom.z === 'number' ? bgCustom.z : 0;
    const visible = bgCustom.visible !== false && bgCustom.hidden !== true;
    const showBg = bgCustom.showBg !== false;
    const showBorder = bgCustom.showBorder !== false;
    const textOnly = bgCustom.textOnly === true;
    return { x: bgX, y: bgY, width: bgW, height: bgH, radius, borderWidth, borderColor, fillColor, z, visible, showBg, showBorder, textOnly };
  }

  isTextOnly(config, widgetKey) {
    const el = this.getElementStyle(config, widgetKey);
    const cardStyle = el.cardStyle && el.cardStyle !== 'default' ? el.cardStyle : (config ? config.cardStyle : 'glass');
    const bg = (config && config.widgetBgStyles && config.widgetBgStyles[widgetKey]) || {};
    return cardStyle === 'text-only' || cardStyle === 'floating' || cardStyle === 'none' || bg.textOnly === true || (bg.showBg === false && bg.showBorder === false);
  }

  drawWidgetCardBg(ctx, widgetKey, x, y, width, height, config, theme, highlight = false) {
    const { cardStyle } = this.getEffectiveColors(config, theme, theme.accent, widgetKey);
    const bg = this.getWidgetBgBounds(config, widgetKey, x, y, width, height);

    const isTextOnly = cardStyle === 'text-only' || cardStyle === 'floating' || cardStyle === 'none' || bg.textOnly || (!bg.showBg && !bg.showBorder);
    if (isTextOnly || !bg.visible) return null; // Floating / text-only / hidden (no backdrop)

    // Record background border bounds for interactive selection/resizing
    this.recordBounds(widgetKey + '_bg', (widgetKey.toUpperCase() + ' Border'), bg.x, bg.y, bg.width, bg.height);

    ctx.save();
    this.drawRoundedRect(ctx, bg.x, bg.y, bg.width, bg.height, bg.radius);

    const style = bg.style || cardStyle || 'glass';
    const strokeColor = bg.borderColor || (highlight ? theme.accent : theme.cardBorder);
    const lineWidth = bg.borderWidth !== undefined ? bg.borderWidth : (highlight ? 1.5 : 1);

    if (bg.showBg) {
      if (bg.fillColor) {
        ctx.fillStyle = bg.fillColor;
        ctx.fill();
      } else if (style === 'minimal' || style === 'outline') {
        // Outlined only
      } else if (style === 'solid') {
        ctx.fillStyle = '#14141d';
        ctx.fill();
      } else {
        // Default glass style
        ctx.fillStyle = highlight ? 'rgba(30, 30, 42, 0.85)' : theme.cardBg;
        ctx.fill();
      }
    }

    if (bg.showBorder && lineWidth > 0) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }

    ctx.restore();
    return bg;
  }

  getElementOffset(config, widgetKey, partKey) {
    if (config && config.widgetElementOffsets && config.widgetElementOffsets[widgetKey]) {
      const offsets = config.widgetElementOffsets[widgetKey];
      let part = offsets[partKey];
      if (!part) {
        if (partKey === 'val') part = offsets['value'];
        else if (partKey === 'value') part = offsets['val'];
        else if (partKey === 'sec') part = offsets['secondary'];
        else if (partKey === 'secondary') part = offsets['sec'];
      }
      if (part) {
        return {
          x: typeof part.x === 'number' ? part.x : 0,
          y: typeof part.y === 'number' ? part.y : 0,
          z: typeof part.z === 'number' ? part.z : 1,
          hidden: part.hidden === true || part.visible === false,
          scale: typeof part.scale === 'number' && !isNaN(part.scale) ? part.scale : 100,
          fontFamily: part.fontFamily || 'default',
          color: (part.color && part.color !== 'default') ? part.color : 'default',
        };
      }
    }
    return { x: 0, y: 0, z: 1, hidden: false, scale: 100, fontFamily: 'default', color: 'default' };
  }

  getSubPartColor(config, widgetKey, partKey, defaultColor) {
    const off = this.getElementOffset(config, widgetKey, partKey);
    if (off && off.color && off.color !== 'default') return off.color;
    return defaultColor;
  }

  isElementHidden(config, widgetKey, partKey) {
    return this.getElementOffset(config, widgetKey, partKey).hidden;
  }

  applyZDepth(ctx, z = 1) {
    if (z > 1) {
      ctx.shadowColor = 'rgba(0, 0, 0, ' + Math.min(0.85, 0.35 + z * 0.1) + ')';
      ctx.shadowBlur = Math.min(24, z * 5);
      ctx.shadowOffsetY = Math.min(12, z * 2.5);
    } else if (z < 0) {
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    }
  }

  getTextOverride(config, widgetKey, fieldKey, defaultVal) {
    if (config && config.widgetTextOverrides && config.widgetTextOverrides[widgetKey]) {
      const val = config.widgetTextOverrides[widgetKey][fieldKey];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        return String(val);
      }
    }
    return defaultVal;
  }

  getMetricLabel(config, key, defaultLabel) {
    if (config && config.widgetTextOverrides && config.widgetTextOverrides.metrics) {
      const val = config.widgetTextOverrides.metrics[key.toLowerCase()];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        return String(val).trim().toUpperCase();
      }
    }
    if (config && config['label' + key] && config['label' + key].trim()) {
      return config['label' + key].trim().toUpperCase();
    }
    return defaultLabel;
  }

  getElementStyle(config, key) {
    const defaults = {
      fontFamily: 'default',
      fontSizeScale: 1.0,
      color: null,
      accentColor: null,
      textAlign: 'default',
      cardStyle: 'default',
      opacity: 100,
    };
    const custom = (config && config.elementStyles && config.elementStyles[key]) || {};
    return { ...defaults, ...custom };
  }

  getEffectiveFont(config, key, weight = 'bold', baseSize = 20) {
    const el = this.getElementStyle(config, key);
    const fontName = el.fontFamily && el.fontFamily !== 'default' ? el.fontFamily : config.fontFamily;
    const fontFam = this.getFontFamily(fontName);
    let scale = typeof el.fontSizeScale === 'number' && !isNaN(el.fontSizeScale) ? el.fontSizeScale : 1.0;
    if (scale > 5) scale = scale / 100; // Normalize percentage values (e.g. 100 -> 1.0, 150 -> 1.5)
    const finalSize = Math.max(8, Math.round(baseSize * scale));
    return `${weight} ${finalSize}px ${fontFam}`;
  }

  getSubPartFont(config, widgetKey, partKey, weight = 'bold', baseSize = 20) {
    const off = this.getElementOffset(config, widgetKey, partKey);
    const el = this.getElementStyle(config, widgetKey);
    const fontName = (off.fontFamily && off.fontFamily !== 'default')
      ? off.fontFamily
      : (el.fontFamily && el.fontFamily !== 'default' ? el.fontFamily : config.fontFamily);
    const fontFam = this.getFontFamily(fontName);
    let widgetScale = typeof el.fontSizeScale === 'number' && !isNaN(el.fontSizeScale) ? el.fontSizeScale : 1.0;
    if (widgetScale > 5) widgetScale = widgetScale / 100;
    let subScale = typeof off.scale === 'number' && !isNaN(off.scale) ? off.scale : 100;
    if (subScale > 5) subScale = subScale / 100;
    const finalSize = Math.max(6, Math.round(baseSize * widgetScale * subScale));
    return `${weight} ${finalSize}px ${fontFam}`;
  }

  getEffectiveColors(config, theme, accent, key) {
    const el = this.getElementStyle(config, key);
    const text = el.color || theme.text;
    const textMuted = el.color ? el.color + 'bb' : theme.textMuted;
    const elAccent = el.accentColor || accent;
    const cardStyle = el.cardStyle && el.cardStyle !== 'default' ? el.cardStyle : config.cardStyle;
    const align = el.textAlign && el.textAlign !== 'default' ? el.textAlign : null;
    const opacity = typeof el.opacity === 'number' && !isNaN(el.opacity) ? el.opacity / 100 : 1.0;
    return { text, textMuted, accent: elAccent, cardStyle, align, opacity };
  }

  /**
   * Main render function
   * @param {Object} activity - Normalized activity data
   * @param {Object} config - User customization options
   * @param {number} scaleMultiplier - Resolution multiplier (1x preview, 2x export)
   */
  render(activity, config, scaleMultiplier = 1) {
    const ratioSpec = ASPECT_RATIOS[config.aspectRatio] || ASPECT_RATIOS['9:16'];
    const W = ratioSpec.width * scaleMultiplier;
    const H = ratioSpec.height * scaleMultiplier;

    this.canvas.width = W;
    this.canvas.height = H;

    const ctx = this.ctx;
    ctx.save();
    ctx.scale(scaleMultiplier, scaleMultiplier);

    const baseW = ratioSpec.width;
    const baseH = ratioSpec.height;

    // Reset bounding boxes on every render
    this.widgetBounds = {};

    const theme = THEMES[config.theme] || THEMES.volt;
    const accentColor = config.customAccentColor || theme.accent;

    // 1. Draw Background
    this.drawBackground(ctx, baseW, baseH, config);

    if (!activity) {
      this.drawPlaceholder(ctx, baseW, baseH);
      ctx.restore();
      return;
    }

    // 2. Render layout
    this.renderLayout(ctx, baseW, baseH, activity, config, theme, accentColor);

    // 3. Render Custom Texts & Stickers
    this.drawCustomTexts(ctx, baseW, baseH, config.customTexts, theme, accentColor);

    ctx.restore();
  }

  drawBackground(ctx, w, h, config) {
    ctx.clearRect(0, 0, w, h);

    if (config.bgType === 'transparent') {
      delete this.widgetBounds['__bg_photo__'];
      return;
    }

    if (config.bgType === 'photo' && this.bgImage) {
      const img = this.bgImage;
      const imgAspect = img.width / img.height;
      const canvasAspect = w / h;
      const isRatioSimilar = Math.abs(imgAspect - canvasAspect) / Math.max(imgAspect, canvasAspect) < 0.05;

      // Fit mode: 'fit' (contain / no-crop full image) vs 'cover' (fill canvas)
      // When aspect ratio is not similar, default to 'fit' unless explicitly set to 'cover'
      const photoFit = config.photoFit || (isRatioSimilar ? 'cover' : 'fit');
      const backdrop = config.photoBackdrop || 'blur'; // 'blur', 'solid', 'black', 'transparent'
      const blur = config.photoBlur || 0;
      const brightness = config.photoBrightness || 100;
      const contrast = config.photoContrast || 100;
      const zoom = (typeof config.photoZoom === 'number' && config.photoZoom > 0) ? config.photoZoom : 1;

      let drawW, drawH;
      if (photoFit === 'fit' || photoFit === 'contain') {
        // Fit entire image inside canvas without cropping any part
        const baseScale = Math.min(w / img.width, h / img.height);
        drawW = img.width * baseScale;
        drawH = img.height * baseScale;
      } else {
        // Fill canvas (cover)
        if (imgAspect > canvasAspect) {
          drawH = h;
          drawW = h * imgAspect;
        } else {
          drawW = w;
          drawH = w / imgAspect;
        }
      }

      drawW *= zoom;
      drawH *= zoom;

      const panX = (config.photoPanX || 0) * (w / 100);
      const panY = (config.photoPanY || 0) * (h / 100);

      const dx = (w - drawW) / 2 + panX;
      const dy = (h - drawH) / 2 + panY;

      // Render margin backdrop if photo leaves any margins uncovered on the canvas
      const coversEntireCanvas = dx <= 0 && dy <= 0 && (dx + drawW >= w) && (dy + drawH >= h);
      if (!coversEntireCanvas && backdrop !== 'transparent') {
        if (backdrop === 'blur') {
          // Modern ambient blur background: smoothly fills unseen edges without empty black space
          ctx.save();
          let bgW, bgH;
          if (imgAspect > canvasAspect) {
            bgH = h;
            bgW = h * imgAspect;
          } else {
            bgW = w;
            bgH = w / imgAspect;
          }
          const bgX = (w - bgW) / 2;
          const bgY = (h - bgH) / 2;
          const ambientBlur = Math.max(30, blur + 25);
          const ambientBrightness = Math.min(65, brightness * 0.55);
          ctx.filter = `blur(${ambientBlur}px) brightness(${ambientBrightness}%)`;
          ctx.drawImage(img, bgX, bgY, bgW, bgH);
          ctx.restore();
        } else if (backdrop === 'black') {
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, w, h);
        } else {
          // Solid canvas theme color
          ctx.fillStyle = config.solidBgColor || '#0a0a0d';
          ctx.fillRect(0, 0, w, h);
        }
      }

      // Draw the uncropped photo at full quality
      ctx.save();
      ctx.filter = `blur(${blur}px) brightness(${brightness}%) contrast(${contrast}%)`;
      ctx.drawImage(img, dx, dy, drawW, drawH);
      ctx.restore();

      // Track photo bounding box for interactive selection and drag
      this.widgetBounds['__bg_photo__'] = {
        x: Math.round(dx),
        y: Math.round(dy),
        width: Math.round(drawW),
        height: Math.round(drawH),
        name: 'Background Photo'
      };

      // Top and bottom protective gradient fades so text pops
      if (config.photoProtectionGradient !== false) {
        const topGrad = ctx.createLinearGradient(0, 0, 0, h * 0.35);
        topGrad.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
        topGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.35)');
        topGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = topGrad;
        ctx.fillRect(0, 0, w, h * 0.35);

        const bottomGrad = ctx.createLinearGradient(0, h * 0.45, 0, h);
        bottomGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        bottomGrad.addColorStop(0.4, 'rgba(0, 0, 0, 0.45)');
        bottomGrad.addColorStop(1, 'rgba(0, 0, 0, 0.88)');
        ctx.fillStyle = bottomGrad;
        ctx.fillRect(0, h * 0.45, w, h * 0.55);
      }
      return;
    }

    delete this.widgetBounds['__bg_photo__'];

    if (config.bgType === 'gradient') {
      const gradPreset = config.gradientPreset || 'sunset';
      const grad = ctx.createLinearGradient(0, 0, w, h);

      if (gradPreset === 'sunset') {
        grad.addColorStop(0, '#f97316');
        grad.addColorStop(0.5, '#ec4899');
        grad.addColorStop(1, '#3b0764');
      } else if (gradPreset === 'cyber') {
        grad.addColorStop(0, '#064e3b');
        grad.addColorStop(0.5, '#0f172a');
        grad.addColorStop(1, '#020617');
      } else if (gradPreset === 'neon') {
        grad.addColorStop(0, '#0369a1');
        grad.addColorStop(0.5, '#4f46e5');
        grad.addColorStop(1, '#1e1b4b');
      } else {
        grad.addColorStop(0, '#1e293b');
        grad.addColorStop(1, '#020617');
      }

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      return;
    }

    // Default Solid
    const solidColor = config.solidBgColor || '#0a0a0c';
    ctx.fillStyle = solidColor;
    ctx.fillRect(0, 0, w, h);
  }

  drawPlaceholder(ctx, w, h) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Select or upload an activity file to start', w / 2, h / 2);
  }

  /**
   * Layout dispatcher
   */
  renderLayout(ctx, w, h, activity, config, theme, accent) {
    const template = config.template || 'story-pro';

    switch (template) {
      case 'split-focus':
        this.renderSplitFocusLayout(ctx, w, h, activity, config, theme, accent);
        break;
      case 'minimal-hud':
        this.renderMinimalHudLayout(ctx, w, h, activity, config, theme, accent);
        break;
      case 'stat-beast':
        this.renderStatBeastLayout(ctx, w, h, activity, config, theme, accent);
        break;
      case 'route-focus':
        this.renderRouteFocusLayout(ctx, w, h, activity, config, theme, accent);
        break;
      case 'lap-workout':
        this.renderLapWorkoutLayout(ctx, w, h, activity, config, theme, accent);
        break;
      case 'story-pro':
      default:
        this.renderStoryProLayout(ctx, w, h, activity, config, theme, accent);
        break;
    }
  }

  // ==========================================
  // TEMPLATE 1: STORY PRO
  // ==========================================
  renderStoryProLayout(ctx, w, h, activity, config, theme, accent) {
    const pad = w * 0.06;
    let currY = h * 0.05;

    // 1. Header
    if (config.showWidgetHeader !== false) {
      const pos = this.getWidgetPos(config, 'header', pad, currY, w - pad * 2, 80);
      const nextY = this.drawHeader(ctx, pos.x, pos.y, pos.width, activity, config, theme, accent, pos.height);
      if (!pos.isCustom) currY = nextY + 18;
    }

    // 2. Route Map
    if (config.showWidgetMap !== false && activity.hasRoute) {
      const defaultMapH = h * (config.aspectRatio === '16:9' ? 0.42 : 0.26);
      const pos = this.getWidgetPos(config, 'map', pad, currY, w - pad * 2, defaultMapH);
      this.drawRouteMap(ctx, pos.x, pos.y, pos.width, pos.height, activity, config, theme, accent);
      if (!pos.isCustom) currY += pos.height + 20;
    }

    // 3. Hero Metric
    if (config.showWidgetHero !== false) {
      const pos = this.getWidgetPos(config, 'hero', pad, currY, w - pad * 2, 105);
      const nextY = this.drawHeroStat(ctx, pos.x, pos.y, pos.width, activity, config, theme, accent, pos.height);
      if (!pos.isCustom) currY = nextY + 16;
    }

    // 4. Secondary Metrics Grid
    if (config.showWidgetMetrics !== false) {
      const pos = this.getWidgetPos(config, 'metrics', pad, currY, w - pad * 2, 80);
      const nextY = this.drawMetricsGrid(ctx, pos.x, pos.y, pos.width, activity, config, theme, accent, 3, pos.height);
      if (!pos.isCustom) currY = nextY + 16;
    }

    // 5. Avg Heart Rate Badge (Optional dedicated widget)
    if (config.showWidgetAvgHrBadge && activity.avgHr && currY < h * 0.85) {
      const pos = this.getWidgetPos(config, 'hrBadge', pad, currY, w - pad * 2, 60);
      const nextY = this.drawAvgHeartRateBadge(ctx, pos.x, pos.y, pos.width, activity, config, theme, accent, pos.height);
      if (!pos.isCustom) currY = nextY + 16;
    }

    // 6. Splits Widget (Bar chart or Spotlight Card)
    if (config.showWidgetSplits !== false) {
      if (config.splitWidgetMode === 'highlight') {
        const pos = this.getWidgetPos(config, 'splitHighlight', pad, currY, w - pad * 2, 115);
        const nextY = this.drawSplitHighlightCard(ctx, pos.x, pos.y, pos.width, activity, config, theme, accent, pos.height);
        if (!pos.isCustom) currY = nextY + 16;
      } else {
        const pos = this.getWidgetPos(config, 'splits', pad, currY, w - pad * 2, 150);
        const nextY = this.drawSplitsBarChart(ctx, pos.x, pos.y, pos.width, activity, config, theme, accent, pos.height);
        if (!pos.isCustom) currY = nextY + 16;
      }
    }

    // 7. Pace Graph (If enabled)
    if (config.showWidgetPaceGraph && currY < h * 0.86) {
      const defaultH = Math.min(100, Math.max(50, h * 0.9 - currY));
      const pos = this.getWidgetPos(config, 'paceGraph', pad, currY, w - pad * 2, defaultH);
      const nextY = this.drawPaceGraph(ctx, pos.x, pos.y, pos.width, pos.height, activity, config, theme, accent);
      if (!pos.isCustom) currY = nextY + 16;
    }

    // 8. Heart Rate Graph (If enabled)
    if (config.showWidgetHrGraph && currY < h * 0.88) {
      const defaultH = Math.min(100, Math.max(50, h * 0.91 - currY));
      const pos = this.getWidgetPos(config, 'hrGraph', pad, currY, w - pad * 2, defaultH);
      const nextY = this.drawHeartRateGraph(ctx, pos.x, pos.y, pos.width, pos.height, activity, config, theme, accent);
      if (!pos.isCustom) currY = nextY + 16;
    }

    // 9. Elevation Profile (If enabled)
    if (config.showWidgetElevation && currY < h * 0.90) {
      const defaultH = Math.min(85, Math.max(45, h * 0.92 - currY));
      const pos = this.getWidgetPos(config, 'elevation', pad, currY, w - pad * 2, defaultH);
      this.drawElevationProfile(ctx, pos.x, pos.y, pos.width, pos.height, activity, config, theme, accent);
      if (!pos.isCustom) currY += pos.height + 16;
    }

    // 10. Watermark
    if (config.showWidgetBrand !== false) {
      const pos = this.getWidgetPos(config, 'brand', pad, h - h * 0.045, w - pad * 2, 26);
      this.drawBrandWatermark(ctx, pos.x, pos.y, pos.width, config, theme, accent, pos.height);
    }
  }

  // ==========================================
  // TEMPLATE 2: SPLIT FOCUS
  // ==========================================
  renderSplitFocusLayout(ctx, w, h, activity, config, theme, accent) {
    const pad = w * 0.06;
    let currY = h * 0.05;

    const posH = this.getWidgetPos(config, 'header', pad, currY, w - pad * 2, 80);
    currY = this.drawHeader(ctx, posH.x, posH.y, posH.width, activity, config, theme, accent, posH.height) + 16;

    // Split Spotlight Card
    const posSp = this.getWidgetPos(config, 'splitHighlight', pad, currY, w - pad * 2, 115);
    currY = this.drawSplitHighlightCard(ctx, posSp.x, posSp.y, posSp.width, activity, config, theme, accent, posSp.height) + 18;

    // Full Splits Bar Chart
    const posSb = this.getWidgetPos(config, 'splits', pad, currY, w - pad * 2, 175);
    currY = this.drawSplitsBarChart(ctx, posSb.x, posSb.y, posSb.width, activity, config, theme, accent, posSb.height) + 18;

    // Pace or HR Graph
    if (config.showWidgetPaceGraph) {
      const posP = this.getWidgetPos(config, 'paceGraph', pad, currY, w - pad * 2, 95);
      currY = this.drawPaceGraph(ctx, posP.x, posP.y, posP.width, posP.height, activity, config, theme, accent) + 16;
    } else if (activity.hasRoute && currY < h * 0.76) {
      const mapH = Math.min(160, h * 0.84 - currY);
      const posM = this.getWidgetPos(config, 'map', pad, currY, w - pad * 2, mapH);
      this.drawRouteMap(ctx, posM.x, posM.y, posM.width, posM.height, activity, config, theme, accent);
      currY += posM.height + 16;
    }

    // Compact Summary Pill
    currY = this.drawCompactSummaryPill(ctx, pad, currY, w - pad * 2, activity, config, theme, accent);

    const posB = this.getWidgetPos(config, 'brand', pad, h - h * 0.04, w - pad * 2, 26);
    this.drawBrandWatermark(ctx, posB.x, posB.y, posB.width, config, theme, accent, posB.height);
  }

  // ==========================================
  // TEMPLATE 3: MINIMAL HUD
  // ==========================================
  renderMinimalHudLayout(ctx, w, h, activity, config, theme, accent) {
    const pad = w * 0.06;

    // Top Floating Glass Pill
    const topY = h * 0.06;
    this.drawFloatingHudPill(ctx, pad, topY, w - pad * 2, activity, config, theme, accent);

    // Subtle route map
    if (activity.hasRoute) {
      const mapH = h * 0.32;
      const mapY = h * 0.48;
      const posM = this.getWidgetPos(config, 'map', pad * 1.5, mapY, w - pad * 3, mapH);
      this.drawRouteMap(ctx, posM.x, posM.y, posM.width, posM.height, activity, config, theme, accent);
    }

    // Avg HR Badge or Pace/HR graph bottom
    if (config.showWidgetAvgHrBadge && activity.avgHr) {
      const posHb = this.getWidgetPos(config, 'hrBadge', pad, h * 0.81, w - pad * 2, 60);
      this.drawAvgHeartRateBadge(ctx, posHb.x, posHb.y, posHb.width, activity, config, theme, accent, posHb.height);
    }

    // Bottom Split Mini-bar
    const botY = h * 0.88;
    if (config.showWidgetSplits !== false) {
      this.drawMiniSplitsBar(ctx, pad, botY, w - pad * 2, activity, config, theme, accent);
    }

    const posB = this.getWidgetPos(config, 'brand', pad, h - h * 0.035, w - pad * 2, 26);
    this.drawBrandWatermark(ctx, posB.x, posB.y, posB.width, config, theme, accent, posB.height);
  }

  // ==========================================
  // TEMPLATE 4: STAT BEAST
  // ==========================================
  renderStatBeastLayout(ctx, w, h, activity, config, theme, accent) {
    const pad = w * 0.05;
    let currY = h * 0.04;

    const posH = this.getWidgetPos(config, 'header', pad, currY, w - pad * 2, 80);
    currY = this.drawHeader(ctx, posH.x, posH.y, posH.width, activity, config, theme, accent, posH.height) + 10;

    // Route Map (compact)
    if (activity.hasRoute) {
      const mapH = h * 0.20;
      const posM = this.getWidgetPos(config, 'map', pad, currY, w - pad * 2, mapH);
      this.drawRouteMap(ctx, posM.x, posM.y, posM.width, posM.height, activity, config, theme, accent);
      currY += posM.height + 12;
    }

    // Hero + Metrics
    const posHero = this.getWidgetPos(config, 'hero', pad, currY, w - pad * 2, 105);
    currY = this.drawHeroStat(ctx, posHero.x, posHero.y, posHero.width, activity, config, theme, accent, posHero.height) + 12;

    const posMet = this.getWidgetPos(config, 'metrics', pad, currY, w - pad * 2, 80);
    currY = this.drawMetricsGrid(ctx, posMet.x, posMet.y, posMet.width, activity, config, theme, accent, 3, posMet.height) + 12;

    // Pace Graph & Heart Rate Graph
    if (config.showWidgetPaceGraph && currY < h * 0.78) {
      const posP = this.getWidgetPos(config, 'paceGraph', pad, currY, w - pad * 2, 75);
      currY = this.drawPaceGraph(ctx, posP.x, posP.y, posP.width, posP.height, activity, config, theme, accent) + 12;
    }

    if (config.showWidgetHrGraph && currY < h * 0.82) {
      const posHr = this.getWidgetPos(config, 'hrGraph', pad, currY, w - pad * 2, 75);
      currY = this.drawHeartRateGraph(ctx, posHr.x, posHr.y, posHr.width, posHr.height, activity, config, theme, accent) + 12;
    } else if (activity.trackpoints && activity.trackpoints.length > 2 && currY < h * 0.82) {
      const posE = this.getWidgetPos(config, 'elevation', pad, currY, w - pad * 2, 70);
      this.drawElevationProfile(ctx, posE.x, posE.y, posE.width, posE.height, activity, config, theme, accent);
      currY += posE.height + 12;
    }

    // Splits Bar
    if (config.showWidgetSplits !== false && currY < h * 0.88) {
      const posS = this.getWidgetPos(config, 'splits', pad, currY, w - pad * 2, 100);
      currY = this.drawSplitsBarChart(ctx, posS.x, posS.y, posS.width, activity, config, theme, accent, posS.height) + 12;
    }

    // HR Zones
    if (activity.hrZones && config.showWidgetHrZones !== false && currY < h * 0.92) {
      this.drawHrZonesBar(ctx, pad, currY, w - pad * 2, activity, config, theme, accent);
    }

    const posB = this.getWidgetPos(config, 'brand', pad, h - h * 0.035, w - pad * 2, 26);
    this.drawBrandWatermark(ctx, posB.x, posB.y, posB.width, config, theme, accent, posB.height);
  }

  // ==========================================
  // TEMPLATE 5: ROUTE FOCUS
  // ==========================================
  renderRouteFocusLayout(ctx, w, h, activity, config, theme, accent) {
    const pad = w * 0.06;
    let currY = h * 0.05;

    const posH = this.getWidgetPos(config, 'header', pad, currY, w - pad * 2, 80);
    currY = this.drawHeader(ctx, posH.x, posH.y, posH.width, activity, config, theme, accent, posH.height) + 16;

    // Massive Route Map (Dominates 50% of the canvas)
    if (activity.hasRoute) {
      const mapH = h * 0.52;
      const posM = this.getWidgetPos(config, 'map', pad, currY, w - pad * 2, mapH);
      this.drawRouteMap(ctx, posM.x, posM.y, posM.width, posM.height, activity, config, theme, accent);
      currY += posM.height + 18;
    }

    // Floating Hero Overlay
    const posHero = this.getWidgetPos(config, 'hero', pad, currY, w - pad * 2, 105);
    currY = this.drawHeroStat(ctx, posHero.x, posHero.y, posHero.width, activity, config, theme, accent, posHero.height) + 16;

    // Metrics Strip
    const posMet = this.getWidgetPos(config, 'metrics', pad, currY, w - pad * 2, 80);
    currY = this.drawMetricsGrid(ctx, posMet.x, posMet.y, posMet.width, activity, config, theme, accent, 3, posMet.height) + 16;

    const posB = this.getWidgetPos(config, 'brand', pad, h - h * 0.035, w - pad * 2, 26);
    this.drawBrandWatermark(ctx, posB.x, posB.y, posB.width, config, theme, accent, posB.height);
  }

  // ==========================================
  // TEMPLATE 6: LAP WORKOUT
  // ==========================================
  renderLapWorkoutLayout(ctx, w, h, activity, config, theme, accent) {
    const pad = w * 0.06;
    let currY = h * 0.05;

    const posH = this.getWidgetPos(config, 'header', pad, currY, w - pad * 2, 80);
    currY = this.drawHeader(ctx, posH.x, posH.y, posH.width, activity, config, theme, accent, posH.height) + 16;

    // Fastest / Spotlight Lap Card
    const posSp = this.getWidgetPos(config, 'splitHighlight', pad, currY, w - pad * 2, 115);
    currY = this.drawSplitHighlightCard(ctx, posSp.x, posSp.y, posSp.width, activity, config, theme, accent, posSp.height) + 16;

    // High chart for all workout laps
    const posS = this.getWidgetPos(config, 'splits', pad, currY, w - pad * 2, 220);
    currY = this.drawSplitsBarChart(ctx, posS.x, posS.y, posS.width, activity, config, theme, accent, posS.height) + 16;

    // Pace or HR Graph
    if (config.showWidgetPaceGraph && currY < h * 0.84) {
      const posP = this.getWidgetPos(config, 'paceGraph', pad, currY, w - pad * 2, 85);
      currY = this.drawPaceGraph(ctx, posP.x, posP.y, posP.width, posP.height, activity, config, theme, accent) + 16;
    }

    // HR Zones bar
    if (activity.hrZones && currY < h * 0.88) {
      currY = this.drawHrZonesBar(ctx, pad, currY, w - pad * 2, activity, config, theme, accent) + 18;
    }

    const posB = this.getWidgetPos(config, 'brand', pad, h - h * 0.035, w - pad * 2, 26);
    this.drawBrandWatermark(ctx, posB.x, posB.y, posB.width, config, theme, accent, posB.height);
  }

  // =========================================================================
  // WIDGET 1: HEADER
  // Designs: 'modern', 'editorial', 'athletic', 'pill', 'retro-cyber', 'minimalist-stamp', 'badge-shield'
  // =========================================================================
  drawHeader(ctx, x, y, width, activity, config, theme, accent, customH = null) {
    ctx.save();
    const elStyle = this.getElementStyle(config, 'header');
    const { text, textMuted, accent: elAccent, cardStyle, align, opacity } = this.getEffectiveColors(config, theme, accent, 'header');
    if (opacity < 1) ctx.globalAlpha = opacity;

    const font = this.getFontFamily(elStyle.fontFamily !== 'default' ? elStyle.fontFamily : config.fontFamily);
    const design = config.headerTemplate || config.headerDesign || 'modern';
    let title = this.getTextOverride(config, 'header', 'title', config.customTitle || activity.title || 'Morning Run');
    let dateText = this.getTextOverride(config, 'header', 'subtitle', config.customSubtitle || `${activity.dateFormatted} • ${activity.timeFormatted}`);
    let runnerName = this.getTextOverride(config, 'header', 'runner', config.runnerName || '@runner');
    let location = this.getTextOverride(config, 'header', 'location', config.locationName || '');
    let weatherText = this.getTextOverride(config, 'header', 'weather', config.weatherText || '');

    // Sub-element X, Y, Z offsets
    const offTitle = this.getElementOffset(config, 'header', 'title');
    const offSub = this.getElementOffset(config, 'header', 'subtitle');
    const offRunner = this.getElementOffset(config, 'header', 'runner');
    const offLoc = this.getElementOffset(config, 'header', 'location');
    const offWeather = this.getElementOffset(config, 'header', 'weather');

    const showLocation = config.headerShowLocation !== false && config.showLocation !== false && !offLoc.hidden;
    location = showLocation ? location : '';

    if (offTitle.hidden) title = '';
    if (offSub.hidden) dateText = '';
    if (offRunner.hidden) runnerName = '';
    if (!showLocation) location = '';
    if (offWeather.hidden) weatherText = '';

    // TEMPLATE: HUD FLIGHT INSTRUMENT
    if (design === 'hud-flight') {
      const h = customH || 96;
      this.drawWidgetCardBg(ctx, 'header', x, y, width, h, config, theme);
      // Top flight bracket ticks
      ctx.strokeStyle = elAccent;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 12, y + 16); ctx.lineTo(x + 12, y + 8); ctx.lineTo(x + 36, y + 8);
      ctx.moveTo(x + width - 12, y + 16); ctx.lineTo(x + width - 12, y + 8); ctx.lineTo(x + width - 36, y + 8);
      ctx.stroke();

      this.applyZDepth(ctx, offRunner.z);
      ctx.textAlign = 'left';
      ctx.fillStyle = this.getSubPartColor(config, 'header', 'runner', elAccent);
      ctx.font = this.getSubPartFont(config, 'header', 'runner', 'bold', 11);
      ctx.fillText(`▲ RUN_TELEMETRY // ${runnerName.toUpperCase()}`, x + 20 + offRunner.x, y + 26 + offRunner.y);

      this.applyZDepth(ctx, offTitle.z);
      ctx.fillStyle = this.getSubPartColor(config, 'header', 'title', text);
      ctx.font = this.getSubPartFont(config, 'header', 'title', 'bold', 30);
      ctx.fillText(title.toUpperCase(), x + 20 + offTitle.x, y + 58 + offTitle.y);

      this.applyZDepth(ctx, offSub.z);
      ctx.fillStyle = this.getSubPartColor(config, 'header', 'subtitle', textMuted);
      ctx.font = this.getSubPartFont(config, 'header', 'subtitle', '500', 12);
      ctx.fillText(`${dateText}${location ? ' • ' + location : ''}`, x + 20 + offSub.x, y + 80 + offSub.y);

      this.applyZDepth(ctx, offWeather.z);
      ctx.textAlign = 'right';
      ctx.fillStyle = this.getSubPartColor(config, 'header', 'weather', elAccent);
      ctx.font = this.getSubPartFont(config, 'header', 'weather', 'bold', 11);
      ctx.fillText(weatherText || 'GPS LOCK: 100%', x + width - 20 + offWeather.x, y + 26 + offWeather.y);

      ctx.restore();
      this.recordBounds('header', 'Header', x, y, width, h);
      return y + h;
    }

    // TEMPLATE: RACE TICKER TAPE
    if (design === 'race-ticker') {
      const h = customH || 88;
      ctx.save();
      this.drawWidgetCardBg(ctx, 'header', x, y, width, h, config, theme);

      // Top racing hazard stripes
      const sw = 10;
      ctx.fillStyle = elAccent;
      for (let sx = x + 6; sx < x + width - 12; sx += sw * 2) {
        ctx.fillRect(sx, y + 3, sw, 4);
      }

      this.applyZDepth(ctx, offTitle.z);
      ctx.textAlign = 'left';
      ctx.fillStyle = this.getSubPartColor(config, 'header', 'title', text);
      ctx.font = this.getSubPartFont(config, 'header', 'title', 'bold', 30);
      ctx.fillText(title.toUpperCase(), x + 20 + offTitle.x, y + 46 + offTitle.y);

      this.applyZDepth(ctx, offSub.z);
      ctx.fillStyle = this.getSubPartColor(config, 'header', 'subtitle', elAccent);
      ctx.font = this.getSubPartFont(config, 'header', 'subtitle', 'bold', 12);
      ctx.fillText(`⚡ ${dateText}  •  ${runnerName}`, x + 20 + offSub.x, y + 72 + offSub.y);

      if (location) {
        this.applyZDepth(ctx, offLoc.z);
        ctx.textAlign = 'right';
        ctx.fillStyle = this.getSubPartColor(config, 'header', 'location', textMuted);
        ctx.font = this.getSubPartFont(config, 'header', 'location', 'bold', 12);
        ctx.fillText(location.toUpperCase(), x + width - 20 + offLoc.x, y + 46 + offLoc.y);
      }

      ctx.restore();
      ctx.restore();
      this.recordBounds('header', 'Header', x, y, width, h);
      return y + h;
    }

    // TEMPLATE: CENTERED HERO
    if (design === 'centered-hero') {
      const h = customH || 102;
      this.drawWidgetCardBg(ctx, 'header', x, y, width, h, config, theme);
      ctx.textAlign = 'center';

      // Top Runner Tag
      this.applyZDepth(ctx, offRunner.z);
      ctx.fillStyle = this.getSubPartColor(config, 'header', 'runner', elAccent);
      ctx.font = this.getSubPartFont(config, 'header', 'runner', 'bold', 12);
      ctx.letterSpacing = '2px';
      ctx.fillText(`★  ${runnerName.toUpperCase()}  ★`, x + width / 2 + offRunner.x, y + 24 + offRunner.y);

      // Main Title
      this.applyZDepth(ctx, offTitle.z);
      ctx.fillStyle = this.getSubPartColor(config, 'header', 'title', text);
      ctx.font = this.getSubPartFont(config, 'header', 'title', 'bold', 34);
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 8;
      ctx.fillText(title.toUpperCase(), x + width / 2 + offTitle.x, y + 58 + offTitle.y);
      ctx.shadowBlur = 0;

      // Subtitle / Date Badge
      this.applyZDepth(ctx, offSub.z);
      const subW = Math.min(width * 0.85, ctx.measureText(dateText).width + 42);
      this.drawRoundedRect(ctx, x + width / 2 - subW / 2 + offSub.x, y + 68 + offSub.y, subW, 24, 12);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fill();
      ctx.strokeStyle = elAccent;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = this.getSubPartColor(config, 'header', 'subtitle', elAccent);
      ctx.font = this.getSubPartFont(config, 'header', 'subtitle', '600', 11);
      ctx.fillText(`${dateText}${location ? ' • ' + location : ''}`, x + width / 2 + offSub.x, y + 84 + offSub.y);

      ctx.restore();
      this.recordBounds('header', 'Header', x, y, width, h);
      return y + h;
    }

    // TEMPLATE: SPLIT BANNER (CALENDAR DATE STAMP BOX)
    if (design === 'split-banner') {
      const h = customH || 96;
      this.drawWidgetCardBg(ctx, 'header', x, y, width, h, config, theme);

      const dateParts = dateText.split('•').map((s) => s.trim());

      this.applyZDepth(ctx, offRunner.z);
      ctx.textAlign = 'left';
      ctx.fillStyle = this.getSubPartColor(config, 'header', 'runner', elAccent);
      ctx.font = this.getSubPartFont(config, 'header', 'runner', 'bold', 12);
      ctx.fillText(runnerName.toUpperCase(), x + 20 + offRunner.x, y + 24 + offRunner.y);

      this.applyZDepth(ctx, offTitle.z);
      ctx.fillStyle = this.getSubPartColor(config, 'header', 'title', text);
      ctx.font = this.getSubPartFont(config, 'header', 'title', 'bold', 30);
      ctx.fillText(title, x + 20 + offTitle.x, y + 56 + offTitle.y);

      this.applyZDepth(ctx, offSub.z);
      ctx.fillStyle = this.getSubPartColor(config, 'header', 'subtitle', textMuted);
      ctx.font = this.getSubPartFont(config, 'header', 'subtitle', '500', 13);
      ctx.fillText(location ? `📍 ${location} • ${dateParts[1] || ''}` : (dateParts[1] || dateText), x + 20 + offSub.x, y + 78 + offSub.y);

      // Right Side: Calendar Stamp Box (66x74)
      const calX = x + width - 84;
      const calY = y + 10;
      const calW = 66;
      const calH = 74;

      this.drawRoundedRect(ctx, calX, calY, calW, calH, 10);
      ctx.fillStyle = 'rgba(20, 20, 30, 0.9)';
      ctx.fill();
      ctx.strokeStyle = elAccent;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Top Month Bar in Calendar
      this.drawRoundedRect(ctx, calX, calY, calW, 20, 10);
      ctx.fillStyle = elAccent;
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.font = 'bold 11px sans-serif';
      const monthStr = (activity.dateFormatted || 'RUN').split(' ')[1] || 'OCT';
      ctx.fillText(monthStr.toUpperCase().slice(0, 3), calX + calW / 2, calY + 14);

      // Day Number
      ctx.fillStyle = text;
      ctx.font = 'bold 26px sans-serif';
      const dayStr = (activity.dateFormatted || '15').split(' ')[0] || '15';
      ctx.fillText(dayStr, calX + calW / 2, calY + 47);

      // Bottom time
      ctx.fillStyle = textMuted;
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(activity.timeFormatted ? activity.timeFormatted.split(' ')[0] : '06:30', calX + calW / 2, calY + 65);

      ctx.restore();
      this.recordBounds('header', 'Header', x, y, width, h);
      return y + h;
    }

    // TEMPLATE: MINIMAL TOP BAR
    if (design === 'minimal-topbar') {
      const h = customH || 52;
      this.drawWidgetCardBg(ctx, 'header', x, y, width, h, config, theme);

      this.applyZDepth(ctx, offTitle.z);
      ctx.textAlign = 'left';
      ctx.fillStyle = elAccent;
      ctx.font = this.getSubPartFont(config, 'header', 'title', 'bold', 12);
      ctx.fillText('⚡', x + 20 + offTitle.x, y + 32 + offTitle.y);

      ctx.fillStyle = text;
      ctx.font = this.getSubPartFont(config, 'header', 'title', 'bold', 16);
      ctx.fillText(title, x + 40 + offTitle.x, y + 33 + offTitle.y);

      this.applyZDepth(ctx, offSub.z);
      const titleW = ctx.measureText(title).width;
      ctx.fillStyle = textMuted;
      ctx.font = this.getSubPartFont(config, 'header', 'subtitle', '500', 13);
      ctx.fillText(`•   ${dateText}`, x + 52 + titleW + offSub.x, y + 33 + offSub.y);

      this.applyZDepth(ctx, offRunner.z);
      ctx.textAlign = 'right';
      ctx.fillStyle = elAccent;
      ctx.font = this.getSubPartFont(config, 'header', 'runner', 'bold', 13);
      ctx.fillText(runnerName, x + width - 20 + offRunner.x, y + 33 + offRunner.y);

      ctx.restore();
      this.recordBounds('header', 'Header', x, y, width, h);
      return y + h;
    }

    // TEMPLATE: MAGAZINE COVER
    if (design === 'magazine-cover') {
      const h = customH || 104;
      this.drawWidgetCardBg(ctx, 'header', x, y, width, h, config, theme);
      const padX = (cardStyle !== 'floating') ? 20 : 0;

      this.applyZDepth(ctx, offRunner.z);
      ctx.textAlign = 'left';
      ctx.fillStyle = elAccent;
      ctx.font = this.getSubPartFont(config, 'header', 'runner', 'bold', 11);
      ctx.letterSpacing = '3px';
      ctx.fillText(`// RUNNER'S LOG — ISSUE 2026 //`, x + padX + offRunner.x, y + 20 + offRunner.y);

      this.applyZDepth(ctx, offTitle.z);
      ctx.fillStyle = text;
      ctx.font = this.getSubPartFont(config, 'header', 'title', 'bold', 38);
      ctx.fillText(title.toUpperCase(), x + padX + offTitle.x, y + 60 + offTitle.y);

      ctx.strokeStyle = elAccent;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + padX, y + 72);
      ctx.lineTo(x + width - padX, y + 72);
      ctx.stroke();

      this.applyZDepth(ctx, offSub.z);
      ctx.fillStyle = textMuted;
      ctx.font = this.getSubPartFont(config, 'header', 'subtitle', '500', 13);
      ctx.fillText(`${dateText}${location ? '   |   ' + location : ''}`, x + padX + offSub.x, y + 90 + offSub.y);

      ctx.textAlign = 'right';
      ctx.fillStyle = elAccent;
      ctx.font = this.getSubPartFont(config, 'header', 'runner', 'bold', 13);
      ctx.fillText(`ATHLETE: ${runnerName.toUpperCase()}`, x + width - padX + offRunner.x, y + 90 + offRunner.y);

      ctx.restore();
      this.recordBounds('header', 'Header', x, y, width, h);
      return y + h;
    }

    // TEMPLATE: RETRO CYBER HUD
    if (design === 'retro-cyber' || design === 'cyber-hud') {
      const h = customH || 96;
      this.drawWidgetCardBg(ctx, 'header', x, y, width, h, config, theme);

      // Corner Tech Crosshairs '+'
      ctx.fillStyle = elAccent;
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('+', x + 8, y + 16);
      ctx.fillText('+', x + 8, y + h - 8);
      ctx.textAlign = 'right';
      ctx.fillText('+', x + width - 8, y + 16);
      ctx.fillText('+', x + width - 8, y + h - 8);

      // System Tag
      this.applyZDepth(ctx, offRunner.z);
      ctx.textAlign = 'left';
      ctx.fillStyle = elAccent;
      ctx.font = this.getSubPartFont(config, 'header', 'runner', 'bold', 11);
      ctx.fillText(`[ SYS.RUN // ${runnerName.toUpperCase()} ]`, x + 24 + offRunner.x, y + 26 + offRunner.y);

      // Main Title
      this.applyZDepth(ctx, offTitle.z);
      ctx.fillStyle = text;
      ctx.font = this.getSubPartFont(config, 'header', 'title', 'bold', 28);
      ctx.fillText(title.toUpperCase(), x + 24 + offTitle.x, y + 58 + offTitle.y);

      this.applyZDepth(ctx, offSub.z);
      ctx.fillStyle = textMuted;
      ctx.font = this.getSubPartFont(config, 'header', 'subtitle', '500', 11);
      ctx.fillText(`${dateText}${location ? ' // ' + location.toUpperCase() : ''}`, x + 24 + offSub.x, y + 80 + offSub.y);

      // Right Status Pill
      this.applyZDepth(ctx, offWeather.z);
      ctx.textAlign = 'right';
      ctx.fillStyle = elAccent;
      ctx.font = this.getSubPartFont(config, 'header', 'weather', 'bold', 12);
      ctx.fillText('● ONLINE [OK]', x + width - 24 + offWeather.x, y + 26 + offWeather.y);
      if (weatherText) {
        ctx.fillStyle = textMuted;
        ctx.fillText(weatherText, x + width - 24 + offWeather.x, y + 58 + offWeather.y);
      }

      ctx.restore();
      this.recordBounds('header', 'Header', x, y, width, h);
      return y + h;
    }

    // TEMPLATE: MINIMALIST PASSPORT STAMP
    if (design === 'minimalist-stamp') {
      const h = customH || 92;
      this.drawWidgetCardBg(ctx, 'header', x, y, width, h, config, theme);

      this.applyZDepth(ctx, offRunner.z);
      ctx.textAlign = 'left';
      ctx.fillStyle = elAccent;
      ctx.font = this.getSubPartFont(config, 'header', 'runner', 'bold', 11);
      ctx.letterSpacing = '3px';
      ctx.fillText('★ OFFICIAL ATHLETIC ENTRY ★', x + 22 + offRunner.x, y + 24 + offRunner.y);

      this.applyZDepth(ctx, offTitle.z);
      ctx.fillStyle = text;
      ctx.font = this.getSubPartFont(config, 'header', 'title', 'bold', 30);
      ctx.letterSpacing = '1px';
      ctx.fillText(title.toUpperCase(), x + 22 + offTitle.x, y + 58 + offTitle.y);

      this.applyZDepth(ctx, offSub.z);
      ctx.fillStyle = textMuted;
      ctx.font = this.getSubPartFont(config, 'header', 'subtitle', '600', 12);
      const metaParts = [dateText, location].filter(Boolean);
      ctx.fillText(metaParts.join('  |  '), x + 22 + offSub.x, y + 78 + offSub.y);

      // Circular Seal Badge on Right
      const sealR = 26;
      const sealX = x + width - sealR - 22;
      const sealY = y + h / 2;
      ctx.strokeStyle = elAccent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sealX, sealY, sealR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = elAccent;
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('RUN', sealX, sealY - 4);
      ctx.fillText('STAMP', sealX, sealY + 10);

      ctx.restore();
      this.recordBounds('header', 'Header', x, y, width, h);
      return y + h;
    }

    // TEMPLATE: BADGE SHIELD / ATHLETIC BADGE
    if (design === 'badge-shield' || design === 'athletic-badge') {
      const h = customH || 96;
      this.drawWidgetCardBg(ctx, 'header', x, y, width, h, config, theme, true);

      // Shield Icon
      ctx.fillStyle = elAccent;
      this.drawRoundedRect(ctx, x + 18, y + 18, 56, 56, 12);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.font = `bold 24px ${font}`;
      ctx.textAlign = 'center';
      ctx.fillText('🏆', x + 46, y + 54);

      this.applyZDepth(ctx, offRunner.z);
      ctx.textAlign = 'left';
      ctx.fillStyle = elAccent;
      ctx.font = this.getSubPartFont(config, 'header', 'runner', 'bold', 12);
      ctx.fillText(`★ ★ ★  ${runnerName.toUpperCase()}  ★ ★ ★`, x + 88 + offRunner.x, y + 34 + offRunner.y);

      this.applyZDepth(ctx, offTitle.z);
      ctx.fillStyle = text;
      ctx.font = this.getSubPartFont(config, 'header', 'title', 'bold', 28);
      ctx.fillText(title, x + 88 + offTitle.x, y + 66 + offTitle.y);

      this.applyZDepth(ctx, offSub.z);
      ctx.textAlign = 'right';
      ctx.fillStyle = textMuted;
      ctx.font = this.getSubPartFont(config, 'header', 'subtitle', '500', 13);
      ctx.fillText(dateText, x + width - 22 + offSub.x, y + 44 + offSub.y);
      if (location) {
        this.applyZDepth(ctx, offLoc.z);
        ctx.fillStyle = elAccent;
        ctx.font = this.getSubPartFont(config, 'header', 'location', 'bold', 12);
        ctx.fillText(location, x + width - 22 + offLoc.x, y + 66 + offLoc.y);
      }

      ctx.restore();
      this.recordBounds('header', 'Header', x, y, width, h);
      return y + h;
    }

    // TEMPLATE: GLASS PILL
    if (design === 'pill') {
      const h = customH || 86;
      this.drawWidgetCardBg(ctx, 'header', x, y, width, h, config, theme, true);
      // Athlete Avatar Icon
      ctx.fillStyle = elAccent;
      ctx.beginPath();
      ctx.arc(x + 40, y + 43, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.font = `bold 16px ${font}`;
      ctx.textAlign = 'center';
      ctx.fillText('🏃', x + 40, y + 49);

      // Title & Date
      this.applyZDepth(ctx, offTitle.z);
      ctx.textAlign = 'left';
      ctx.fillStyle = text;
      ctx.font = this.getSubPartFont(config, 'header', 'title', 'bold', 22);
      ctx.fillText(title, x + 76 + offTitle.x, y + 38 + offTitle.y);

      this.applyZDepth(ctx, offSub.z);
      ctx.fillStyle = textMuted;
      ctx.font = this.getSubPartFont(config, 'header', 'subtitle', '500', 13);
      ctx.fillText(`${dateText}${location ? ' • ' + location : ''}`, x + 76 + offSub.x, y + 62 + offSub.y);

      // Right: Runner handle
      this.applyZDepth(ctx, offRunner.z);
      ctx.textAlign = 'right';
      ctx.fillStyle = elAccent;
      ctx.font = this.getSubPartFont(config, 'header', 'runner', 'bold', 14);
      ctx.fillText(runnerName, x + width - 22 + offRunner.x, y + 46 + offRunner.y);

      ctx.restore();
      this.recordBounds('header', 'Header', x, y, width, h);
      return y + h;
    }

    // TEMPLATE: STACKED EDITORIAL
    if (design === 'editorial' || design === 'stacked-editorial') {
      const h = customH || 96;
      const padX = (cardStyle !== 'floating') ? 22 : 10;
      this.drawWidgetCardBg(ctx, 'header', x, y, width, h, config, theme);

      this.applyZDepth(ctx, offSub.z);
      ctx.textAlign = 'left';
      ctx.fillStyle = elAccent;
      ctx.font = this.getSubPartFont(config, 'header', 'subtitle', 'bold', 11);
      ctx.letterSpacing = '2px';
      ctx.fillText(`// ${dateText.toUpperCase()} //`, x + padX + offSub.x, y + 20 + offSub.y);

      this.applyZDepth(ctx, offTitle.z);
      ctx.fillStyle = text;
      ctx.font = this.getSubPartFont(config, 'header', 'title', 'bold', 36);
      ctx.fillText(title, x + padX + offTitle.x, y + 56 + offTitle.y);

      // Thin separator line
      ctx.strokeStyle = elAccent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + padX, y + 68);
      ctx.lineTo(x + width - padX, y + 68);
      ctx.stroke();

      // Meta row below line
      if (location) {
        this.applyZDepth(ctx, offLoc.z);
        ctx.fillStyle = textMuted;
        ctx.font = this.getSubPartFont(config, 'header', 'location', '600', 13);
        ctx.fillText(`📍 ${location}`, x + padX + offLoc.x, y + 86 + offLoc.y);
      }

      this.applyZDepth(ctx, offRunner.z);
      ctx.textAlign = 'right';
      ctx.fillStyle = text;
      ctx.font = this.getSubPartFont(config, 'header', 'runner', 'bold', 13);
      ctx.fillText(`${runnerName.toUpperCase()}`, x + width - padX + offRunner.x, y + 86 + offRunner.y);

      ctx.restore();
      this.recordBounds('header', 'Header', x, y, width, h);
      return y + h;
    }

    // TEMPLATE: SPORT ATHLETIC HUD
    if (design === 'athletic') {
      const h = customH || 94;
      const padX = (cardStyle !== 'floating') ? 22 : 12;
      this.drawWidgetCardBg(ctx, 'header', x, y, width, h, config, theme);

      // Category chip
      ctx.fillStyle = elAccent;
      this.drawRoundedRect(ctx, x + padX, y + 10, 80, 22, 4);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.font = `bold 11px ${font}`;
      ctx.textAlign = 'center';
      ctx.fillText('⚡ RUN HUD', x + padX + 40, y + 25);

      // Title
      this.applyZDepth(ctx, offTitle.z);
      ctx.textAlign = 'left';
      ctx.fillStyle = text;
      ctx.font = this.getSubPartFont(config, 'header', 'title', 'bold', 28);
      ctx.fillText(title.toUpperCase(), x + padX + offTitle.x, y + 58 + offTitle.y);

      this.applyZDepth(ctx, offSub.z);
      ctx.fillStyle = textMuted;
      ctx.font = this.getSubPartFont(config, 'header', 'subtitle', '600', 13);
      ctx.fillText(`${dateText}${location ? '  |  ' + location : ''}`, x + padX + offSub.x, y + 80 + offSub.y);

      // Right: Runner
      this.applyZDepth(ctx, offRunner.z);
      ctx.textAlign = 'right';
      ctx.fillStyle = elAccent;
      ctx.font = this.getSubPartFont(config, 'header', 'runner', 'bold', 15);
      ctx.fillText(runnerName.toUpperCase(), x + width - padX + offRunner.x, y + 58 + offRunner.y);

      ctx.restore();
      this.recordBounds('header', 'Header', x, y, width, h);
      return y + h;
    }


    if (design === 'vertical-sidebar-badge') {
      // Style: Vertical Accent Card (Stacked headline with glowing sidebar stripe)
      const h = customH || 92;
      this.drawWidgetCardBg(ctx, 'header', x, y, width, h, config, theme);

      // Thick left accent stripe
      ctx.fillStyle = elAccent;
      this.drawRoundedRect(ctx, x + 4, y + 8, 6, h - 16, 3);
      ctx.fill();

      // Title
      this.applyZDepth(ctx, offTitle.z);
      ctx.textAlign = 'left';
      ctx.fillStyle = this.getSubPartColor(config, 'header', 'title', text);
      ctx.font = this.getSubPartFont(config, 'header', 'title', 'bold', 28);
      ctx.fillText(title, x + 24 + offTitle.x, y + 36 + offTitle.y);

      // Subtitle
      this.applyZDepth(ctx, offSub.z);
      ctx.fillStyle = this.getSubPartColor(config, 'header', 'subtitle', textMuted);
      ctx.font = this.getSubPartFont(config, 'header', 'subtitle', '500', 13);
      ctx.fillText(dateText, x + 24 + offSub.x, y + 62 + offSub.y);

      // Right-aligned Runner & Location
      const rightX = x + width - 20;
      ctx.textAlign = 'right';
      if (runnerName) {
        this.applyZDepth(ctx, offRunner.z);
        ctx.fillStyle = this.getSubPartColor(config, 'header', 'runner', elAccent);
        ctx.font = this.getSubPartFont(config, 'header', 'runner', 'bold', 14);
        ctx.fillText(runnerName, rightX + offRunner.x, y + 36 + offRunner.y);
      }
      if (location) {
        this.applyZDepth(ctx, offLoc.z);
        ctx.fillStyle = this.getSubPartColor(config, 'header', 'location', textMuted);
        ctx.font = this.getSubPartFont(config, 'header', 'location', '500', 12);
        ctx.fillText(`📍 ${location}`, rightX + offLoc.x, y + 60 + offLoc.y);
      }

      ctx.restore();
      this.recordBounds('header', 'Header', x, y, width, h);
      return y + h;
    }

    if (design === 'running-bib-header') {
      // Style: Marathon Race Bib Header (Bib number, athlete tag & perforated seal)
      const h = customH || 96;
      this.drawWidgetCardBg(ctx, 'header', x, y, width, h, config, theme);

      // Top bib color bar
      ctx.fillStyle = elAccent;
      this.drawRoundedRect(ctx, x + 12, y + 8, width - 24, 6, 3);
      ctx.fill();

      // Runner name & bib number
      this.applyZDepth(ctx, offRunner.z);
      ctx.textAlign = 'left';
      ctx.fillStyle = this.getSubPartColor(config, 'header', 'runner', elAccent);
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`BIB #4219 // ATHLETE: ${runnerName.toUpperCase()}`, x + 18 + offRunner.x, y + 32 + offRunner.y);

      // Main title
      this.applyZDepth(ctx, offTitle.z);
      ctx.fillStyle = this.getSubPartColor(config, 'header', 'title', text);
      ctx.font = this.getSubPartFont(config, 'header', 'title', 'bold', 28);
      ctx.fillText(title.toUpperCase(), x + 18 + offTitle.x, y + 64 + offTitle.y);

      // Date & location on right
      ctx.textAlign = 'right';
      const rightX = x + width - 18;
      this.applyZDepth(ctx, offSub.z);
      ctx.fillStyle = this.getSubPartColor(config, 'header', 'subtitle', textMuted);
      ctx.font = this.getSubPartFont(config, 'header', 'subtitle', 'bold', 11);
      ctx.fillText(dateText, rightX + offSub.x, y + 60 + offSub.y);
      if (location) {
        this.applyZDepth(ctx, offLoc.z);
        ctx.fillText(location.toUpperCase(), rightX + offLoc.x, y + 78 + offLoc.y);
      }

      // Perforated dots along bottom edge
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(x + 14, y + h - 8);
      ctx.lineTo(x + width - 14, y + h - 8);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.restore();
      this.recordBounds('header', 'Header', x, y, width, h);
      return y + h;
    }

    if (design === 'broadcast-lowerthird') {
      // Style: Broadcast Banner (Lower-third TV ribbon with live dot)
      const h = customH || 82;
      this.drawWidgetCardBg(ctx, 'header', x, y, width, h, config, theme);

      // Glowing LIVE indicator pill
      const liveW = 70;
      this.drawRoundedRect(ctx, x + 16, y + 14, liveW, 20, 10);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x + 28, y + 24, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444';
      ctx.fill();

      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('FINISH', x + 38, y + 27);

      // Title
      this.applyZDepth(ctx, offTitle.z);
      ctx.fillStyle = this.getSubPartColor(config, 'header', 'title', text);
      ctx.font = this.getSubPartFont(config, 'header', 'title', 'bold', 26);
      ctx.fillText(title, x + 96 + offTitle.x, y + 32 + offTitle.y);

      // Sub-bar banner
      this.drawRoundedRect(ctx, x + 16, y + 44, width - 32, 26, 6);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.fill();

      this.applyZDepth(ctx, offSub.z);
      ctx.fillStyle = this.getSubPartColor(config, 'header', 'subtitle', textMuted);
      ctx.font = this.getSubPartFont(config, 'header', 'subtitle', '500', 11);
      ctx.fillText(dateText, x + 26 + offSub.x, y + 61 + offSub.y);

      ctx.textAlign = 'right';
      const rightX = x + width - 26;
      this.applyZDepth(ctx, offRunner.z);
      ctx.fillStyle = this.getSubPartColor(config, 'header', 'runner', elAccent);
      ctx.font = this.getSubPartFont(config, 'header', 'runner', 'bold', 11);
      ctx.fillText(`${runnerName}  ${location ? '• ' + location : ''}`, rightX + offRunner.x, y + 61 + offRunner.y);

      ctx.restore();
      this.recordBounds('header', 'Header', x, y, width, h);
      return y + h;
    }

    if (design === 'architect-monolith') {
      // Style: Architectural Monolith (Oversized date & clean typography)
      const h = customH || 92;
      this.drawWidgetCardBg(ctx, 'header', x, y, width, h, config, theme);

      // Extract day number & month if possible
      const dayNum = activity.dateFormatted ? (activity.dateFormatted.match(/\d+/) || ['15'])[0] : '15';
      const monthStr = activity.dateFormatted ? (activity.dateFormatted.match(/[A-Za-z]+/) || ['OCT'])[0].toUpperCase() : 'OCT';

      // Big calendar block
      const dateBoxW = 56;
      this.drawRoundedRect(ctx, x + 16, y + 14, dateBoxW, h - 28, 6);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fill();
      ctx.strokeStyle = elAccent;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = elAccent;
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(dayNum, x + 16 + dateBoxW / 2, y + 42);
      ctx.fillStyle = textMuted;
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(monthStr, x + 16 + dateBoxW / 2, y + 58);

      // Main title
      this.applyZDepth(ctx, offTitle.z);
      ctx.textAlign = 'left';
      ctx.fillStyle = this.getSubPartColor(config, 'header', 'title', text);
      ctx.font = this.getSubPartFont(config, 'header', 'title', 'bold', 30);
      ctx.fillText(title.toUpperCase(), x + 86 + offTitle.x, y + 42 + offTitle.y);

      // Subtitle & Runner
      this.applyZDepth(ctx, offSub.z);
      ctx.fillStyle = this.getSubPartColor(config, 'header', 'subtitle', textMuted);
      ctx.font = this.getSubPartFont(config, 'header', 'subtitle', '500', 12);
      ctx.fillText(`${activity.timeFormatted || '06:30 AM'} // ${runnerName}`, x + 86 + offSub.x, y + 66 + offSub.y);

      if (location) {
        ctx.textAlign = 'right';
        this.applyZDepth(ctx, offLoc.z);
        ctx.fillStyle = elAccent;
        ctx.font = this.getSubPartFont(config, 'header', 'location', 'bold', 12);
        ctx.fillText(`📍 ${location}`, x + width - 20 + offLoc.x, y + 42 + offLoc.y);
      }

      ctx.restore();
      this.recordBounds('header', 'Header', x, y, width, h);
      return y + h;
    }

    // DEFAULT 'modern' / 'modern-clean':
    const padX = (cardStyle !== 'floating') ? 24 : 12;
    const padY = (cardStyle !== 'floating') ? 14 : 8;
    const h = customH || (config.weatherText ? 96 : 84);
    if (cardStyle !== 'floating') {
      this.drawWidgetCardBg(ctx, 'header', x, y, width, h, config, theme);
    }
    const alignMode = align || 'left';
    ctx.textAlign = alignMode;

    const titleX = (alignMode === 'center' ? x + width / 2 : alignMode === 'right' ? x + width - padX : x + padX) + offTitle.x;
    const subX = (alignMode === 'center' ? x + width / 2 : alignMode === 'right' ? x + width - padX : x + padX) + offSub.x;

    this.applyZDepth(ctx, offTitle.z);
    ctx.fillStyle = text;
    ctx.font = this.getSubPartFont(config, 'header', 'title', 'bold', 32);
    ctx.fillText(title, titleX, y + padY + 30 + offTitle.y);

    this.applyZDepth(ctx, offSub.z);
    ctx.font = this.getSubPartFont(config, 'header', 'subtitle', '500', 14);
    ctx.fillStyle = textMuted;
    ctx.fillText(dateText, subX, y + padY + 54 + offSub.y);

    if (alignMode === 'left') {
      ctx.textAlign = 'right';
      const rightX = x + width - padX;
      if (location) {
        this.applyZDepth(ctx, offLoc.z);
        ctx.fillStyle = elAccent;
        ctx.font = this.getSubPartFont(config, 'header', 'location', 'bold', 12);
        ctx.fillText(location.toUpperCase(), rightX + offLoc.x, y + padY + 20 + offLoc.y);
      }

      this.applyZDepth(ctx, offRunner.z);
      ctx.fillStyle = text;
      ctx.font = this.getSubPartFont(config, 'header', 'runner', '600', 15);
      ctx.fillText(runnerName, rightX + offRunner.x, y + padY + (location ? 42 : 28) + offRunner.y);

      if (config.weatherText) {
        this.applyZDepth(ctx, offWeather.z);
        ctx.fillStyle = textMuted;
        ctx.font = this.getSubPartFont(config, 'header', 'weather', '500', 12);
        ctx.fillText(config.weatherText, rightX + offWeather.x, y + padY + (location ? 64 : 50) + offWeather.y);
      }
    }

    ctx.restore();
    this.recordBounds('header', 'Header', x, y, width, h);
    return y + h;
  }

  // =========================================================================
  // WIDGET 2: ROUTE MAP
  // Designs: 'glow', 'card', 'milestones', 'minimal', 'neon-pulse', 'framed-polaroid', 'gradient-speed'
  // =========================================================================
  drawRouteMap(ctx, x, y, width, height, activity, config, theme, accent) {
    if (!activity.hasRoute || !activity.bounds || activity.bounds.minLat === 90) return;

    ctx.save();
    const { accent: mapAccent, opacity: mapOpacity, cardStyle } = this.getEffectiveColors(config, theme, accent, 'map');
    if (mapOpacity < 1) ctx.globalAlpha = mapOpacity;
    accent = mapAccent;

    const design = config.mapDesign || 'glow';
    this.recordBounds('map', 'Route Map', x, y, width, height);

    const offRoute = this.getElementOffset(config, 'map', 'route');
    const offCaption = this.getElementOffset(config, 'map', 'caption');

    // Check if bare route (no backdrop) or floating is chosen
    const isBareRoute = design === 'bare-route' || design === 'bare-glow' || design === 'bare-speed' || this.isTextOnly(config, 'map');

    // Frame / Background
    if (isBareRoute) {
      // Zero backdrop drawn! Pure floating map
    } else if (design === 'framed-polaroid') {
      // White / bright polaroid card with bottom caption
      this.drawWidgetCardBg(ctx, 'map', x, y, width, height, config, theme) || (() => {
        ctx.fillStyle = '#ffffff';
        this.drawRoundedRect(ctx, x, y, width, height, 12);
        ctx.fill();
      })();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 16;
      // Simulated top masking tape
      ctx.fillStyle = 'rgba(251, 191, 36, 0.7)';
      this.drawRoundedRect(ctx, x + width / 2 - 40, y - 8, 80, 18, 3);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Dark inner viewport for the map
      const padP = 16;
      const innerH = height - 52;
      ctx.fillStyle = '#0f172a';
      this.drawRoundedRect(ctx, x + padP, y + padP, width - padP * 2, innerH, 8);
      ctx.fill();

      // Polaroid bottom caption
      if (!offCaption.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offCaption.z);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#1e293b';
        ctx.font = this.getSubPartFont(config, 'map', 'caption', 'bold', 14);
        const capDefault = `${config.locationName || activity.title || 'Run'} • ${activity.distanceMain} ${activity.distanceUnit}`;
        const capText = this.getTextOverride(config, 'map', 'caption', capDefault);
        ctx.fillText(capText, x + width / 2 + offCaption.x, y + height - 16 + offCaption.y);
        ctx.restore();
      }
    } else if (design === 'cyber-wireframe') {
      // Cyber Grid & Compass HUD
      this.drawWidgetCardBg(ctx, 'map', x, y, width, height, config, theme);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
      ctx.lineWidth = 1;
      const gStep = 25;
      for (let gx = x; gx < x + width; gx += gStep) {
        ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx, y + height); ctx.stroke();
      }
      for (let gy = y; gy < y + height; gy += gStep) {
        ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + width, gy); ctx.stroke();
      }
      // Top-right compass rose
      const compX = x + width - 30;
      const compY = y + 30;
      ctx.beginPath();
      ctx.arc(compX, compY, 14, 0, Math.PI * 2);
      ctx.strokeStyle = accent;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillStyle = accent;
      ctx.font = 'bold 9px monospace';
      ctx.fillText('N ▲', compX, compY + 3);

    } else if (design === 'radar-screen') {
      // Tactical Radar Screen (Concentric circles & crosshairs)
      this.drawWidgetCardBg(ctx, 'map', x, y, width, height, config, theme);
      const rCx = x + width / 2;
      const rCy = y + height / 2;
      const maxR = Math.min(width, height) * 0.44;
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.15)';
      ctx.lineWidth = 1;
      [0.25, 0.5, 0.75, 1.0].forEach(fac => {
        ctx.beginPath();
        ctx.arc(rCx, rCy, maxR * fac, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.beginPath();
      ctx.moveTo(rCx - maxR, rCy); ctx.lineTo(rCx + maxR, rCy);
      ctx.moveTo(rCx, rCy - maxR); ctx.lineTo(rCx, rCy + maxR);
      ctx.stroke();

    } else if (design === 'vintage-topo-map') {
      // Topographic Elevation Contours
      this.drawWidgetCardBg(ctx, 'map', x, y, width, height, config, theme);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      const waveCount = 5;
      for (let w = 1; w <= waveCount; w++) {
        ctx.beginPath();
        const wy = y + (height / (waveCount + 1)) * w;
        ctx.moveTo(x, wy);
        ctx.bezierCurveTo(x + width * 0.25, wy - 20, x + width * 0.75, wy + 20, x + width, wy);
        ctx.stroke();
      }
    } else if (design === 'neon-pulse') {
      // Tech grid backdrop
      this.drawWidgetCardBg(ctx, 'map', x, y, width, height, config, theme);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
      ctx.lineWidth = 1;
      const gridStep = 30;
      for (let gx = x; gx < x + width; gx += gridStep) {
        ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx, y + height); ctx.stroke();
      }
      for (let gy = y; gy < y + height; gy += gridStep) {
        ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + width, gy); ctx.stroke();
      }
    } else {
      this.drawWidgetCardBg(ctx, 'map', x, y, width, height, config, theme);
    }

    if (offRoute.hidden) {
      ctx.restore();
      return;
    }

    const pad = design === 'framed-polaroid' ? 28 : isBareRoute ? 8 : 24;
    const mapW = width - pad * 2;
    const mapH = (design === 'framed-polaroid' ? height - 60 : height) - pad * 2;
    const mapX = x + pad;
    const mapY = y + pad;

    const bounds = activity.fullBounds || activity.bounds;
    const dLat = bounds.maxLat - bounds.minLat || 0.0001;
    const dLon = bounds.maxLon - bounds.minLon || 0.0001;

    const midLatRad = ((bounds.minLat + bounds.maxLat) / 2) * (Math.PI / 180);
    const lonScale = Math.cos(midLatRad);
    const geoW = dLon * lonScale;
    const geoH = dLat;

    const scale = Math.min(mapW / geoW, mapH / geoH);
    const offsetX = mapX + (mapW - geoW * scale) / 2;
    const offsetY = mapY + (mapH - geoH * scale) / 2;

    const project = (lat, lon) => {
      const px = offsetX + (lon - bounds.minLon) * lonScale * scale + offRoute.x;
      const py = offsetY + (bounds.maxLat - lat) * scale + offRoute.y;
      return [px, py];
    };

    const pts = activity.trackpoints;

    // In animated run progress mode: draw background complete route in ghost outline
    if (activity.fullTrackpoints && activity.fullTrackpoints.length > pts.length) {
      ctx.save();
      ctx.beginPath();
      activity.fullTrackpoints.forEach((p, idx) => {
        const [px, py] = project(p.lat, p.lon);
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.lineWidth = design === 'minimal' ? 2.5 : 4;
      ctx.setLineDash([3, 5]);
      ctx.stroke();
      ctx.restore();
    }

    // Glowing track shadow
    if (design === 'glow' || design === 'bare-glow' || design === 'neon-pulse' || config.mapGlow) {
      ctx.shadowColor = accent;
      ctx.shadowBlur = design === 'bare-glow' ? 18 : 14;
    }

    const colorMode = config.mapColorMode || 'accent';
    const isSpeedGradient = design === 'gradient-speed' || design === 'bare-speed' || colorMode === 'pace';

    if (isSpeedGradient || colorMode === 'hr') {
      ctx.lineWidth = design === 'minimal' ? 3.5 : 5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 0; i < pts.length - 1; i++) {
        const p1 = project(pts[i].lat, pts[i].lon);
        const p2 = project(pts[i + 1].lat, pts[i + 1].lon);

        let segColor = accent;
        if (isSpeedGradient) {
          const pace = pts[i].speed ? 1000 / pts[i].speed : activity.avgPace;
          const ratio = Math.max(0, Math.min(1, (activity.avgPace * 1.3 - pace) / (activity.avgPace * 0.6)));
          segColor = this.interpolateColor('#ff3366', '#00f0ff', ratio);
        } else if (colorMode === 'hr') {
          const hr = pts[i].hr || activity.avgHr || 150;
          const ratio = Math.max(0, Math.min(1, (hr - 120) / 65));
          segColor = this.interpolateColor('#10b981', '#ef4444', ratio);
        }

        ctx.strokeStyle = segColor;
        ctx.beginPath();
        ctx.moveTo(p1[0], p1[1]);
        ctx.lineTo(p2[0], p2[1]);
        ctx.stroke();
      }
    } else {
      // Solid Accent Path
      ctx.beginPath();
      pts.forEach((p, idx) => {
        const [px, py] = project(p.lat, p.lon);
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });

      ctx.strokeStyle = accent;
      ctx.lineWidth = design === 'minimal' ? 3.5 : 5.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }

    // Milestones markers
    if (design === 'milestones' && activity.splits && activity.splits.length > 0) {
      const font = this.getFontFamily(config.fontFamily);
      activity.splits.forEach((split, sIdx) => {
        if (!split.endPoint) return;
        const [mx, my] = project(split.endPoint.lat, split.endPoint.lon);

        ctx.fillStyle = '#0a0a0d';
        ctx.beginPath();
        ctx.arc(mx, my, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = accent;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold 10px ${font}`;
        ctx.textAlign = 'center';
        ctx.fillText(`${sIdx + 1}`, mx, my + 3.5);
      });
    }

    // Start Marker (Green Ring)
    const allPts = activity.fullTrackpoints || pts;
    const startPt = project(allPts[0].lat, allPts[0].lon);
    if (design === 'neon-pulse') {
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(startPt[0], startPt[1], 14, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = '#10b981';
    ctx.beginPath(); ctx.arc(startPt[0], startPt[1], 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(startPt[0], startPt[1], 3, 0, Math.PI * 2); ctx.fill();

    // Finish marker (Red ring)
    const finishCoord = allPts[allPts.length - 1];
    const endPt = project(finishCoord.lat, finishCoord.lon);
    if (design === 'neon-pulse') {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(endPt[0], endPt[1], 14, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = '#ef4444';
    ctx.beginPath(); ctx.arc(endPt[0], endPt[1], 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(endPt[0], endPt[1], 3, 0, Math.PI * 2); ctx.fill();

    // Live Runner Beacon (in animated progress mode)
    if (activity.runnerPoint) {
      const [rx, ry] = project(activity.runnerPoint.lat, activity.runnerPoint.lon);
      ctx.save();
      const pRatio = typeof activity.progress === 'number' ? activity.progress : 1;
      const pulsePhase = (pRatio * 30) % 1;
      const pulseR = 8 + 10 * pulsePhase;

      // Outer radar pulse ring
      ctx.beginPath();
      ctx.arc(rx, ry, pulseR, 0, Math.PI * 2);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2 * (1 - pulsePhase);
      ctx.stroke();

      // Glowing solid runner dot
      ctx.shadowColor = accent;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(rx, ry, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Tag pill above runner
      const runnerTag = '▲ RUNNER';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      const tagW = ctx.measureText(runnerTag).width + 8;
      this.drawRoundedRect(ctx, rx - tagW / 2, ry - 22, tagW, 14, 4);
      ctx.fillStyle = '#0a0a12';
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.fillText(runnerTag, rx, ry - 12);
      ctx.restore();
    }

    ctx.restore();
  }

  // =========================================================================
  // WIDGET 3: HERO STAT
  // Designs: 'mega', 'card', 'split-pill', 'outline', 'tape-sticker', 'digital-lcd', 'speedometer'
  // =========================================================================
  drawHeroStat(ctx, x, y, width, activity, config, theme, accent, customH = null) {
    ctx.save();
    const elStyle = this.getElementStyle(config, 'hero');
    const { text, textMuted, accent: elAccent, cardStyle, align, opacity } = this.getEffectiveColors(config, theme, accent, 'hero');
    if (opacity < 1) ctx.globalAlpha = opacity;

    const font = this.getFontFamily(elStyle.fontFamily !== 'default' ? elStyle.fontFamily : config.fontFamily);
    const design = config.heroDesign || 'mega';
    const heroType = config.heroMetric || 'distance';

    let mainVal = activity.distanceMain;
    let mainUnit = activity.distanceUnit.toUpperCase();
    let defaultLabel = 'TOTAL DISTANCE';

    if (heroType === 'time') {
      mainVal = activity.durationFormatted;
      mainUnit = '';
      defaultLabel = 'MOVING TIME';
    } else if (heroType === 'pace') {
      mainVal = activity.avgPaceFormatted.split(' ')[0];
      mainUnit = activity.avgPaceFormatted.split(' ')[1] || '/KM';
      defaultLabel = (activity.isAnimated && activity.progress < 0.999) ? 'CURRENT PACE' : 'AVERAGE PACE';
    }

    const labelKey = heroType === 'time' ? 'Time' : heroType === 'pace' ? 'Pace' : 'Distance';
    let label = this.getMetricLabel(config, labelKey, defaultLabel);

    // Apply individual text overrides for hero metric
    label = this.getTextOverride(config, 'hero', 'label', label);
    mainVal = this.getTextOverride(config, 'hero', 'value', mainVal);
    mainUnit = this.getTextOverride(config, 'hero', 'unit', mainUnit);

    const offLabel = this.getElementOffset(config, 'hero', 'label');
    const offVal = this.getElementOffset(config, 'hero', 'value');
    const offUnit = this.getElementOffset(config, 'hero', 'unit');
    const offSec = this.getElementOffset(config, 'hero', 'secondary');

    if (offLabel.hidden) label = '';
    if (offVal.hidden) mainVal = '';
    if (offUnit.hidden) mainUnit = '';

    const h = customH || 105;
    this.recordBounds('hero', 'Hero Metric', x, y, width, h);

    if (design === 'boxed-bracket') {
      // Style 8: Futuristic Tech HUD Boxed Brackets with glowing corner anchors
      if (cardStyle !== 'floating') {
        this.drawWidgetCardBg(ctx, 'hero', x, y, width, h, config, theme);
      }
      ctx.strokeStyle = elAccent;
      ctx.lineWidth = 2;
      const bLen = 16;
      ctx.beginPath();
      ctx.moveTo(x + 8, y + 8 + bLen); ctx.lineTo(x + 8, y + 8); ctx.lineTo(x + 8 + bLen, y + 8);
      ctx.moveTo(x + width - 8 - bLen, y + 8); ctx.lineTo(x + width - 8, y + 8); ctx.lineTo(x + width - 8, y + 8 + bLen);
      ctx.moveTo(x + 8, y + h - 8 - bLen); ctx.lineTo(x + 8, y + h - 8); ctx.lineTo(x + 8 + bLen, y + h - 8);
      ctx.moveTo(x + width - 8 - bLen, y + h - 8); ctx.lineTo(x + width - 8, y + h - 8); ctx.lineTo(x + width - 8, y + h - 8 - bLen);
      ctx.stroke();

      ctx.fillStyle = elAccent;
      ctx.beginPath(); ctx.arc(x + 24, y + 26, 4, 0, Math.PI * 2); ctx.fill();
      ctx.textAlign = 'left';
      ctx.font = this.getSubPartFont(config, 'hero', 'label', 'bold', 11);
      ctx.fillText(label.toUpperCase(), x + 34, y + 30);

      ctx.fillStyle = text;
      ctx.font = this.getSubPartFont(config, 'hero', 'val', 'bold', 56);
      ctx.fillText(mainVal, x + 24, y + 84);

      if (mainUnit) {
        const vw = ctx.measureText(mainVal).width;
        ctx.fillStyle = elAccent;
        ctx.font = this.getSubPartFont(config, 'hero', 'unit', 'bold', 22);
        ctx.fillText(mainUnit, x + 36 + vw, y + 82);
      }

      ctx.textAlign = 'right';
      ctx.fillStyle = textMuted;
      ctx.font = `bold 10px monospace`;
      ctx.fillText(`GPS ACTIVE // METRIC`, x + width - 24, y + 82);

      ctx.restore();
      return y + h;
    }

    if (design === 'stacked-duo') {
      // Style 9: Vertical Split-Tone Stack with Sub-Bar
      const subH = 26;
      const topH = h - subH;
      this.drawRoundedRect(ctx, x, y, width, topH, 12);
      ctx.fillStyle = cardStyle === 'solid' ? '#111118' : 'rgba(15, 15, 22, 0.9)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.stroke();

      this.drawRoundedRect(ctx, x, y + topH - 4, width, subH + 4, 8);
      ctx.fillStyle = elAccent;
      ctx.fill();

      ctx.textAlign = 'center';
      ctx.fillStyle = textMuted;
      ctx.font = this.getSubPartFont(config, 'hero', 'label', 'bold', 11);
      ctx.fillText(label, x + width / 2, y + 20);

      ctx.fillStyle = text;
      ctx.font = this.getSubPartFont(config, 'hero', 'val', 'bold', 48);
      ctx.fillText(`${mainVal} ${mainUnit}`, x + width / 2, y + topH - 12);

      ctx.fillStyle = '#000000';
      ctx.font = this.getSubPartFont(config, 'hero', 'secondary', 'bold', 11);
      ctx.letterSpacing = '1px';
      ctx.fillText(`⚡ RUN TRACKER OFFICIAL STAT`, x + width / 2, y + topH + 16);

      ctx.restore();
      return y + h;
    }

    if (design === 'badge-pill') {
      // Style 10: Horizontal Athletic Capsule Pill with circular runner icon
      const r = Math.min(28, h / 2);
      this.drawRoundedRect(ctx, x, y, width, h, r);
      ctx.fillStyle = cardStyle === 'solid' ? '#14141e' : 'rgba(20, 20, 30, 0.88)';
      ctx.fill();
      ctx.strokeStyle = elAccent;
      ctx.lineWidth = 2;
      ctx.stroke();

      const iconR = r - 6;
      ctx.fillStyle = elAccent;
      ctx.beginPath();
      ctx.arc(x + r + 6, y + h / 2, iconR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.font = `bold 22px sans-serif`;
      ctx.textAlign = 'center';
      const icon = heroType === 'time' ? '⏱️' : heroType === 'pace' ? '⚡' : '🏃';
      ctx.fillText(icon, x + r + 6, y + h / 2 + 7);

      ctx.textAlign = 'left';
      ctx.fillStyle = text;
      ctx.font = this.getSubPartFont(config, 'hero', 'val', 'bold', 52);
      const startTextX = x + r * 2 + 20;
      ctx.fillText(mainVal, startTextX, y + h / 2 + 18);

      const valW = ctx.measureText(mainVal).width;
      if (mainUnit) {
        ctx.fillStyle = elAccent;
        ctx.font = this.getSubPartFont(config, 'hero', 'unit', 'bold', 20);
        ctx.fillText(mainUnit, startTextX + valW + 10, y + h / 2 + 16);
      }

      ctx.textAlign = 'right';
      ctx.fillStyle = textMuted;
      ctx.font = this.getSubPartFont(config, 'hero', 'label', 'bold', 12);
      ctx.fillText(label, x + width - 24, y + h / 2 + 5);

      ctx.restore();
      return y + h;
    }

    if (design === 'cyber-glass') {
      // Style 11: Neon Glassmorphic HUD Bar
      this.drawRoundedRect(ctx, x, y, width, h, 14);
      ctx.fillStyle = 'rgba(10, 16, 26, 0.85)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = elAccent;
      this.drawRoundedRect(ctx, x, y, 6, h, 3);
      ctx.fill();

      ctx.textAlign = 'left';
      ctx.fillStyle = elAccent;
      ctx.font = this.getSubPartFont(config, 'hero', 'label', 'bold', 11);
      ctx.fillText(`// ${label}`, x + 24, y + 26);

      ctx.fillStyle = text;
      ctx.font = this.getSubPartFont(config, 'hero', 'val', 'bold', 58);
      ctx.shadowColor = elAccent;
      ctx.shadowBlur = 10;
      ctx.fillText(mainVal, x + 24, y + 84);
      ctx.shadowBlur = 0;

      if (mainUnit) {
        const vw = ctx.measureText(mainVal).width;
        ctx.fillStyle = elAccent;
        ctx.font = this.getSubPartFont(config, 'hero', 'unit', 'bold', 22);
        ctx.fillText(mainUnit, x + 34 + vw, y + 82);
      }

      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      this.drawRoundedRect(ctx, x + width - 110, y + 16, 96, 24, 6);
      ctx.fill();
      ctx.fillStyle = elAccent;
      ctx.font = `bold 10px monospace`;
      ctx.fillText(`● LIVE_DATA`, x + width - 24, y + 32);

      ctx.restore();
      return y + h;
    }

    if (design === 'racing-bib') {
      // Style 12: Official Marathon Racing Bib
      this.drawRoundedRect(ctx, x, y, width, h, 8);
      ctx.fillStyle = '#f8fafc';
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.stroke();

      this.drawRoundedRect(ctx, x + 2, y + 2, width - 4, 26, 6);
      ctx.fillStyle = elAccent;
      ctx.fill();

      ctx.textAlign = 'center';
      ctx.fillStyle = '#000000';
      ctx.font = this.getSubPartFont(config, 'hero', 'label', 'bold', 12);
      ctx.letterSpacing = '1px';
      ctx.fillText(`★ OFFICIAL RACE SPLIT // ${label} ★`, x + width / 2, y + 20);

      ctx.fillStyle = '#0f172a';
      ctx.font = this.getSubPartFont(config, 'hero', 'val', 'bold', 56);
      ctx.fillText(`${mainVal} ${mainUnit}`, x + width / 2, y + 82);

      ctx.fillStyle = '#94a3b8';
      ctx.beginPath(); ctx.arc(x + 12, y + 12, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + width - 12, y + 12, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 12, y + h - 12, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + width - 12, y + h - 12, 3, 0, Math.PI * 2); ctx.fill();

      ctx.restore();
      return y + h;
    }

    if (design === 'minimal-line') {
      // Style 13: Ultra-Minimal Hairline (Zero Box Background)
      const alignMode = align || 'left';
      ctx.textAlign = alignMode;
      const startX = alignMode === 'center' ? x + width / 2 : alignMode === 'right' ? x + width : x + 8;

      ctx.fillStyle = elAccent;
      ctx.font = this.getSubPartFont(config, 'hero', 'label', 'bold', 12);
      ctx.letterSpacing = '1.5px';
      ctx.fillText(label.toUpperCase(), startX, y + 22);

      ctx.fillStyle = text;
      ctx.font = this.getSubPartFont(config, 'hero', 'val', 'bold', 64);
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 10;
      ctx.fillText(mainVal, startX, y + 84);

      if (mainUnit) {
        const vw = ctx.measureText(mainVal).width;
        ctx.fillStyle = elAccent;
        ctx.font = this.getSubPartFont(config, 'hero', 'unit', 'bold', 24);
        ctx.shadowBlur = 0;
        const uX = alignMode === 'center' ? startX + vw / 2 + 12 : alignMode === 'right' ? startX : startX + vw + 14;
        ctx.fillText(mainUnit, uX, y + 80);
      }

      ctx.strokeStyle = elAccent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 8, y + 94);
      ctx.lineTo(x + width - 8, y + 94);
      ctx.stroke();

      ctx.restore();
      return y + h;
    }

    if (design === 'tape-sticker') {
      // Style 5: Athletic Tape Sticker with racing stripes
      ctx.save();
      this.drawRoundedRect(ctx, x, y, width, h, 6);
      ctx.fillStyle = '#1e1b4b';
      ctx.fill();

      // Top and bottom diagonal hazard tape strips
      const stripeW = 16;
      ctx.fillStyle = elAccent;
      for (let sx = x; sx < x + width; sx += stripeW * 2) {
        ctx.beginPath();
        ctx.moveTo(sx, y);
        ctx.lineTo(sx + stripeW, y);
        ctx.lineTo(sx + stripeW - 6, y + 8);
        ctx.lineTo(sx - 6, y + 8);
        ctx.closePath();
        ctx.fill();
      }

      ctx.textAlign = 'left';
      ctx.fillStyle = elAccent;
      ctx.font = this.getSubPartFont(config, 'hero', 'label', 'bold', 13);
      ctx.fillText(`⚡ ${label}`, x + 24, y + 36);

      ctx.fillStyle = text;
      ctx.font = this.getSubPartFont(config, 'hero', 'val', 'bold', 58);
      ctx.fillText(mainVal, x + 24, y + 86);

      if (mainUnit) {
        const vw = ctx.measureText(mainVal).width;
        ctx.fillStyle = elAccent;
        ctx.font = this.getSubPartFont(config, 'hero', 'unit', 'bold', 22);
        ctx.fillText(mainUnit, x + 34 + vw, y + 84);
      }

      ctx.restore();
      ctx.restore();
      return y + h;
    }

    if (design === 'digital-lcd') {
      // Style 6: Retro Digital Stopwatch LCD
      this.drawRoundedRect(ctx, x, y, width, h, 10);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.strokeStyle = elAccent;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Metallic top rim
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(x + 2, y + 2, width - 4, 18);

      ctx.textAlign = 'center';
      ctx.fillStyle = elAccent;
      ctx.font = this.getSubPartFont(config, 'hero', 'label', 'bold', 11);
      ctx.fillText(`[ DIGITAL TIMER // ${label} ]`, x + width / 2, y + 15);

      ctx.fillStyle = text;
      ctx.font = this.getSubPartFont(config, 'hero', 'val', 'bold', 60);
      ctx.shadowColor = elAccent;
      ctx.shadowBlur = 12;
      ctx.fillText(`${mainVal} ${mainUnit}`, x + width / 2, y + 82);
      ctx.shadowBlur = 0;

      ctx.restore();
      return y + h;
    }

    if (design === 'speedometer') {
      // Style 7: Curved Speedometer Arc Motif
      if (cardStyle !== 'floating') {
        this.drawCardBackground(ctx, x, y, width, h, config, theme);
      }
      const cx = x + width / 2;
      const cy = y + h - 10;
      const r = Math.min(width * 0.38, h * 0.85);

      // Arc track
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI, Math.PI * 2);
      ctx.stroke();

      // Active arc (filled 70%)
      ctx.strokeStyle = elAccent;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI, Math.PI * 1.72);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = textMuted;
      ctx.font = this.getSubPartFont(config, 'hero', 'label', 'bold', 12);
      ctx.fillText(label, cx, y + 30);

      ctx.fillStyle = text;
      ctx.font = this.getSubPartFont(config, 'hero', 'val', 'bold', 48);
      ctx.fillText(`${mainVal} ${mainUnit}`, cx, y + 76);

      ctx.restore();
      return y + h;
    }

    if (design === 'split-pill') {
      this.drawRoundedRect(ctx, x, y, width, h, 24);
      ctx.fillStyle = cardStyle === 'solid' ? '#14141d' : 'rgba(20, 20, 28, 0.85)';
      ctx.fill();
      ctx.strokeStyle = elAccent;
      ctx.stroke();

      // Left Accent Strip
      ctx.fillStyle = elAccent;
      this.drawRoundedRect(ctx, x + 8, y + 8, 88, h - 16, 18);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.font = `bold 24px ${font}`;
      ctx.textAlign = 'center';
      const icon = heroType === 'time' ? '⏱️' : heroType === 'pace' ? '⚡' : '🏃';
      ctx.fillText(icon, x + 52, y + 58);

      // Right Stats
      ctx.textAlign = 'left';
      ctx.fillStyle = textMuted;
      ctx.font = this.getSubPartFont(config, 'hero', 'label', 'bold', 12);
      ctx.fillText(label, x + 115, y + 36);

      ctx.fillStyle = text;
      ctx.font = this.getSubPartFont(config, 'hero', 'val', 'bold', 52);
      ctx.fillText(mainVal, x + 115, y + 82);

      if (mainUnit) {
        ctx.fillStyle = elAccent;
        ctx.font = this.getSubPartFont(config, 'hero', 'unit', 'bold', 20);
        const valW = ctx.measureText(mainVal).width;
        ctx.fillText(mainUnit, x + 125 + valW, y + 80);
      }

      ctx.restore();
      return y + h;
    }

    if (design === 'outline') {
      const alignMode = align || 'center';
      const centerX = alignMode === 'left' ? x + 24 : alignMode === 'right' ? x + width - 24 : x + width / 2;
      ctx.textAlign = alignMode;
      ctx.fillStyle = textMuted;
      ctx.font = this.getSubPartFont(config, 'hero', 'label', 'bold', 13);
      ctx.fillText(label, centerX, y + 24);

      const valFont = this.getSubPartFont(config, 'hero', 'val', 'bold', 68);
      const unitFont = this.getSubPartFont(config, 'hero', 'unit', 'bold', 26);

      ctx.font = valFont;
      const valW = ctx.measureText(mainVal).width;
      ctx.font = unitFont;
      const unitW = mainUnit ? ctx.measureText(mainUnit).width : 0;
      const gap = mainUnit ? 14 : 0;
      const totalW = valW + gap + unitW;

      let startX;
      if (alignMode === 'left') {
        startX = x + 24;
      } else if (alignMode === 'right') {
        startX = x + width - 24 - totalW;
      } else {
        startX = Math.round(x + (width - totalW) / 2);
      }

      ctx.textAlign = 'left';
      ctx.fillStyle = elAccent;
      ctx.font = valFont;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = 12;
      ctx.fillText(mainVal, startX, y + 84);

      if (mainUnit) {
        ctx.fillStyle = text;
        ctx.font = unitFont;
        ctx.shadowBlur = 0;
        ctx.fillText(mainUnit, startX + valW + gap, y + 80);
      }

      ctx.restore();
      return y + h;
    }


    if (design === 'vertical-totem') {
      // Style: Vertical Monolith Totem (Stacked mega typography)
      const totemH = customH || 140;
      this.recordBounds('hero', 'Hero Metric', x, y, width, totemH);
      if (cardStyle !== 'floating') {
        this.drawWidgetCardBg(ctx, 'hero', x, y, width, totemH, config, theme);
      }

      // Top category pill
      const pillW = 160;
      const pillX = x + (width - pillW) / 2;
      this.drawRoundedRect(ctx, pillX, y + 14, pillW, 24, 12);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fill();
      ctx.strokeStyle = elAccent;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.save();
      this.applyZDepth(ctx, offLabel.z);
      ctx.textAlign = 'center';
      ctx.fillStyle = this.getSubPartColor(config, 'hero', 'label', elAccent);
      ctx.font = this.getSubPartFont(config, 'hero', 'label', 'bold', 11);
      ctx.fillText(label.toUpperCase(), x + width / 2 + offLabel.x, y + 30 + offLabel.y);
      ctx.restore();

      // Huge stacked number
      ctx.save();
      this.applyZDepth(ctx, offVal.z);
      ctx.textAlign = 'center';
      ctx.fillStyle = this.getSubPartColor(config, 'hero', 'val', text);
      ctx.font = this.getSubPartFont(config, 'hero', 'val', 'bold', 68);
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 12;
      ctx.fillText(mainVal, x + width / 2 + offVal.x, y + 96 + offVal.y);
      ctx.restore();

      // Bottom unit bar
      if (mainUnit) {
        ctx.save();
        this.applyZDepth(ctx, offUnit.z);
        ctx.textAlign = 'center';
        ctx.fillStyle = this.getSubPartColor(config, 'hero', 'unit', textMuted);
        ctx.font = this.getSubPartFont(config, 'hero', 'unit', 'bold', 14);
        ctx.letterSpacing = '3px';
        ctx.fillText(mainUnit.toUpperCase(), x + width / 2 + offUnit.x, y + 124 + offUnit.y);
        ctx.restore();
      }

      ctx.restore();
      return y + totemH;
    }

    if (design === 'precision-hud-gauge') {
      // Style: Precision Arc Gauge HUD (Dual calibrated dials & digital center readout)
      const gaugeH = customH || 120;
      this.recordBounds('hero', 'Hero Metric', x, y, width, gaugeH);
      if (cardStyle !== 'floating') {
        this.drawWidgetCardBg(ctx, 'hero', x, y, width, gaugeH, config, theme);
      }

      const cx = x + width / 2;
      const cy = y + gaugeH / 2 + 10;
      const radius = Math.min(width * 0.32, gaugeH * 0.42);

      // Gauge background arc
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, -Math.PI * 1.15, Math.PI * 0.15);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Active illuminated gauge segment
      ctx.beginPath();
      ctx.arc(cx, cy, radius, -Math.PI * 1.15, -Math.PI * 0.3);
      ctx.strokeStyle = elAccent;
      ctx.lineWidth = 6;
      ctx.shadowColor = elAccent;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.restore();

      // Label top
      ctx.save();
      this.applyZDepth(ctx, offLabel.z);
      ctx.textAlign = 'center';
      ctx.fillStyle = this.getSubPartColor(config, 'hero', 'label', textMuted);
      ctx.font = this.getSubPartFont(config, 'hero', 'label', 'bold', 11);
      ctx.fillText(label.toUpperCase(), cx + offLabel.x, y + 22 + offLabel.y);
      ctx.restore();

      // Center value
      ctx.save();
      this.applyZDepth(ctx, offVal.z);
      ctx.textAlign = 'center';
      ctx.fillStyle = this.getSubPartColor(config, 'hero', 'val', text);
      ctx.font = this.getSubPartFont(config, 'hero', 'val', 'bold', 48);
      ctx.fillText(mainVal, cx + offVal.x, cy + 12 + offVal.y);
      ctx.restore();

      // Unit badge below value
      if (mainUnit) {
        ctx.save();
        this.applyZDepth(ctx, offUnit.z);
        ctx.textAlign = 'center';
        ctx.fillStyle = this.getSubPartColor(config, 'hero', 'unit', elAccent);
        ctx.font = this.getSubPartFont(config, 'hero', 'unit', 'bold', 12);
        ctx.fillText(mainUnit, cx + offUnit.x, cy + 30 + offUnit.y);
        ctx.restore();
      }

      ctx.restore();
      return y + gaugeH;
    }

    if (design === 'tactical-crosshair') {
      // Style: Tactical Crosshair Optic (Reticle, corner tickmarks & HUD anchors)
      const tactH = customH || 110;
      this.recordBounds('hero', 'Hero Metric', x, y, width, tactH);
      if (cardStyle !== 'floating') {
        this.drawWidgetCardBg(ctx, 'hero', x, y, width, tactH, config, theme);
      }

      // Corner crosshair ticks
      const tLen = 10;
      ctx.strokeStyle = elAccent;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 10, y + 10 + tLen); ctx.lineTo(x + 10, y + 10); ctx.lineTo(x + 10 + tLen, y + 10);
      ctx.moveTo(x + width - 10 - tLen, y + 10); ctx.lineTo(x + width - 10, y + 10); ctx.lineTo(x + width - 10, y + 10 + tLen);
      ctx.moveTo(x + 10, y + tactH - 10 - tLen); ctx.lineTo(x + 10, y + tactH - 10); ctx.lineTo(x + 10 + tLen, y + tactH - 10);
      ctx.moveTo(x + width - 10 - tLen, y + tactH - 10); ctx.lineTo(x + width - 10, y + tactH - 10); ctx.lineTo(x + width - 10, y + tactH - 10 - tLen);
      ctx.stroke();

      // Telemetry tags
      ctx.textAlign = 'left';
      ctx.fillStyle = elAccent;
      ctx.font = 'bold 9px monospace';
      ctx.fillText('+ SYS // OPTIC', x + 16, y + 24);

      ctx.textAlign = 'right';
      ctx.fillStyle = textMuted;
      ctx.fillText('STATUS: LOCKED', x + width - 16, y + 24);

      // Center value
      ctx.save();
      this.applyZDepth(ctx, offVal.z);
      ctx.textAlign = 'center';
      ctx.fillStyle = this.getSubPartColor(config, 'hero', 'val', text);
      ctx.font = this.getSubPartFont(config, 'hero', 'val', 'bold', 56);
      ctx.fillText(mainVal, x + width / 2 + offVal.x, y + 74 + offVal.y);
      ctx.restore();

      // Unit and label footer
      ctx.save();
      this.applyZDepth(ctx, offUnit.z);
      ctx.textAlign = 'center';
      ctx.fillStyle = this.getSubPartColor(config, 'hero', 'unit', elAccent);
      ctx.font = this.getSubPartFont(config, 'hero', 'unit', 'bold', 12);
      ctx.fillText(`${label.toUpperCase()} [ ${mainUnit || 'TOTAL'} ]`, x + width / 2 + offUnit.x, y + tactH - 14 + offUnit.y);
      ctx.restore();

      ctx.restore();
      return y + tactH;
    }

    if (design === 'angled-speed-slash') {
      // Style: Dynamic Speed Slash (Athletic slanted card with speed gradient)
      const slashH = customH || 105;
      this.recordBounds('hero', 'Hero Metric', x, y, width, slashH);

      // Angled slanted background
      const slant = 18;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x + slant, y);
      ctx.lineTo(x + width, y);
      ctx.lineTo(x + width - slant, y + slashH);
      ctx.lineTo(x, y + slashH);
      ctx.closePath();
      const slashGrad = ctx.createLinearGradient(x, y, x + width, y + slashH);
      slashGrad.addColorStop(0, '#101018');
      slashGrad.addColorStop(1, '#1b1b28');
      ctx.fillStyle = slashGrad;
      ctx.fill();
      ctx.strokeStyle = elAccent;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Racing hazard lines on right edge
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      for (let s = 0; s < 4; s++) {
        const sx = x + width - 28 - s * 8;
        ctx.beginPath();
        ctx.moveTo(sx, y + 10);
        ctx.lineTo(sx - 12, y + slashH - 10);
        ctx.stroke();
      }
      ctx.restore();

      // Slanted content
      ctx.save();
      this.applyZDepth(ctx, offLabel.z);
      ctx.textAlign = 'left';
      ctx.fillStyle = this.getSubPartColor(config, 'hero', 'label', elAccent);
      ctx.font = this.getSubPartFont(config, 'hero', 'label', 'italic bold', 12);
      ctx.fillText(`/// ${label.toUpperCase()}`, x + slant + 16 + offLabel.x, y + 28 + offLabel.y);
      ctx.restore();

      ctx.save();
      this.applyZDepth(ctx, offVal.z);
      ctx.textAlign = 'left';
      ctx.fillStyle = this.getSubPartColor(config, 'hero', 'val', text);
      ctx.font = this.getSubPartFont(config, 'hero', 'val', 'italic bold', 58);
      ctx.fillText(mainVal, x + slant + 16 + offVal.x, y + 80 + offVal.y);
      const valW = ctx.measureText(mainVal).width;
      ctx.restore();

      if (mainUnit) {
        ctx.save();
        this.applyZDepth(ctx, offUnit.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = this.getSubPartColor(config, 'hero', 'unit', textMuted);
        ctx.font = this.getSubPartFont(config, 'hero', 'unit', 'italic bold', 20);
        ctx.fillText(mainUnit, x + slant + 24 + valW + offUnit.x, y + 76 + offUnit.y);
        ctx.restore();
      }

      ctx.restore();
      return y + slashH;
    }

    // Default 'mega' and 'card':
    if (cardStyle !== 'floating') {
      this.drawWidgetCardBg(ctx, 'hero', x, y, width, h, config, theme, design === 'card');
    }

    const alignMode = align || 'center';
    const centerX = (alignMode === 'left' ? x + 24 : alignMode === 'right' ? x + width - 24 : x + width / 2) + offLabel.x;
    ctx.textAlign = alignMode;
    this.applyZDepth(ctx, offLabel.z);
    ctx.fillStyle = this.getSubPartColor(config, 'hero', 'label', textMuted);
    ctx.font = this.getSubPartFont(config, 'hero', 'label', 'bold', 13);
    ctx.letterSpacing = '1px';
    ctx.fillText(label, centerX, y + 26 + offLabel.y);

    const valFont = this.getSubPartFont(config, 'hero', 'val', 'bold', 64);
    const unitFont = this.getSubPartFont(config, 'hero', 'unit', 'bold', 24);

    ctx.font = valFont;
    const valW = ctx.measureText(mainVal).width;
    ctx.font = unitFont;
    const unitW = mainUnit ? ctx.measureText(mainUnit).width : 0;
    const gap = mainUnit ? 14 : 0;
    const totalW = valW + gap + unitW;

    let startX;
    if (alignMode === 'left') {
      startX = x + 24;
    } else if (alignMode === 'right') {
      startX = x + width - 24 - totalW;
    } else {
      startX = Math.round(x + (width - totalW) / 2);
    }

    ctx.textAlign = 'left';
    this.applyZDepth(ctx, offVal.z);
    ctx.fillStyle = this.getSubPartColor(config, 'hero', 'val', text);
    ctx.font = valFont;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 2;
    ctx.fillText(mainVal, startX + offVal.x, y + 84 + offVal.y);

    if (mainUnit) {
      this.applyZDepth(ctx, offUnit.z);
      ctx.shadowBlur = 0;
      ctx.fillStyle = this.getSubPartColor(config, 'hero', 'unit', elAccent);
      ctx.font = unitFont;
      ctx.fillText(mainUnit, startX + valW + gap + offUnit.x, y + 80 + offUnit.y);
    }

    ctx.restore();
    return y + h;
  }

  // =========================================================================
  // WIDGET 4: SECONDARY METRICS
  // Designs: 'grid', 'strip', 'badges', 'compact', 'circular-gauges', 'editorial-table', 'pill-row'
  // =========================================================================
  drawMetricsGrid(ctx, x, y, width, activity, config, theme, accent, cols = 3, customH = null) {
    ctx.save();
    const elStyle = this.getElementStyle(config, 'metrics');
    const { text, textMuted, accent: elAccent, cardStyle, align, opacity } = this.getEffectiveColors(config, theme, accent, 'metrics');
    if (opacity < 1) ctx.globalAlpha = opacity;
    accent = elAccent;

    const font = this.getFontFamily(elStyle.fontFamily !== 'default' ? elStyle.fontFamily : config.fontFamily);
    const design = config.metricsDesign || 'grid';

    const offLabel = this.getElementOffset(config, 'metrics', 'label');
    const offVal = this.getElementOffset(config, 'metrics', 'val');

    const isLive = activity.isAnimated && activity.progress < 0.999;
    const paceLabelDefault = isLive ? 'PACE' : 'AVG PACE';
    const hrLabelDefault = isLive ? 'HEART RATE' : 'AVG HR';

    const metrics = [];
    if (config.heroMetric !== 'time') metrics.push({ label: this.getMetricLabel(config, 'Time', 'TIME'), val: activity.durationFormatted, icon: '⏱️' });
    if (config.heroMetric !== 'pace') metrics.push({ label: this.getMetricLabel(config, 'Pace', paceLabelDefault), val: activity.avgPaceFormatted, icon: '⚡' });
    if (activity.avgHr && config.metricShowHr !== false) metrics.push({ label: this.getMetricLabel(config, 'Hr', hrLabelDefault), val: `${activity.avgHr} bpm`, icon: '❤️' });
    if (activity.elevationGain !== null && config.metricShowElevation !== false) metrics.push({ label: this.getMetricLabel(config, 'Elevation', 'ELEV GAIN'), val: `+${activity.elevationGain}m`, icon: '⛰️' });
    if (activity.avgCadence && config.metricShowCadence !== false) metrics.push({ label: this.getMetricLabel(config, 'Cadence', 'CADENCE'), val: `${activity.avgCadence} spm`, icon: '👟' });
    if (activity.calories && config.metricShowCalories !== false) metrics.push({ label: this.getMetricLabel(config, 'Calories', 'CALORIES'), val: `${activity.calories} kcal`, icon: '🔥' });
    if (activity.bestPaceFormatted && config.metricShowBestPace !== false) metrics.push({ label: this.getMetricLabel(config, 'BestPace', 'BEST PACE'), val: activity.bestPaceFormatted, icon: '🚀' });

    const displayMetrics = metrics.slice(0, cols);
    if (offLabel.hidden) displayMetrics.forEach((m) => { m.label = ''; m.icon = ''; });
    if (offVal.hidden) displayMetrics.forEach((m) => { m.val = ''; });
    const cardH = customH || 80;
    this.recordBounds('metrics', 'Secondary Metrics', x, y, width, cardH);
    this.drawWidgetCardBg(ctx, 'metrics', x, y, width, cardH, config, theme);

    if (design === 'cards-2col') {
      // Style 8: 2-Column Bold Stat Cards with Left Accent Indicator
      const halfCols = 2;
      const count = displayMetrics.length;
      const rows = Math.ceil(count / halfCols);
      const gapX = 12;
      const gapY = 8;
      const itemW = (width - gapX) / 2;
      const singleH = Math.max(50, Math.floor((cardH - (rows - 1) * gapY) / rows));
      const totalH = rows * singleH + (rows - 1) * gapY;
      this.recordBounds('metrics', 'Secondary Metrics', x, y, width, totalH);

      displayMetrics.forEach((m, idx) => {
        const c = idx % 2;
        const r = Math.floor(idx / 2);
        const ix = x + c * (itemW + gapX);
        const iy = y + r * (singleH + gapY);

        this.drawRoundedRect(ctx, ix, iy, itemW, singleH, 10);
        ctx.fillStyle = cardStyle === 'solid' ? '#14141e' : 'rgba(20, 20, 30, 0.85)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.stroke();

        ctx.fillStyle = elAccent;
        this.drawRoundedRect(ctx, ix + 2, iy + 6, 4, singleH - 12, 2);
        ctx.fill();

        ctx.textAlign = 'left';
        ctx.fillStyle = textMuted;
        ctx.font = this.getSubPartFont(config, 'metrics', 'label', 'bold', 10);
        ctx.fillText(m.label, ix + 14, iy + singleH * 0.38);

        ctx.fillStyle = text;
        ctx.font = this.getSubPartFont(config, 'metrics', 'val', 'bold', 18);
        ctx.fillText(m.val, ix + 14, iy + singleH * 0.82);
      });

      ctx.restore();
      return y + totalH;
    }

    if (design === 'vertical-stacked-hud') {
      // Style 9: Vertical Telemetry Rows with icons & right values
      const count = displayMetrics.length;
      const rowH = Math.max(26, Math.floor(cardH / count));
      const totalH = count * rowH;
      this.recordBounds('metrics', 'Secondary Metrics', x, y, width, totalH);

      if (cardStyle !== 'floating') {
        this.drawCardBackground(ctx, x, y, width, totalH, config, theme);
      }

      displayMetrics.forEach((m, idx) => {
        const ry = y + idx * rowH;
        if (idx > 0) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.beginPath(); ctx.moveTo(x + 12, ry); ctx.lineTo(x + width - 12, ry); ctx.stroke();
        }

        ctx.textAlign = 'left';
        ctx.fillStyle = elAccent;
        ctx.font = this.getSubPartFont(config, 'metrics', 'label', 'bold', 12);
        ctx.fillText(`${m.icon} ${m.label}`, x + 16, ry + rowH * 0.68);

        ctx.textAlign = 'right';
        ctx.fillStyle = text;
        ctx.font = this.getSubPartFont(config, 'metrics', 'val', 'bold', 14);
        ctx.fillText(m.val, x + width - 16, ry + rowH * 0.68);
      });

      ctx.restore();
      return y + totalH;
    }

    if (design === 'split-scoreboard') {
      // Style 10: LED Marathon Scoreboard Tiles
      const cardGap = 8;
      const itemW = (width - cardGap * (displayMetrics.length - 1)) / displayMetrics.length;

      displayMetrics.forEach((m, idx) => {
        const itemX = x + idx * (itemW + cardGap);
        this.drawRoundedRect(ctx, itemX, y, itemW, cardH, 6);
        ctx.fillStyle = '#0a0a10';
        ctx.fill();
        ctx.strokeStyle = '#222230';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.fillStyle = '#f59e0b';
        ctx.font = `bold 10px monospace`;
        ctx.fillText(m.label, itemX + itemW / 2, y + 24);

        ctx.fillStyle = elAccent;
        ctx.font = `bold 19px monospace`;
        ctx.shadowColor = elAccent;
        ctx.shadowBlur = 8;
        ctx.fillText(m.val, itemX + itemW / 2, y + 58);
        ctx.shadowBlur = 0;
      });

      ctx.restore();
      return y + cardH;
    }

    if (design === 'cyber-brackets') {
      // Style 11: Cyberpunk Corner Brackets on Each Stat Card
      const cardGap = 10;
      const itemW = (width - cardGap * (displayMetrics.length - 1)) / displayMetrics.length;

      displayMetrics.forEach((m, idx) => {
        const itemX = x + idx * (itemW + cardGap);
        this.drawRoundedRect(ctx, itemX, y, itemW, cardH, 4);
        ctx.fillStyle = 'rgba(10, 16, 26, 0.88)';
        ctx.fill();

        ctx.strokeStyle = elAccent;
        ctx.lineWidth = 1.5;
        const b = 6;
        ctx.beginPath();
        ctx.moveTo(itemX, y + b); ctx.lineTo(itemX, y); ctx.lineTo(itemX + b, y);
        ctx.moveTo(itemX + itemW - b, y); ctx.lineTo(itemX + itemW, y); ctx.lineTo(itemX + itemW, y + b);
        ctx.moveTo(itemX, y + cardH - b); ctx.lineTo(itemX, y + cardH); ctx.lineTo(itemX + b, y + cardH);
        ctx.moveTo(itemX + itemW - b, y + cardH); ctx.lineTo(itemX + itemW, y + cardH); ctx.lineTo(itemX + itemW, y + cardH - b);
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.fillStyle = elAccent;
        ctx.font = `bold 10px monospace`;
        ctx.fillText(`[ ${m.label} ]`, itemX + itemW / 2, y + 24);

        ctx.fillStyle = text;
        ctx.font = this.getSubPartFont(config, 'metrics', 'val', 'bold', 20);
        ctx.fillText(m.val, itemX + itemW / 2, y + 56);
      });

      ctx.restore();
      return y + cardH;
    }

    if (design === 'hex-badges') {
      // Style 12: Athletic Chamfered Badges
      const cardGap = 8;
      const itemW = (width - cardGap * (displayMetrics.length - 1)) / displayMetrics.length;

      displayMetrics.forEach((m, idx) => {
        const itemX = x + idx * (itemW + cardGap);
        this.drawRoundedRect(ctx, itemX, y, itemW, cardH, 12);
        ctx.fillStyle = cardStyle === 'solid' ? '#14141e' : 'rgba(25, 25, 35, 0.85)';
        ctx.fill();
        ctx.strokeStyle = elAccent;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.fillStyle = textMuted;
        ctx.font = this.getSubPartFont(config, 'metrics', 'label', 'bold', 10);
        ctx.fillText(m.label, itemX + itemW / 2, y + 24);

        ctx.fillStyle = elAccent;
        ctx.font = this.getSubPartFont(config, 'metrics', 'val', 'bold', 20);
        ctx.fillText(m.val, itemX + itemW / 2, y + 56);
      });

      ctx.restore();
      return y + cardH;
    }

    if (design === 'horizontal-ticker') {
      // Style 13: Compact Single-Line Stat Ribbon
      const hTickerH = 46;
      this.drawRoundedRect(ctx, x, y, width, hTickerH, hTickerH / 2);
      ctx.fillStyle = cardStyle === 'solid' ? '#111118' : 'rgba(15, 15, 24, 0.9)';
      ctx.fill();
      ctx.strokeStyle = elAccent;
      ctx.lineWidth = 1;
      ctx.stroke();

      const itemW = width / displayMetrics.length;
      displayMetrics.forEach((m, idx) => {
        const cx = x + idx * itemW + itemW / 2;
        ctx.textAlign = 'center';
        ctx.fillStyle = text;
        ctx.font = this.getSubPartFont(config, 'metrics', 'label', 'bold', 12);
        ctx.fillText(`${m.label}: `, cx - 14, y + 28);
        ctx.fillStyle = elAccent;
        ctx.fillText(m.val, cx + 22, y + 28);
      });

      ctx.restore();
      return y + hTickerH;
    }

    if (design === 'circular-gauges') {
      // Style 5: Radial Gauge Rings for metrics
      if (cardStyle !== 'floating') {
        this.drawCardBackground(ctx, x, y, width, cardH, config, theme);
      }
      const colW = width / displayMetrics.length;

      displayMetrics.forEach((m, idx) => {
        const cx = x + idx * colW + colW / 2;
        const cy = y + cardH / 2;
        const r = Math.min(26, cardH * 0.32);

        // Circular background track
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.arc(cx, cy - 6, r, 0, Math.PI * 2); ctx.stroke();

        // Accent arc
        ctx.strokeStyle = elAccent;
        ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.arc(cx, cy - 6, r, -Math.PI / 2, Math.PI * 0.85); ctx.stroke();

        ctx.textAlign = 'center';
        ctx.fillStyle = text;
        ctx.font = this.getSubPartFont(config, 'metrics', 'val', 'bold', 13);
        ctx.fillText(m.val.split(' ')[0], cx, cy - 2);

        ctx.fillStyle = textMuted;
        ctx.font = this.getSubPartFont(config, 'metrics', 'label', 'bold', 10);
        ctx.fillText(m.label, cx, y + cardH - 10);
      });

      ctx.restore();
      return y + cardH;
    }

    if (design === 'editorial-table') {
      // Style 6: Official Results Table
      this.drawRoundedRect(ctx, x, y, width, cardH, 8);
      ctx.fillStyle = cardStyle === 'solid' ? '#14141d' : 'rgba(10, 10, 15, 0.9)';
      ctx.fill();
      ctx.strokeStyle = elAccent;
      ctx.lineWidth = 1;
      ctx.stroke();

      const colW = width / displayMetrics.length;
      displayMetrics.forEach((m, idx) => {
        const cx = x + idx * colW;
        if (idx % 2 === 1) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
          ctx.fillRect(cx, y + 1, colW, cardH - 2);
        }

        ctx.textAlign = 'left';
        ctx.fillStyle = elAccent;
        ctx.font = this.getSubPartFont(config, 'metrics', 'label', 'bold', 10);
        ctx.fillText(`// ${m.label}`, cx + 12, y + 24);

        ctx.fillStyle = text;
        ctx.font = this.getSubPartFont(config, 'metrics', 'val', 'bold', 22);
        ctx.fillText(m.val, cx + 12, y + 56);
      });

      ctx.restore();
      return y + cardH;
    }

    if (design === 'pill-row') {
      // Style 7: Segmented Pill Row
      const cardGap = 8;
      const itemW = (width - cardGap * (displayMetrics.length - 1)) / displayMetrics.length;

      displayMetrics.forEach((m, idx) => {
        const itemX = x + idx * (itemW + cardGap);
        this.drawRoundedRect(ctx, itemX, y, itemW, cardH, cardH / 2);
        ctx.fillStyle = cardStyle === 'solid' ? '#14141d' : 'rgba(20, 20, 30, 0.85)';
        ctx.fill();
        ctx.strokeStyle = elAccent;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.fillStyle = elAccent;
        ctx.font = this.getSubPartFont(config, 'metrics', 'label', 'bold', 10);
        ctx.fillText(`${m.icon} ${m.label}`, itemX + itemW / 2, y + 26);

        ctx.fillStyle = text;
        ctx.font = this.getSubPartFont(config, 'metrics', 'val', 'bold', 18);
        ctx.fillText(m.val, itemX + itemW / 2, y + 56);
      });

      ctx.restore();
      return y + cardH;
    }

    if (design === 'horizontal-pipeline') {
      // Style 14: Horizontal Telemetry Pipeline (Inline Stream //)
      const pipeH = customH || 56;
      this.recordBounds('metrics', 'Secondary Metrics', x, y, width, pipeH);
      if (cardStyle !== 'floating') {
        this.drawRoundedRect(ctx, x, y, width, pipeH, 12);
        ctx.fillStyle = cardStyle === 'solid' ? '#0d1117' : 'rgba(13, 17, 23, 0.88)';
        ctx.fill();
        ctx.strokeStyle = elAccent;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      const colW = width / displayMetrics.length;
      displayMetrics.forEach((m, idx) => {
        const cx = x + idx * colW;
        if (idx > 0) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.beginPath();
          ctx.moveTo(cx, y + 10);
          ctx.lineTo(cx, y + pipeH - 10);
          ctx.stroke();
        }

        const itemMidX = cx + colW / 2;
        ctx.save();
        this.applyZDepth(ctx, offLabel.z);
        ctx.textAlign = 'center';
        ctx.fillStyle = this.getSubPartColor(config, 'metrics', 'label', elAccent);
        ctx.font = this.getSubPartFont(config, 'metrics', 'label', 'bold', 10);
        ctx.fillText(`// ${m.label}`.toUpperCase(), itemMidX + offLabel.x, y + 19 + offLabel.y);
        ctx.restore();

        ctx.save();
        this.applyZDepth(ctx, offVal.z);
        ctx.textAlign = 'center';
        ctx.fillStyle = this.getSubPartColor(config, 'metrics', 'val', text);
        ctx.font = this.getSubPartFont(config, 'metrics', 'val', 'bold', 20);
        ctx.fillText(m.val, itemMidX + offVal.x, y + pipeH - 14 + offVal.y);
        ctx.restore();
      });

      ctx.restore();
      return y + pipeH;
    }

    if (design === 'horizontal-chips') {
      // Style 15: Horizontal Stat Chips (Icon + Label + Value inline)
      const chipH = customH || 48;
      const cardGap = 8;
      const itemW = (width - cardGap * (displayMetrics.length - 1)) / displayMetrics.length;
      this.recordBounds('metrics', 'Secondary Metrics', x, y, width, chipH);

      displayMetrics.forEach((m, idx) => {
        const itemX = x + idx * (itemW + cardGap);
        this.drawRoundedRect(ctx, itemX, y, itemW, chipH, chipH / 2);
        ctx.fillStyle = cardStyle === 'solid' ? '#14141e' : 'rgba(20, 24, 34, 0.85)';
        ctx.fill();
        ctx.strokeStyle = elAccent;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.save();
        this.applyZDepth(ctx, offLabel.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = this.getSubPartColor(config, 'metrics', 'label', textMuted);
        ctx.font = this.getSubPartFont(config, 'metrics', 'label', 'bold', 10);
        const labelStr = m.icon ? `${m.icon} ${m.label}` : m.label;
        ctx.fillText(labelStr, itemX + 14 + offLabel.x, y + chipH / 2 + 4 + offLabel.y);
        ctx.restore();

        ctx.save();
        this.applyZDepth(ctx, offVal.z);
        ctx.textAlign = 'right';
        ctx.fillStyle = this.getSubPartColor(config, 'metrics', 'val', text);
        ctx.font = this.getSubPartFont(config, 'metrics', 'val', 'bold', 15);
        ctx.fillText(m.val, itemX + itemW - 14 + offVal.x, y + chipH / 2 + 5 + offVal.y);
        ctx.restore();
      });

      ctx.restore();
      return y + chipH;
    }

    if (design === 'horizontal-slash-minimal') {
      // Style 16: Horizontal Minimalist Slash (Clean Floating)
      const slashH = customH || 50;
      this.recordBounds('metrics', 'Secondary Metrics', x, y, width, slashH);

      const colW = width / displayMetrics.length;
      displayMetrics.forEach((m, idx) => {
        const cx = x + idx * colW + colW / 2;

        if (idx < displayMetrics.length - 1) {
          const slashX = x + (idx + 1) * colW;
          ctx.save();
          ctx.fillStyle = elAccent;
          ctx.font = '300 24px monospace';
          ctx.textAlign = 'center';
          ctx.globalAlpha = 0.5;
          ctx.fillText('/', slashX, y + slashH / 2 + 8);
          ctx.restore();
        }

        ctx.save();
        this.applyZDepth(ctx, offLabel.z);
        ctx.textAlign = 'center';
        ctx.fillStyle = this.getSubPartColor(config, 'metrics', 'label', elAccent);
        ctx.font = this.getSubPartFont(config, 'metrics', 'label', 'bold', 11);
        ctx.letterSpacing = '1px';
        ctx.fillText(m.label.toUpperCase(), cx + offLabel.x, y + 18 + offLabel.y);
        ctx.restore();

        ctx.save();
        this.applyZDepth(ctx, offVal.z);
        ctx.textAlign = 'center';
        ctx.fillStyle = this.getSubPartColor(config, 'metrics', 'val', text);
        ctx.font = this.getSubPartFont(config, 'metrics', 'val', 'bold', 22);
        ctx.fillText(m.val, cx + offVal.x, y + slashH - 6 + offVal.y);
        ctx.restore();
      });

      ctx.restore();
      return y + slashH;
    }

    if (design === 'horizontal-linear-cards') {
      // Style 17: Horizontal Leaderboard Rows (Left/Right)
      const cardH_item = customH || 52;
      const cardGap = 8;
      const itemW = (width - cardGap * (displayMetrics.length - 1)) / displayMetrics.length;
      this.recordBounds('metrics', 'Secondary Metrics', x, y, width, cardH_item);

      displayMetrics.forEach((m, idx) => {
        const itemX = x + idx * (itemW + cardGap);
        this.drawRoundedRect(ctx, itemX, y, itemW, cardH_item, 8);
        ctx.fillStyle = cardStyle === 'solid' ? '#12121c' : 'rgba(18, 18, 28, 0.85)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = elAccent;
        this.drawRoundedRect(ctx, itemX + 2, y + 8, 3, cardH_item - 16, 2);
        ctx.fill();

        ctx.save();
        this.applyZDepth(ctx, offLabel.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = this.getSubPartColor(config, 'metrics', 'label', textMuted);
        ctx.font = this.getSubPartFont(config, 'metrics', 'label', 'bold', 9);
        ctx.fillText(m.label.toUpperCase(), itemX + 12 + offLabel.x, y + 20 + offLabel.y);
        ctx.restore();

        ctx.save();
        this.applyZDepth(ctx, offVal.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = this.getSubPartColor(config, 'metrics', 'val', text);
        ctx.font = this.getSubPartFont(config, 'metrics', 'val', 'bold', 19);
        ctx.fillText(m.val, itemX + 12 + offVal.x, y + cardH_item - 12 + offVal.y);
        ctx.restore();
      });

      ctx.restore();
      return y + cardH_item;
    }


    if (design === 'vertical-minimal-stack') {
      // Style: Vertical Minimalist Stack (Clean hairline rows, left accent indicators, right bold values)
      const vertCount = Math.min(displayMetrics.length, 6);
      const rowH = Math.max(34, Math.floor((customH || (vertCount * 42)) / vertCount));
      const totalH = vertCount * rowH;
      this.recordBounds('metrics', 'Secondary Metrics', x, y, width, totalH);

      if (cardStyle !== 'floating' && !this.isTextOnly(config, 'metrics')) {
        this.drawCardBackground(ctx, x, y, width, totalH, config, theme);
      }

      displayMetrics.slice(0, vertCount).forEach((m, idx) => {
        const ry = y + idx * rowH;
        if (idx > 0) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x + 16, ry);
          ctx.lineTo(x + width - 16, ry);
          ctx.stroke();
        }

        // Left accent notch
        ctx.fillStyle = elAccent;
        this.drawRoundedRect(ctx, x + 16, ry + (rowH - 14) / 2, 4, 14, 2);
        ctx.fill();

        // Label with icon
        ctx.save();
        this.applyZDepth(ctx, offLabel.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = this.getSubPartColor(config, 'metrics', 'label', textMuted);
        ctx.font = this.getSubPartFont(config, 'metrics', 'label', 'bold', 12);
        ctx.letterSpacing = '0.5px';
        const labelText = m.icon ? `${m.icon}  ${m.label.toUpperCase()}` : m.label.toUpperCase();
        ctx.fillText(labelText, x + 28 + offLabel.x, ry + rowH / 2 + 5 + offLabel.y);
        ctx.restore();

        // Right value
        ctx.save();
        this.applyZDepth(ctx, offVal.z);
        ctx.textAlign = 'right';
        ctx.fillStyle = this.getSubPartColor(config, 'metrics', 'val', text);
        ctx.font = this.getSubPartFont(config, 'metrics', 'val', 'bold', 18);
        ctx.fillText(m.val, x + width - 18 + offVal.x, ry + rowH / 2 + 6 + offVal.y);
        ctx.restore();
      });

      ctx.restore();
      return y + totalH;
    }

    if (design === 'vertical-pill-stack') {
      // Style: Vertical Capsule Pills (Floating pill cards with circular icon badge & prominent values)
      const vertCount = Math.min(displayMetrics.length, 6);
      const pillGap = 8;
      const pillH = Math.max(38, Math.floor(((customH || (vertCount * 48 + (vertCount - 1) * pillGap)) - (vertCount - 1) * pillGap) / vertCount));
      const totalH = vertCount * pillH + (vertCount - 1) * pillGap;
      this.recordBounds('metrics', 'Secondary Metrics', x, y, width, totalH);

      displayMetrics.slice(0, vertCount).forEach((m, idx) => {
        const py = y + idx * (pillH + pillGap);
        this.drawRoundedRect(ctx, x, py, width, pillH, pillH / 2);
        ctx.fillStyle = cardStyle === 'solid' ? '#14141e' : 'rgba(20, 24, 34, 0.82)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Left circular icon badge
        const badgeRadius = Math.max(12, pillH / 2 - 5);
        const badgeCx = x + 8 + badgeRadius;
        const badgeCy = py + pillH / 2;
        ctx.beginPath();
        ctx.arc(badgeCx, badgeCy, badgeRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.fill();
        ctx.strokeStyle = elAccent;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.font = '12px sans-serif';
        ctx.fillText(m.icon || '⚡', badgeCx, badgeCy + 4);

        // Center-left label
        ctx.save();
        this.applyZDepth(ctx, offLabel.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = this.getSubPartColor(config, 'metrics', 'label', textMuted);
        ctx.font = this.getSubPartFont(config, 'metrics', 'label', 'bold', 11);
        ctx.fillText(m.label.toUpperCase(), badgeCx + badgeRadius + 10 + offLabel.x, py + pillH / 2 + 4 + offLabel.y);
        ctx.restore();

        // Right value
        ctx.save();
        this.applyZDepth(ctx, offVal.z);
        ctx.textAlign = 'right';
        ctx.fillStyle = this.getSubPartColor(config, 'metrics', 'val', elAccent);
        ctx.font = this.getSubPartFont(config, 'metrics', 'val', 'bold', 16);
        ctx.fillText(m.val, x + width - 18 + offVal.x, py + pillH / 2 + 5 + offVal.y);
        ctx.restore();
      });

      ctx.restore();
      return y + totalH;
    }

    if (design === 'vertical-timeline-flow') {
      // Style: Vertical Telemetry Timeline (Glowing vertical axis line with node points for each metric)
      const vertCount = Math.min(displayMetrics.length, 6);
      const rowH = Math.max(40, Math.floor((customH || (vertCount * 46)) / vertCount));
      const totalH = vertCount * rowH;
      this.recordBounds('metrics', 'Secondary Metrics', x, y, width, totalH);

      if (cardStyle !== 'floating' && !this.isTextOnly(config, 'metrics')) {
        this.drawCardBackground(ctx, x, y, width, totalH, config, theme);
      }

      // Continuous vertical timeline wire
      const axisX = x + 30;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(axisX, y + 16);
      ctx.lineTo(axisX, y + totalH - 16);
      ctx.stroke();

      displayMetrics.slice(0, vertCount).forEach((m, idx) => {
        const ry = y + idx * rowH;
        const nodeY = ry + rowH / 2;

        // Glowing node ring
        ctx.save();
        ctx.shadowColor = elAccent;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(axisX, nodeY, 6, 0, Math.PI * 2);
        ctx.fillStyle = elAccent;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(axisX, nodeY, 9, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();

        // Label above / beside
        ctx.save();
        this.applyZDepth(ctx, offLabel.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = this.getSubPartColor(config, 'metrics', 'label', textMuted);
        ctx.font = this.getSubPartFont(config, 'metrics', 'label', 'bold', 10);
        ctx.fillText(`[ 0${idx + 1} ] // ${m.label.toUpperCase()}`, axisX + 18 + offLabel.x, nodeY - 4 + offLabel.y);
        ctx.restore();

        // Right value (large bold telemetry value)
        ctx.save();
        this.applyZDepth(ctx, offVal.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = this.getSubPartColor(config, 'metrics', 'val', text);
        ctx.font = this.getSubPartFont(config, 'metrics', 'val', 'bold', 18);
        ctx.fillText(m.val, axisX + 18 + offVal.x, nodeY + 16 + offVal.y);
        ctx.restore();
      });

      ctx.restore();
      return y + totalH;
    }

    if (design === 'vertical-data-ladder') {
      // Style: Vertical Telemetry Ladder (Stepped brackets, index indicators [01], mono labels, bold metrics)
      const vertCount = Math.min(displayMetrics.length, 6);
      const rowH = Math.max(34, Math.floor((customH || (vertCount * 40)) / vertCount));
      const totalH = vertCount * rowH;
      this.recordBounds('metrics', 'Secondary Metrics', x, y, width, totalH);

      if (cardStyle !== 'floating' && !this.isTextOnly(config, 'metrics')) {
        this.drawCardBackground(ctx, x, y, width, totalH, config, theme);
      }

      displayMetrics.slice(0, vertCount).forEach((m, idx) => {
        const ry = y + idx * rowH;

        // Step index badge [01]
        ctx.textAlign = 'left';
        ctx.fillStyle = elAccent;
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`[0${idx + 1}]`, x + 16, ry + rowH / 2 + 4);

        // Metric label
        ctx.save();
        this.applyZDepth(ctx, offLabel.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = this.getSubPartColor(config, 'metrics', 'label', textMuted);
        ctx.font = this.getSubPartFont(config, 'metrics', 'label', 'bold', 11);
        const lText = m.label.toUpperCase();
        ctx.fillText(lText, x + 54 + offLabel.x, ry + rowH / 2 + 4 + offLabel.y);
        const lWidth = ctx.measureText(lText).width;
        ctx.restore();

        // Value text
        ctx.save();
        this.applyZDepth(ctx, offVal.z);
        ctx.textAlign = 'right';
        ctx.fillStyle = this.getSubPartColor(config, 'metrics', 'val', text);
        ctx.font = this.getSubPartFont(config, 'metrics', 'val', 'bold', 17);
        const vText = m.val;
        const vWidth = ctx.measureText(vText).width;
        ctx.fillText(vText, x + width - 16 + offVal.x, ry + rowH / 2 + 5 + offVal.y);
        ctx.restore();

        // Dotted leader line between label and value
        const dotStart = x + 62 + lWidth;
        const dotEnd = x + width - 24 - vWidth;
        if (dotEnd > dotStart + 10) {
          ctx.save();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 5]);
          ctx.beginPath();
          ctx.moveTo(dotStart, ry + rowH / 2 + 2);
          ctx.lineTo(dotEnd, ry + rowH / 2 + 2);
          ctx.stroke();
          ctx.restore();
        }
      });

      ctx.restore();
      return y + totalH;
    }

    if (design === 'vertical-athletic-cards') {
      // Style: Vertical Athletic Cards (Stacked bordered cards with rank badges #1, #2, sub-labels, and bold numbers)
      const vertCount = Math.min(displayMetrics.length, 6);
      const cardGap = 8;
      const cardH_item = Math.max(42, Math.floor(((customH || (vertCount * 52 + (vertCount - 1) * cardGap)) - (vertCount - 1) * cardGap) / vertCount));
      const totalH = vertCount * cardH_item + (vertCount - 1) * cardGap;
      this.recordBounds('metrics', 'Secondary Metrics', x, y, width, totalH);

      displayMetrics.slice(0, vertCount).forEach((m, idx) => {
        const cy = y + idx * (cardH_item + cardGap);
        this.drawRoundedRect(ctx, x, cy, width, cardH_item, 8);
        ctx.fillStyle = cardStyle === 'solid' ? '#12121a' : 'rgba(18, 18, 28, 0.85)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Left accent bar
        ctx.fillStyle = elAccent;
        this.drawRoundedRect(ctx, x + 2, cy + 6, 4, cardH_item - 12, 2);
        ctx.fill();

        // Rank pill badge `#01`
        this.drawRoundedRect(ctx, x + 14, cy + (cardH_item - 22) / 2, 28, 22, 4);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fill();
        ctx.textAlign = 'center';
        ctx.fillStyle = elAccent;
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`#0${idx + 1}`, x + 28, cy + (cardH_item - 22) / 2 + 15);

        // Label
        ctx.save();
        this.applyZDepth(ctx, offLabel.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = this.getSubPartColor(config, 'metrics', 'label', textMuted);
        ctx.font = this.getSubPartFont(config, 'metrics', 'label', 'bold', 11);
        ctx.fillText(m.label.toUpperCase(), x + 50 + offLabel.x, cy + cardH_item / 2 + 4 + offLabel.y);
        ctx.restore();

        // Value
        ctx.save();
        this.applyZDepth(ctx, offVal.z);
        ctx.textAlign = 'right';
        ctx.fillStyle = this.getSubPartColor(config, 'metrics', 'val', text);
        ctx.font = this.getSubPartFont(config, 'metrics', 'val', 'bold', 18);
        ctx.fillText(m.val, x + width - 16 + offVal.x, cy + cardH_item / 2 + 5 + offVal.y);
        ctx.restore();
      });

      ctx.restore();
      return y + totalH;
    }

    if (design === 'strip') {
      if (cardStyle !== 'floating') {
        this.drawCardBackground(ctx, x, y, width, cardH, config, theme);
      }
      const colW = width / displayMetrics.length;

      displayMetrics.forEach((m, idx) => {
        const cx = x + idx * colW + colW / 2;
        ctx.textAlign = 'center';
        ctx.fillStyle = this.getSubPartColor(config, 'metrics', 'label', textMuted);
        ctx.font = this.getSubPartFont(config, 'metrics', 'label', '600', 12);
        ctx.fillText(m.label, cx, y + 26);

        ctx.fillStyle = this.getSubPartColor(config, 'metrics', 'val', text);
        ctx.font = this.getSubPartFont(config, 'metrics', 'val', 'bold', 22);
        ctx.fillText(m.val, cx, y + 60);

        if (idx < displayMetrics.length - 1) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
          ctx.beginPath();
          ctx.moveTo(x + (idx + 1) * colW, y + 15);
          ctx.lineTo(x + (idx + 1) * colW, y + cardH - 15);
          ctx.stroke();
        }
      });

      ctx.restore();
      return y + cardH;
    }

    if (design === 'badges') {
      const cardGap = 10;
      const itemW = (width - cardGap * (displayMetrics.length - 1)) / displayMetrics.length;

      displayMetrics.forEach((m, idx) => {
        const itemX = x + idx * (itemW + cardGap);
        this.drawRoundedRect(ctx, itemX, y, itemW, cardH, 20);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fill();
        ctx.strokeStyle = elAccent;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.fillStyle = elAccent;
        ctx.font = this.getSubPartFont(config, 'metrics', 'label', 'bold', 11);
        ctx.fillText(m.label, itemX + itemW / 2, y + 25);

        ctx.fillStyle = text;
        ctx.font = this.getSubPartFont(config, 'metrics', 'val', 'bold', 20);
        ctx.fillText(m.val, itemX + itemW / 2, y + 57);
      });

      ctx.restore();
      return y + cardH;
    }

    // Default 'grid' & 'compact':
    const cardGap = 12;
    const itemW = (width - cardGap * (displayMetrics.length - 1)) / displayMetrics.length;

    displayMetrics.forEach((m, idx) => {
      const itemX = x + idx * (itemW + cardGap);
      if (cardStyle !== 'floating') {
        this.drawCardBackground(ctx, itemX, y, itemW, cardH, config, theme);
      }

      ctx.save();
      this.applyZDepth(ctx, offLabel.z);
      ctx.textAlign = 'center';
      ctx.fillStyle = this.getSubPartColor(config, 'metrics', 'label', textMuted);
      ctx.font = this.getSubPartFont(config, 'metrics', 'label', 'bold', 11);
      ctx.letterSpacing = '0.5px';
      ctx.fillText(m.label, itemX + itemW / 2 + offLabel.x, y + 26 + offLabel.y);
      ctx.restore();

      ctx.save();
      this.applyZDepth(ctx, offVal.z);
      ctx.textAlign = 'center';
      ctx.fillStyle = this.getSubPartColor(config, 'metrics', 'val', text);
      ctx.font = this.getSubPartFont(config, 'metrics', 'val', 'bold', 22);
      ctx.fillText(m.val, itemX + itemW / 2 + offVal.x, y + 58 + offVal.y);
      ctx.restore();
    });

    ctx.restore();
    return y + cardH;
  }

  // =========================================================================
  // WIDGET 5: SPLITS BAR CHART
  // Designs: 'vertical-bars', 'horizontal-bars', 'speed-dots', 'pace-table', 'split-bubbles'
  // =========================================================================
  drawSplitsBarChart(ctx, x, y, width, activity, config, theme, accent, chartH = 150) {
    const isLapSource = config.splitDataSource === 'laps' && activity.hasLaps;
    const items = isLapSource ? activity.laps : activity.splits;

    if (!items || items.length === 0) return y;

    ctx.save();
    const elStyle = this.getElementStyle(config, 'splits');
    const { text, textMuted, accent: elAccent, cardStyle, align, opacity } = this.getEffectiveColors(config, theme, accent, 'splits');
    if (opacity < 1) ctx.globalAlpha = opacity;
    accent = elAccent;

    const font = this.getFontFamily(elStyle.fontFamily !== 'default' ? elStyle.fontFamily : config.fontFamily);
    const design = config.splitsDesign || 'vertical-bars';
    this.recordBounds('splits', 'Splits Chart', x, y, width, chartH);

    if (cardStyle !== 'floating') {
      this.drawWidgetCardBg(ctx, 'splits', x, y, width, chartH, config, theme);
    }

    const offTitle = this.getElementOffset(config, 'splits', 'title');
    const offBadge = this.getElementOffset(config, 'splits', 'badge');
    const offTable = this.getElementOffset(config, 'splits', 'table');

    const padX = 20;
    const titleY = y + 26;
    const defaultTitle = isLapSource ? `WORKOUT LAPS (${items.length} TOTAL)` : `SPLITS (${activity.splitDistanceMeters ? (activity.splitDistanceMeters / 1000) + 'KM' : '1KM'} • ${items.length} TOTAL)`;
    const chartTitle = this.getTextOverride(config, 'splits', 'title', config.splitCustomTitle || defaultTitle);

    if (!offTitle.hidden && chartTitle) {
      this.applyZDepth(ctx, offTitle.z);
      ctx.textAlign = 'left';
      ctx.fillStyle = textMuted;
      ctx.font = this.getSubPartFont(config, 'splits', 'title', 'bold', 13);
      ctx.letterSpacing = '1px';
      ctx.fillText(chartTitle, x + padX + offTitle.x, titleY + offTitle.y);
    }

    const showFastest = config.splitHighlightFastest !== false;
    const fastest = showFastest ? items.find((it) => it.isFastest) : null;
    if (fastest && !offBadge.hidden) {
      this.applyZDepth(ctx, offBadge.z);
      ctx.textAlign = 'right';
      ctx.fillStyle = elAccent;
      ctx.font = this.getSubPartFont(config, 'splits', 'badge', 'bold', 12);
      ctx.fillText(`⚡ FASTEST: ${fastest.shortName} (${fastest.paceFormatted.split(' ')[0]})`, x + width - padX + offBadge.x, titleY + offBadge.y);
    }

    if (offTable.hidden) {
      ctx.restore();
      return y + chartH;
    }

    if (design === 'speed-dots') {
      // Style 3: Connected Pace Dots (Displays ALL splits)
      const dotAreaY = y + 45;
      const dotAreaH = chartH - 70;
      const dotAreaW = width - padX * 2;

      let minP = Infinity, maxP = 0;
      items.forEach((it) => {
        if (it.pace > 0) {
          if (it.pace < minP) minP = it.pace;
          if (it.pace > maxP) maxP = it.pace;
        }
      });
      if (minP === Infinity) minP = 240;
      if (maxP <= minP) maxP = minP + 60;

      const isAnim = activity.isAnimated && items.some((it) => it.isCompleted !== undefined);
      const stepX = dotAreaW / Math.max(1, items.length - 1);

      // Background path (dim if animating, full accent if static)
      ctx.beginPath();
      items.forEach((it, idx) => {
        const dx = x + padX + idx * stepX;
        const dy = dotAreaY + (it.pace - minP) / (maxP - minP || 1) * dotAreaH;
        if (idx === 0) ctx.moveTo(dx, dy);
        else ctx.lineTo(dx, dy);
      });
      ctx.strokeStyle = isAnim ? 'rgba(255, 255, 255, 0.15)' : elAccent;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Active completed line up to current segment
      if (isAnim) {
        ctx.beginPath();
        let started = false;
        items.forEach((it, idx) => {
          if (it.isCompleted || it.isCurrent) {
            const dx = x + padX + idx * stepX;
            const dy = dotAreaY + (it.pace - minP) / (maxP - minP || 1) * dotAreaH;
            if (!started) { ctx.moveTo(dx, dy); started = true; }
            else ctx.lineTo(dx, dy);
          }
        });
        if (started) {
          ctx.strokeStyle = elAccent;
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      }

      // Draw dots and labels
      const labelStep = items.length > 20 ? 4 : items.length > 10 ? 2 : 1;
      items.forEach((it, idx) => {
        const dx = x + padX + idx * stepX;
        const dy = dotAreaY + (it.pace - minP) / (maxP - minP || 1) * dotAreaH;

        if (isAnim && it.isPending) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.beginPath(); ctx.arc(dx, dy, 3, 0, Math.PI * 2); ctx.fill();
        } else if (isAnim && it.isCurrent) {
          ctx.fillStyle = elAccent;
          ctx.shadowColor = elAccent;
          ctx.shadowBlur = 10;
          ctx.beginPath(); ctx.arc(dx, dy, 7, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = it.isFastest && showFastest ? elAccent : text;
          ctx.beginPath(); ctx.arc(dx, dy, it.isFastest && showFastest ? 6 : 4, 0, Math.PI * 2); ctx.fill();
        }

        if (idx % labelStep === 0 || (it.isFastest && showFastest) || (isAnim && it.isCurrent) || idx === items.length - 1) {
          ctx.textAlign = 'center';
          ctx.fillStyle = (isAnim && it.isCurrent) ? elAccent : (it.isFastest && showFastest ? elAccent : textMuted);
          ctx.font = this.getSubPartFont(config, 'splits', 'table', 'bold', 10);
          ctx.fillText(it.shortName, dx, dotAreaY + dotAreaH + 16);
        }
      });

      ctx.restore();
      return y + chartH;
    }

    if (design === 'pace-delta-bars') {
      // Style 6: Bi-directional +/- Delta Bar Equalizer
      const count = items.length;
      const avgPace = activity.avgPace || 0;
      const isCustomPos = config.widgetPositions && config.widgetPositions['splits'];
      const effectiveH = isCustomPos ? chartH : Math.max(chartH, Math.min(460, 56 + count * 22));
      const isAnim = activity.isAnimated && items.some((it) => it.isCompleted !== undefined);
      this.recordBounds('splits', 'Splits Chart', x, y, width, effectiveH);

      if (!isCustomPos && cardStyle !== 'floating') {
        ctx.clearRect(x, y, width, effectiveH);
        this.drawCardBackground(ctx, x, y, width, effectiveH, config, theme);
        ctx.textAlign = 'left';
        ctx.fillStyle = textMuted;
        ctx.font = this.getSubPartFont(config, 'splits', 'title', 'bold', 13);
        ctx.letterSpacing = '1px';
        ctx.fillText(chartTitle, x + padX + offTitle.x, titleY + offTitle.y);
        if (fastest) {
          ctx.textAlign = 'right';
          ctx.fillStyle = elAccent;
          ctx.font = this.getSubPartFont(config, 'splits', 'badge', 'bold', 12);
          ctx.fillText(`⚡ FASTEST: ${fastest.shortName} (${fastest.paceFormatted.split(' ')[0]})`, x + width - padX + offBadge.x, titleY + offBadge.y);
        }
      }

      const tableW = width - padX * 2;
      const tableStartY = y + 46;
      const availableH = effectiveH - 54;
      const rowH = Math.min(22, Math.max(14, availableH / count));
      const midX = x + padX + tableW * 0.62;
      const maxBarSpan = tableW * 0.26;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(midX, tableStartY); ctx.lineTo(midX, tableStartY + count * rowH);
      ctx.stroke();
      ctx.setLineDash([]);

      items.forEach((it, idx) => {
        const ry = tableStartY + idx * rowH;
        const deltaSec = avgPace > 0 && it.pace > 0 ? Math.round(it.pace - avgPace) : 0;
        const splitCustom = (config.splitCustomLabels && config.splitCustomLabels[it.index]) || it.name || ('Split ' + it.shortName);

        if (isAnim && it.isCurrent) {
          ctx.fillStyle = 'rgba(204, 255, 0, 0.12)';
          ctx.fillRect(x + padX, ry, tableW, rowH);
        }

        ctx.textAlign = 'left';
        ctx.fillStyle = (isAnim && it.isCurrent) ? elAccent : (it.isFastest && showFastest ? elAccent : (isAnim && it.isPending ? 'rgba(255, 255, 255, 0.3)' : text));
        ctx.font = this.getSubPartFont(config, 'splits', 'table', 'bold', 11);
        ctx.fillText(`${splitCustom}${(isAnim && it.isCurrent) ? ' 🏃 LIVE' : (it.isFastest && showFastest ? ' ⚡' : '')}`, x + padX, ry + rowH * 0.72);

        ctx.textAlign = 'left';
        ctx.fillStyle = (isAnim && it.isPending) ? 'rgba(255, 255, 255, 0.25)' : textMuted;
        ctx.font = this.getSubPartFont(config, 'splits', 'table', '500', 11);
        const paceStr = isAnim && it.isPending ? '--:--' : (isAnim && it.isCurrent && it.displayPaceFormatted ? it.displayPaceFormatted.split(' ')[0] : it.paceFormatted.split(' ')[0]);
        ctx.fillText(paceStr, x + padX + 80, ry + rowH * 0.72);

        if (!isAnim || !it.isPending) {
          const rawBarLen = Math.min(maxBarSpan, Math.abs(deltaSec) * 3);
          const barLen = isAnim && it.isCurrent ? Math.max(3, rawBarLen * (it.splitProgress || 0.1)) : rawBarLen;
          if (deltaSec < 0) {
            ctx.fillStyle = elAccent;
            this.drawRoundedRect(ctx, midX - barLen, ry + 4, barLen, rowH - 8, 2);
            ctx.fill();
            ctx.textAlign = 'right';
            ctx.fillText(`-${Math.abs(deltaSec)}s`, midX - barLen - 6, ry + rowH * 0.72);
          } else if (deltaSec > 0) {
            ctx.fillStyle = '#ff5555';
            this.drawRoundedRect(ctx, midX, ry + 4, barLen, rowH - 8, 2);
            ctx.fill();
            ctx.textAlign = 'left';
            ctx.fillText(`+${deltaSec}s`, midX + barLen + 6, ry + rowH * 0.72);
          } else {
            ctx.textAlign = 'center';
            ctx.fillStyle = textMuted;
            ctx.fillText('EVEN', midX, ry + rowH * 0.72);
          }
        }
      });

      ctx.restore();
      return y + effectiveH;
    }

    if (design === 'card-grid') {
      // Style 7: Compact Multi-Card Split Tiles
      const count = items.length;
      const isCustomPos = config.widgetPositions && config.widgetPositions['splits'];
      const cols = count <= 6 ? 2 : count <= 12 ? 3 : 4;
      const rows = Math.ceil(count / cols);
      const gap = 8;
      const tileW = (width - padX * 2 - (cols - 1) * gap) / cols;
      const tileH = 50;
      const gridAreaY = y + 42;
      const totalGridH = rows * (tileH + gap) + 48;
      const effectiveH = isCustomPos ? chartH : Math.min(500, Math.max(chartH, totalGridH));
      const isAnim = activity.isAnimated && items.some((it) => it.isCompleted !== undefined);
      this.recordBounds('splits', 'Splits Chart', x, y, width, effectiveH);

      if (!isCustomPos && cardStyle !== 'floating') {
        ctx.clearRect(x, y, width, effectiveH);
        this.drawCardBackground(ctx, x, y, width, effectiveH, config, theme);
        ctx.textAlign = 'left';
        ctx.fillStyle = textMuted;
        ctx.font = this.getSubPartFont(config, 'splits', 'title', 'bold', 13);
        ctx.letterSpacing = '1px';
        ctx.fillText(chartTitle, x + padX + offTitle.x, titleY + offTitle.y);
        if (fastest) {
          ctx.textAlign = 'right';
          ctx.fillStyle = elAccent;
          ctx.font = this.getSubPartFont(config, 'splits', 'badge', 'bold', 12);
          ctx.fillText(`⚡ FASTEST: ${fastest.shortName} (${fastest.paceFormatted.split(' ')[0]})`, x + width - padX + offBadge.x, titleY + offBadge.y);
        }
      }

      items.forEach((it, idx) => {
        const c = idx % cols;
        const r = Math.floor(idx / cols);
        const tx = x + padX + c * (tileW + gap);
        const ty = gridAreaY + r * (tileH + gap);
        if (ty + tileH > y + effectiveH) return;

        this.drawRoundedRect(ctx, tx, ty, tileW, tileH, 8);
        if (isAnim && it.isPending) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.textAlign = 'left';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
          ctx.font = this.getSubPartFont(config, 'splits', 'table', 'bold', 10);
          ctx.fillText(`SPLIT ${it.shortName}`, tx + 8, ty + 18);

          ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.font = this.getSubPartFont(config, 'splits', 'table', 'bold', 15);
          ctx.fillText('--:--', tx + 8, ty + 38);
          return;
        }

        if (isAnim && it.isCurrent) {
          ctx.fillStyle = 'rgba(204, 255, 0, 0.14)';
          ctx.fill();
          ctx.strokeStyle = elAccent;
          ctx.lineWidth = 1.5;
          ctx.shadowColor = elAccent;
          ctx.shadowBlur = 8;
          ctx.stroke();
          ctx.shadowBlur = 0;

          ctx.textAlign = 'left';
          ctx.fillStyle = elAccent;
          ctx.font = this.getSubPartFont(config, 'splits', 'table', 'bold', 10);
          ctx.fillText(`SPLIT ${it.shortName} ● LIVE`, tx + 8, ty + 18);

          ctx.fillStyle = '#ffffff';
          ctx.font = this.getSubPartFont(config, 'splits', 'table', 'bold', 15);
          ctx.fillText((it.displayPaceFormatted || it.paceFormatted).split(' ')[0], tx + 8, ty + 38);

          ctx.textAlign = 'right';
          ctx.fillStyle = elAccent;
          ctx.font = this.getSubPartFont(config, 'splits', 'table', 'bold', 11);
          ctx.fillText(it.displayTimeFormatted, tx + tileW - 8, ty + 24);
          if (it.avgHr) {
            ctx.fillStyle = '#ef4444';
            ctx.fillText(`${activity.liveHr || it.avgHr} bpm`, tx + tileW - 8, ty + 38);
          }
          return;
        }

        ctx.fillStyle = it.isFastest && showFastest ? 'rgba(204, 255, 0, 0.12)' : 'rgba(255, 255, 255, 0.05)';
        ctx.fill();
        ctx.strokeStyle = it.isFastest && showFastest ? elAccent : 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.textAlign = 'left';
        ctx.fillStyle = it.isFastest && showFastest ? elAccent : textMuted;
        ctx.font = this.getSubPartFont(config, 'splits', 'table', 'bold', 10);
        ctx.fillText(`SPLIT ${it.shortName}${it.isFastest && showFastest ? ' ⚡' : ''}`, tx + 8, ty + 18);

        ctx.fillStyle = text;
        ctx.font = this.getSubPartFont(config, 'splits', 'table', 'bold', 15);
        ctx.fillText(it.paceFormatted.split(' ')[0], tx + 8, ty + 38);

        ctx.textAlign = 'right';
        ctx.fillStyle = textMuted;
        ctx.font = this.getSubPartFont(config, 'splits', 'table', '500', 11);
        ctx.fillText(it.timeFormatted, tx + tileW - 8, ty + 24);
        if (it.avgHr) {
          ctx.fillText(`${it.avgHr} bpm`, tx + tileW - 8, ty + 38);
        }
      });

      ctx.restore();
      return y + effectiveH;
    }

    if (design === 'pace-table') {
      // Style 4: Clean Single-Column Split Breakdown Table with customizable columns & +/- Delta
      const count = items.length;
      const avgPace = activity.avgPace || 0;
      const isCustomPos = config.widgetPositions && config.widgetPositions['splits'];
      const effectiveH = isCustomPos ? chartH : Math.max(chartH, Math.min(460, 56 + count * 22));
      const isAnim = activity.isAnimated && items.some((it) => it.isCompleted !== undefined);

      // Re-record bounding box with effective height
      this.recordBounds('splits', 'Splits Chart', x, y, width, effectiveH);

      // Card Background if dynamic height changed
      if (!isCustomPos && cardStyle !== 'floating') {
        ctx.clearRect(x, y, width, effectiveH);
        this.drawWidgetCardBg(ctx, 'splits', x, y, width, effectiveH, config, theme);
        // Redraw title
        this.applyZDepth(ctx, offTitle.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = textMuted;
        ctx.font = this.getSubPartFont(config, 'splits', 'title', 'bold', 13);
        ctx.letterSpacing = '1px';
        ctx.fillText(chartTitle, x + padX + offTitle.x, titleY + offTitle.y);
        if (fastest) {
          this.applyZDepth(ctx, offBadge.z);
          ctx.textAlign = 'right';
          ctx.fillStyle = elAccent;
          ctx.font = this.getSubPartFont(config, 'splits', 'badge', 'bold', 12);
          ctx.fillText(`⚡ FASTEST: ${fastest.shortName} (${fastest.paceFormatted.split(' ')[0]})`, x + width - padX + offBadge.x, titleY + offBadge.y);
        }
      }

      const tableW = width - padX * 2;
      const headerY = y + 44 + offTable.y;

      // Customizable columns configuration:
      const splitCols = config.splitColumns || { time: true, pace: true, delta: true };
      const colDefs = [
        { key: 'split', title: this.getTextOverride(config, 'splits', 'headerSplit', 'SPLIT'), align: 'left', flex: 1.2 },
      ];
      if (splitCols.time !== false) colDefs.push({ key: 'time', title: this.getTextOverride(config, 'splits', 'headerTime', 'TIME'), align: 'center', flex: 1.0 });
      if (splitCols.pace !== false) colDefs.push({ key: 'pace', title: this.getTextOverride(config, 'splits', 'headerPace', 'PACE'), align: 'right', flex: 1.0 });
      if (splitCols.delta !== false) colDefs.push({ key: 'delta', title: this.getTextOverride(config, 'splits', 'headerDelta', '+/- DELTA'), align: 'right', flex: 1.0 });
      if (splitCols.avgHr) colDefs.push({ key: 'avgHr', title: this.getTextOverride(config, 'splits', 'headerHr', 'AVG HR'), align: 'right', flex: 0.9 });
      if (splitCols.maxHr) colDefs.push({ key: 'maxHr', title: this.getTextOverride(config, 'splits', 'headerMaxHr', 'MAX HR'), align: 'right', flex: 0.9 });
      if (splitCols.minHr) colDefs.push({ key: 'minHr', title: this.getTextOverride(config, 'splits', 'headerMinHr', 'MIN HR'), align: 'right', flex: 0.9 });
      if (splitCols.cadence) colDefs.push({ key: 'cadence', title: this.getTextOverride(config, 'splits', 'headerCad', 'CADENCE'), align: 'right', flex: 0.9 });
      if (splitCols.elevation) colDefs.push({ key: 'elevation', title: this.getTextOverride(config, 'splits', 'headerElev', 'ELEV'), align: 'right', flex: 0.8 });

      const totalFlex = colDefs.reduce((acc, c) => acc + c.flex, 0);

      let curColX = x + padX;
      const computedCols = colDefs.map((c) => {
        const cW = (c.flex / totalFlex) * tableW;
        const posX = c.align === 'left' ? curColX : c.align === 'center' ? curColX + cW / 2 : curColX + cW;
        const res = { ...c, width: cW, posX, startX: curColX };
        curColX += cW;
        return res;
      });

      // Table Column Headers
      ctx.fillStyle = textMuted;
      ctx.font = this.getSubPartFont(config, 'splits', 'table', '600', 10);
      ctx.letterSpacing = '0.5px';
      computedCols.forEach((col) => {
        ctx.textAlign = col.align;
        ctx.fillText(col.title, col.posX, headerY);
      });

      // Subtle Divider
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + padX, headerY + 6);
      ctx.lineTo(x + width - padX, headerY + 6);
      ctx.stroke();

      const tableStartY = headerY + 12;
      const availableH = effectiveH - (tableStartY - y) - 8;
      const rowH = Math.min(22, Math.max(14, availableH / count));
      const fontSize = Math.min(12, Math.max(9, Math.round(rowH * 0.58)));

      items.forEach((it, idx) => {
        const ry = tableStartY + idx * rowH;

        if (isAnim && it.isCurrent) {
          ctx.fillStyle = 'rgba(204, 255, 0, 0.12)';
          ctx.fillRect(x + padX - 4, ry, tableW + 8, rowH);
          ctx.strokeStyle = elAccent;
          ctx.lineWidth = 1;
          ctx.strokeRect(x + padX - 4, ry, tableW + 8, rowH);
        } else if (idx % 2 === 1) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
          ctx.fillRect(x + padX - 4, ry, tableW + 8, rowH);
        }

        const deltaSec = avgPace > 0 && it.pace > 0 ? Math.round(it.pace - avgPace) : 0;
        let deltaStr = 'EVEN';
        let deltaColor = textMuted;
        if (isAnim && it.isPending) {
          deltaStr = '--';
        } else if (deltaSec < 0) {
          const abs = Math.abs(deltaSec);
          const m = Math.floor(abs / 60);
          const s = abs % 60;
          deltaStr = m > 0 ? `-${m}:${String(s).padStart(2, '0')}` : `-${s}s`;
          deltaColor = elAccent;
        } else if (deltaSec > 0) {
          const m = Math.floor(deltaSec / 60);
          const s = deltaSec % 60;
          deltaStr = m > 0 ? `+${m}:${String(s).padStart(2, '0')}` : `+${s}s`;
          deltaColor = '#ff5555';
        }

        const splitCustom = (config.splitCustomLabels && config.splitCustomLabels[it.index]) || it.name || ('Split ' + it.shortName);

        computedCols.forEach((col) => {
          ctx.textAlign = col.align;
          let cellText = '';
          let cellColor = text;

          if (isAnim && it.isPending) {
            cellText = col.key === 'split' ? splitCustom : '--:--';
            cellColor = 'rgba(255, 255, 255, 0.25)';
          } else if (isAnim && it.isCurrent) {
            switch (col.key) {
              case 'split':
                cellText = `${splitCustom} 🏃 LIVE`;
                cellColor = elAccent;
                break;
              case 'time':
                cellText = it.displayTimeFormatted || it.timeFormatted;
                cellColor = elAccent;
                break;
              case 'pace':
                cellText = (it.displayPaceFormatted || it.paceFormatted).split(' ')[0];
                cellColor = elAccent;
                break;
              case 'delta':
                cellText = deltaStr;
                cellColor = deltaColor;
                break;
              case 'avgHr':
                cellText = activity.liveHr ? `${activity.liveHr} bpm` : (it.avgHr ? `${it.avgHr} bpm` : '--');
                cellColor = '#ef4444';
                break;
              case 'maxHr':
                cellText = it.maxHr ? `${it.maxHr} bpm` : '--';
                cellColor = text;
                break;
              case 'minHr':
                cellText = it.minHr ? `${it.minHr} bpm` : '--';
                cellColor = text;
                break;
              case 'cadence':
                cellText = it.avgCadence ? `${it.avgCadence} spm` : '--';
                cellColor = text;
                break;
              case 'elevation':
                cellText = typeof it.elevationGain === 'number' ? `+${it.elevationGain}m` : '--';
                cellColor = text;
                break;
            }
          } else {
            // Completed or standard view
            switch (col.key) {
              case 'split':
                cellText = `${splitCustom}${it.isFastest && showFastest ? ' ⚡' : ''}`;
                cellColor = it.isFastest && showFastest ? elAccent : text;
                break;
              case 'time':
                cellText = it.timeFormatted;
                cellColor = textMuted;
                break;
              case 'pace':
                cellText = it.paceFormatted.split(' ')[0];
                cellColor = it.isFastest && showFastest ? elAccent : text;
                break;
              case 'delta':
                cellText = deltaStr;
                cellColor = deltaColor;
                break;
              case 'avgHr':
                cellText = it.avgHr ? `${it.avgHr} bpm` : '--';
                cellColor = text;
                break;
              case 'maxHr':
                cellText = it.maxHr ? `${it.maxHr} bpm` : '--';
                cellColor = text;
                break;
              case 'minHr':
                cellText = it.minHr ? `${it.minHr} bpm` : '--';
                cellColor = text;
                break;
              case 'cadence':
                cellText = it.avgCadence ? `${it.avgCadence} spm` : '--';
                cellColor = text;
                break;
              case 'elevation':
                cellText = typeof it.elevationGain === 'number' ? `+${it.elevationGain}m` : '--';
                cellColor = text;
                break;
            }
          }

          ctx.fillStyle = cellColor;
          ctx.font = this.getSubPartFont(config, 'splits', 'table', (col.key === 'time' ? '500' : 'bold'), fontSize);
          ctx.fillText(cellText, col.posX, ry + rowH * 0.74);
        });
      });

      ctx.restore();
      return y + effectiveH;
    }

    if (design === 'split-bubbles') {
      // Style 5: Floating Rounded Split Bubbles (Displays ALL splits wrapped in rows)
      const count = items.length;
      const rows = count <= 8 ? 1 : count <= 16 ? 2 : 3;
      const perRow = Math.ceil(count / rows);
      const bubbleAreaY = y + 44;
      const gap = 4;
      const bubbleW = Math.min(54, (width - padX * 2 - (perRow - 1) * gap) / perRow);
      const bubbleH = Math.min(48, (chartH - 56 - (rows - 1) * gap) / rows);
      const isAnim = activity.isAnimated && items.some((it) => it.isCompleted !== undefined);

      items.forEach((it, idx) => {
        const row = Math.floor(idx / perRow);
        const col = idx % perRow;
        const bx = x + padX + col * (bubbleW + gap);
        const by = bubbleAreaY + row * (bubbleH + gap);

        this.drawRoundedRect(ctx, bx, by, bubbleW, bubbleH, Math.min(12, bubbleH / 2));
        if (isAnim && it.isPending) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
          ctx.stroke();

          ctx.textAlign = 'center';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
          ctx.font = this.getSubPartFont(config, 'splits', 'table', 'bold', 10);
          ctx.fillText(it.shortName, bx + bubbleW / 2, by + bubbleH * 0.38);

          ctx.fillText('--:--', bx + bubbleW / 2, by + bubbleH * 0.82);
          return;
        }

        if (isAnim && it.isCurrent) {
          ctx.fillStyle = elAccent;
          ctx.shadowColor = elAccent;
          ctx.shadowBlur = 10;
          ctx.fill();
          ctx.shadowBlur = 0;

          ctx.textAlign = 'center';
          ctx.fillStyle = '#000000';
          ctx.font = this.getSubPartFont(config, 'splits', 'table', 'bold', 10);
          ctx.fillText(`${it.shortName} ●`, bx + bubbleW / 2, by + bubbleH * 0.38);

          ctx.fillStyle = '#000000';
          ctx.font = this.getSubPartFont(config, 'splits', 'table', 'bold', 11);
          ctx.fillText((it.displayPaceFormatted || it.paceFormatted).split(' ')[0], bx + bubbleW / 2, by + bubbleH * 0.82);
          return;
        }

        ctx.fillStyle = (it.isFastest && showFastest) ? elAccent : 'rgba(255, 255, 255, 0.08)';
        ctx.fill();

        ctx.textAlign = 'center';
        ctx.fillStyle = (it.isFastest && showFastest) ? '#000000' : textMuted;
        ctx.font = this.getSubPartFont(config, 'splits', 'table', 'bold', 10);
        ctx.fillText(it.shortName, bx + bubbleW / 2, by + bubbleH * 0.38);

        ctx.fillStyle = (it.isFastest && showFastest) ? '#000000' : text;
        ctx.font = this.getSubPartFont(config, 'splits', 'table', 'bold', 11);
        ctx.fillText(it.paceFormatted.split(' ')[0], bx + bubbleW / 2, by + bubbleH * 0.82);
      });

      ctx.restore();
      return y + chartH;
    }

    if (design === 'vertical-split-cards') {
      // Style: Vertical Split Cards (Stacked interval tiles with delta)
      const count = Math.min(items.length, 8);
      const isCustomPos = config.widgetPositions && config.widgetPositions['splits'];
      const cardGap = 6;
      const availableH = chartH - 46;
      const rowH = Math.max(26, Math.floor((availableH - (count - 1) * cardGap) / count));
      const totalH = 46 + count * rowH + (count - 1) * cardGap;
      const isAnim = activity.isAnimated && items.some((it) => it.isCompleted !== undefined);
      this.recordBounds('splits', 'Splits Chart', x, y, width, totalH);

      items.slice(0, count).forEach((it, idx) => {
        const ry = y + 42 + idx * (rowH + cardGap);
        this.drawRoundedRect(ctx, x + padX, ry, width - padX * 2, rowH, 6);

        if (isAnim && it.isPending) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.textAlign = 'left';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
          ctx.font = this.getSubPartFont(config, 'splits', 'table', 'bold', 11);
          ctx.fillText(it.shortName, x + padX + 12, ry + rowH / 2 + 4);

          ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.fillText('--:--', x + padX + 70, ry + rowH / 2 + 4);

          ctx.textAlign = 'right';
          ctx.fillText('--:--', x + width - padX - 12, ry + rowH / 2 + 4);
          return;
        }

        if (isAnim && it.isCurrent) {
          ctx.fillStyle = 'rgba(204, 255, 0, 0.12)';
          ctx.fill();
          ctx.strokeStyle = elAccent;
          ctx.lineWidth = 1.5;
          ctx.shadowColor = elAccent;
          ctx.shadowBlur = 6;
          ctx.stroke();
          ctx.shadowBlur = 0;

          ctx.textAlign = 'left';
          ctx.fillStyle = elAccent;
          ctx.font = this.getSubPartFont(config, 'splits', 'table', 'bold', 11);
          ctx.fillText(`${it.shortName} ● LIVE`, x + padX + 12, ry + rowH / 2 + 4);

          ctx.fillStyle = elAccent;
          ctx.font = '10px monospace';
          ctx.fillText(it.displayTimeFormatted, x + padX + 90, ry + rowH / 2 + 4);

          ctx.textAlign = 'right';
          ctx.fillStyle = '#ffffff';
          ctx.font = this.getSubPartFont(config, 'splits', 'table', 'bold', 12);
          ctx.fillText((it.displayPaceFormatted || it.paceFormatted).split(' ')[0], x + width - padX - 12, ry + rowH / 2 + 4);
          return;
        }

        ctx.fillStyle = it.isFastest && showFastest ? 'rgba(204, 255, 0, 0.12)' : 'rgba(255, 255, 255, 0.04)';
        ctx.fill();
        ctx.strokeStyle = it.isFastest && showFastest ? elAccent : 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.textAlign = 'left';
        ctx.fillStyle = it.isFastest && showFastest ? elAccent : text;
        ctx.font = this.getSubPartFont(config, 'splits', 'table', 'bold', 11);
        ctx.fillText(it.shortName, x + padX + 12, ry + rowH / 2 + 4);

        ctx.fillStyle = textMuted;
        ctx.font = '10px monospace';
        ctx.fillText(it.timeFormatted || '', x + padX + 70, ry + rowH / 2 + 4);

        ctx.textAlign = 'right';
        ctx.fillStyle = it.isFastest && showFastest ? elAccent : text;
        ctx.font = this.getSubPartFont(config, 'splits', 'table', 'bold', 12);
        ctx.fillText(it.paceFormatted.split(' ')[0], x + width - padX - 12, ry + rowH / 2 + 4);
      });

      ctx.restore();
      return y + totalH;
    }

    if (design === 'split-ladder-timeline') {
      // Style: Vertical Route Timeline (Mile/KM Route Wire)
      const count = Math.min(items.length, 8);
      const rowH = Math.max(28, Math.floor((chartH - 46) / count));
      const totalH = 46 + count * rowH;
      const isAnim = activity.isAnimated && items.some((it) => it.isCompleted !== undefined);
      this.recordBounds('splits', 'Splits Chart', x, y, width, totalH);

      const wireX = x + padX + 24;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(wireX, y + 42);
      ctx.lineTo(wireX, y + totalH - 12);
      ctx.stroke();

      items.slice(0, count).forEach((it, idx) => {
        const ry = y + 42 + idx * rowH + rowH / 2;

        if (isAnim && it.isPending) {
          ctx.beginPath();
          ctx.arc(wireX, ry, 3, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.fill();

          ctx.textAlign = 'left';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.font = this.getSubPartFont(config, 'splits', 'table', 'bold', 11);
          ctx.fillText(it.shortName, wireX + 14, ry + 4);

          ctx.textAlign = 'right';
          ctx.fillText('--:--', x + width - padX - 14, ry + 4);
          return;
        }

        if (isAnim && it.isCurrent) {
          ctx.beginPath();
          ctx.arc(wireX, ry, 6, 0, Math.PI * 2);
          ctx.fillStyle = elAccent;
          ctx.shadowColor = elAccent;
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;

          ctx.textAlign = 'left';
          ctx.fillStyle = elAccent;
          ctx.font = this.getSubPartFont(config, 'splits', 'table', 'bold', 11);
          ctx.fillText(`${it.shortName} ● RUNNING`, wireX + 14, ry + 4);

          ctx.textAlign = 'right';
          ctx.fillStyle = elAccent;
          ctx.font = this.getSubPartFont(config, 'splits', 'table', 'bold', 12);
          ctx.fillText((it.displayPaceFormatted || it.paceFormatted).split(' ')[0], x + width - padX - 14, ry + 4);
          return;
        }

        ctx.beginPath();
        ctx.arc(wireX, ry, it.isFastest && showFastest ? 5 : 3.5, 0, Math.PI * 2);
        ctx.fillStyle = it.isFastest && showFastest ? elAccent : '#ffffff';
        ctx.fill();

        ctx.textAlign = 'left';
        ctx.fillStyle = it.isFastest && showFastest ? elAccent : text;
        ctx.font = this.getSubPartFont(config, 'splits', 'table', 'bold', 11);
        ctx.fillText(it.shortName, wireX + 14, ry + 4);

        ctx.textAlign = 'right';
        ctx.fillStyle = text;
        ctx.font = this.getSubPartFont(config, 'splits', 'table', 'bold', 12);
        ctx.fillText(it.paceFormatted.split(' ')[0], x + width - padX - 14, ry + 4);
      });

      ctx.restore();
      return y + totalH;
    }

    if (design === 'compact-dot-matrix') {
      // Style: Compact Pace Dot Matrix
      const count = items.length;
      this.recordBounds('splits', 'Splits Chart', x, y, width, chartH);
      const isAnim = activity.isAnimated && items.some((it) => it.isCompleted !== undefined);

      const dotAreaY = y + 46;
      const dotAreaH = chartH - 58;
      const dotAreaW = width - padX * 2;
      const cols = Math.min(count, 15);
      const dotW = (dotAreaW - (cols - 1) * 6) / cols;

      items.slice(0, cols).forEach((it, idx) => {
        const dx = x + padX + idx * (dotW + 6);
        const paceRatio = activity.avgPace > 0 && it.pace > 0 ? Math.max(0.3, Math.min(1.0, activity.avgPace / it.pace)) : 0.7;
        const curH = dotAreaH * paceRatio;
        const dy = dotAreaY + (dotAreaH - curH);

        if (isAnim && it.isPending) {
          this.drawRoundedRect(ctx, dx, dotAreaY + dotAreaH - 4, dotW, 4, 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.fill();
        } else if (isAnim && it.isCurrent) {
          const liveH = Math.max(4, curH * (it.splitProgress || 0.1));
          this.drawRoundedRect(ctx, dx, dotAreaY + (dotAreaH - liveH), dotW, liveH, 4);
          ctx.fillStyle = elAccent;
          ctx.shadowColor = elAccent;
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          this.drawRoundedRect(ctx, dx, dy, dotW, curH, 4);
          ctx.fillStyle = it.isFastest && showFastest ? elAccent : 'rgba(255, 255, 255, 0.75)';
          ctx.fill();
        }

        ctx.textAlign = 'center';
        ctx.fillStyle = (isAnim && it.isCurrent) ? elAccent : textMuted;
        ctx.font = '9px monospace';
        ctx.fillText(`${idx + 1}`, dx + dotW / 2, dotAreaY + dotAreaH + 12);
      });

      ctx.restore();
      return y + chartH;
    }

    if (design === 'horizontal-bars') {
      // Style 2: Horizontal Bars (Multi-column so ALL splits to end of workout fit)
      const count = items.length;
      const colCount = count <= 8 ? 1 : 2;
      const perCol = Math.ceil(count / colCount);
      const rowH = Math.min(22, (chartH - 48) / perCol);
      const barAreaY = y + 42;
      const colGap = 20;
      const colW = (width - padX * 2 - (colCount - 1) * colGap) / colCount;
      const isAnim = activity.isAnimated && items.some((it) => it.isCompleted !== undefined);

      let minP = Infinity, maxP = 0;
      items.forEach((it) => {
        if (it.pace > 0) {
          if (it.pace < minP) minP = it.pace;
          if (it.pace > maxP) maxP = it.pace;
        }
      });
      if (minP === Infinity) minP = 240;
      if (maxP <= minP) maxP = minP + 60;

      items.forEach((it, idx) => {
        const col = Math.floor(idx / perCol);
        const row = idx % perCol;
        const colX = x + padX + col * (colW + colGap);
        const ry = barAreaY + row * rowH;

        ctx.textAlign = 'left';
        ctx.fillStyle = (isAnim && it.isCurrent) ? elAccent : ((it.isFastest && showFastest) ? elAccent : textMuted);
        ctx.font = this.getSubPartFont(config, 'splits', 'table', 'bold', 10);
        ctx.fillText(it.shortName, colX, ry + 13);

        const nameW = 24;
        const paceW = 42;
        const barStart = colX + nameW;
        const maxBarW = colW - nameW - paceW;
        const ratio = Math.max(0.2, 1 - (it.pace - minP) / (maxP - minP || 1) * 0.7);
        const bw = Math.max(4, maxBarW * ratio);

        if (isAnim && it.isPending) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
          this.drawRoundedRect(ctx, barStart, ry + 3, 4, rowH - 6, 2);
          ctx.fill();
        } else if (isAnim && it.isCurrent) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
          this.drawRoundedRect(ctx, barStart, ry + 3, bw, rowH - 6, 2);
          ctx.fill();

          const liveBw = Math.max(6, bw * (it.splitProgress || 0.1));
          ctx.fillStyle = elAccent;
          ctx.shadowColor = elAccent;
          ctx.shadowBlur = 8;
          this.drawRoundedRect(ctx, barStart, ry + 3, liveBw, rowH - 6, 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = (it.isFastest && showFastest) ? elAccent : (isAnim ? 'rgba(255, 255, 255, 0.75)' : 'rgba(255, 255, 255, 0.4)');
          this.drawRoundedRect(ctx, barStart, ry + 3, bw, rowH - 6, 2);
          ctx.fill();
        }

        let paceStr = it.paceFormatted.split(' ')[0];
        if (isAnim && it.isPending) {
          paceStr = '--:--';
        } else if (isAnim && it.isCurrent) {
          paceStr = (it.displayPaceFormatted || it.paceFormatted).split(' ')[0];
        }

        ctx.textAlign = 'right';
        ctx.fillStyle = (isAnim && it.isCurrent) ? elAccent : ((it.isFastest && showFastest) ? elAccent : text);
        ctx.font = this.getSubPartFont(config, 'splits', 'table', 'bold', 10);
        ctx.fillText(paceStr, colX + colW, ry + 13);
      });

      ctx.restore();
      return y + chartH;
    }

    // Default 'vertical-bars': (Displays ALL splits dynamically)
    const barAreaY = y + 42;
    const barAreaH = chartH - 65;
    const barAreaW = width - padX * 2;
    const isAnim = activity.isAnimated && items.some((it) => it.isCompleted !== undefined);

    let minPace = Infinity, maxPace = 0;
    items.forEach((it) => {
      if (it.pace > 0) {
        if (it.pace < minPace) minPace = it.pace;
        if (it.pace > maxPace) maxPace = it.pace;
      }
    });

    if (minPace === Infinity) minPace = 240;
    if (maxPace <= minPace) maxPace = minPace + 60;

    const count = items.length;
    const barGap = count > 25 ? 2 : count > 15 ? 4 : count > 8 ? 6 : 10;
    const barW = Math.max(4, (barAreaW - barGap * (count - 1)) / count);
    const labelStep = count > 24 ? 5 : count > 14 ? 2 : 1;

    items.forEach((it, idx) => {
      const bx = x + padX + idx * (barW + barGap);
      const paceNorm = Math.max(0.2, Math.min(1, 1 - (it.pace - minPace) / (maxPace - minPace || 1) * 0.75));
      const fullBh = barAreaH * paceNorm;

      if (isAnim && it.isPending) {
        const bh = Math.max(3, barAreaH * 0.08);
        const by = barAreaY + (barAreaH - bh);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.shadowBlur = 0;
        this.drawRoundedRect(ctx, bx, by, barW, bh, 3);
        ctx.fill();
      } else if (isAnim && it.isCurrent) {
        // Ghost background container showing potential segment target
        const ghostBy = barAreaY + (barAreaH - fullBh);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        this.drawRoundedRect(ctx, bx, ghostBy, barW, fullBh, 3);
        ctx.fill();

        // Growing live bar proportional to segment progress
        const liveBh = Math.max(4, fullBh * (it.splitProgress || 0.1));
        const liveBy = barAreaY + (barAreaH - liveBh);
        ctx.fillStyle = elAccent;
        ctx.shadowColor = elAccent;
        ctx.shadowBlur = 12;
        this.drawRoundedRect(ctx, bx, liveBy, barW, liveBh, 3);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        const by = barAreaY + (barAreaH - fullBh);
        if (it.isFastest && showFastest) {
          ctx.fillStyle = elAccent;
          ctx.shadowColor = elAccent;
          ctx.shadowBlur = 8;
        } else {
          ctx.fillStyle = isAnim ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.45)';
          ctx.shadowBlur = 0;
        }
        this.drawRoundedRect(ctx, bx, by, barW, fullBh, 3);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      const shouldShowLabel = (idx % labelStep === 0) || (it.isFastest && showFastest) || (idx === count - 1) || (isAnim && it.isCurrent);
      if (shouldShowLabel) {
        ctx.textAlign = 'center';
        ctx.fillStyle = (isAnim && it.isCurrent) ? elAccent : ((it.isFastest && showFastest) ? elAccent : textMuted);
        ctx.font = this.getSubPartFont(config, 'splits', 'table', '600', 10);
        ctx.fillText(it.shortName, bx + barW / 2, barAreaY + barAreaH + 16);
      }

      if (barW >= 24) {
        let paceLabel = it.paceFormatted.split(' ')[0];
        if (isAnim && it.isPending) {
          paceLabel = '--';
        } else if (isAnim && it.isCurrent) {
          paceLabel = (it.displayPaceFormatted || it.paceFormatted).split(' ')[0];
        }

        const effectiveBy = isAnim && it.isCurrent ? (barAreaY + (barAreaH - Math.max(4, fullBh * (it.splitProgress || 0.1)))) : (barAreaY + (barAreaH - (isAnim && it.isPending ? Math.max(3, barAreaH * 0.08) : fullBh)));
        ctx.textAlign = 'center';
        ctx.fillStyle = (isAnim && it.isCurrent) ? elAccent : ((it.isFastest && showFastest) ? elAccent : text);
        ctx.font = this.getSubPartFont(config, 'splits', 'table', 'bold', 10);
        ctx.fillText(paceLabel, bx + barW / 2, effectiveBy - 6);

        if (isAnim && it.isCurrent) {
          ctx.fillStyle = elAccent;
          ctx.font = 'bold 9px sans-serif';
          ctx.fillText('● LIVE', bx + barW / 2, effectiveBy - 18);
        }
      }
    });

    ctx.restore();
    return y + chartH;
  }

  // =========================================================================
  // WIDGET 6: SPLIT HIGHLIGHT CARD
  // Designs: 'spotlight', 'bib', 'medal-podium', 'polaroid-clip'
  // =========================================================================
  drawSplitHighlightCard(ctx, x, y, width, activity, config, theme, accent, customH = null) {
    const isLapSource = config.splitDataSource === 'laps' && activity.hasLaps;
    const items = isLapSource ? activity.laps : activity.splits;

    if (!items || items.length === 0) return y;

    let target = items[0];
    const targetKey = config.highlightSplitTarget || 'fastest';

    if (activity.isAnimated && (!config.highlightSplitTarget || config.highlightSplitTarget === 'fastest')) {
      target = items.find((it) => it.isCurrent) || items.find((it) => it.isCompleted) || items[0];
    } else if (targetKey === 'fastest') target = items.find((it) => it.isFastest) || items[0];
    else if (targetKey === 'slowest') target = items.find((it) => it.isSlowest) || items[0];
    else if (targetKey === 'last') target = items[items.length - 1];
    else if (targetKey.startsWith('index-')) {
      const idx = parseInt(targetKey.replace('index-', ''), 10);
      target = items[idx] || items[0];
    }

    const isTargetLive = activity.isAnimated && target && target.isCurrent;
    const targetPaceFormatted = isTargetLive ? (target.displayPaceFormatted || target.paceFormatted) : target.paceFormatted;
    const targetTimeFormatted = isTargetLive ? (target.displayTimeFormatted || target.timeFormatted) : target.timeFormatted;

    ctx.save();
    const elStyle = this.getElementStyle(config, 'splitHighlight');
    const { text, textMuted, accent: elAccent, cardStyle, align, opacity } = this.getEffectiveColors(config, theme, accent, 'splitHighlight');
    if (opacity < 1) ctx.globalAlpha = opacity;
    accent = elAccent;

    const font = this.getFontFamily(elStyle.fontFamily !== 'default' ? elStyle.fontFamily : config.fontFamily);
    const design = config.splitHighlightDesign || 'spotlight';
    const cardH = customH || 115;
    this.recordBounds('splitHighlight', 'Split Highlight', x, y, width, cardH);
    this.drawWidgetCardBg(ctx, 'splitHighlight', x, y, width, cardH, config, theme, true);

    const offBadge = this.getElementOffset(config, 'splitHighlight', 'badge');
    const offVal = this.getElementOffset(config, 'splitHighlight', 'val');
    const offTitle = this.getElementOffset(config, 'splitHighlight', 'title');
    const offTime = this.getElementOffset(config, 'splitHighlight', 'time');
    const offHr = this.getElementOffset(config, 'splitHighlight', 'hr');

    const padX = 24;

    if (design === 'medal-podium') {
      // Style 3: Gold Medal Trophy Podium
      if (!offBadge.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offBadge.z);
        ctx.fillStyle = '#fbbf24';
        ctx.font = '36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(isTargetLive ? '🏃' : '🥇', x + padX + 24 + offBadge.x, y + 68 + offBadge.y);

        ctx.textAlign = 'left';
        ctx.fillStyle = '#fbbf24';
        ctx.font = this.getSubPartFont(config, 'splitHighlight', 'badge', 'bold', 12);
        const defaultBadge = isTargetLive
          ? `★ LIVE SPLIT • ${target.name.toUpperCase()} (${Math.round((target.splitProgress || 0) * 100)}%) ★`
          : `★ PODIUM SPLIT • ${target.name.toUpperCase()} ★`;
        const badgeText = this.getTextOverride(config, 'splitHighlight', 'badge', defaultBadge);
        ctx.fillText(badgeText, x + padX + 60 + offBadge.x, y + 36 + offBadge.y);
        ctx.restore();
      }

      if (!offVal.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offVal.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        ctx.font = this.getSubPartFont(config, 'splitHighlight', 'val', 'bold', 42);
        const valText = this.getTextOverride(config, 'splitHighlight', 'val', targetPaceFormatted);
        ctx.fillText(valText, x + padX + 60 + offVal.x, y + 80 + offVal.y);
        ctx.restore();
      }

      if (!offTime.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offTime.z);
        ctx.textAlign = 'right';
        ctx.fillStyle = theme.textMuted;
        ctx.font = this.getSubPartFont(config, 'splitHighlight', 'time', 'bold', 14);
        const timeText = this.getTextOverride(config, 'splitHighlight', 'time', `TIME: ${targetTimeFormatted}`);
        ctx.fillText(timeText, x + width - padX + offTime.x, y + 54 + offTime.y);
        ctx.restore();
      }

      if ((target.avgHr || activity.avgHr) && !offHr.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offHr.z);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#ef4444';
        ctx.font = this.getSubPartFont(config, 'splitHighlight', 'hr', 'bold', 14);
        const hrVal = isTargetLive && activity.liveHr ? activity.liveHr : (target.avgHr || activity.avgHr);
        const hrText = this.getTextOverride(config, 'splitHighlight', 'hr', `HR: ${hrVal} BPM`);
        ctx.fillText(hrText, x + width - padX + offHr.x, y + 78 + offHr.y);
        ctx.restore();
      }

      ctx.restore();
      return y + cardH;
    }


    if (design === 'trophy-cup') {
      // Style: Trophy Podium Banner (Gold Ribbon & Fast Split)
      ctx.save();
      ctx.fillStyle = '#fbbf24';
      ctx.font = '36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(isTargetLive ? '🏃' : '🏆', x + padX + 24 + offBadge.x, y + 68 + offBadge.y);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#fbbf24';
      ctx.font = this.getSubPartFont(config, 'splitHighlight', 'badge', 'bold', 12);
      ctx.letterSpacing = '1px';
      ctx.fillText(isTargetLive ? 'LIVE INTERVAL IN PROGRESS' : 'CHAMPION INTERVAL', x + padX + 64 + offBadge.x, y + 38 + offBadge.y);

      ctx.fillStyle = text;
      ctx.font = this.getSubPartFont(config, 'splitHighlight', 'title', 'bold', 20);
      ctx.fillText(`${target.name} (${target.shortName})`, x + padX + 64 + offTitle.x, y + 64 + offTitle.y);

      ctx.textAlign = 'right';
      ctx.fillStyle = elAccent;
      ctx.font = this.getSubPartFont(config, 'splitHighlight', 'val', 'bold', 32);
      ctx.fillText(targetPaceFormatted.split(' ')[0], x + width - padX + offVal.x, y + 64 + offVal.y);

      ctx.fillStyle = textMuted;
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(targetPaceFormatted.split(' ')[1] || '/KM', x + width - padX + offVal.x, y + 84 + offVal.y);

      ctx.restore();
      ctx.restore();
      return y + cardH;
    }

    if (design === 'split-terminal') {
      // Style: Digital Split Terminal (Monospace Code Prompt)
      ctx.save();
      ctx.textAlign = 'left';
      ctx.fillStyle = elAccent;
      ctx.font = 'bold 11px monospace';
      ctx.fillText(isTargetLive ? `> EXEC: LIVE_SEGMENT_TELEMETRY` : `> EXEC: FASTEST_INTERVAL_QUERY`, x + padX + offBadge.x, y + 32 + offBadge.y);

      ctx.fillStyle = text;
      ctx.font = this.getSubPartFont(config, 'splitHighlight', 'title', 'bold', 20);
      ctx.fillText(`TARGET: [ ${target.shortName} ] // ${targetTimeFormatted}`, x + padX + offTitle.x, y + 62 + offTitle.y);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`PACE_TELEMETRY: ${targetPaceFormatted}`, x + padX + offTitle.x, y + 84 + offTitle.y);

      ctx.textAlign = 'right';
      ctx.fillStyle = elAccent;
      ctx.font = this.getSubPartFont(config, 'splitHighlight', 'val', 'bold', 34);
      ctx.fillText(targetPaceFormatted.split(' ')[0], x + width - padX + offVal.x, y + 70 + offVal.y);

      ctx.restore();
      ctx.restore();
      return y + cardH;
    }

    if (design === 'polaroid-clip') {
      // Style 4: Pinned Paper Card with Paperclip
      ctx.fillStyle = '#f8fafc';
      this.drawRoundedRect(ctx, x, y, width, cardH, 8);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (!offBadge.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offBadge.z);
        ctx.fillStyle = '#64748b';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('📎', x + 16 + offBadge.x, y + 32 + offBadge.y);
        ctx.restore();
      }

      if (!offTitle.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offTitle.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#0f172a';
        ctx.font = this.getSubPartFont(config, 'splitHighlight', 'title', 'bold', 14);
        const titleText = this.getTextOverride(config, 'splitHighlight', 'title', isTargetLive ? `LIVE SEGMENT: ${target.name}` : `SPLIT NOTE: ${target.name}`);
        ctx.fillText(titleText, x + 50 + offTitle.x, y + 30 + offTitle.y);
        ctx.restore();
      }

      if (!offVal.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offVal.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#0284c7';
        ctx.font = this.getSubPartFont(config, 'splitHighlight', 'val', 'bold', 46);
        const valText = this.getTextOverride(config, 'splitHighlight', 'val', targetPaceFormatted);
        ctx.fillText(valText, x + 50 + offVal.x, y + 84 + offVal.y);
        ctx.restore();
      }

      if (!offTime.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offTime.z);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#475569';
        ctx.font = this.getSubPartFont(config, 'splitHighlight', 'time', '600', 14);
        const timeText = this.getTextOverride(config, 'splitHighlight', 'time', `Split Time: ${targetTimeFormatted}`);
        ctx.fillText(timeText, x + width - 20 + offTime.x, y + 52 + offTime.y);
        ctx.restore();
      }

      if (!offHr.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offHr.z);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#475569';
        ctx.font = this.getSubPartFont(config, 'splitHighlight', 'hr', '600', 14);
        const defaultStat = isTargetLive && activity.liveHr ? `HR: ${activity.liveHr} BPM` : (target.avgHr ? `HR: ${target.avgHr} BPM` : `Elev: +${target.elevationGain || 0}m`);
        const hrText = this.getTextOverride(config, 'splitHighlight', 'hr', defaultStat);
        ctx.fillText(hrText, x + width - 20 + offHr.x, y + 78 + offHr.y);
        ctx.restore();
      }

      ctx.restore();
      return y + cardH;
    }

    if (design === 'bib') {
      this.drawCardBackground(ctx, x, y, width, cardH, config, theme, true);
      if (!offBadge.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offBadge.z);
        ctx.fillStyle = accent;
        this.drawRoundedRect(ctx, x + padX + offBadge.x, y + 16 + offBadge.y, 52, 24, 6);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = this.getSubPartFont(config, 'splitHighlight', 'badge', 'bold', 12);
        ctx.textAlign = 'center';
        const badgeText = this.getTextOverride(config, 'splitHighlight', 'badge', isTargetLive ? 'LIVE' : target.shortName);
        ctx.fillText(badgeText, x + padX + 26 + offBadge.x, y + 33 + offBadge.y);
        ctx.restore();
      }

      if (!offTitle.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offTitle.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = theme.text;
        ctx.font = this.getSubPartFont(config, 'splitHighlight', 'title', 'bold', 14);
        const titleText = this.getTextOverride(config, 'splitHighlight', 'title', target.name.toUpperCase());
        ctx.fillText(titleText, x + padX + 64 + offTitle.x, y + 33 + offTitle.y);
        ctx.restore();
      }

      if (!offVal.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offVal.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = accent;
        ctx.font = this.getSubPartFont(config, 'splitHighlight', 'val', 'bold', 48);
        const valText = this.getTextOverride(config, 'splitHighlight', 'val', targetPaceFormatted);
        ctx.fillText(valText, x + padX + offVal.x, y + 88 + offVal.y);
        ctx.restore();
      }

      if (!offTime.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offTime.z);
        ctx.textAlign = 'right';
        ctx.fillStyle = theme.textMuted;
        ctx.font = this.getSubPartFont(config, 'splitHighlight', 'time', '600', 13);
        const timeText = this.getTextOverride(config, 'splitHighlight', 'time', `SPLIT TIME: ${targetTimeFormatted}`);
        ctx.fillText(timeText, x + width - padX + offTime.x, y + 52 + offTime.y);
        ctx.restore();
      }

      if (!offHr.hidden && (target.avgHr || activity.avgHr)) {
        ctx.save();
        this.applyZDepth(ctx, offHr.z);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#ef4444';
        ctx.font = this.getSubPartFont(config, 'splitHighlight', 'hr', '600', 13);
        const hrVal = isTargetLive && activity.liveHr ? activity.liveHr : (target.avgHr || activity.avgHr);
        const hrText = this.getTextOverride(config, 'splitHighlight', 'hr', `HEART RATE: ${hrVal} BPM`);
        ctx.fillText(hrText, x + width - padX + offHr.x, y + 74 + offHr.y);
        ctx.restore();
      }

      ctx.restore();
      return y + cardH;
    }

    // Default 'spotlight':
    ctx.shadowColor = accent;
    ctx.shadowBlur = 10;
    this.drawCardBackground(ctx, x, y, width, cardH, config, theme, true);
    ctx.shadowBlur = 0;

    if (!offBadge.hidden) {
      ctx.save();
      this.applyZDepth(ctx, offBadge.z);
      ctx.textAlign = 'left';
      ctx.fillStyle = accent;
      ctx.font = this.getSubPartFont(config, 'splitHighlight', 'badge', 'bold', 12);
      ctx.letterSpacing = '1px';
      const defaultTag = isTargetLive
        ? `★ LIVE SPLIT • ${target.name.toUpperCase()} (${Math.round((target.splitProgress || 0) * 100)}%) ★`
        : (target.isFastest ? '⚡ FASTEST SPLIT SPOTLIGHT' : 'HIGHLIGHTED SPLIT');
      const tag = this.getTextOverride(config, 'splitHighlight', 'badge', defaultTag);
      ctx.fillText(tag, x + padX + offBadge.x, y + 30 + offBadge.y);
      ctx.restore();
    }

    if (!offVal.hidden) {
      ctx.save();
      this.applyZDepth(ctx, offVal.z);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.font = this.getSubPartFont(config, 'splitHighlight', 'val', 'bold', 44);
      const valText = this.getTextOverride(config, 'splitHighlight', 'val', targetPaceFormatted);
      ctx.fillText(valText, x + padX + offVal.x, y + 82 + offVal.y);
      ctx.restore();
    }

    if (!offTitle.hidden) {
      ctx.save();
      this.applyZDepth(ctx, offTitle.z);
      ctx.textAlign = 'right';
      ctx.fillStyle = theme.text;
      ctx.font = this.getSubPartFont(config, 'splitHighlight', 'title', 'bold', 18);
      const titleText = this.getTextOverride(config, 'splitHighlight', 'title', target.name);
      ctx.fillText(titleText, x + width - padX + offTitle.x, y + 36 + offTitle.y);
      ctx.restore();
    }

    if (!offTime.hidden) {
      ctx.save();
      this.applyZDepth(ctx, offTime.z);
      ctx.textAlign = 'right';
      ctx.fillStyle = theme.textMuted;
      ctx.font = this.getSubPartFont(config, 'splitHighlight', 'time', '600', 14);
      const timeText = this.getTextOverride(config, 'splitHighlight', 'time', `Time: ${targetTimeFormatted}`);
      ctx.fillText(timeText, x + width - padX + offTime.x, y + 62 + offTime.y);
      ctx.restore();
    }

    if (!offHr.hidden && (target.elevationGain !== undefined || target.avgHr || activity.avgHr)) {
      ctx.save();
      this.applyZDepth(ctx, offHr.z);
      ctx.textAlign = 'right';
      ctx.fillStyle = theme.textMuted;
      ctx.font = this.getSubPartFont(config, 'splitHighlight', 'hr', '600', 14);
      const defaultStat = isTargetLive && activity.liveHr
        ? `HR: ${activity.liveHr} BPM`
        : (target.avgHr ? `HR: ${target.avgHr} BPM` : (activity.avgHr ? `HR: ${activity.avgHr} BPM` : `Gain: +${target.elevationGain}m`));
      const hrText = this.getTextOverride(config, 'splitHighlight', 'hr', defaultStat);
      ctx.fillText(hrText, x + width - padX + offHr.x, y + 84 + offHr.y);
      ctx.restore();
    }

    ctx.restore();
    return y + cardH;
  }

  /**
   * Helper to draw a glowing scanning needle, pulse ring, and current value pill
   * across Elevation, Pace, and Heart Rate graphs when animating.
   */
  drawChartScanningCursor(ctx, chartX, chartY, chartW, chartH, curDist, totalDist, curY, labelText, accentColor, font) {
    if (curDist == null || totalDist <= 0) return;
    const normX = Math.max(0, Math.min(1, curDist / totalDist));
    const curX = chartX + normX * chartW;
    const clampedY = Math.max(chartY + 4, Math.min(chartY + chartH - 4, curY));

    ctx.save();
    // 1. Vertical scanning line
    ctx.beginPath();
    ctx.moveTo(curX, chartY);
    ctx.lineTo(curX, chartY + chartH);
    ctx.strokeStyle = accentColor || '#38bdf8';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Pulse beacon ring & center dot
    ctx.beginPath();
    ctx.arc(curX, clampedY, 7, 0, Math.PI * 2);
    ctx.fillStyle = accentColor || '#38bdf8';
    ctx.globalAlpha = 0.28;
    ctx.fill();
    ctx.globalAlpha = 1.0;

    ctx.beginPath();
    ctx.arc(curX, clampedY, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = accentColor || '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 3. Compact value pill badge
    if (labelText) {
      ctx.font = `bold 10px ${font || 'sans-serif'}`;
      const textW = ctx.measureText(labelText).width;
      const tagW = textW + 12;
      const tagH = 17;
      const tagX = Math.max(chartX, Math.min(chartX + chartW - tagW, curX - tagW / 2));
      const tagY = Math.max(chartY - 2, clampedY - 22);

      this.drawRoundedRect(ctx, tagX, tagY, tagW, tagH, 4);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.strokeStyle = accentColor || '#38bdf8';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = accentColor || '#38bdf8';
      ctx.textAlign = 'center';
      ctx.fillText(labelText, tagX + tagW / 2, tagY + 12);
    }
    ctx.restore();
  }

  // =========================================================================
  // WIDGET 7: ELEVATION PROFILE
  // Designs: 'area', 'line', 'stepped-gradient', 'mountain-peaks'
  // =========================================================================
  drawElevationProfile(ctx, x, y, width, height, activity, config, theme, accent) {
    const pts = activity.trackpoints || [];
    if (!pts || pts.length < 3) return;

    ctx.save();
    const elStyle = this.getElementStyle(config, 'elevation');
    const { text, textMuted, accent: elAccent, cardStyle, align, opacity } = this.getEffectiveColors(config, theme, accent, 'elevation');
    if (opacity < 1) ctx.globalAlpha = opacity;
    accent = elAccent;

    const font = this.getFontFamily(elStyle.fontFamily !== 'default' ? elStyle.fontFamily : config.fontFamily);
    const design = config.elevationDesign || 'area';
    this.recordBounds('elevation', 'Elevation Profile', x, y, width, height);

    this.drawWidgetCardBg(ctx, 'elevation', x, y, width, height, config, theme);

    const offTitle = this.getElementOffset(config, 'elevation', 'title');
    const offStat = this.getElementOffset(config, 'elevation', 'stat');
    const offChart = this.getElementOffset(config, 'elevation', 'chart');

    const pad = 16;
    const chartW = width - pad * 2;
    const chartH = height - 36;
    const chartX = x + pad;
    const chartY = y + 26;

    const elevTitle = this.getTextOverride(config, 'elevation', 'title', 'ELEVATION PROFILE');
    if (!offTitle.hidden && elevTitle) {
      ctx.save();
      this.applyZDepth(ctx, offTitle.z);
      ctx.textAlign = 'left';
      ctx.fillStyle = theme.textMuted;
      ctx.font = this.getSubPartFont(config, 'elevation', 'title', 'bold', 11);
      ctx.fillText(elevTitle, chartX + offTitle.x, y + 18 + offTitle.y);
      ctx.restore();
    }

    if (!offStat.hidden) {
      ctx.save();
      this.applyZDepth(ctx, offStat.z);
      ctx.textAlign = 'right';
      ctx.fillStyle = accent;
      ctx.font = this.getSubPartFont(config, 'elevation', 'stat', 'bold', 11);
      const defaultElevStat = `+${activity.elevationGain || 0}M GAIN  •  PEAK ${activity.maxElevation || 0}M`;
      const elevStat = this.getTextOverride(config, 'elevation', 'stat', defaultElevStat);
      ctx.fillText(elevStat, chartX + chartW + offStat.x, y + 18 + offStat.y);
      ctx.restore();
    }

    if (offChart.hidden) {
      ctx.restore();
      return;
    }

    const minEle = activity.fullMinElevation != null ? activity.fullMinElevation : (activity.minElevation || 0);
    const maxEle = Math.max(minEle + 10, activity.fullMaxElevation != null ? activity.fullMaxElevation : (activity.maxElevation || 100));
    const dEle = maxEle - minEle;
    const totalDist = activity.fullDistance || activity.distance || 1;

    const getY = (ele) => chartY + chartH - ((ele - minEle) / dEle) * chartH;

    // Animated Ghost Background: Subtle full terrain profile if animating
    if (activity.fullTrackpoints && activity.fullTrackpoints.length > 2 && activity.progress !== undefined && activity.progress < 0.999) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(chartX, chartY + chartH);
      activity.fullTrackpoints.forEach((p) => {
        const px = chartX + (p.dist / totalDist) * chartW;
        const py = getY(p.ele);
        ctx.lineTo(px, py);
      });
      ctx.lineTo(chartX + chartW, chartY + chartH);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
      ctx.fill();

      ctx.beginPath();
      activity.fullTrackpoints.forEach((p, idx) => {
        const px = chartX + (p.dist / totalDist) * chartW;
        const py = getY(p.ele);
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }


    if (design === 'stepped-bars') {
      // Style: Stepped Altitude Columns (Quantized Terrain Bars)
      const colCount = Math.min(pts.length, 36);
      const colStep = Math.max(1, Math.floor(pts.length / colCount));
      const colW = (chartW - (colCount - 1) * 2) / colCount;

      for (let c = 0; c < colCount; c++) {
        const pt = pts[c * colStep] || pts[pts.length - 1];
        const barH = Math.max(4, ((pt.ele - minEle) / (dEle || 1)) * chartH);
        const bx = chartX + c * (colW + 2);
        const by = chartY + chartH - barH;

        this.drawRoundedRect(ctx, bx, by, colW, barH, 2);
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.6 + 0.4 * ((pt.ele - minEle) / (dEle || 1));
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (activity.runnerPoint) {
        const curY = getY(activity.runnerPoint.ele);
        this.drawChartScanningCursor(ctx, chartX, chartY, chartW, chartH, activity.runnerPoint.dist, totalDist, curY, `▲ ${Math.round(activity.runnerPoint.ele)}m`, accent, font);
      }
      ctx.restore();
      return y + height;
    }

    if (design === 'dual-fill') {
      // Style: Dual-Zone Climb & Descent Gradient (Ascent vs Descent)
      ctx.lineWidth = 2.5;
      for (let i = 0; i < pts.length - 1; i++) {
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const x1 = chartX + (p1.dist / totalDist) * chartW;
        const y1 = getY(p1.ele);
        const x2 = chartX + (p2.dist / totalDist) * chartW;
        const y2 = getY(p2.ele);
        const isClimb = p2.ele >= p1.ele;

        ctx.strokeStyle = isClimb ? '#fbbf24' : '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      if (activity.runnerPoint) {
        const curY = getY(activity.runnerPoint.ele);
        this.drawChartScanningCursor(ctx, chartX, chartY, chartW, chartH, activity.runnerPoint.dist, totalDist, curY, `▲ ${Math.round(activity.runnerPoint.ele)}m`, accent, font);
      }
      ctx.restore();
      return y + height;
    }

    if (design === 'topo-contours') {
      // Style 5: Topographic Contour Fill
      const layers = 4;
      for (let l = 1; l <= layers; l++) {
        const factor = l / layers;
        const grad = ctx.createLinearGradient(0, chartY, 0, chartY + chartH);
        grad.addColorStop(0, accent);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.beginPath();
        ctx.moveTo(chartX, chartY + chartH);
        pts.forEach((p) => {
          const px = chartX + (p.dist / totalDist) * chartW;
          const py = chartY + chartH - ((p.ele - minEle) / dEle) * chartH * factor;
          ctx.lineTo(px, py);
        });
        ctx.lineTo(chartX + chartW, chartY + chartH);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.globalAlpha = 0.18;
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      ctx.beginPath();
      pts.forEach((p, idx) => {
        const px = chartX + (p.dist / totalDist) * chartW;
        const py = getY(p.ele);
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      if (activity.runnerPoint) {
        const curY = getY(activity.runnerPoint.ele);
        this.drawChartScanningCursor(ctx, chartX, chartY, chartW, chartH, activity.runnerPoint.dist, totalDist, curY, `▲ ${Math.round(activity.runnerPoint.ele)}m`, accent, font);
      }
      ctx.restore();
      return y + height;
    }

    if (design === 'gradient-altitude') {
      // Style 6: High-Contrast Altitude Gradient with Summit Callout Pill
      const grad = ctx.createLinearGradient(0, chartY, 0, chartY + chartH);
      grad.addColorStop(0, '#38bdf8');
      grad.addColorStop(0.5, '#818cf8');
      grad.addColorStop(1, '#c084fc');

      ctx.beginPath();
      ctx.moveTo(chartX, chartY + chartH);
      pts.forEach((p) => {
        const px = chartX + (p.dist / totalDist) * chartW;
        const py = getY(p.ele);
        ctx.lineTo(px, py);
      });
      ctx.lineTo(chartX + chartW, chartY + chartH);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.4;
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.beginPath();
      pts.forEach((p, idx) => {
        const px = chartX + (p.dist / totalDist) * chartW;
        const py = getY(p.ele);
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.stroke();

      let peakPt = pts[0];
      pts.forEach((p) => { if (p.ele > peakPt.ele) peakPt = p; });
      const peakX = chartX + (peakPt.dist / totalDist) * chartW;
      const peakY = getY(peakPt.ele);
      this.drawRoundedRect(ctx, peakX - 32, peakY - 22, 64, 18, 9);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#38bdf8';
      ctx.font = `bold 10px ${font}`;
      ctx.textAlign = 'center';
      ctx.fillText(`▲ ${Math.round(peakPt.ele)}m`, peakX, peakY - 10);

      if (activity.runnerPoint) {
        const curY = getY(activity.runnerPoint.ele);
        this.drawChartScanningCursor(ctx, chartX, chartY, chartW, chartH, activity.runnerPoint.dist, totalDist, curY, `▲ ${Math.round(activity.runnerPoint.ele)}m`, '#38bdf8', font);
      }
      ctx.restore();
      return y + height;
    }

    if (design === 'mountain-peaks') {
      // Style 4: Mountain Silhouette with summit flag
      ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
      ctx.beginPath();
      ctx.moveTo(chartX, chartY + chartH);
      pts.forEach((p) => {
        const px = chartX + (p.dist / totalDist) * chartW;
        const py = getY(p.ele);
        ctx.lineTo(px, py);
      });
      ctx.lineTo(chartX + chartW, chartY + chartH);
      ctx.closePath();
      ctx.fill();

      // Peak flag
      let peakPt = pts[0];
      pts.forEach((p) => { if (p.ele > peakPt.ele) peakPt = p; });
      const peakX = chartX + (peakPt.dist / totalDist) * chartW;
      const peakY = getY(peakPt.ele);
      ctx.fillStyle = '#ef4444';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🚩', peakX, peakY - 4);
    } else if (design === 'stepped-gradient' || design === 'area') {
      const grad = ctx.createLinearGradient(0, chartY, 0, chartY + chartH);
      grad.addColorStop(0, accent);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.beginPath();
      ctx.moveTo(chartX, chartY + chartH);
      pts.forEach((p) => {
        const px = chartX + (p.dist / totalDist) * chartW;
        const py = getY(p.ele);
        ctx.lineTo(px, py);
      });
      ctx.lineTo(chartX + chartW, chartY + chartH);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.35;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Top Line stroke
    ctx.beginPath();
    pts.forEach((p, idx) => {
      const px = chartX + (p.dist / totalDist) * chartW;
      const py = getY(p.ele);
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    if (activity.runnerPoint) {
      const curY = getY(activity.runnerPoint.ele);
      this.drawChartScanningCursor(ctx, chartX, chartY, chartW, chartH, activity.runnerPoint.dist, totalDist, curY, `▲ ${Math.round(activity.runnerPoint.ele)}m`, accent, font);
    }

    ctx.restore();
    return y + height;
  }

  // =========================================================================
  // WIDGET 8: PACE GRAPH
  // Designs: 'area', 'line', 'gradient-zone', 'stepped-splits'
  // =========================================================================
  drawPaceGraph(ctx, x, y, width, height, activity, config, theme, accent) {
    const pts = activity.paceCurve || [];
    if (!pts || pts.length < 3) return y;

    ctx.save();
    const elStyle = this.getElementStyle(config, 'paceGraph');
    const { text, textMuted, accent: elAccent, cardStyle, align, opacity } = this.getEffectiveColors(config, theme, accent, 'paceGraph');
    if (opacity < 1) ctx.globalAlpha = opacity;
    accent = elAccent;

    const font = this.getFontFamily(elStyle.fontFamily !== 'default' ? elStyle.fontFamily : config.fontFamily);
    const design = config.paceGraphDesign || 'area';
    this.recordBounds('paceGraph', 'Pace Graph', x, y, width, height);

    this.drawWidgetCardBg(ctx, 'paceGraph', x, y, width, height, config, theme);

    const offTitle = this.getElementOffset(config, 'paceGraph', 'title');
    const offStat = this.getElementOffset(config, 'paceGraph', 'stat');
    const offChart = this.getElementOffset(config, 'paceGraph', 'chart');

    const pad = 16;
    const chartW = width - pad * 2;
    const chartH = height - 38;
    const chartX = x + pad;
    const chartY = y + 28;

    const paceTitle = this.getTextOverride(config, 'paceGraph', 'title', 'PACE PROFILE');
    if (!offTitle.hidden && paceTitle) {
      ctx.save();
      this.applyZDepth(ctx, offTitle.z);
      ctx.textAlign = 'left';
      ctx.fillStyle = theme.textMuted;
      ctx.font = this.getSubPartFont(config, 'paceGraph', 'title', 'bold', 11);
      ctx.fillText(paceTitle, chartX + offTitle.x, y + 18 + offTitle.y);
      ctx.restore();
    }

    if (!offStat.hidden) {
      ctx.save();
      this.applyZDepth(ctx, offStat.z);
      ctx.textAlign = 'right';
      ctx.fillStyle = accent;
      ctx.font = this.getSubPartFont(config, 'paceGraph', 'stat', 'bold', 11);
      const defaultPaceStat = activity.isAnimated && activity.livePaceFormatted
        ? `LIVE: ${activity.livePaceFormatted.split(' ')[0]}  •  AVG: ${activity.avgPaceFormatted.split(' ')[0]}`
        : `AVG: ${activity.avgPaceFormatted}  •  BEST: ${activity.bestPaceFormatted || '--'}`;
      const paceStat = this.getTextOverride(config, 'paceGraph', 'stat', defaultPaceStat);
      ctx.fillText(paceStat, chartX + chartW + offStat.x, y + 18 + offStat.y);
      ctx.restore();
    }

    if (offChart.hidden) {
      ctx.restore();
      return;
    }

    let minPace = Infinity, maxPace = 0;
    pts.forEach((p) => {
      if (p.pace > 0) {
        if (p.pace < minPace) minPace = p.pace;
        if (p.pace > maxPace) maxPace = p.pace;
      }
    });

    if (minPace === Infinity) minPace = 240;
    if (maxPace <= minPace) maxPace = minPace + 60;

    const dPace = maxPace - minPace;
    const totalDist = activity.fullDistance || activity.distance || 1;
    const getY = (pace) => chartY + ((pace - minPace) / dPace) * chartH;

    if (design === 'bar-histogram') {
      // Style 5: High-Density Pace Bar Histogram
      const barCount = Math.min(36, pts.length);
      const step = Math.floor(pts.length / barCount);
      const bW = chartW / barCount - 2;

      for (let i = 0; i < barCount; i++) {
        const pt = pts[i * step] || pts[pts.length - 1];
        const bx = chartX + i * (bW + 2);
        const paceNorm = Math.max(0.15, Math.min(1, 1 - (pt.pace - minPace) / (dPace || 1)));
        const bh = chartH * paceNorm;
        const by = chartY + chartH - bh;

        ctx.fillStyle = pt.pace < activity.avgPace ? elAccent : 'rgba(255, 255, 255, 0.35)';
        this.drawRoundedRect(ctx, bx, by, bW, bh, 2);
        ctx.fill();
      }

      if (activity.runnerPoint) {
        const curY = getY(activity.avgPace);
        this.drawChartScanningCursor(ctx, chartX, chartY, chartW, chartH, activity.runnerPoint.dist, totalDist, curY, activity.avgPaceFormatted, accent, font);
      }
      ctx.restore();
      return y + height;
    }

    if (design === 'cyber-hud-pace') {
      // Style 6: Cyberpunk Grid Pace Curve with Target Line & HUD Callouts
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
      ctx.lineWidth = 1;
      for (let gy = chartY; gy <= chartY + chartH; gy += chartH / 3) {
        ctx.beginPath(); ctx.moveTo(chartX, gy); ctx.lineTo(chartX + chartW, gy); ctx.stroke();
      }

      ctx.beginPath();
      pts.forEach((p, idx) => {
        const px = chartX + (p.dist / totalDist) * chartW;
        const py = getY(p.pace);
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;

      const avgY = getY(activity.avgPace);
      ctx.strokeStyle = elAccent;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(chartX, avgY); ctx.lineTo(chartX + chartW, avgY); ctx.stroke();
      ctx.setLineDash([]);

      if (activity.runnerPoint) {
        const curY = getY(activity.avgPace);
        this.drawChartScanningCursor(ctx, chartX, chartY, chartW, chartH, activity.runnerPoint.dist, totalDist, curY, activity.avgPaceFormatted, '#00f0ff', font);
      }
      ctx.restore();
      return y + height;
    }

    if (design === 'gradient-zone') {
      // Green / Cyan / Orange zone fills
      const grad = ctx.createLinearGradient(0, chartY, 0, chartY + chartH);
      grad.addColorStop(0, '#10b981'); // fast
      grad.addColorStop(0.5, '#00f0ff');
      grad.addColorStop(1, '#ff3366'); // slow

      ctx.beginPath();
      ctx.moveTo(chartX, chartY + chartH);
      pts.forEach((p) => {
        const px = chartX + (p.dist / totalDist) * chartW;
        const py = getY(p.pace);
        ctx.lineTo(px, py);
      });
      ctx.lineTo(chartX + chartW, chartY + chartH);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.35;
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (design === 'area') {
      const grad = ctx.createLinearGradient(0, chartY, 0, chartY + chartH);
      grad.addColorStop(0, accent);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.05)');

      ctx.beginPath();
      ctx.moveTo(chartX, chartY + chartH);
      pts.forEach((p) => {
        const px = chartX + (p.dist / totalDist) * chartW;
        const py = getY(p.pace);
        ctx.lineTo(px, py);
      });
      ctx.lineTo(chartX + chartW, chartY + chartH);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.3;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Line stroke
    ctx.beginPath();
    pts.forEach((p, idx) => {
      const px = chartX + (p.dist / totalDist) * chartW;
      const py = getY(p.pace);
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Average Pace dashed baseline
    const avgY = getY(activity.avgPace);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(chartX, avgY);
    ctx.lineTo(chartX + chartW, avgY);
    ctx.stroke();
    ctx.setLineDash([]);

    if (activity.runnerPoint) {
      const curY = getY(activity.avgPace);
      this.drawChartScanningCursor(ctx, chartX, chartY, chartW, chartH, activity.runnerPoint.dist, totalDist, curY, activity.avgPaceFormatted, accent, font);
    }

    ctx.restore();
    return y + height;
  }

  // =========================================================================
  // WIDGET 9: HEART RATE GRAPH
  // Designs: 'filled-area', 'ecg-wave', 'zone-bars', 'pulse-glow'
  // =========================================================================
  drawHeartRateGraph(ctx, x, y, width, height, activity, config, theme, accent) {
    const pts = activity.hrCurve || [];
    if (!pts || pts.length < 3) return y;

    ctx.save();
    const elStyle = this.getElementStyle(config, 'hrGraph');
    const { text, textMuted, accent: elAccent, cardStyle, align, opacity } = this.getEffectiveColors(config, theme, accent, 'hrGraph');
    if (opacity < 1) ctx.globalAlpha = opacity;
    accent = elAccent;

    const font = this.getFontFamily(elStyle.fontFamily !== 'default' ? elStyle.fontFamily : config.fontFamily);
    const design = config.hrGraphDesign || 'filled-area';
    this.recordBounds('hrGraph', 'Heart Rate Graph', x, y, width, height);

    this.drawWidgetCardBg(ctx, 'hrGraph', x, y, width, height, config, theme);

    const offTitle = this.getElementOffset(config, 'hrGraph', 'title');
    const offStat = this.getElementOffset(config, 'hrGraph', 'stat');
    const offChart = this.getElementOffset(config, 'hrGraph', 'chart');

    const pad = 16;
    const chartW = width - pad * 2;
    const chartH = height - 38;
    const chartX = x + pad;
    const chartY = y + 28;

    const hrTitle = this.getTextOverride(config, 'hrGraph', 'title', 'HEART RATE PROFILE');
    if (!offTitle.hidden && hrTitle) {
      ctx.save();
      this.applyZDepth(ctx, offTitle.z);
      ctx.textAlign = 'left';
      ctx.fillStyle = theme.textMuted;
      ctx.font = this.getSubPartFont(config, 'hrGraph', 'title', 'bold', 11);
      ctx.fillText(hrTitle, chartX + offTitle.x, y + 18 + offTitle.y);
      ctx.restore();
    }

    if (!offStat.hidden) {
      ctx.save();
      this.applyZDepth(ctx, offStat.z);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ef4444';
      ctx.font = this.getSubPartFont(config, 'hrGraph', 'stat', 'bold', 11);
      const defaultHrStat = activity.isAnimated && activity.liveHr
        ? `LIVE: ${activity.liveHr} BPM  •  AVG: ${activity.avgHr || '--'} BPM`
        : `AVG: ${activity.avgHr || '--'} BPM  •  MAX: ${activity.maxHr || '--'}`;
      const hrStat = this.getTextOverride(config, 'hrGraph', 'stat', defaultHrStat);
      ctx.fillText(hrStat, chartX + chartW + offStat.x, y + 18 + offStat.y);
      ctx.restore();
    }

    if (offChart.hidden) {
      ctx.restore();
      return;
    }

    const minH = activity.fullMinHr != null ? activity.fullMinHr : (activity.minHr || 120);
    const maxH = Math.max(minH + 20, activity.fullMaxHr != null ? activity.fullMaxHr : (activity.maxHr || 185));
    const dH = maxH - minH;
    const totalDist = activity.fullDistance || activity.distance || 1;

    const getY = (hr) => chartY + chartH - ((hr - minH) / dH) * chartH;

    if (design === 'zone-gradient-strip') {
      // Style 5: Continuous Z1-Z5 Multi-Zone Color Gradient
      const grad = ctx.createLinearGradient(0, chartY + chartH, 0, chartY);
      grad.addColorStop(0, '#3b82f6');
      grad.addColorStop(0.3, '#10b981');
      grad.addColorStop(0.6, '#f59e0b');
      grad.addColorStop(0.85, '#f97316');
      grad.addColorStop(1, '#ef4444');

      ctx.beginPath();
      ctx.moveTo(chartX, chartY + chartH);
      pts.forEach((p) => {
        const px = chartX + (p.dist / totalDist) * chartW;
        const py = getY(p.hr);
        ctx.lineTo(px, py);
      });
      ctx.lineTo(chartX + chartW, chartY + chartH);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.45;
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.beginPath();
      pts.forEach((p, idx) => {
        const px = chartX + (p.dist / totalDist) * chartW;
        const py = getY(p.hr);
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.strokeStyle = grad;
      ctx.lineWidth = 3;
      ctx.stroke();

      if (activity.runnerPoint) {
        const curY = getY(activity.runnerPoint.hr);
        this.drawChartScanningCursor(ctx, chartX, chartY, chartW, chartH, activity.runnerPoint.dist, totalDist, curY, `${activity.runnerPoint.hr} BPM`, '#ef4444', font);
      }
      ctx.restore();
      return y + height;
    }

    if (design === 'cardiac-monitor') {
      // Style 6: Pro Cardiac Oscilloscope CRT Display
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.15)';
      ctx.lineWidth = 1;
      for (let gx = chartX; gx <= chartX + chartW; gx += 30) {
        ctx.beginPath(); ctx.moveTo(gx, chartY); ctx.lineTo(gx, chartY + chartH); ctx.stroke();
      }

      ctx.beginPath();
      pts.forEach((p, idx) => {
        const px = chartX + (p.dist / totalDist) * chartW;
        const py = getY(p.hr);
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;

      const lastP = pts[pts.length - 1];
      const endX = chartX + chartW;
      const endY = getY(lastP.hr);
      ctx.fillStyle = '#10b981';
      ctx.beginPath(); ctx.arc(endX, endY, 5, 0, Math.PI * 2); ctx.fill();

      if (activity.runnerPoint) {
        const curY = getY(activity.runnerPoint.hr);
        this.drawChartScanningCursor(ctx, chartX, chartY, chartW, chartH, activity.runnerPoint.dist, totalDist, curY, `${activity.runnerPoint.hr} BPM`, '#10b981', font);
      }
      ctx.restore();
      return y + height;
    }

    if (design === 'zone-bars') {
      // 5-Zone Colored Vertical Frequency Bars
      const barCount = Math.min(30, pts.length);
      const step = Math.floor(pts.length / barCount);
      const bW = chartW / barCount - 2;

      for (let i = 0; i < barCount; i++) {
        const pt = pts[i * step] || pts[pts.length - 1];
        const bx = chartX + i * (bW + 2);
        const bh = ((pt.hr - minH) / dH) * chartH;
        const by = chartY + chartH - bh;

        let zCol = '#3b82f6';
        if (pt.hr > 170) zCol = '#ef4444';
        else if (pt.hr > 155) zCol = '#f97316';
        else if (pt.hr > 140) zCol = '#10b981';

        ctx.fillStyle = zCol;
        this.drawRoundedRect(ctx, bx, by, bW, bh, 2);
        ctx.fill();
      }
    } else {
      if (design === 'filled-area' || design === 'pulse-glow') {
        const grad = ctx.createLinearGradient(0, chartY, 0, chartY + chartH);
        grad.addColorStop(0, 'rgba(239, 68, 68, 0.7)');
        grad.addColorStop(1, 'rgba(239, 68, 68, 0.05)');

        ctx.beginPath();
        ctx.moveTo(chartX, chartY + chartH);
        pts.forEach((p) => {
          const px = chartX + (p.dist / totalDist) * chartW;
          const py = getY(p.hr);
          ctx.lineTo(px, py);
        });
        ctx.lineTo(chartX + chartW, chartY + chartH);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Line stroke
      ctx.beginPath();
      pts.forEach((p, idx) => {
        const px = chartX + (p.dist / totalDist) * chartW;
        const py = getY(p.hr);
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = design === 'pulse-glow' ? 3.5 : 2.5;
      if (design === 'pulse-glow') {
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 10;
      }
      ctx.stroke();
    }

    if (activity.runnerPoint) {
      const curY = getY(activity.runnerPoint.hr);
      this.drawChartScanningCursor(ctx, chartX, chartY, chartW, chartH, activity.runnerPoint.dist, totalDist, curY, `${activity.runnerPoint.hr} BPM`, '#ef4444', font);
    }

    ctx.restore();
    return y + height;
  }

  // =========================================================================
  // WIDGET 10: AVERAGE HEART RATE BADGE
  // Designs: 'pill', 'card', 'heart-gauge', 'compact-tag'
  // =========================================================================
  drawAvgHeartRateBadge(ctx, x, y, width, activity, config, theme, accent, customH = null) {
    if (!activity.avgHr) return y;

    ctx.save();
    const elStyle = this.getElementStyle(config, 'hrBadge');
    const { text, textMuted, accent: elAccent, cardStyle, align, opacity } = this.getEffectiveColors(config, theme, accent, 'hrBadge');
    if (opacity < 1) ctx.globalAlpha = opacity;

    const font = this.getFontFamily(elStyle.fontFamily !== 'default' ? elStyle.fontFamily : config.fontFamily);
    const design = config.hrBadgeDesign || 'pill';
    const h = customH || 60;
    this.recordBounds('hrBadge', 'Avg HR Badge', x, y, width, h);
    this.drawWidgetCardBg(ctx, 'hrBadge', x, y, width, h, config, theme, true);

    const offIcon = this.getElementOffset(config, 'hrBadge', 'icon');
    const offLabel = this.getElementOffset(config, 'hrBadge', 'label');
    const offVal = this.getElementOffset(config, 'hrBadge', 'val');
    const offUnit = this.getElementOffset(config, 'hrBadge', 'unit');
    const offPeak = this.getElementOffset(config, 'hrBadge', 'peak');

    const isLive = activity.isAnimated && activity.progress < 0.999;
    const labelOverride = this.getTextOverride(config, 'hrBadge', 'label', null);
    const unitOverride = this.getTextOverride(config, 'hrBadge', 'unit', 'BPM');

    if (design === 'zone-badge') {
      // Style 5: Multi-Zone Telemetry Capsule
      const cardH = customH || 86;
      this.drawWidgetCardBg(ctx, 'hrBadge', x, y, width, cardH, config, theme, true);

      // Determine Zone based on avgHr
      const hr = activity.avgHr;
      let zoneNum = 2;
      let zoneName = 'AEROBIC';
      let zoneCol = '#10b981';
      if (hr < 120) { zoneNum = 1; zoneName = 'RECOVERY'; zoneCol = '#3b82f6'; }
      else if (hr < 142) { zoneNum = 2; zoneName = 'AEROBIC'; zoneCol = '#10b981'; }
      else if (hr < 158) { zoneNum = 3; zoneName = 'TEMPO'; zoneCol = '#f59e0b'; }
      else if (hr < 172) { zoneNum = 4; zoneName = 'THRESHOLD'; zoneCol = '#f97316'; }
      else { zoneNum = 5; zoneName = 'ANAEROBIC'; zoneCol = '#ef4444'; }

      // Top bar with Zone pills
      const pillGap = 6;
      const totalPillW = 140;
      const pillW = (totalPillW - pillGap * 4) / 5;
      const pillH = 6;
      const zoneColors = ['#3b82f6', '#10b981', '#f59e0b', '#f97316', '#ef4444'];
      const pX = x + width - totalPillW - 20;
      const pY = y + 24;

      zoneColors.forEach((zc, idx) => {
        ctx.fillStyle = (idx + 1 === zoneNum) ? zc : 'rgba(255,255,255,0.15)';
        this.drawRoundedRect(ctx, pX + idx * (pillW + pillGap), pY, pillW, pillH, 3);
        ctx.fill();
        if (idx + 1 === zoneNum) {
          ctx.shadowColor = zc;
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // Label
      if (!offLabel.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offLabel.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = theme.textMuted;
        ctx.font = this.getSubPartFont(config, 'hrBadge', 'label', 'bold', 11);
        ctx.letterSpacing = '1px';
        const defaultHrLabel = isLive ? 'LIVE HEART RATE' : 'HEART RATE INTENSITY';
        ctx.fillText(labelOverride || defaultHrLabel, x + 20 + offLabel.x, y + 28 + offLabel.y);
        ctx.restore();
      }

      // Value
      if (!offVal.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offVal.z);
        ctx.fillStyle = '#ffffff';
        ctx.font = this.getSubPartFont(config, 'hrBadge', 'val', '900', 36);
        ctx.fillText(`${activity.avgHr}`, x + 20 + offVal.x, y + 68 + offVal.y);
        ctx.restore();
      }

      // Unit
      if (!offUnit.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offUnit.z);
        const valW = offVal.hidden ? 0 : ctx.measureText(`${activity.avgHr}`).width;
        ctx.fillStyle = zoneCol;
        ctx.font = this.getSubPartFont(config, 'hrBadge', 'unit', 'bold', 16);
        ctx.fillText(unitOverride, x + 24 + valW + offUnit.x, y + 66 + offUnit.y);
        ctx.restore();
      }

      // Zone tag badge on right
      if (!offPeak.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offPeak.z);
        const tagW = 90;
        const tagH = 24;
        const tagX = x + width - tagW - 20 + offPeak.x;
        const tagY = y + 46 + offPeak.y;
        this.drawRoundedRect(ctx, tagX, tagY, tagW, tagH, 12);
        ctx.fillStyle = `${zoneCol}22`;
        ctx.fill();
        ctx.strokeStyle = zoneCol;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.fillStyle = zoneCol;
        ctx.font = this.getSubPartFont(config, 'hrBadge', 'peak', '900', 11);
        const defaultZoneText = `ZONE ${zoneNum} • ${zoneName}`;
        const zoneText = this.getTextOverride(config, 'hrBadge', 'peak', defaultZoneText);
        ctx.fillText(zoneText, tagX + tagW / 2, tagY + 16);
        ctx.restore();
      }

      ctx.restore();
      return y + cardH;
    }

    if (design === 'lcd-pulse') {
      // Style 6: Cardiac Monitor Oscilloscope LCD
      const cardH = customH || 84;
      this.drawRoundedRect(ctx, x, y, width, cardH, 12);
      ctx.fillStyle = '#060d13';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 245, 212, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Mini ECG waveform line across bottom background
      ctx.save();
      ctx.beginPath();
      const ecgY = y + 54;
      const ecgPts = [
        0, 0, 0.15, 0, 0.2, -6, 0.23, 14, 0.27, -22, 0.31, 8, 0.35, 0,
        0.5, 0, 0.65, 0, 0.7, -6, 0.73, 14, 0.77, -22, 0.81, 8, 0.85, 0, 1.0, 0
      ];
      for (let i = 0; i < ecgPts.length; i += 2) {
        const px = x + ecgPts[i] * width;
        const py = ecgY + ecgPts[i + 1];
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = 'rgba(0, 245, 212, 0.25)';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.restore();

      // Blinking Pulse Dot / Icon
      if (!offIcon.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offIcon.z);
        ctx.fillStyle = '#00f5d4';
        ctx.shadowColor = '#00f5d4';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(x + 24 + offIcon.x, y + 26 + offIcon.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      if (!offLabel.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offLabel.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#00f5d4';
        ctx.font = this.getSubPartFont(config, 'hrBadge', 'label', 'bold', 11);
        ctx.letterSpacing = '1.5px';
        ctx.fillText(labelOverride || 'CARDIAC PULSE TELEMETRY', x + 38 + offLabel.x, y + 30 + offLabel.y);
        ctx.restore();
      }

      if (!offVal.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offVal.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        ctx.font = this.getSubPartFont(config, 'hrBadge', 'val', '900', 36);
        ctx.fillText(`${activity.avgHr}`, x + 24 + offVal.x, y + 68 + offVal.y);
        ctx.restore();
      }

      if (!offUnit.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offUnit.z);
        const valW = offVal.hidden ? 0 : ctx.measureText(`${activity.avgHr}`).width;
        ctx.fillStyle = '#00f5d4';
        ctx.font = this.getSubPartFont(config, 'hrBadge', 'unit', 'bold', 16);
        ctx.fillText(unitOverride, x + 28 + valW + offUnit.x, y + 66 + offUnit.y);
        ctx.restore();
      }

      if (!offPeak.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offPeak.z);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#94a3b8';
        ctx.font = this.getSubPartFont(config, 'hrBadge', 'peak', 'bold', 12);
        const peakDefault = `PEAK: ${activity.maxHr} ${unitOverride}`;
        const peakText = this.getTextOverride(config, 'hrBadge', 'peak', peakDefault);
        ctx.fillText(peakText, x + width - 20 + offPeak.x, y + 66 + offPeak.y);
        ctx.restore();
      }

      ctx.restore();
      return y + cardH;
    }


    if (design === 'vertical-hr-thermometer') {
      // Style: Vertical Zone Thermometer (5-Zone Meter Column)
      const cardH = customH || 86;
      this.drawWidgetCardBg(ctx, 'hrBadge', x, y, width, cardH, config, theme, true);

      // Meter on right
      const meterW = 10;
      const meterH = cardH - 24;
      const meterX = x + width - meterW - 20;
      const meterY = y + 12;

      const zones = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6'];
      const segH = meterH / 5;
      zones.forEach((col, idx) => {
        ctx.fillStyle = col;
        ctx.fillRect(meterX, meterY + idx * segH, meterW, segH - 1);
      });

      // Left stats
      ctx.textAlign = 'left';
      ctx.fillStyle = elAccent;
      ctx.font = '16px sans-serif';
      ctx.fillText('❤️', x + 16, y + 34);

      ctx.save();
      this.applyZDepth(ctx, offVal.z);
      ctx.fillStyle = this.getSubPartColor(config, 'hrBadge', 'val', text);
      ctx.font = this.getSubPartFont(config, 'hrBadge', 'val', 'bold', 28);
      ctx.fillText(String(activity.avgHr), x + 44 + offVal.x, y + 42 + offVal.y);
      ctx.restore();

      ctx.save();
      this.applyZDepth(ctx, offLabel.z);
      ctx.fillStyle = this.getSubPartColor(config, 'hrBadge', 'label', textMuted);
      ctx.font = this.getSubPartFont(config, 'hrBadge', 'label', 'bold', 10);
      const defaultThermometerLabel = isLive ? 'LIVE HEART RATE' : 'AVG HEART RATE';
      ctx.fillText(labelOverride || defaultThermometerLabel, x + 16 + offLabel.x, y + 66 + offLabel.y);
      ctx.restore();

      ctx.restore();
      return y + cardH;
    }

    if (design === 'tactical-ecg-card') {
      // Style: ECG Telemetry Strip (Oscilloscope CRT Strip)
      const cardH = customH || 68;
      this.drawWidgetCardBg(ctx, 'hrBadge', x, y, width, cardH, config, theme, true);

      // Oscilloscope ECG wave in background
      const waveX = x + 100;
      const waveW = width - 120;
      const waveCy = y + cardH / 2;
      ctx.save();
      ctx.strokeStyle = elAccent;
      ctx.lineWidth = 1.8;
      ctx.shadowColor = elAccent;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(waveX, waveCy);
      ctx.lineTo(waveX + waveW * 0.2, waveCy);
      ctx.lineTo(waveX + waveW * 0.28, waveCy - 16);
      ctx.lineTo(waveX + waveW * 0.36, waveCy + 14);
      ctx.lineTo(waveX + waveW * 0.44, waveCy - 4);
      ctx.lineTo(waveX + waveW * 0.52, waveCy);
      ctx.lineTo(waveX + waveW, waveCy);
      ctx.stroke();
      ctx.restore();

      // Left BPM readout
      ctx.textAlign = 'left';
      ctx.fillStyle = this.getSubPartColor(config, 'hrBadge', 'val', text);
      ctx.font = this.getSubPartFont(config, 'hrBadge', 'val', 'bold', 24);
      ctx.fillText(`${activity.avgHr}`, x + 16, y + 36);

      ctx.fillStyle = elAccent;
      ctx.font = 'bold 10px monospace';
      ctx.fillText('BPM // ECG', x + 16, y + 54);

      ctx.restore();
      return y + cardH;
    }

    if (design === 'heart-gauge') {
      // Style 3: Circular Radial Gauge Badge
      const cardH = customH || 82;
      this.drawCardBackground(ctx, x, y, width, cardH, config, theme, true);
      const cx = x + 44;
      const cy = y + cardH / 2;
      const r = 26;

      ctx.strokeStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI * 0.7); ctx.stroke();

      if (!offIcon.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offIcon.z);
        ctx.fillStyle = '#ef4444';
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('❤️', cx + offIcon.x, cy + 7 + offIcon.y);
        ctx.restore();
      }

      if (!offLabel.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offLabel.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = theme.textMuted;
        ctx.font = this.getSubPartFont(config, 'hrBadge', 'label', 'bold', 11);
        const defaultGaugeLabel = isLive ? 'LIVE HEART RATE' : 'HEART RATE ZONE';
        ctx.fillText(labelOverride || defaultGaugeLabel, x + 84 + offLabel.x, y + 30 + offLabel.y);
        ctx.restore();
      }

      if (!offVal.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offVal.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        ctx.font = this.getSubPartFont(config, 'hrBadge', 'val', 'bold', 32);
        const valStr = offUnit.hidden ? `${activity.avgHr}` : `${activity.avgHr} ${unitOverride}`;
        ctx.fillText(valStr, x + 84 + offVal.x, y + 64 + offVal.y);
        ctx.restore();
      }

      if (!offPeak.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offPeak.z);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#fca5a5';
        ctx.font = this.getSubPartFont(config, 'hrBadge', 'peak', 'bold', 13);
        const peakDefault = `MAX ${activity.maxHr} ${unitOverride}`;
        const peakText = this.getTextOverride(config, 'hrBadge', 'peak', peakDefault);
        ctx.fillText(peakText, x + width - 20 + offPeak.x, y + 46 + offPeak.y);
        ctx.restore();
      }

      ctx.restore();
      return y + cardH;
    }

    if (design === 'compact-tag') {
      // Style 4: Minimal Smartwatch Complication
      this.drawRoundedRect(ctx, x, y, width, h, 8);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (!offIcon.hidden || !offUnit.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offIcon.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ef4444';
        ctx.font = this.getSubPartFont(config, 'hrBadge', 'unit', 'bold', 16);
        const tagIcon = offIcon.hidden ? '' : '❤️ ';
        const tagUnit = offUnit.hidden ? '' : unitOverride;
        ctx.fillText(`${tagIcon}${tagUnit}`.trim(), x + 16 + offIcon.x, y + h / 2 + 5 + offIcon.y);
        ctx.restore();
      }

      if (!offVal.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offVal.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        ctx.font = this.getSubPartFont(config, 'hrBadge', 'val', 'bold', 22);
        ctx.fillText(`${activity.avgHr}`, x + 82 + offVal.x, y + h / 2 + 6 + offVal.y);
        ctx.restore();
      }

      if (!offPeak.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offPeak.z);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#fca5a5';
        ctx.font = this.getSubPartFont(config, 'hrBadge', 'peak', 'bold', 12);
        const peakDefault = `PEAK: ${activity.maxHr}`;
        const peakText = this.getTextOverride(config, 'hrBadge', 'peak', peakDefault);
        ctx.fillText(peakText, x + width - 16 + offPeak.x, y + h / 2 + 5 + offPeak.y);
        ctx.restore();
      }

      ctx.restore();
      return y + h;
    }

    if (design === 'card') {
      const cardH = customH || 80;
      this.drawCardBackground(ctx, x, y, width, cardH, config, theme, true);
      if (!offLabel.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offLabel.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = theme.textMuted;
        ctx.font = this.getSubPartFont(config, 'hrBadge', 'label', 'bold', 12);
        const defaultCardLabel = isLive ? 'LIVE HEART RATE' : 'AVERAGE HEART RATE';
        ctx.fillText(labelOverride || defaultCardLabel, x + 20 + offLabel.x, y + 26 + offLabel.y);
        ctx.restore();
      }

      if (!offVal.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offVal.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ef4444';
        ctx.font = this.getSubPartFont(config, 'hrBadge', 'val', 'bold', 38);
        ctx.fillText(`${activity.avgHr}`, x + 20 + offVal.x, y + 64 + offVal.y);
        ctx.restore();
      }

      if (!offUnit.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offUnit.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = theme.text;
        ctx.font = this.getSubPartFont(config, 'hrBadge', 'unit', 'bold', 18);
        ctx.fillText(unitOverride, x + 90 + offUnit.x, y + 62 + offUnit.y);
        ctx.restore();
      }

      if (!offPeak.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offPeak.z);
        ctx.textAlign = 'right';
        ctx.fillStyle = theme.textMuted;
        ctx.font = this.getSubPartFont(config, 'hrBadge', 'peak', '600', 13);
        const peakDefault = `PEAK: ${activity.maxHr} ${unitOverride}`;
        const peakText = this.getTextOverride(config, 'hrBadge', 'peak', peakDefault);
        ctx.fillText(peakText, x + width - 20 + offPeak.x, y + 45 + offPeak.y);
        ctx.restore();
      }

      ctx.restore();
      return y + cardH;
    }

    // Default 'pill':
    this.drawRoundedRect(ctx, x, y, width, h, 30);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (!offIcon.hidden) {
      ctx.save();
      this.applyZDepth(ctx, offIcon.z);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ef4444';
      ctx.font = this.getSubPartFont(config, 'hrBadge', 'icon', 'bold', 22);
      ctx.fillText('❤️', x + 20 + offIcon.x, y + 37 + offIcon.y);
      ctx.restore();
    }

    if (!offVal.hidden || !offLabel.hidden || !offUnit.hidden) {
      ctx.save();
      this.applyZDepth(ctx, offVal.z);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.font = this.getSubPartFont(config, 'hrBadge', 'val', 'bold', 20);
      const defaultPillLabel = isLive ? 'LIVE HEART RATE' : 'AVG HEART RATE';
      const labelPart = offLabel.hidden ? '' : (labelOverride || defaultPillLabel) + ': ';
      const valPart = offVal.hidden ? '' : `${activity.avgHr} `;
      const unitPart = offUnit.hidden ? '' : unitOverride;
      ctx.fillText(`${labelPart}${valPart}${unitPart}`.trim(), x + 54 + offVal.x, y + 36 + offVal.y);
      ctx.restore();
    }

    if (!offPeak.hidden) {
      ctx.save();
      this.applyZDepth(ctx, offPeak.z);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fca5a5';
      ctx.font = this.getSubPartFont(config, 'hrBadge', 'peak', 'bold', 14);
      const peakDefault = `MAX: ${activity.maxHr} ${unitOverride}`;
      const peakText = this.getTextOverride(config, 'hrBadge', 'peak', peakDefault);
      ctx.fillText(peakText, x + width - 24 + offPeak.x, y + 36 + offPeak.y);
      ctx.restore();
    }

    ctx.restore();
    return y + h;
  }

  // =========================================================================
  // WIDGET 11: HR ZONES BAR
  // =========================================================================
  drawHrZonesBar(ctx, x, y, width, activity, config, theme, accent, customH = null) {
    const zones = activity.hrZones;
    if (!zones) return y;

    ctx.save();
    const font = this.getFontFamily(config.fontFamily);
    const h = customH || 40;
    this.recordBounds('hrZones', 'HR Zones Bar', x, y, width, h);

    const pad = 12;
    const barW = width - pad * 2;
    const barY = y + 16;
    const barH = 12;

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#f97316', '#ef4444'];
    let curX = x + pad;

    zones.forEach((z, idx) => {
      const zw = barW * z.percent;
      if (zw > 0) {
        ctx.fillStyle = colors[idx % colors.length];
        this.drawRoundedRect(ctx, curX, barY, zw, barH, idx === 0 ? 4 : idx === zones.length - 1 ? 4 : 0);
        ctx.fill();
        curX += zw;
      }
    });

    ctx.restore();
    return y + h;
  }

  drawFloatingHudPill(ctx, x, y, width, activity, config, theme, accent) {
    const h = 70;
    this.drawRoundedRect(ctx, x, y, width, h, 35);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const font = this.getFontFamily(config.fontFamily);
    const colW = width / 3;

    // Dist
    ctx.textAlign = 'center';
    ctx.fillStyle = accent;
    ctx.font = `bold 11px ${font}`;
    ctx.fillText('DISTANCE', x + colW * 0.5, y + 26);
    ctx.fillStyle = '#fff';
    ctx.font = `bold 22px ${font}`;
    ctx.fillText(`${activity.distanceMain} ${activity.distanceUnit}`, x + colW * 0.5, y + 54);

    // Time
    ctx.fillStyle = accent;
    ctx.font = `bold 11px ${font}`;
    ctx.fillText('TIME', x + colW * 1.5, y + 26);
    ctx.fillStyle = '#fff';
    ctx.font = `bold 22px ${font}`;
    ctx.fillText(activity.durationFormatted, x + colW * 1.5, y + 54);

    // Pace
    ctx.fillStyle = accent;
    ctx.font = `bold 11px ${font}`;
    ctx.fillText('PACE', x + colW * 2.5, y + 26);
    ctx.fillStyle = '#fff';
    ctx.font = `bold 22px ${font}`;
    ctx.fillText(activity.avgPaceFormatted, x + colW * 2.5, y + 54);
  }

  drawMiniSplitsBar(ctx, x, y, width, activity, config, theme, accent) {
    const splits = activity.splits || [];
    if (splits.length === 0) return;

    const count = Math.min(splits.length, 12);
    const gap = 4;
    const barW = (width - gap * (count - 1)) / count;
    const barH = 24;
    const isAnim = activity.isAnimated && splits.some((s) => s.isCompleted !== undefined);

    splits.slice(0, count).forEach((s, idx) => {
      const bx = x + idx * (barW + gap);
      if (isAnim && s.isPending) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        this.drawRoundedRect(ctx, bx, y, barW, barH, 4);
        ctx.fill();
      } else if (isAnim && s.isCurrent) {
        // Ghost background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        this.drawRoundedRect(ctx, bx, y, barW, barH, 4);
        ctx.fill();

        // Growing fill
        const fillW = Math.max(3, barW * (s.splitProgress || 0.1));
        ctx.fillStyle = accent;
        ctx.shadowColor = accent;
        ctx.shadowBlur = 8;
        this.drawRoundedRect(ctx, bx, y, fillW, barH, 4);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = s.isFastest ? accent : (isAnim ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.4)');
        this.drawRoundedRect(ctx, bx, y, barW, barH, 4);
        ctx.fill();
      }
    });
  }

  drawCompactSummaryPill(ctx, x, y, width, activity, config, theme, accent) {
    const h = 50;
    this.drawRoundedRect(ctx, x, y, width, h, 25);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fill();

    const font = this.getFontFamily(config.fontFamily);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 16px ${font}`;
    ctx.fillText(`${activity.distanceMain} ${activity.distanceUnit}  •  ${activity.durationFormatted}  •  ${activity.avgPaceFormatted}`, x + width / 2, y + 31);
    return y + h;
  }

  drawBrandWatermark(ctx, x, y, width, config, theme, accent, customH = null) {
    ctx.save();
    const elStyle = this.getElementStyle(config, 'brand');
    const { text, textMuted, accent: elAccent, align, opacity } = this.getEffectiveColors(config, theme, accent, 'brand');
    if (opacity < 1) ctx.globalAlpha = opacity;
    accent = elAccent;

    const font = this.getFontFamily(elStyle.fontFamily !== 'default' ? elStyle.fontFamily : config.fontFamily);
    const h = customH || 24;
    this.recordBounds('brand', 'Watermark / Brand', x, y - 14, width, h);

    const brandStyle = config.brandStyle || 'runcut';
    let brandText = '⚡ RUNOVERLAY';

    if (brandStyle === 'strava') {
      brandText = 'STRAVA RUNNER';
    } else if (brandStyle === 'nike') {
      brandText = 'JUST DO IT • RUN CLUB';
    } else if (brandStyle === 'custom' && config.customWatermark) {
      brandText = config.customWatermark.toUpperCase();
    }

    brandText = this.getTextOverride(config, 'brand', 'text', brandText);

    const offText = this.getElementOffset(config, 'brand', 'text');
    if (offText.hidden) {
      ctx.restore();
      return;
    }

    this.applyZDepth(ctx, offText.z);
    ctx.textAlign = 'center';
    ctx.font = this.getSubPartFont(config, 'brand', 'text', 'bold', 12);
    ctx.letterSpacing = '2px';
    const brandDefColor = config.brandStyle === 'strava' ? '#fc5200' : 'rgba(255, 255, 255, 0.6)';
    ctx.fillStyle = this.getSubPartColor(config, 'brand', 'text', brandDefColor);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 6;
    ctx.fillText(brandText, x + width / 2 + offText.x, y + offText.y);

    ctx.restore();
  }

  // =========================================================================
  // CUSTOM TEXTS & STICKERS RENDERER
  // =========================================================================
  drawCustomTexts(ctx, w, h, customTexts, theme, accent) {
    if (!customTexts || !Array.isArray(customTexts) || customTexts.length === 0) return;

    ctx.save();
    customTexts.forEach((item, index) => {
      if (!item || !item.text) return;

      const fontKey = item.fontFamily || 'athletic';
      const font = this.getFontFamily(fontKey);
      const fontSize = item.fontSize || 36;
      const weight = item.fontWeight || 'bold';
      const color = item.color || '#ffffff';
      const bgStyle = item.bgStyle || 'none';
      const align = item.align || 'center';

      ctx.save();
      ctx.font = `${weight} ${fontSize}px ${font}`;

      const textMetrics = ctx.measureText(item.text);
      const textW = textMetrics.width;
      const textH = fontSize * 1.25;

      const padX = bgStyle === 'none' ? 0 : 20;
      const padY = bgStyle === 'none' ? 0 : 12;

      let boxW = item.width || (textW + padX * 2);
      let boxH = item.height || (textH + padY * 2);

      let x = item.x !== undefined ? item.x : (w - boxW) / 2;
      let y = item.y !== undefined ? item.y : (h - boxH) / 2;

      // Draw background if specified
      if (bgStyle === 'pill') {
        this.drawRoundedRect(ctx, x, y, boxW, boxH, boxH / 2);
        ctx.fillStyle = item.bgColor || 'rgba(0, 0, 0, 0.75)';
        ctx.fill();
        ctx.strokeStyle = item.borderColor || accent;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (bgStyle === 'card') {
        this.drawCardBackground(ctx, x, y, boxW, boxH, { cardStyle: 'glass', cardRadius: 16 }, theme);
      } else if (bgStyle === 'tape') {
        ctx.save();
        ctx.translate(x + boxW / 2, y + boxH / 2);
        ctx.rotate(-0.03); // Athletic tilt
        this.drawRoundedRect(ctx, -boxW / 2, -boxH / 2, boxW, boxH, 4);
        ctx.fillStyle = item.bgColor || '#ff3366';
        ctx.fill();
        ctx.restore();
      } else if (bgStyle === 'neon-box') {
        this.drawRoundedRect(ctx, x, y, boxW, boxH, 8);
        ctx.fillStyle = 'rgba(10, 10, 16, 0.85)';
        ctx.fill();
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2;
        ctx.shadowColor = accent;
        ctx.shadowBlur = 10;
        ctx.stroke();
      }

      // Draw Text
      ctx.fillStyle = color;
      ctx.textAlign = align;
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 8;

      let drawTextX = x + boxW / 2;
      if (align === 'left') drawTextX = x + padX;
      else if (align === 'right') drawTextX = x + boxW - padX;

      ctx.fillText(item.text, drawTextX, y + boxH / 2);
      ctx.restore();

      // Record bounds for drag & drop hit test
      const itemId = item.id || `custom_${index}`;
      this.recordBounds(itemId, item.text, x, y, boxW, boxH);
    });
    ctx.restore();
  }

  // ==========================================
  // CARD BACKGROUND HELPER
  // ==========================================
  drawCardBackground(ctx, x, y, w, h, config, theme, highlight = false) {
    const radius = config.cardRadius || 16;
    const style = config.cardStyle || 'glass';

    ctx.save();
    this.drawRoundedRect(ctx, x, y, w, h, radius);

    if (style === 'minimal') {
      ctx.strokeStyle = highlight ? theme.accent : 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (style === 'solid') {
      ctx.fillStyle = '#14141d';
      ctx.fill();
      ctx.strokeStyle = highlight ? theme.accent : 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
      return;
    }

    // Default 'glass' style
    ctx.fillStyle = highlight ? 'rgba(30, 30, 42, 0.85)' : theme.cardBg;
    ctx.fill();

    ctx.strokeStyle = highlight ? theme.accent : theme.cardBorder;
    ctx.lineWidth = highlight ? 1.5 : 1;
    ctx.stroke();

    ctx.restore();
  }

  drawRoundedRect(ctx, x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  getFontFamily(choice) {
    switch (choice) {
      case 'athletic':
        return "'Anton', 'Bebas Neue', 'Impact', sans-serif";
      case 'bebas':
        return "'Bebas Neue', 'Anton', sans-serif";
      case 'oswald':
        return "'Oswald', 'Anton', sans-serif";
      case 'montserrat':
        return "'Montserrat', -apple-system, sans-serif";
      case 'barlow':
        return "'Barlow Condensed', 'Bebas Neue', sans-serif";
      case 'tech':
      case 'cyber':
        return "'Rajdhani', 'Orbitron', monospace";
      case 'mono':
        return "'JetBrains Mono', 'Roboto Mono', monospace";
      case 'serif':
        return "'Playfair Display', 'Georgia', serif";
      case 'script':
        return "'Caveat', 'Brush Script MT', cursive";
      case 'modern':
      default:
        return "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif";
    }
  }

  interpolateColor(c1, c2, factor) {
    const r1 = parseInt(c1.substring(1, 3), 16);
    const g1 = parseInt(c1.substring(3, 5), 16);
    const b1 = parseInt(c1.substring(5, 7), 16);

    const r2 = parseInt(c2.substring(1, 3), 16);
    const g2 = parseInt(c2.substring(3, 5), 16);
    const b2 = parseInt(c2.substring(5, 7), 16);

    const r = Math.round(r1 + factor * (r2 - r1));
    const g = Math.round(g1 + factor * (g2 - g1));
    const b = Math.round(b1 + factor * (b2 - b1));

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
}
