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
  'custom': { width: 1080, height: 1080, label: 'Custom User Defined' },
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

  recordBounds(key, name, x, y, width, height, customRot = null) {
    if (!this.widgetBounds) this.widgetBounds = {};
    const rot = (typeof customRot === 'number')
      ? customRot
      : ((typeof this.currentWidgetRotation === 'number' && this.currentWidgetRotation !== 0)
          ? this.currentWidgetRotation
          : this.getWidgetRotation(this.currentConfig, key));
    this.widgetBounds[key] = {
      id: key,
      name: name,
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(width),
      height: Math.round(height),
      rotation: rot,
    };
  }

  getWidgetRotation(config, widgetKey) {
    if (config && config.widgetPositions && config.widgetPositions[widgetKey]) {
      const p = config.widgetPositions[widgetKey];
      if (typeof p.rotation === 'number' && !isNaN(p.rotation)) return p.rotation;
    }
    if (config && config.elementStyles && config.elementStyles[widgetKey]) {
      const st = config.elementStyles[widgetKey];
      if (typeof st.rotation === 'number' && !isNaN(st.rotation)) return st.rotation;
    }
    return 0;
  }

  applyWidgetRotation(ctx, config, widgetKey, x, y, width, height) {
    const rot = this.getWidgetRotation(config, widgetKey);
    this.currentWidgetRotation = rot;
    if (rot && rot !== 0) {
      const cx = x + width / 2;
      const cy = y + height / 2;
      ctx.translate(cx, cy);
      ctx.rotate((rot * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }
    this.setupTextEffectsHook(ctx, config, widgetKey);
    return rot;
  }

  getTextEffects(config, widgetKey, partKey = null) {
    const elStyle = this.getElementStyle(config, widgetKey) || {};
    let subPart = null;
    if (partKey && config && config.widgetElementOffsets && config.widgetElementOffsets[widgetKey]) {
      subPart = config.widgetElementOffsets[widgetKey][partKey];
    }

    // Shadow settings
    let shadowEnabled = false;
    let shadowColor = '#000000';
    let shadowBlur = 8;
    let shadowOffsetX = 0;
    let shadowOffsetY = 3;

    if (subPart && subPart.textShadow !== undefined) {
      if (typeof subPart.textShadow === 'object') {
        shadowEnabled = !!subPart.textShadow.enabled;
        if (subPart.textShadow.color) shadowColor = subPart.textShadow.color;
        if (typeof subPart.textShadow.blur === 'number') shadowBlur = subPart.textShadow.blur;
        if (typeof subPart.textShadow.offsetX === 'number') shadowOffsetX = subPart.textShadow.offsetX;
        if (typeof subPart.textShadow.offsetY === 'number') shadowOffsetY = subPart.textShadow.offsetY;
      } else {
        shadowEnabled = !!subPart.textShadow;
      }
      if (subPart.textShadowColor) shadowColor = subPart.textShadowColor;
      if (typeof subPart.textShadowBlur === 'number') shadowBlur = subPart.textShadowBlur;
      if (typeof subPart.textShadowOffsetX === 'number') shadowOffsetX = subPart.textShadowOffsetX;
      if (typeof subPart.textShadowOffsetY === 'number') shadowOffsetY = subPart.textShadowOffsetY;
    } else if (elStyle.textShadow !== undefined) {
      if (typeof elStyle.textShadow === 'object') {
        shadowEnabled = !!elStyle.textShadow.enabled;
        if (elStyle.textShadow.color) shadowColor = elStyle.textShadow.color;
        if (typeof elStyle.textShadow.blur === 'number') shadowBlur = elStyle.textShadow.blur;
        if (typeof elStyle.textShadow.offsetX === 'number') shadowOffsetX = elStyle.textShadow.offsetX;
        if (typeof elStyle.textShadow.offsetY === 'number') shadowOffsetY = elStyle.textShadow.offsetY;
      } else {
        shadowEnabled = !!elStyle.textShadow;
      }
      if (elStyle.textShadowColor) shadowColor = elStyle.textShadowColor;
      if (typeof elStyle.textShadowBlur === 'number') shadowBlur = elStyle.textShadowBlur;
      if (typeof elStyle.textShadowOffsetX === 'number') shadowOffsetX = elStyle.textShadowOffsetX;
      if (typeof elStyle.textShadowOffsetY === 'number') shadowOffsetY = elStyle.textShadowOffsetY;
    }

    // Outline settings
    let outlineEnabled = false;
    let outlineColor = '#000000';
    let outlineWidth = 2;

    if (subPart && subPart.textOutline !== undefined) {
      if (typeof subPart.textOutline === 'object') {
        outlineEnabled = !!subPart.textOutline.enabled;
        if (subPart.textOutline.color) outlineColor = subPart.textOutline.color;
        if (typeof subPart.textOutline.width === 'number') outlineWidth = subPart.textOutline.width;
      } else {
        outlineEnabled = !!subPart.textOutline;
      }
      if (subPart.textOutlineColor) outlineColor = subPart.textOutlineColor;
      if (typeof subPart.textOutlineWidth === 'number') outlineWidth = subPart.textOutlineWidth;
    } else if (elStyle.textOutline !== undefined) {
      if (typeof elStyle.textOutline === 'object') {
        outlineEnabled = !!elStyle.textOutline.enabled;
        if (elStyle.textOutline.color) outlineColor = elStyle.textOutline.color;
        if (typeof elStyle.textOutline.width === 'number') outlineWidth = elStyle.textOutline.width;
      } else {
        outlineEnabled = !!elStyle.textOutline;
      }
      if (elStyle.textOutlineColor) outlineColor = elStyle.textOutlineColor;
      if (typeof elStyle.textOutlineWidth === 'number') outlineWidth = elStyle.textOutlineWidth;
    }

    return {
      shadowEnabled,
      shadowColor,
      shadowBlur,
      shadowOffsetX,
      shadowOffsetY,
      outlineEnabled,
      outlineColor,
      outlineWidth,
      shadow: {
        enabled: shadowEnabled,
        color: shadowColor,
        blur: shadowBlur,
        offsetX: shadowOffsetX,
        offsetY: shadowOffsetY,
      },
      outline: {
        enabled: outlineEnabled,
        color: outlineColor,
        width: outlineWidth,
      },
    };
  }

  setupTextEffectsHook(ctx, config, widgetKey) {
    if (!ctx) return;
    const self = this;
    const widgetEffects = this.getTextEffects(config, widgetKey);
    const subPartOffsets = (config && config.widgetElementOffsets && config.widgetElementOffsets[widgetKey]) || {};
    const hasSubEffects = Object.values(subPartOffsets).some(
      (p) => p && (p.textShadow !== undefined || p.textOutline !== undefined)
    );

    if (!widgetEffects.shadowEnabled && !widgetEffects.outlineEnabled && !hasSubEffects) {
      return;
    }

    const origFillText = ctx.fillText;
    const origStrokeText = ctx.strokeText;
    const origSave = ctx.save;
    const origRestore = ctx.restore;
    let saveDepth = 1;

    ctx.save = function () {
      saveDepth++;
      return origSave.apply(ctx, arguments);
    };

    ctx.restore = function () {
      saveDepth--;
      if (saveDepth <= 0) {
        ctx.fillText = origFillText;
        ctx.strokeText = origStrokeText;
        ctx.save = origSave;
        ctx.restore = origRestore;
        self.currentSubPart = null;
        self.currentWidgetRotation = 0;
      }
      return origRestore.apply(ctx, arguments);
    };

    ctx.fillText = function (text, x, y, maxWidth) {
      if (text === null || text === undefined || text === '') return;
      const str = String(text);

      let effects = widgetEffects;
      if (self.currentSubPart && self.currentSubPart.widgetKey === widgetKey) {
        const pEffects = self.getTextEffects(config, widgetKey, self.currentSubPart.partKey);
        if (pEffects.shadowEnabled || pEffects.outlineEnabled) {
          effects = pEffects;
        }
      }

      if (effects.outlineEnabled) {
        origSave.call(ctx);
        ctx.lineWidth = (effects.outlineWidth || 2) * 2;
        ctx.strokeStyle = effects.outlineColor || '#000000';
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        if (effects.shadowEnabled) {
          ctx.shadowColor = effects.shadowColor || 'rgba(0,0,0,0.85)';
          ctx.shadowBlur = effects.shadowBlur !== undefined ? effects.shadowBlur : 8;
          ctx.shadowOffsetX = effects.shadowOffsetX || 0;
          ctx.shadowOffsetY = effects.shadowOffsetY || 3;
        }
        if (maxWidth !== undefined) {
          origStrokeText.call(ctx, str, x, y, maxWidth);
        } else {
          origStrokeText.call(ctx, str, x, y);
        }
        origRestore.call(ctx);
      }

      if (effects.shadowEnabled && !effects.outlineEnabled) {
        origSave.call(ctx);
        ctx.shadowColor = effects.shadowColor || 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = effects.shadowBlur !== undefined ? effects.shadowBlur : 8;
        ctx.shadowOffsetX = effects.shadowOffsetX || 0;
        ctx.shadowOffsetY = effects.shadowOffsetY || 3;
        if (maxWidth !== undefined) {
          origFillText.call(ctx, str, x, y, maxWidth);
        } else {
          origFillText.call(ctx, str, x, y);
        }
        origRestore.call(ctx);
      } else {
        if (maxWidth !== undefined) {
          origFillText.call(ctx, str, x, y, maxWidth);
        } else {
          origFillText.call(ctx, str, x, y);
        }
      }
    };
  }

  applySubPartEffects(ctx, config, widgetKey, partKey, cx = null, cy = null) {
    this.currentSubPart = { widgetKey, partKey };
    const off = this.getElementOffset(config, widgetKey, partKey);
    if (off && typeof off.rotation === 'number' && off.rotation !== 0 && cx !== null && cy !== null) {
      ctx.translate(cx, cy);
      ctx.rotate((off.rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }
  }

  getWidgetPos(config, key, defaultX, defaultY, defaultW, defaultH) {
    const rot = this.getWidgetRotation(config, key);
    if (config && config.widgetPositions && config.widgetPositions[key]) {
      const p = config.widgetPositions[key];
      return {
        x: p.x !== undefined ? p.x : defaultX,
        y: p.y !== undefined ? p.y : defaultY,
        width: p.width !== undefined ? p.width : defaultW,
        height: p.height !== undefined ? p.height : defaultH,
        rotation: typeof p.rotation === 'number' ? p.rotation : rot,
        isCustom: true,
      };
    }
    return {
      x: defaultX,
      y: defaultY,
      width: defaultW,
      height: defaultH,
      rotation: rot,
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
    if (config && config.widgetElementOffsets) {
      let offsets = config.widgetElementOffsets[widgetKey];
      if (!offsets && widgetKey && widgetKey.includes('_')) {
        const baseKey = widgetKey.split('_')[0];
        offsets = config.widgetElementOffsets[baseKey];
      }
      if (!offsets) {
        return { x: 0, y: 0, z: 1, hidden: false, scale: 100, fontFamily: 'default', color: 'default' };
      }
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


  getMetricItemOffsets(config, widgetKey, metricKey) {
    const globalLabel = this.getElementOffset(config, widgetKey, 'label');
    const globalVal = this.getElementOffset(config, widgetKey, 'val');
    const itemOff = this.getElementOffset(config, widgetKey, metricKey);
    const itemLabelOff = this.getElementOffset(config, widgetKey, `${metricKey}Label`);
    const itemValOff = this.getElementOffset(config, widgetKey, `${metricKey}Val`);

    const labelHidden = globalLabel.hidden || itemOff.hidden || itemLabelOff.hidden;
    const labelX = globalLabel.x + itemOff.x + itemLabelOff.x;
    const labelY = globalLabel.y + itemOff.y + itemLabelOff.y;
    const labelZ = Math.max(globalLabel.z, itemOff.z, itemLabelOff.z);
    const labelScale = ((globalLabel.scale || 100) / 100) * ((itemOff.scale || 100) / 100) * ((itemLabelOff.scale || 100) / 100);
    const labelFont = itemLabelOff.fontFamily !== 'default' ? itemLabelOff.fontFamily : (itemOff.fontFamily !== 'default' ? itemOff.fontFamily : globalLabel.fontFamily);
    const labelColor = itemLabelOff.color !== 'default' ? itemLabelOff.color : (itemOff.color !== 'default' ? itemOff.color : globalLabel.color);

    const valHidden = globalVal.hidden || itemOff.hidden || itemValOff.hidden;
    const valX = globalVal.x + itemOff.x + itemValOff.x;
    const valY = globalVal.y + itemOff.y + itemValOff.y;
    const valZ = Math.max(globalVal.z, itemOff.z, itemValOff.z);
    const valScale = ((globalVal.scale || 100) / 100) * ((itemOff.scale || 100) / 100) * ((itemValOff.scale || 100) / 100);
    const valFont = itemValOff.fontFamily !== 'default' ? itemValOff.fontFamily : (itemOff.fontFamily !== 'default' ? itemOff.fontFamily : globalVal.fontFamily);
    const valColor = itemValOff.color !== 'default' ? itemValOff.color : (itemOff.color !== 'default' ? itemOff.color : globalVal.color);

    return {
      item: itemOff,
      label: { x: labelX, y: labelY, z: labelZ, hidden: labelHidden, scale: labelScale, fontFamily: labelFont, color: labelColor },
      val: { x: valX, y: valY, z: valZ, hidden: valHidden, scale: valScale, fontFamily: valFont, color: valColor }
    };
  }

  getMetricFont(config, widgetKey, metricKey, partType = 'label', weight = 'bold', baseSize = 20) {
    const mOff = this.getMetricItemOffsets(config, widgetKey, metricKey);
    const target = partType === 'label' ? mOff.label : mOff.val;
    const el = this.getElementStyle(config, widgetKey);
    const fontName = (target.fontFamily && target.fontFamily !== 'default')
      ? target.fontFamily
      : (el.fontFamily && el.fontFamily !== 'default' ? el.fontFamily : config.fontFamily);
    const fontFam = this.getFontFamily(fontName);
    let widgetScale = typeof el.fontSizeScale === 'number' && !isNaN(el.fontSizeScale) ? el.fontSizeScale : 1.0;
    if (widgetScale > 5) widgetScale = widgetScale / 100;
    let subScale = typeof target.scale === 'number' && !isNaN(target.scale) ? target.scale : 1.0;
    const finalSize = Math.max(6, Math.round(baseSize * widgetScale * subScale));
    return `${weight} ${finalSize}px ${fontFam}`;
  }

  getSplitItemOffsets(config, widgetKey, splitIdx) {
    const lapLabelsOff = this.getElementOffset(config, widgetKey, 'lapLabels');
    const paceLabelsOff = this.getElementOffset(config, widgetKey, 'paceLabels');
    const barsOff = this.getElementOffset(config, widgetKey, 'bars');

    const splitOff = this.getElementOffset(config, widgetKey, `split_${splitIdx}`);
    const splitLapOff = this.getElementOffset(config, widgetKey, `split_lap_${splitIdx}`);
    const splitLabelAliasOff = this.getElementOffset(config, widgetKey, `split_label_${splitIdx}`);
    const effSplitLapOff = (splitLapOff.x !== 0 || splitLapOff.y !== 0 || splitLapOff.hidden || splitLapOff.color !== 'default' || splitLapOff.scale !== 100)
      ? splitLapOff : splitLabelAliasOff;

    const splitPaceOff = this.getElementOffset(config, widgetKey, `split_pace_${splitIdx}`);
    const splitBarOff = this.getElementOffset(config, widgetKey, `split_bar_${splitIdx}`);

    const lapHidden = lapLabelsOff.hidden || splitOff.hidden || effSplitLapOff.hidden;
    const lapX = lapLabelsOff.x + splitOff.x + effSplitLapOff.x;
    const lapY = lapLabelsOff.y + splitOff.y + effSplitLapOff.y;
    const lapZ = Math.max(lapLabelsOff.z, splitOff.z, effSplitLapOff.z);
    const lapScale = ((lapLabelsOff.scale || 100) / 100) * ((splitOff.scale || 100) / 100) * ((effSplitLapOff.scale || 100) / 100);
    const lapFont = effSplitLapOff.fontFamily !== 'default' ? effSplitLapOff.fontFamily : (splitOff.fontFamily !== 'default' ? splitOff.fontFamily : lapLabelsOff.fontFamily);
    const lapColor = effSplitLapOff.color !== 'default' ? effSplitLapOff.color : (splitOff.color !== 'default' ? splitOff.color : lapLabelsOff.color);

    const paceHidden = paceLabelsOff.hidden || splitOff.hidden || splitPaceOff.hidden;
    const paceX = paceLabelsOff.x + splitOff.x + splitPaceOff.x;
    const paceY = paceLabelsOff.y + splitOff.y + splitPaceOff.y;
    const paceZ = Math.max(paceLabelsOff.z, splitOff.z, splitPaceOff.z);
    const paceScale = ((paceLabelsOff.scale || 100) / 100) * ((splitOff.scale || 100) / 100) * ((splitPaceOff.scale || 100) / 100);
    const paceFont = splitPaceOff.fontFamily !== 'default' ? splitPaceOff.fontFamily : (splitOff.fontFamily !== 'default' ? splitOff.fontFamily : paceLabelsOff.fontFamily);
    const paceColor = splitPaceOff.color !== 'default' ? splitPaceOff.color : (splitOff.color !== 'default' ? splitOff.color : paceLabelsOff.color);

    const barHidden = barsOff.hidden || splitOff.hidden || splitBarOff.hidden;
    const barX = barsOff.x + splitOff.x + splitBarOff.x;
    const barY = barsOff.y + splitOff.y + splitBarOff.y;
    const barZ = Math.max(barsOff.z, splitOff.z, splitBarOff.z);
    const barScale = ((barsOff.scale || 100) / 100) * ((splitOff.scale || 100) / 100) * ((splitBarOff.scale || 100) / 100);
    const barColor = splitBarOff.color !== 'default' ? splitBarOff.color : (splitOff.color !== 'default' ? splitOff.color : barsOff.color);

    return {
      split: splitOff,
      lap: { x: lapX, y: lapY, z: lapZ, hidden: lapHidden, scale: lapScale, fontFamily: lapFont, color: lapColor },
      pace: { x: paceX, y: paceY, z: paceZ, hidden: paceHidden, scale: paceScale, fontFamily: paceFont, color: paceColor },
      bar: { x: barX, y: barY, z: barZ, hidden: barHidden, scale: barScale, color: barColor }
    };
  }

  getSplitFont(config, widgetKey, splitIdx, partType = 'lap', weight = 'bold', baseSize = 20) {
    const sOff = this.getSplitItemOffsets(config, widgetKey, splitIdx);
    const target = partType === 'lap' ? sOff.lap : sOff.pace;
    const el = this.getElementStyle(config, widgetKey);
    const fontName = (target.fontFamily && target.fontFamily !== 'default')
      ? target.fontFamily
      : (el.fontFamily && el.fontFamily !== 'default' ? el.fontFamily : config.fontFamily);
    const fontFam = this.getFontFamily(fontName);
    let widgetScale = typeof el.fontSizeScale === 'number' && !isNaN(el.fontSizeScale) ? el.fontSizeScale : 1.0;
    if (widgetScale > 5) widgetScale = widgetScale / 100;
    let subScale = typeof target.scale === 'number' && !isNaN(target.scale) ? target.scale : 1.0;
    const finalSize = Math.max(6, Math.round(baseSize * widgetScale * subScale));
    return `${weight} ${finalSize}px ${fontFam}`;
  }

  getSplitTelemetryStyle(config, widgetKey, splitIdx, metricKey, defaultColor, defaultWeight = '600', defaultSize = 10) {
    const aliasMap = {
      pace: ['pace', 'paceLabels', 'headerPace'],
      avgHr: ['avgHr', 'hr', 'heartRate', 'hrLabels', 'headerHr'],
      hr: ['hr', 'avgHr', 'heartRate', 'hrLabels', 'headerHr'],
      maxHr: ['maxHr', 'headerMaxHr'],
      minHr: ['minHr', 'headerMinHr'],
      time: ['time', 'timeLabels', 'headerTime'],
      delta: ['delta', 'deltaLabels', 'headerDelta'],
      elevation: ['elevation', 'elevationLabels', 'elev', 'headerElev'],
      cadence: ['cadence', 'cadenceLabels', 'cad', 'headerCad']
    };

    const candidateKeys = aliasMap[metricKey] || [metricKey];

    // 1. Check per-split override: e.g. split_avgHr_0, split_hr_0, split_pace_0
    let perSplitOff = null;
    if (splitIdx !== null && splitIdx !== undefined) {
      for (const k of candidateKeys) {
        const o = this.getElementOffset(config, widgetKey, `split_${k}_${splitIdx}`);
        if (o && (o.color !== 'default' || o.fontFamily !== 'default' || (o.scale && o.scale !== 100) || o.x !== 0 || o.y !== 0 || o.hidden)) {
          perSplitOff = o;
          break;
        }
      }
    }

    // 2. Check global metric override: e.g. avgHr, hr, pace, paceLabels
    let globalMetricOff = null;
    for (const k of candidateKeys) {
      const o = this.getElementOffset(config, widgetKey, k);
      if (o && (o.color !== 'default' || o.fontFamily !== 'default' || (o.scale && o.scale !== 100) || o.x !== 0 || o.y !== 0 || o.hidden)) {
        globalMetricOff = o;
        break;
      }
    }
    if (!globalMetricOff && candidateKeys.length > 0) {
      globalMetricOff = this.getElementOffset(config, widgetKey, candidateKeys[0]);
    }

    const splitEntireOff = (splitIdx !== null && splitIdx !== undefined)
      ? this.getElementOffset(config, widgetKey, `split_${splitIdx}`)
      : { x: 0, y: 0, z: 1, hidden: false };
    const el = this.getElementStyle(config, widgetKey);

    const isHidden = (perSplitOff && perSplitOff.hidden) || (globalMetricOff && globalMetricOff.hidden) || (splitEntireOff && splitEntireOff.hidden);

    let color = defaultColor;
    if (perSplitOff && perSplitOff.color && perSplitOff.color !== 'default') {
      color = perSplitOff.color;
    } else if (globalMetricOff && globalMetricOff.color && globalMetricOff.color !== 'default') {
      color = globalMetricOff.color;
    }

    let fontName = 'default';
    if (perSplitOff && perSplitOff.fontFamily && perSplitOff.fontFamily !== 'default') {
      fontName = perSplitOff.fontFamily;
    } else if (globalMetricOff && globalMetricOff.fontFamily && globalMetricOff.fontFamily !== 'default') {
      fontName = globalMetricOff.fontFamily;
    } else if (el.fontFamily && el.fontFamily !== 'default') {
      fontName = el.fontFamily;
    } else {
      fontName = config.fontFamily;
    }
    const fontFam = this.getFontFamily(fontName);

    let widgetScale = typeof el.fontSizeScale === 'number' && !isNaN(el.fontSizeScale) ? el.fontSizeScale : 1.0;
    if (widgetScale > 5) widgetScale = widgetScale / 100;
    let metricScale = 1.0;
    if (globalMetricOff && typeof globalMetricOff.scale === 'number' && !isNaN(globalMetricOff.scale)) {
      metricScale = globalMetricOff.scale > 5 ? globalMetricOff.scale / 100 : globalMetricOff.scale;
    }
    let splitScale = 1.0;
    if (perSplitOff && typeof perSplitOff.scale === 'number' && !isNaN(perSplitOff.scale)) {
      splitScale = perSplitOff.scale > 5 ? perSplitOff.scale / 100 : perSplitOff.scale;
    }
    const finalSize = Math.max(6, Math.round(defaultSize * widgetScale * metricScale * splitScale));
    const font = `${defaultWeight} ${finalSize}px ${fontFam}`;

    const x = (globalMetricOff?.x || 0) + (perSplitOff?.x || 0) + (splitEntireOff?.x || 0);
    const y = (globalMetricOff?.y || 0) + (perSplitOff?.y || 0) + (splitEntireOff?.y || 0);
    const z = Math.max(globalMetricOff?.z || 1, perSplitOff?.z || 1, splitEntireOff?.z || 1);

    return { color, font, hidden: !!isHidden, x, y, z, size: finalSize };
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

  getAspectRatioDimensions(ratioKey, config = null) {
    if (ratioKey === 'custom' || (config && config.aspectRatio === 'custom')) {
      const w = (config && config.customWidth) ? parseInt(config.customWidth, 10) : 1080;
      const h = (config && config.customHeight) ? parseInt(config.customHeight, 10) : 1080;
      return {
        width: Math.max(300, Math.min(4000, isNaN(w) ? 1080 : w)),
        height: Math.max(300, Math.min(4000, isNaN(h) ? 1080 : h)),
        label: 'Custom'
      };
    }
    return ASPECT_RATIOS[ratioKey] || ASPECT_RATIOS['9:16'];
  }

  getWidgetAlign(align, defaultAlign = 'left') {
    if (align === 'left' || align === 'center' || align === 'right') return align;
    return defaultAlign;
  }

  getAlignX(align, x, width, pad = 20, defaultAlign = 'left') {
    const eff = this.getWidgetAlign(align, defaultAlign);
    if (eff === 'center') return x + width / 2;
    if (eff === 'right') return x + width - pad;
    return x + pad;
  }

  /**
   * Main render function
   * @param {Object} activity - Normalized activity data
   * @param {Object} config - User customization options
   * @param {number} scaleMultiplier - Resolution multiplier (1x preview, 2x export)
   */
  render(activity, config, scaleMultiplier = 1) {
    this.currentConfig = config;
    const ratioSpec = this.getAspectRatioDimensions(config.aspectRatio, config);
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

    // 2.5 Render Extra Widget Instances (Autonomous duplicate or additional widgets)
    this.renderExtraWidgetInstances(ctx, baseW, baseH, activity, config, theme, accentColor);

    // 3. Render Custom Texts & Stickers
    this.drawCustomTexts(ctx, baseW, baseH, config.customTexts, theme, accentColor);

    // 4. Render Grid Guidelines (Snap to Grid / Alignment Grid)
    if (config.snapToGrid && (config.showGridOverlay || config.isDraggingGrid)) {
      this.drawGridOverlay(ctx, baseW, baseH, config);
    }

    ctx.restore();
  }

  drawGridOverlay(ctx, w, h, config) {
    const gridSize = config.gridSize && config.gridSize >= 2 ? config.gridSize : 20;
    ctx.save();
    ctx.lineWidth = 0.6;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';

    ctx.beginPath();
    for (let x = gridSize; x < w; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = gridSize; y < h; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();

    if (gridSize <= 30) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.lineWidth = 1.0;
      const majorStep = gridSize * 5;
      ctx.beginPath();
      for (let x = majorStep; x < w; x += majorStep) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = majorStep; y < h; y += majorStep) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();
    }
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
      case 'kinetic-centered':
        this.renderKineticCenteredLayout(ctx, w, h, activity, config, theme, accent);
        break;
      case 'marathon-finisher':
        this.renderMarathonFinisherLayout(ctx, w, h, activity, config, theme, accent);
        break;
      case 'tokyo-night':
        this.renderTokyoNightLayout(ctx, w, h, activity, config, theme, accent);
        break;
      case 'ultra-trail':
        this.renderUltraTrailLayout(ctx, w, h, activity, config, theme, accent);
        break;
      case 'swiss-editorial':
        this.renderSwissEditorialLayout(ctx, w, h, activity, config, theme, accent);
        break;
      case 'smartwatch-ultra':
        this.renderSmartwatchUltraLayout(ctx, w, h, activity, config, theme, accent);
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
      const isVertMet = ['vertical-stacked-hud', 'vertical-minimal-stack', 'vertical-pill-stack', 'vertical-timeline-flow', 'vertical-data-ladder', 'vertical-athletic-cards'].includes(config.metricsDesign);
      const defaultMetH = isVertMet ? 220 : ((config.metricsDesign === 'cards-2col' || config.metricsDesign === 'centered-cross-quad') ? 140 : 80);
      const pos = this.getWidgetPos(config, 'metrics', pad, currY, w - pad * 2, defaultMetH);
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
        if (config.showWidgetSplitHighlight !== false) {
          const pos = this.getWidgetPos(config, 'splitHighlight', pad, currY, w - pad * 2, 115);
          const nextY = this.drawSplitHighlightCard(ctx, pos.x, pos.y, pos.width, activity, config, theme, accent, pos.height);
          if (!pos.isCustom) currY = nextY + 16;
        }
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
    if (config.showWidgetSplitHighlight !== false && config.showWidgetSplits !== false) {
      const posSp = this.getWidgetPos(config, 'splitHighlight', pad, currY, w - pad * 2, 115);
      currY = this.drawSplitHighlightCard(ctx, posSp.x, posSp.y, posSp.width, activity, config, theme, accent, posSp.height) + 18;
    }

    // Full Splits Bar Chart
    if (config.showWidgetSplits !== false) {
      const posSb = this.getWidgetPos(config, 'splits', pad, currY, w - pad * 2, 175);
      currY = this.drawSplitsBarChart(ctx, posSb.x, posSb.y, posSb.width, activity, config, theme, accent, posSb.height) + 18;
    }

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

    const isVertMet = ['vertical-stacked-hud', 'vertical-minimal-stack', 'vertical-pill-stack', 'vertical-timeline-flow', 'vertical-data-ladder', 'vertical-athletic-cards'].includes(config.metricsDesign);
    const defaultMetH = isVertMet ? 220 : ((config.metricsDesign === 'cards-2col' || config.metricsDesign === 'centered-cross-quad') ? 140 : 80);
    const posMet = this.getWidgetPos(config, 'metrics', pad, currY, w - pad * 2, defaultMetH);
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
    const isVertMet = ['vertical-stacked-hud', 'vertical-minimal-stack', 'vertical-pill-stack', 'vertical-timeline-flow', 'vertical-data-ladder', 'vertical-athletic-cards'].includes(config.metricsDesign);
    const defaultMetH = isVertMet ? 220 : ((config.metricsDesign === 'cards-2col' || config.metricsDesign === 'centered-cross-quad') ? 140 : 80);
    const posMet = this.getWidgetPos(config, 'metrics', pad, currY, w - pad * 2, defaultMetH);
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
    if (config.showWidgetSplitHighlight !== false && config.showWidgetSplits !== false) {
      const posSp = this.getWidgetPos(config, 'splitHighlight', pad, currY, w - pad * 2, 115);
      currY = this.drawSplitHighlightCard(ctx, posSp.x, posSp.y, posSp.width, activity, config, theme, accent, posSp.height) + 16;
    }

    // High chart for all workout laps
    if (config.showWidgetSplits !== false) {
      const posS = this.getWidgetPos(config, 'splits', pad, currY, w - pad * 2, 220);
      currY = this.drawSplitsBarChart(ctx, posS.x, posS.y, posS.width, activity, config, theme, accent, posS.height) + 16;
    }

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

  // ==========================================
  // TEMPLATE 7: KINETIC CENTERED MINIMAL
  // Symmetrical center-aligned minimalism
  // ==========================================
  renderKineticCenteredLayout(ctx, w, h, activity, config, theme, accent) {
    const pad = w * 0.07;
    let currY = h * 0.05;

    // 1. Centered Header
    if (config.showWidgetHeader !== false) {
      const posH = this.getWidgetPos(config, 'header', pad, currY, w - pad * 2, 90);
      const nextY = this.drawHeader(ctx, posH.x, posH.y, posH.width, activity, { ...config, headerTemplate: config.headerTemplate || 'centered-crest' }, theme, accent, posH.height);
      if (!posH.isCustom) currY = nextY + 16;
    }

    // 2. Route Map (Centered)
    if (activity.hasRoute && config.showWidgetMap !== false) {
      const mapH = Math.min(h * 0.28, 300);
      const posM = this.getWidgetPos(config, 'map', pad, currY, w - pad * 2, mapH);
      this.drawRouteMap(ctx, posM.x, posM.y, posM.width, posM.height, activity, config, theme, accent);
      if (!posM.isCustom) currY += posM.height + 16;
    }

    // 3. Hero Metric (Centered Monolith / Stadium)
    if (config.showWidgetHero !== false) {
      const heroH = 110;
      const posHero = this.getWidgetPos(config, 'hero', pad, currY, w - pad * 2, heroH);
      const nextY = this.drawHeroStat(ctx, posHero.x, posHero.y, posHero.width, activity, { ...config, heroDesign: config.heroDesign || 'centered-monolith' }, theme, accent, posHero.height);
      if (!posHero.isCustom) currY = nextY + 16;
    }

    // 4. Secondary Metrics (Centered Pod Triad)
    if (config.showWidgetMetrics !== false) {
      const posMet = this.getWidgetPos(config, 'metrics', pad, currY, w - pad * 2, 85);
      const nextY = this.drawMetricsGrid(ctx, posMet.x, posMet.y, posMet.width, activity, { ...config, metricsDesign: config.metricsDesign || 'centered-pod-triad' }, theme, accent, 3, posMet.height);
      if (!posMet.isCustom) currY = nextY + 16;
    }

    // 5. Elevation or Pace Pulse (If space allows)
    if (config.showWidgetElevation !== false && activity.trackpoints && activity.trackpoints.length > 2 && currY < h * 0.82) {
      const posE = this.getWidgetPos(config, 'elevation', pad, currY, w - pad * 2, 80);
      this.drawElevationProfile(ctx, posE.x, posE.y, posE.width, posE.height, activity, { ...config, elevationDesign: config.elevationDesign || 'centered-mountain-peak' }, theme, accent);
      currY += posE.height + 14;
    } else if (config.showWidgetSplits !== false && currY < h * 0.85) {
      const posS = this.getWidgetPos(config, 'splits', pad, currY, w - pad * 2, 120);
      currY = this.drawSplitsBarChart(ctx, posS.x, posS.y, posS.width, activity, { ...config, splitsDesign: config.splitsDesign || 'centered-split-pills' }, theme, accent, posS.height) + 14;
    }

    // 6. Centered Brand
    const posB = this.getWidgetPos(config, 'brand', pad, h - h * 0.04, w - pad * 2, 26);
    this.drawBrandWatermark(ctx, posB.x, posB.y, posB.width, { ...config, brandStyle: config.brandStyle || 'centered-cinematic-stamp' }, theme, accent, posB.height);
  }

  // ==========================================
  // TEMPLATE 8: MARATHON FINISHER LUXE
  // Gold & carbon aesthetic, trophy badge & elevation ridge
  // ==========================================
  renderMarathonFinisherLayout(ctx, w, h, activity, config, theme, accent) {
    const pad = w * 0.06;
    let currY = h * 0.045;

    // 1. Collegiate Shield / Bib Header
    const posH = this.getWidgetPos(config, 'header', pad, currY, w - pad * 2, 88);
    currY = this.drawHeader(ctx, posH.x, posH.y, posH.width, activity, { ...config, headerTemplate: config.headerTemplate || 'badge-shield' }, theme, accent, posH.height) + 16;

    // 2. Spotlight Fastest Split / Trophy Card
    if (config.showWidgetSplitHighlight !== false && config.showWidgetSplits !== false) {
      const posSp = this.getWidgetPos(config, 'splitHighlight', pad, currY, w - pad * 2, 115);
      currY = this.drawSplitHighlightCard(ctx, posSp.x, posSp.y, posSp.width, activity, { ...config, splitHighlightDesign: config.splitHighlightDesign || 'centered-trophy-card' }, theme, accent, posSp.height) + 16;
    }

    // 3. Hero Distance
    const posHero = this.getWidgetPos(config, 'hero', pad, currY, w - pad * 2, 105);
    currY = this.drawHeroStat(ctx, posHero.x, posHero.y, posHero.width, activity, config, theme, accent, posHero.height) + 16;

    // 4. Secondary Metrics (2-Col Bold Cards / Scoreboard)
    const posMet = this.getWidgetPos(config, 'metrics', pad, currY, w - pad * 2, 110);
    currY = this.drawMetricsGrid(ctx, posMet.x, posMet.y, posMet.width, activity, { ...config, metricsDesign: config.metricsDesign || 'cards-2col' }, theme, accent, 4, posMet.height) + 16;

    // 5. Elevation Profile or Splits
    if (activity.trackpoints && activity.trackpoints.length > 2 && currY < h * 0.82) {
      const posE = this.getWidgetPos(config, 'elevation', pad, currY, w - pad * 2, 85);
      this.drawElevationProfile(ctx, posE.x, posE.y, posE.width, posE.height, activity, config, theme, accent);
      currY += posE.height + 16;
    } else if (config.showWidgetSplits !== false && currY < h * 0.85) {
      const posS = this.getWidgetPos(config, 'splits', pad, currY, w - pad * 2, 130);
      currY = this.drawSplitsBarChart(ctx, posS.x, posS.y, posS.width, activity, config, theme, accent, posS.height) + 16;
    }

    // 6. Brand
    const posB = this.getWidgetPos(config, 'brand', pad, h - h * 0.035, w - pad * 2, 26);
    this.drawBrandWatermark(ctx, posB.x, posB.y, posB.width, config, theme, accent, posB.height);
  }

  // ==========================================
  // TEMPLATE 9: TOKYO NIGHT HUD
  // Cyberpunk neon telemetry, flight instruments & speed pulse
  // ==========================================
  renderTokyoNightLayout(ctx, w, h, activity, config, theme, accent) {
    const pad = w * 0.055;
    let currY = h * 0.045;

    // 1. Flight HUD Header
    const posH = this.getWidgetPos(config, 'header', pad, currY, w - pad * 2, 92);
    currY = this.drawHeader(ctx, posH.x, posH.y, posH.width, activity, { ...config, headerTemplate: config.headerTemplate || 'hud-flight' }, theme, accent, posH.height) + 14;

    // 2. Neon Pulse Map
    if (activity.hasRoute && config.showWidgetMap !== false) {
      const mapH = Math.min(h * 0.28, 280);
      const posM = this.getWidgetPos(config, 'map', pad, currY, w - pad * 2, mapH);
      this.drawRouteMap(ctx, posM.x, posM.y, posM.width, posM.height, activity, { ...config, mapDesign: config.mapDesign || 'neon-pulse' }, theme, accent);
      currY += posM.height + 14;
    }

    // 3. Hero Bracket Box
    const posHero = this.getWidgetPos(config, 'hero', pad, currY, w - pad * 2, 105);
    currY = this.drawHeroStat(ctx, posHero.x, posHero.y, posHero.width, activity, { ...config, heroDesign: config.heroDesign || 'boxed-bracket' }, theme, accent, posHero.height) + 14;

    // 4. Vertical Stacked HUD Telemetry Rows
    const posMet = this.getWidgetPos(config, 'metrics', pad, currY, w - pad * 2, 110);
    currY = this.drawMetricsGrid(ctx, posMet.x, posMet.y, posMet.width, activity, { ...config, metricsDesign: config.metricsDesign || 'vertical-stacked-hud' }, theme, accent, 4, posMet.height) + 14;

    // 5. Pace Speed Pulse or HR LCD
    if (config.showWidgetPaceGraph && currY < h * 0.84) {
      const posP = this.getWidgetPos(config, 'paceGraph', pad, currY, w - pad * 2, 85);
      currY = this.drawPaceGraph(ctx, posP.x, posP.y, posP.width, posP.height, activity, { ...config, paceGraphDesign: config.paceGraphDesign || 'centered-speed-pulse' }, theme, accent) + 14;
    } else if (activity.avgHr && currY < h * 0.86) {
      const posHr = this.getWidgetPos(config, 'hrBadge', pad, currY, w - pad * 2, 70);
      currY = this.drawAvgHeartRateBadge(ctx, posHr.x, posHr.y, posHr.width, activity, { ...config, hrBadgeDesign: config.hrBadgeDesign || 'lcd-pulse' }, theme, accent, posHr.height) + 14;
    }

    // 6. Brand
    const posB = this.getWidgetPos(config, 'brand', pad, h - h * 0.035, w - pad * 2, 26);
    this.drawBrandWatermark(ctx, posB.x, posB.y, posB.width, config, theme, accent, posB.height);
  }

  // ==========================================
  // TEMPLATE 10: ULTRA TRAIL RIDGE
  // Mountain elevation profile, split ladder & trail telemetry
  // ==========================================
  renderUltraTrailLayout(ctx, w, h, activity, config, theme, accent) {
    const pad = w * 0.06;
    let currY = h * 0.045;

    // 1. Trail Stamp Header
    const posH = this.getWidgetPos(config, 'header', pad, currY, w - pad * 2, 85);
    currY = this.drawHeader(ctx, posH.x, posH.y, posH.width, activity, { ...config, headerTemplate: config.headerTemplate || 'minimalist-stamp' }, theme, accent, posH.height) + 14;

    // 2. Prominent Mountain Elevation Profile (Key Feature)
    if (activity.trackpoints && activity.trackpoints.length > 2) {
      const elevH = Math.min(h * 0.24, 250);
      const posE = this.getWidgetPos(config, 'elevation', pad, currY, w - pad * 2, elevH);
      this.drawElevationProfile(ctx, posE.x, posE.y, posE.width, posE.height, activity, { ...config, elevationDesign: config.elevationDesign || 'mountain-peaks' }, theme, accent);
      currY += posE.height + 16;
    }

    // 3. Hero Stat (Capsule / Monolith)
    const posHero = this.getWidgetPos(config, 'hero', pad, currY, w - pad * 2, 105);
    currY = this.drawHeroStat(ctx, posHero.x, posHero.y, posHero.width, activity, { ...config, heroDesign: config.heroDesign || 'centered-stadium-capsule' }, theme, accent, posHero.height) + 16;

    // 4. Horizontal Chips / Timeline
    const posMet = this.getWidgetPos(config, 'metrics', pad, currY, w - pad * 2, 85);
    currY = this.drawMetricsGrid(ctx, posMet.x, posMet.y, posMet.width, activity, { ...config, metricsDesign: config.metricsDesign || 'horizontal-chips' }, theme, accent, 3, posMet.height) + 16;

    // 5. Splits Timeline Ladder
    if (config.showWidgetSplits !== false && currY < h * 0.86) {
      const posS = this.getWidgetPos(config, 'splits', pad, currY, w - pad * 2, 130);
      currY = this.drawSplitsBarChart(ctx, posS.x, posS.y, posS.width, activity, { ...config, splitsDesign: config.splitsDesign || 'centered-split-ladder' }, theme, accent, posS.height) + 16;
    }

    // 6. Brand
    const posB = this.getWidgetPos(config, 'brand', pad, h - h * 0.035, w - pad * 2, 26);
    this.drawBrandWatermark(ctx, posB.x, posB.y, posB.width, config, theme, accent, posB.height);
  }

  // ==========================================
  // TEMPLATE 11: SWISS ATHLETIC EDITORIAL
  // High-fashion athletic magazine typography & bold 2-col stats
  // ==========================================
  renderSwissEditorialLayout(ctx, w, h, activity, config, theme, accent) {
    const pad = w * 0.07;
    let currY = h * 0.05;

    // 1. Magazine Cover Header
    const posH = this.getWidgetPos(config, 'header', pad, currY, w - pad * 2, 95);
    currY = this.drawHeader(ctx, posH.x, posH.y, posH.width, activity, { ...config, headerTemplate: config.headerTemplate || 'magazine-cover' }, theme, accent, posH.height) + 18;

    // 2. Bold Minimalist Hero Line
    const posHero = this.getWidgetPos(config, 'hero', pad, currY, w - pad * 2, 105);
    currY = this.drawHeroStat(ctx, posHero.x, posHero.y, posHero.width, activity, { ...config, heroDesign: config.heroDesign || 'minimal-line' }, theme, accent, posHero.height) + 18;

    // 3. 2-Column Bold Stat Cards
    const posMet = this.getWidgetPos(config, 'metrics', pad, currY, w - pad * 2, 115);
    currY = this.drawMetricsGrid(ctx, posMet.x, posMet.y, posMet.width, activity, { ...config, metricsDesign: config.metricsDesign || 'cards-2col' }, theme, accent, 4, posMet.height) + 18;

    // 4. Split Table or Route Map
    if (activity.hasRoute && config.showWidgetMap !== false && currY < h * 0.72) {
      const mapH = Math.min(h * 0.22, 220);
      const posM = this.getWidgetPos(config, 'map', pad, currY, w - pad * 2, mapH);
      this.drawRouteMap(ctx, posM.x, posM.y, posM.width, posM.height, activity, { ...config, mapDesign: config.mapDesign || 'minimal' }, theme, accent);
      currY += posM.height + 18;
    } else if (config.showWidgetSplits !== false && currY < h * 0.85) {
      const posS = this.getWidgetPos(config, 'splits', pad, currY, w - pad * 2, 130);
      currY = this.drawSplitsBarChart(ctx, posS.x, posS.y, posS.width, activity, { ...config, splitsDesign: config.splitsDesign || 'pace-table' }, theme, accent, posS.height) + 18;
    }

    // 5. Brand
    const posB = this.getWidgetPos(config, 'brand', pad, h - h * 0.035, w - pad * 2, 26);
    this.drawBrandWatermark(ctx, posB.x, posB.y, posB.width, { ...config, brandStyle: 'nike' }, theme, accent, posB.height);
  }

  // ==========================================
  // TEMPLATE 12: WATCH FACE MODULAR
  // Smartwatch complication gauges & radial pods
  // ==========================================
  renderSmartwatchUltraLayout(ctx, w, h, activity, config, theme, accent) {
    const pad = w * 0.06;
    let currY = h * 0.05;

    // 1. Monogram Header
    const posH = this.getWidgetPos(config, 'header', pad, currY, w - pad * 2, 90);
    currY = this.drawHeader(ctx, posH.x, posH.y, posH.width, activity, { ...config, headerTemplate: config.headerTemplate || 'circular-monogram' }, theme, accent, posH.height) + 16;

    // 2. Speedometer / Radial Pod Hero
    const posHero = this.getWidgetPos(config, 'hero', pad, currY, w - pad * 2, 115);
    currY = this.drawHeroStat(ctx, posHero.x, posHero.y, posHero.width, activity, { ...config, heroDesign: config.heroDesign || 'speedometer' }, theme, accent, posHero.height) + 16;

    // 3. Circular Gauges / Pill Clusters
    const posMet = this.getWidgetPos(config, 'metrics', pad, currY, w - pad * 2, 95);
    currY = this.drawMetricsGrid(ctx, posMet.x, posMet.y, posMet.width, activity, { ...config, metricsDesign: config.metricsDesign || 'circular-gauges' }, theme, accent, 3, posMet.height) + 16;

    // 4. Cardiac Halo HR Badge
    if (activity.avgHr && currY < h * 0.84) {
      const posHr = this.getWidgetPos(config, 'hrBadge', pad, currY, w - pad * 2, 70);
      currY = this.drawAvgHeartRateBadge(ctx, posHr.x, posHr.y, posHr.width, activity, { ...config, hrBadgeDesign: config.hrBadgeDesign || 'centered-heart-crest' }, theme, accent, posHr.height) + 16;
    }

    // 5. Elevation or Pace Pulse
    if (config.showWidgetPaceGraph && currY < h * 0.88) {
      const posP = this.getWidgetPos(config, 'paceGraph', pad, currY, w - pad * 2, 80);
      currY = this.drawPaceGraph(ctx, posP.x, posP.y, posP.width, posP.height, activity, { ...config, paceGraphDesign: config.paceGraphDesign || 'centered-speed-pulse' }, theme, accent) + 16;
    }

    // 6. Brand
    const posB = this.getWidgetPos(config, 'brand', pad, h - h * 0.035, w - pad * 2, 26);
    this.drawBrandWatermark(ctx, posB.x, posB.y, posB.width, config, theme, accent, posB.height);
  }

  // =========================================================================
  // WIDGET 1: HEADER
  // Designs: 'modern', 'editorial', 'athletic', 'pill', 'retro-cyber', 'minimalist-stamp', 'badge-shield'
  // =========================================================================
  drawHeader(ctx, x, y, width, activity, config, theme, accent, customH = null, widgetKey = 'header') {
    ctx.save();
    const rot = this.applyWidgetRotation(ctx, config, widgetKey, x, y, width, customH || 95);
    const elStyle = this.getElementStyle(config, widgetKey);
    const { text, textMuted, accent: elAccent, cardStyle, align, opacity } = this.getEffectiveColors(config, theme, accent, widgetKey);
    if (opacity < 1) ctx.globalAlpha = opacity;

    const font = this.getFontFamily(elStyle.fontFamily !== 'default' ? elStyle.fontFamily : config.fontFamily);
    const design = config.headerTemplate || config.headerDesign || 'modern';
    let title = this.getTextOverride(config, widgetKey, 'title', config.customTitle || activity.title || 'Morning Run');
    let dateText = this.getTextOverride(config, widgetKey, 'subtitle', config.customSubtitle || `${activity.dateFormatted} • ${activity.timeFormatted}`);
    let runnerName = this.getTextOverride(config, widgetKey, 'runner', config.runnerName || '@runner');
    let location = this.getTextOverride(config, widgetKey, 'location', config.locationName || '');
    let weatherText = this.getTextOverride(config, widgetKey, 'weather', config.weatherText || '');

    // Sub-element X, Y, Z offsets
    const offTitle = this.getElementOffset(config, widgetKey, 'title');
    const offSub = this.getElementOffset(config, widgetKey, 'subtitle');
    const offRunner = this.getElementOffset(config, widgetKey, 'runner');
    const offLoc = this.getElementOffset(config, widgetKey, 'location');
    const offWeather = this.getElementOffset(config, widgetKey, 'weather');

    const showLocation = config.headerShowLocation !== false && config.showLocation !== false && !offLoc.hidden;
    location = showLocation ? location : '';

    if (offTitle.hidden) title = '';
    if (offSub.hidden) dateText = '';
    if (offRunner.hidden) runnerName = '';
    if (!showLocation) location = '';
    if (offWeather.hidden) weatherText = '';

    // TEMPLATE: CENTERED ATHLETIC CREST
    if (design === 'centered-crest') {
      const h = customH || 98;
      this.drawWidgetCardBg(ctx, widgetKey, x, y, width, h, config, theme);
      const effAlign = this.getWidgetAlign(align, 'center');
      const cx = this.getAlignX(effAlign, x, width, 24, 'center');
      ctx.textAlign = effAlign;

      this.applyZDepth(ctx, offRunner.z);
      ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'runner', elAccent);
      ctx.font = this.getSubPartFont(config, widgetKey, 'runner', 'bold', 11);
      ctx.fillText(effAlign === 'center' ? `★  ${runnerName.toUpperCase()}  ★` : runnerName.toUpperCase(), cx + offRunner.x, y + 24 + offRunner.y);

      this.applyZDepth(ctx, offTitle.z);
      ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'title', text);
      ctx.font = this.getSubPartFont(config, widgetKey, 'title', 'bold', 32);
      ctx.fillText(title.toUpperCase(), cx + offTitle.x, y + 58 + offTitle.y);

      if (effAlign === 'center') {
        const titleW = ctx.measureText(title.toUpperCase()).width;
        const lineLen = Math.max(20, (width - titleW - 60) / 2);
        ctx.strokeStyle = elAccent + '66';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + 20, y + 50); ctx.lineTo(x + 20 + lineLen, y + 50);
        ctx.moveTo(x + width - 20 - lineLen, y + 50); ctx.lineTo(x + width - 20, y + 50);
        ctx.stroke();
      }

      this.applyZDepth(ctx, offSub.z);
      ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'subtitle', textMuted);
      ctx.font = this.getSubPartFont(config, widgetKey, 'subtitle', '500', 12);
      ctx.fillText(`${dateText}${location ? '  •  ' + location : ''}${weatherText ? '  •  ' + weatherText : ''}`, cx + offSub.x, y + 80 + offSub.y);

      ctx.restore();
      this.recordBounds(widgetKey, 'Header', x, y, width, h);
      return y + h;
    }

    // TEMPLATE: CENTERED MINIMAL CLEAN
    if (design === 'centered-minimal-clean') {
      const h = customH || 86;
      this.drawWidgetCardBg(ctx, widgetKey, x, y, width, h, config, theme);
      const effAlign = this.getWidgetAlign(align, 'center');
      const cx = this.getAlignX(effAlign, x, width, 24, 'center');
      ctx.textAlign = effAlign;

      this.applyZDepth(ctx, offTitle.z);
      ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'title', text);
      ctx.font = this.getSubPartFont(config, widgetKey, 'title', 'bold', 30);
      ctx.fillText(title, cx + offTitle.x, y + 36 + offTitle.y);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 24, y + 48); ctx.lineTo(x + width - 24, y + 48);
      ctx.stroke();

      this.applyZDepth(ctx, offSub.z);
      ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'subtitle', elAccent);
      ctx.font = this.getSubPartFont(config, widgetKey, 'subtitle', '600', 12);
      ctx.fillText(`${dateText}   //   ${runnerName}${location ? '   //   ' + location : ''}`, cx + offSub.x, y + 70 + offSub.y);

      ctx.restore();
      this.recordBounds(widgetKey, 'Header', x, y, width, h);
      return y + h;
    }

    // TEMPLATE: CIRCULAR RUNNER MONOGRAM
    if (design === 'circular-monogram') {
      const h = customH || 105;
      this.drawWidgetCardBg(ctx, widgetKey, x, y, width, h, config, theme);
      const effAlign = this.getWidgetAlign(align, 'center');
      const cx = this.getAlignX(effAlign, x, width, 24, 'center');
      ctx.textAlign = effAlign;

      const monoR = 14;
      const monoY = y + 20;
      const monoX = effAlign === 'center' ? x + width / 2 : effAlign === 'right' ? x + width - 36 : x + 36;
      const defaultInitials = (runnerName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2) || 'RN').toUpperCase();
      const initials = this.getTextOverride(config, widgetKey, 'monogram', defaultInitials);
      const offMono = this.getElementOffset(config, widgetKey, 'monogram');
      if (!offMono.hidden && initials) {
        ctx.fillStyle = elAccent;
        ctx.beginPath(); ctx.arc(monoX + offMono.x, monoY + offMono.y, monoR, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(initials, monoX + offMono.x, monoY + 4 + offMono.y);
      }

      ctx.textAlign = effAlign;
      this.applyZDepth(ctx, offTitle.z);
      ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'title', text);
      ctx.font = this.getSubPartFont(config, widgetKey, 'title', 'bold', 28);
      ctx.fillText(title.toUpperCase(), cx + offTitle.x, y + 64 + offTitle.y);

      this.applyZDepth(ctx, offSub.z);
      ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'subtitle', textMuted);
      ctx.font = this.getSubPartFont(config, widgetKey, 'subtitle', '500', 12);
      ctx.fillText(`${dateText}   •   ${runnerName}${location ? '   •   ' + location : ''}`, cx + offSub.x, y + 86 + offSub.y);

      ctx.restore();
      this.recordBounds(widgetKey, 'Header', x, y, width, h);
      return y + h;
    }

    // TEMPLATE: HUD FLIGHT INSTRUMENT
    if (design === 'hud-flight') {
      const h = customH || 96;
      this.drawWidgetCardBg(ctx, widgetKey, x, y, width, h, config, theme);
      // Top flight bracket ticks
      ctx.strokeStyle = elAccent;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 12, y + 16); ctx.lineTo(x + 12, y + 8); ctx.lineTo(x + 36, y + 8);
      ctx.moveTo(x + width - 12, y + 16); ctx.lineTo(x + width - 12, y + 8); ctx.lineTo(x + width - 36, y + 8);
      ctx.stroke();

      const flightPrompt = this.getTextOverride(config, widgetKey, 'flightPrompt', '▲ RUN_TELEMETRY');
      const offFlightPrompt = this.getElementOffset(config, widgetKey, 'flightPrompt');
      if (!offRunner.hidden || !offFlightPrompt.hidden) {
        this.applyZDepth(ctx, offRunner.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'runner', elAccent);
        ctx.font = this.getSubPartFont(config, widgetKey, 'runner', 'bold', 11);
        const p = (!offFlightPrompt.hidden && flightPrompt) ? `${flightPrompt} ` : '';
        const r = (!offRunner.hidden && runnerName) ? `// ${runnerName.toUpperCase()}` : '';
        ctx.fillText(`${p}${r}`.trim(), x + 20 + offRunner.x, y + 26 + offRunner.y);
      }

      if (!offTitle.hidden && title) {
        this.applyZDepth(ctx, offTitle.z);
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'title', text);
        ctx.font = this.getSubPartFont(config, widgetKey, 'title', 'bold', 30);
        ctx.fillText(title.toUpperCase(), x + 20 + offTitle.x, y + 58 + offTitle.y);
      }

      if (!offSub.hidden && (dateText || location)) {
        this.applyZDepth(ctx, offSub.z);
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'subtitle', textMuted);
        ctx.font = this.getSubPartFont(config, widgetKey, 'subtitle', '500', 12);
        ctx.fillText(`${dateText}${location ? ' • ' + location : ''}`, x + 20 + offSub.x, y + 80 + offSub.y);
      }

      const flightStatus = this.getTextOverride(config, widgetKey, 'flightStatus', 'GPS LOCK: 100%');
      const offFlightStatus = this.getElementOffset(config, widgetKey, 'flightStatus');
      if (!offWeather.hidden || !offFlightStatus.hidden) {
        this.applyZDepth(ctx, offWeather.z);
        ctx.textAlign = 'right';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'weather', elAccent);
        ctx.font = this.getSubPartFont(config, widgetKey, 'weather', 'bold', 11);
        const st = weatherText || flightStatus;
        ctx.fillText(st, x + width - 20 + offWeather.x, y + 26 + offWeather.y);
      }

      ctx.restore();
      this.recordBounds(widgetKey, 'Header', x, y, width, h);
      return y + h;
    }

    // TEMPLATE: RACE TICKER TAPE
    if (design === 'race-ticker') {
      const h = customH || 88;
      ctx.save();
      this.drawWidgetCardBg(ctx, widgetKey, x, y, width, h, config, theme);

      // Top racing hazard stripes
      const sw = 10;
      ctx.fillStyle = elAccent;
      for (let sx = x + 6; sx < x + width - 12; sx += sw * 2) {
        ctx.fillRect(sx, y + 3, sw, 4);
      }

      this.applyZDepth(ctx, offTitle.z);
      ctx.textAlign = 'left';
      ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'title', text);
      ctx.font = this.getSubPartFont(config, widgetKey, 'title', 'bold', 30);
      ctx.fillText(title.toUpperCase(), x + 20 + offTitle.x, y + 46 + offTitle.y);

      this.applyZDepth(ctx, offSub.z);
      ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'subtitle', elAccent);
      ctx.font = this.getSubPartFont(config, widgetKey, 'subtitle', 'bold', 12);
      ctx.fillText(`⚡ ${dateText}  •  ${runnerName}`, x + 20 + offSub.x, y + 72 + offSub.y);

      if (location) {
        this.applyZDepth(ctx, offLoc.z);
        ctx.textAlign = 'right';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'location', textMuted);
        ctx.font = this.getSubPartFont(config, widgetKey, 'location', 'bold', 12);
        ctx.fillText(location.toUpperCase(), x + width - 20 + offLoc.x, y + 46 + offLoc.y);
      }

      ctx.restore();
      ctx.restore();
      this.recordBounds(widgetKey, 'Header', x, y, width, h);
      return y + h;
    }

    // TEMPLATE: CENTERED HERO
    if (design === 'centered-hero') {
      const h = customH || 102;
      this.drawWidgetCardBg(ctx, widgetKey, x, y, width, h, config, theme);
      ctx.textAlign = 'center';

      // Top Runner Tag
      this.applyZDepth(ctx, offRunner.z);
      ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'runner', elAccent);
      ctx.font = this.getSubPartFont(config, widgetKey, 'runner', 'bold', 12);
      ctx.letterSpacing = '2px';
      ctx.fillText(`★  ${runnerName.toUpperCase()}  ★`, x + width / 2 + offRunner.x, y + 24 + offRunner.y);

      // Main Title
      this.applyZDepth(ctx, offTitle.z);
      ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'title', text);
      ctx.font = this.getSubPartFont(config, widgetKey, 'title', 'bold', 34);
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

      ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'subtitle', elAccent);
      ctx.font = this.getSubPartFont(config, widgetKey, 'subtitle', '600', 11);
      ctx.fillText(`${dateText}${location ? ' • ' + location : ''}`, x + width / 2 + offSub.x, y + 84 + offSub.y);

      ctx.restore();
      this.recordBounds(widgetKey, 'Header', x, y, width, h);
      return y + h;
    }

    // TEMPLATE: SPLIT BANNER (CALENDAR DATE STAMP BOX)
    if (design === 'split-banner') {
      const h = customH || 96;
      this.drawWidgetCardBg(ctx, widgetKey, x, y, width, h, config, theme);

      const dateParts = dateText.split('•').map((s) => s.trim());

      this.applyZDepth(ctx, offRunner.z);
      ctx.textAlign = 'left';
      ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'runner', elAccent);
      ctx.font = this.getSubPartFont(config, widgetKey, 'runner', 'bold', 12);
      ctx.fillText(runnerName.toUpperCase(), x + 20 + offRunner.x, y + 24 + offRunner.y);

      this.applyZDepth(ctx, offTitle.z);
      ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'title', text);
      ctx.font = this.getSubPartFont(config, widgetKey, 'title', 'bold', 30);
      ctx.fillText(title, x + 20 + offTitle.x, y + 56 + offTitle.y);

      this.applyZDepth(ctx, offSub.z);
      ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'subtitle', textMuted);
      ctx.font = this.getSubPartFont(config, widgetKey, 'subtitle', '500', 13);
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
      this.recordBounds(widgetKey, 'Header', x, y, width, h);
      return y + h;
    }

    // TEMPLATE: MINIMAL TOP BAR
    if (design === 'minimal-topbar') {
      const h = customH || 52;
      this.drawWidgetCardBg(ctx, widgetKey, x, y, width, h, config, theme);

      this.applyZDepth(ctx, offTitle.z);
      ctx.textAlign = 'left';
      ctx.fillStyle = elAccent;
      ctx.font = this.getSubPartFont(config, widgetKey, 'title', 'bold', 12);
      ctx.fillText('⚡', x + 20 + offTitle.x, y + 32 + offTitle.y);

      ctx.fillStyle = text;
      ctx.font = this.getSubPartFont(config, widgetKey, 'title', 'bold', 16);
      ctx.fillText(title, x + 40 + offTitle.x, y + 33 + offTitle.y);

      this.applyZDepth(ctx, offSub.z);
      const titleW = ctx.measureText(title).width;
      ctx.fillStyle = textMuted;
      ctx.font = this.getSubPartFont(config, widgetKey, 'subtitle', '500', 13);
      ctx.fillText(`•   ${dateText}`, x + 52 + titleW + offSub.x, y + 33 + offSub.y);

      this.applyZDepth(ctx, offRunner.z);
      ctx.textAlign = 'right';
      ctx.fillStyle = elAccent;
      ctx.font = this.getSubPartFont(config, widgetKey, 'runner', 'bold', 13);
      ctx.fillText(runnerName, x + width - 20 + offRunner.x, y + 33 + offRunner.y);

      ctx.restore();
      this.recordBounds(widgetKey, 'Header', x, y, width, h);
      return y + h;
    }

    // TEMPLATE: MAGAZINE COVER
    if (design === 'magazine-cover') {
      const h = customH || 104;
      this.drawWidgetCardBg(ctx, widgetKey, x, y, width, h, config, theme);
      const padX = (cardStyle !== 'floating') ? 20 : 0;

      const taglineY = y + Math.max(12, Math.round(h * 0.18));
      const titleY = y + Math.max(26, Math.round(h * 0.58));
      const dividerY = y + Math.max(34, Math.round(h * 0.72));
      const subY = y + Math.max(44, Math.round(h * 0.88));

      const defaultTagline = "// RUNNER'S LOG — ISSUE 2026 //";
      const taglineText = this.getTextOverride(config, widgetKey, 'tagline', defaultTagline);
      const offTagline = this.getElementOffset(config, widgetKey, 'tagline');
      if (!offTagline.hidden && taglineText) {
        this.applyZDepth(ctx, offTagline.z || offRunner.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'tagline', elAccent);
        const tagSize = Math.max(8, Math.min(13, Math.round(h * 0.11)));
        ctx.font = this.getSubPartFont(config, widgetKey, 'tagline', 'bold', tagSize);
        ctx.letterSpacing = '2px';
        ctx.fillText(taglineText, x + padX + offTagline.x, taglineY + offTagline.y);
      }

      if (!offTitle.hidden && title) {
        this.applyZDepth(ctx, offTitle.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'title', text);
        const baseTitleSize = Math.max(14, Math.min(48, Math.round(h * 0.38)));
        let titleFontSize = baseTitleSize;
        ctx.font = this.getSubPartFont(config, widgetKey, 'title', 'bold', titleFontSize);
        ctx.letterSpacing = '0px';

        const maxTitleW = width - padX * 2;
        let measuredW = ctx.measureText(title.toUpperCase()).width;
        if (measuredW > maxTitleW && maxTitleW > 50) {
          titleFontSize = Math.max(11, Math.floor(titleFontSize * (maxTitleW / measuredW)));
          ctx.font = this.getSubPartFont(config, widgetKey, 'title', 'bold', titleFontSize);
        }
        ctx.fillText(title.toUpperCase(), x + padX + offTitle.x, titleY + offTitle.y);
      }

      ctx.strokeStyle = elAccent;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + padX, dividerY);
      ctx.lineTo(x + width - padX, dividerY);
      ctx.stroke();

      const subFontSize = Math.max(8, Math.min(14, Math.round(h * 0.12)));

      if (!offSub.hidden && (dateText || location)) {
        this.applyZDepth(ctx, offSub.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'subtitle', textMuted);
        ctx.font = this.getSubPartFont(config, widgetKey, 'subtitle', '500', subFontSize);
        ctx.fillText(`${dateText}${location ? '   |   ' + location : ''}`, x + padX + offSub.x, subY + offSub.y);
      }

      const athletePrefix = this.getTextOverride(config, widgetKey, 'athletePrefix', 'ATHLETE:');
      const offAthletePrefix = this.getElementOffset(config, widgetKey, 'athletePrefix');
      if (!offRunner.hidden && (runnerName || athletePrefix)) {
        this.applyZDepth(ctx, offRunner.z);
        ctx.textAlign = 'right';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'runner', elAccent);
        ctx.font = this.getSubPartFont(config, widgetKey, 'runner', 'bold', subFontSize);
        const prefixStr = (!offAthletePrefix.hidden && athletePrefix) ? `${athletePrefix} ` : '';
        ctx.fillText(`${prefixStr}${runnerName.toUpperCase()}`, x + width - padX + offRunner.x, subY + offRunner.y);
      }

      ctx.restore();
      this.recordBounds(widgetKey, 'Header', x, y, width, h);
      return y + h;
    }

    // TEMPLATE: RETRO CYBER HUD
    if (design === 'retro-cyber' || design === 'cyber-hud') {
      const h = customH || 96;
      this.drawWidgetCardBg(ctx, widgetKey, x, y, width, h, config, theme);

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
      const sysPrompt = this.getTextOverride(config, widgetKey, 'sysPrompt', '[ SYS.RUN ]');
      const offSys = this.getElementOffset(config, widgetKey, 'sysPrompt');
      if (!offRunner.hidden || !offSys.hidden) {
        this.applyZDepth(ctx, offRunner.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'runner', elAccent);
        ctx.font = this.getSubPartFont(config, widgetKey, 'runner', 'bold', 11);
        const pStr = (!offSys.hidden && sysPrompt) ? `${sysPrompt} ` : '';
        const rStr = (!offRunner.hidden && runnerName) ? `// ${runnerName.toUpperCase()}` : '';
        ctx.fillText(`${pStr}${rStr}`.trim(), x + 24 + offRunner.x, y + 26 + offRunner.y);
      }

      // Main Title
      if (!offTitle.hidden && title) {
        this.applyZDepth(ctx, offTitle.z);
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'title', text);
        ctx.font = this.getSubPartFont(config, widgetKey, 'title', 'bold', 28);
        ctx.fillText(title.toUpperCase(), x + 24 + offTitle.x, y + 58 + offTitle.y);
      }

      if (!offSub.hidden && (dateText || location)) {
        this.applyZDepth(ctx, offSub.z);
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'subtitle', textMuted);
        ctx.font = this.getSubPartFont(config, widgetKey, 'subtitle', '500', 11);
        ctx.fillText(`${dateText}${location ? ' // ' + location.toUpperCase() : ''}`, x + 24 + offSub.x, y + 80 + offSub.y);
      }

      // Right Status Pill
      const onlineStatus = this.getTextOverride(config, widgetKey, 'onlineStatus', '● ONLINE [OK]');
      const offOnline = this.getElementOffset(config, widgetKey, 'onlineStatus');
      if (!offOnline.hidden && onlineStatus) {
        this.applyZDepth(ctx, offWeather.z);
        ctx.textAlign = 'right';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'onlineStatus', elAccent);
        ctx.font = this.getSubPartFont(config, widgetKey, 'onlineStatus', 'bold', 12);
        ctx.fillText(onlineStatus, x + width - 24 + offWeather.x, y + 26 + offWeather.y);
      }
      if (!offWeather.hidden && weatherText) {
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'weather', textMuted);
        ctx.font = this.getSubPartFont(config, widgetKey, 'weather', '500', 12);
        ctx.fillText(weatherText, x + width - 24 + offWeather.x, y + 58 + offWeather.y);
      }

      ctx.restore();
      this.recordBounds(widgetKey, 'Header', x, y, width, h);
      return y + h;
    }

    // TEMPLATE: MINIMALIST PASSPORT STAMP
    if (design === 'minimalist-stamp') {
      const h = customH || 92;
      this.drawWidgetCardBg(ctx, widgetKey, x, y, width, h, config, theme);

      const stampBadge = this.getTextOverride(config, widgetKey, 'stampBadge', '★ OFFICIAL ATHLETIC ENTRY ★');
      const offStampBadge = this.getElementOffset(config, widgetKey, 'stampBadge');
      if (!offStampBadge.hidden && stampBadge) {
        this.applyZDepth(ctx, offStampBadge.z || offRunner.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'stampBadge', elAccent);
        ctx.font = this.getSubPartFont(config, widgetKey, 'stampBadge', 'bold', 11);
        ctx.letterSpacing = '3px';
        ctx.fillText(stampBadge, x + 22 + offStampBadge.x, y + 24 + offStampBadge.y);
      }

      if (!offTitle.hidden && title) {
        this.applyZDepth(ctx, offTitle.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'title', text);
        ctx.font = this.getSubPartFont(config, widgetKey, 'title', 'bold', 30);
        ctx.letterSpacing = '1px';
        ctx.fillText(title.toUpperCase(), x + 22 + offTitle.x, y + 58 + offTitle.y);
      }

      if (!offSub.hidden && (dateText || location)) {
        this.applyZDepth(ctx, offSub.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'subtitle', textMuted);
        ctx.font = this.getSubPartFont(config, widgetKey, 'subtitle', '600', 12);
        const metaParts = [dateText, location].filter(Boolean);
        ctx.fillText(metaParts.join('  |  '), x + 22 + offSub.x, y + 78 + offSub.y);
      }

      // Circular Seal Badge on Right
      const sealTop = this.getTextOverride(config, widgetKey, 'sealTop', 'RUN');
      const sealBottom = this.getTextOverride(config, widgetKey, 'sealBottom', 'STAMP');
      const offSeal = this.getElementOffset(config, widgetKey, 'seal');
      if (!offSeal.hidden && (sealTop || sealBottom)) {
        const sealR = 26;
        const sealX = x + width - sealR - 22;
        const sealY = y + h / 2;
        ctx.strokeStyle = elAccent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sealX, sealY, sealR, 0, Math.PI * 2);
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'seal', elAccent);
        ctx.font = 'bold 10px sans-serif';
        if (sealTop) ctx.fillText(sealTop, sealX, sealY - 4);
        if (sealBottom) ctx.fillText(sealBottom, sealX, sealY + 10);
      }

      ctx.restore();
      this.recordBounds(widgetKey, 'Header', x, y, width, h);
      return y + h;
    }

    // TEMPLATE: BADGE SHIELD / ATHLETIC BADGE
    if (design === 'badge-shield' || design === 'athletic-badge') {
      const h = customH || 96;
      this.drawWidgetCardBg(ctx, widgetKey, x, y, width, h, config, theme, true);

      // Shield Icon
      const shieldIcon = this.getTextOverride(config, widgetKey, 'shieldIcon', '🏆');
      const offShield = this.getElementOffset(config, widgetKey, 'shieldIcon');
      if (!offShield.hidden && shieldIcon) {
        ctx.fillStyle = elAccent;
        this.drawRoundedRect(ctx, x + 18, y + 18, 56, 56, 12);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = `bold 24px ${font}`;
        ctx.textAlign = 'center';
        ctx.fillText(shieldIcon, x + 46, y + 54);
      }

      if (!offRunner.hidden && runnerName) {
        this.applyZDepth(ctx, offRunner.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'runner', elAccent);
        ctx.font = this.getSubPartFont(config, widgetKey, 'runner', 'bold', 12);
        ctx.fillText(`★ ★ ★  ${runnerName.toUpperCase()}  ★ ★ ★`, x + 88 + offRunner.x, y + 34 + offRunner.y);
      }

      if (!offTitle.hidden && title) {
        this.applyZDepth(ctx, offTitle.z);
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'title', text);
        ctx.font = this.getSubPartFont(config, widgetKey, 'title', 'bold', 28);
        ctx.fillText(title, x + 88 + offTitle.x, y + 66 + offTitle.y);
      }

      if (!offSub.hidden && dateText) {
        this.applyZDepth(ctx, offSub.z);
        ctx.textAlign = 'right';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'subtitle', textMuted);
        ctx.font = this.getSubPartFont(config, widgetKey, 'subtitle', '500', 13);
        ctx.fillText(dateText, x + width - 22 + offSub.x, y + 44 + offSub.y);
      }
      if (location && !offLoc.hidden) {
        this.applyZDepth(ctx, offLoc.z);
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'location', elAccent);
        ctx.font = this.getSubPartFont(config, widgetKey, 'location', 'bold', 12);
        ctx.fillText(location, x + width - 22 + offLoc.x, y + 66 + offLoc.y);
      }

      ctx.restore();
      this.recordBounds(widgetKey, 'Header', x, y, width, h);
      return y + h;
    }

    // TEMPLATE: GLASS PILL
    if (design === 'pill') {
      const h = customH || 86;
      this.drawWidgetCardBg(ctx, widgetKey, x, y, width, h, config, theme, true);
      // Athlete Avatar Icon
      const pillIcon = this.getTextOverride(config, widgetKey, 'pillIcon', '🏃');
      const offPillIcon = this.getElementOffset(config, widgetKey, 'pillIcon');
      if (!offPillIcon.hidden && pillIcon) {
        ctx.fillStyle = elAccent;
        ctx.beginPath();
        ctx.arc(x + 40, y + 43, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = `bold 16px ${font}`;
        ctx.textAlign = 'center';
        ctx.fillText(pillIcon, x + 40, y + 49);
      }

      // Title & Date
      if (!offTitle.hidden && title) {
        this.applyZDepth(ctx, offTitle.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'title', text);
        ctx.font = this.getSubPartFont(config, widgetKey, 'title', 'bold', 22);
        ctx.fillText(title, x + 76 + offTitle.x, y + 38 + offTitle.y);
      }

      if (!offSub.hidden && (dateText || location)) {
        this.applyZDepth(ctx, offSub.z);
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'subtitle', textMuted);
        ctx.font = this.getSubPartFont(config, widgetKey, 'subtitle', '500', 13);
        ctx.fillText(`${dateText}${location ? ' • ' + location : ''}`, x + 76 + offSub.x, y + 62 + offSub.y);
      }

      // Right: Runner handle
      if (!offRunner.hidden && runnerName) {
        this.applyZDepth(ctx, offRunner.z);
        ctx.textAlign = 'right';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'runner', elAccent);
        ctx.font = this.getSubPartFont(config, widgetKey, 'runner', 'bold', 14);
        ctx.fillText(runnerName, x + width - 22 + offRunner.x, y + 46 + offRunner.y);
      }

      ctx.restore();
      this.recordBounds(widgetKey, 'Header', x, y, width, h);
      return y + h;
    }

    // TEMPLATE: STACKED EDITORIAL
    if (design === 'editorial' || design === 'stacked-editorial') {
      const h = customH || 96;
      const padX = (cardStyle !== 'floating') ? 22 : 10;
      this.drawWidgetCardBg(ctx, widgetKey, x, y, width, h, config, theme);

      this.applyZDepth(ctx, offSub.z);
      ctx.textAlign = 'left';
      ctx.fillStyle = elAccent;
      ctx.font = this.getSubPartFont(config, widgetKey, 'subtitle', 'bold', 11);
      ctx.letterSpacing = '2px';
      ctx.fillText(`// ${dateText.toUpperCase()} //`, x + padX + offSub.x, y + 20 + offSub.y);

      this.applyZDepth(ctx, offTitle.z);
      ctx.fillStyle = text;
      ctx.font = this.getSubPartFont(config, widgetKey, 'title', 'bold', 36);
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
        ctx.font = this.getSubPartFont(config, widgetKey, 'location', '600', 13);
        ctx.fillText(`📍 ${location}`, x + padX + offLoc.x, y + 86 + offLoc.y);
      }

      this.applyZDepth(ctx, offRunner.z);
      ctx.textAlign = 'right';
      ctx.fillStyle = text;
      ctx.font = this.getSubPartFont(config, widgetKey, 'runner', 'bold', 13);
      ctx.fillText(`${runnerName.toUpperCase()}`, x + width - padX + offRunner.x, y + 86 + offRunner.y);

      ctx.restore();
      this.recordBounds(widgetKey, 'Header', x, y, width, h);
      return y + h;
    }

    // TEMPLATE: SPORT ATHLETIC HUD
    if (design === 'athletic') {
      const h = customH || 94;
      const padX = (cardStyle !== 'floating') ? 22 : 12;
      this.drawWidgetCardBg(ctx, widgetKey, x, y, width, h, config, theme);

      // Category chip
      const hudChip = this.getTextOverride(config, widgetKey, 'hudChip', '⚡ RUN HUD');
      const offHudChip = this.getElementOffset(config, widgetKey, 'hudChip');
      if (!offHudChip.hidden && hudChip) {
        ctx.fillStyle = elAccent;
        this.drawRoundedRect(ctx, x + padX, y + 10, 80, 22, 4);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = `bold 11px ${font}`;
        ctx.textAlign = 'center';
        ctx.fillText(hudChip, x + padX + 40, y + 25);
      }

      // Title
      if (!offTitle.hidden && title) {
        this.applyZDepth(ctx, offTitle.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = text;
        ctx.font = this.getSubPartFont(config, widgetKey, 'title', 'bold', 28);
        ctx.fillText(title.toUpperCase(), x + padX + offTitle.x, y + 58 + offTitle.y);
      }

      if (!offSub.hidden && (dateText || location)) {
        this.applyZDepth(ctx, offSub.z);
        ctx.fillStyle = textMuted;
        ctx.font = this.getSubPartFont(config, widgetKey, 'subtitle', '600', 13);
        ctx.fillText(`${dateText}${location ? '  |  ' + location : ''}`, x + padX + offSub.x, y + 80 + offSub.y);
      }

      // Right: Runner
      if (!offRunner.hidden && runnerName) {
        this.applyZDepth(ctx, offRunner.z);
        ctx.textAlign = 'right';
        ctx.fillStyle = elAccent;
        ctx.font = this.getSubPartFont(config, widgetKey, 'runner', 'bold', 15);
        ctx.fillText(runnerName.toUpperCase(), x + width - padX + offRunner.x, y + 58 + offRunner.y);
      }

      ctx.restore();
      this.recordBounds(widgetKey, 'Header', x, y, width, h);
      return y + h;
    }


    if (design === 'vertical-sidebar-badge') {
      // Style: Vertical Accent Card (Stacked headline with glowing sidebar stripe)
      const h = customH || 92;
      this.drawWidgetCardBg(ctx, widgetKey, x, y, width, h, config, theme);

      // Thick left accent stripe
      ctx.fillStyle = elAccent;
      this.drawRoundedRect(ctx, x + 4, y + 8, 6, h - 16, 3);
      ctx.fill();

      // Title
      if (!offTitle.hidden && title) {
        this.applyZDepth(ctx, offTitle.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'title', text);
        ctx.font = this.getSubPartFont(config, widgetKey, 'title', 'bold', 28);
        ctx.fillText(title, x + 24 + offTitle.x, y + 36 + offTitle.y);
      }

      // Subtitle
      if (!offSub.hidden && dateText) {
        this.applyZDepth(ctx, offSub.z);
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'subtitle', textMuted);
        ctx.font = this.getSubPartFont(config, widgetKey, 'subtitle', '500', 13);
        ctx.fillText(dateText, x + 24 + offSub.x, y + 62 + offSub.y);
      }

      // Right-aligned Runner & Location
      const rightX = x + width - 20;
      ctx.textAlign = 'right';
      if (!offRunner.hidden && runnerName) {
        this.applyZDepth(ctx, offRunner.z);
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'runner', elAccent);
        ctx.font = this.getSubPartFont(config, widgetKey, 'runner', 'bold', 14);
        ctx.fillText(runnerName, rightX + offRunner.x, y + 36 + offRunner.y);
      }
      if (location && !offLoc.hidden) {
        this.applyZDepth(ctx, offLoc.z);
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'location', textMuted);
        ctx.font = this.getSubPartFont(config, widgetKey, 'location', '500', 12);
        ctx.fillText(`📍 ${location}`, rightX + offLoc.x, y + 60 + offLoc.y);
      }

      ctx.restore();
      this.recordBounds(widgetKey, 'Header', x, y, width, h);
      return y + h;
    }

    if (design === 'running-bib-header') {
      // Style: Marathon Race Bib Header (Bib number, athlete tag & perforated seal)
      const h = customH || 96;
      this.drawWidgetCardBg(ctx, widgetKey, x, y, width, h, config, theme);

      // Top bib color bar
      ctx.fillStyle = elAccent;
      this.drawRoundedRect(ctx, x + 12, y + 8, width - 24, 6, 3);
      ctx.fill();

      // Runner name & bib number
      const bibPrefix = this.getTextOverride(config, widgetKey, 'bibPrefix', 'BIB #4219 // ATHLETE:');
      const offBibPrefix = this.getElementOffset(config, widgetKey, 'bibPrefix');
      if (!offRunner.hidden || !offBibPrefix.hidden) {
        this.applyZDepth(ctx, offRunner.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'runner', elAccent);
        ctx.font = 'bold 11px monospace';
        const p = (!offBibPrefix.hidden && bibPrefix) ? `${bibPrefix} ` : '';
        const r = (!offRunner.hidden && runnerName) ? runnerName.toUpperCase() : '';
        ctx.fillText(`${p}${r}`.trim(), x + 18 + offRunner.x, y + 32 + offRunner.y);
      }

      // Main title
      if (!offTitle.hidden && title) {
        this.applyZDepth(ctx, offTitle.z);
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'title', text);
        ctx.font = this.getSubPartFont(config, widgetKey, 'title', 'bold', 28);
        ctx.fillText(title.toUpperCase(), x + 18 + offTitle.x, y + 64 + offTitle.y);
      }

      // Date & location on right
      ctx.textAlign = 'right';
      const rightX = x + width - 18;
      if (!offSub.hidden && dateText) {
        this.applyZDepth(ctx, offSub.z);
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'subtitle', textMuted);
        ctx.font = this.getSubPartFont(config, widgetKey, 'subtitle', 'bold', 11);
        ctx.fillText(dateText, rightX + offSub.x, y + 60 + offSub.y);
      }
      if (location && !offLoc.hidden) {
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
      this.recordBounds(widgetKey, 'Header', x, y, width, h);
      return y + h;
    }

    if (design === 'broadcast-lowerthird') {
      // Style: Broadcast Banner (Lower-third TV ribbon with live dot)
      const h = customH || 82;
      this.drawWidgetCardBg(ctx, widgetKey, x, y, width, h, config, theme);

      // Glowing LIVE indicator pill
      const finishBadge = this.getTextOverride(config, widgetKey, 'finishBadge', 'FINISH');
      const offFinish = this.getElementOffset(config, widgetKey, 'finishBadge');
      if (!offFinish.hidden && finishBadge) {
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
        ctx.fillText(finishBadge, x + 38, y + 27);
      }

      // Title
      if (!offTitle.hidden && title) {
        this.applyZDepth(ctx, offTitle.z);
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'title', text);
        ctx.font = this.getSubPartFont(config, widgetKey, 'title', 'bold', 26);
        ctx.fillText(title, x + 96 + offTitle.x, y + 32 + offTitle.y);
      }

      // Sub-bar banner
      this.drawRoundedRect(ctx, x + 16, y + 44, width - 32, 26, 6);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.fill();

      if (!offSub.hidden && dateText) {
        this.applyZDepth(ctx, offSub.z);
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'subtitle', textMuted);
        ctx.font = this.getSubPartFont(config, widgetKey, 'subtitle', '500', 11);
        ctx.fillText(dateText, x + 26 + offSub.x, y + 61 + offSub.y);
      }

      ctx.textAlign = 'right';
      const rightX = x + width - 26;
      if (!offRunner.hidden && (runnerName || location)) {
        this.applyZDepth(ctx, offRunner.z);
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'runner', elAccent);
        ctx.font = this.getSubPartFont(config, widgetKey, 'runner', 'bold', 11);
        ctx.fillText(`${runnerName}  ${location ? '• ' + location : ''}`, rightX + offRunner.x, y + 61 + offRunner.y);
      }

      ctx.restore();
      this.recordBounds(widgetKey, 'Header', x, y, width, h);
      return y + h;
    }

    if (design === 'architect-monolith') {
      // Style: Architectural Monolith (Oversized date & clean typography)
      const h = customH || 92;
      this.drawWidgetCardBg(ctx, widgetKey, x, y, width, h, config, theme);

      // Extract day number & month if possible
      const defaultDayNum = activity.dateFormatted ? (activity.dateFormatted.match(/\d+/) || ['15'])[0] : '15';
      const defaultMonthStr = activity.dateFormatted ? (activity.dateFormatted.match(/[A-Za-z]+/) || ['OCT'])[0].toUpperCase() : 'OCT';
      const dayNum = this.getTextOverride(config, widgetKey, 'dayNum', defaultDayNum);
      const monthStr = this.getTextOverride(config, widgetKey, 'monthStr', defaultMonthStr);
      const offDayNum = this.getElementOffset(config, widgetKey, 'dayNum');
      const offMonthStr = this.getElementOffset(config, widgetKey, 'monthStr');

      // Big calendar block
      const dateBoxW = 56;
      if (!offDayNum.hidden || !offMonthStr.hidden) {
        this.drawRoundedRect(ctx, x + 16, y + 14, dateBoxW, h - 28, 6);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fill();
        ctx.strokeStyle = elAccent;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.textAlign = 'center';
        if (!offDayNum.hidden && dayNum) {
          ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'dayNum', elAccent);
          ctx.font = 'bold 22px sans-serif';
          ctx.fillText(dayNum, x + 16 + dateBoxW / 2 + offDayNum.x, y + 42 + offDayNum.y);
        }
        if (!offMonthStr.hidden && monthStr) {
          ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'monthStr', textMuted);
          ctx.font = 'bold 9px sans-serif';
          ctx.fillText(monthStr, x + 16 + dateBoxW / 2 + offMonthStr.x, y + 58 + offMonthStr.y);
        }
      }

      // Main title
      this.applyZDepth(ctx, offTitle.z);
      ctx.textAlign = 'left';
      ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'title', text);
      ctx.font = this.getSubPartFont(config, widgetKey, 'title', 'bold', 30);
      ctx.fillText(title.toUpperCase(), x + 86 + offTitle.x, y + 42 + offTitle.y);

      // Subtitle & Runner
      this.applyZDepth(ctx, offSub.z);
      ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'subtitle', textMuted);
      ctx.font = this.getSubPartFont(config, widgetKey, 'subtitle', '500', 12);
      ctx.fillText(`${activity.timeFormatted || '06:30 AM'} // ${runnerName}`, x + 86 + offSub.x, y + 66 + offSub.y);

      if (location) {
        ctx.textAlign = 'right';
        this.applyZDepth(ctx, offLoc.z);
        ctx.fillStyle = elAccent;
        ctx.font = this.getSubPartFont(config, widgetKey, 'location', 'bold', 12);
        ctx.fillText(`📍 ${location}`, x + width - 20 + offLoc.x, y + 42 + offLoc.y);
      }

      ctx.restore();
      this.recordBounds(widgetKey, 'Header', x, y, width, h);
      return y + h;
    }

    if (design === 'speed-chaser-bracket') {
      // Style: Aerodynamic Speed Bracket (Racing flags & speed notch)
      const h = customH || 88;
      this.drawWidgetCardBg(ctx, widgetKey, x, y, width, h, config, theme);

      // Slanted speed chevrons on left
      ctx.save();
      ctx.fillStyle = elAccent;
      const stripeW = 10;
      ctx.beginPath();
      ctx.moveTo(x + 18, y + 16);
      ctx.lineTo(x + 18 + stripeW, y + 16);
      ctx.lineTo(x + 12 + stripeW, y + h - 16);
      ctx.lineTo(x + 12, y + h - 16);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.moveTo(x + 32, y + 16);
      ctx.lineTo(x + 32 + stripeW, y + 16);
      ctx.lineTo(x + 26 + stripeW, y + h - 16);
      ctx.lineTo(x + 26, y + h - 16);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Top mini telemetry tag
      const speedTag = this.getTextOverride(config, widgetKey, 'speedTag', '⚡ SPEED CHASER // GPS TELEMETRY');
      ctx.save();
      ctx.textAlign = 'left';
      ctx.fillStyle = elAccent;
      ctx.font = 'bold 9px monospace';
      ctx.fillText(speedTag, x + 48, y + 24);
      ctx.restore();

      // Title
      if (!offTitle.hidden && title) {
        this.applyZDepth(ctx, offTitle.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'title', text);
        ctx.font = this.getSubPartFont(config, widgetKey, 'title', 'italic bold', 28);
        ctx.fillText(title.toUpperCase(), x + 48 + offTitle.x, y + 52 + offTitle.y);
      }

      // Subtitle
      if (!offSub.hidden && dateText) {
        this.applyZDepth(ctx, offSub.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'subtitle', textMuted);
        ctx.font = this.getSubPartFont(config, widgetKey, 'subtitle', '600', 11);
        ctx.fillText(dateText, x + 48 + offSub.x, y + 72 + offSub.y);
      }

      ctx.textAlign = 'right';
      const rightX = x + width - 20;
      if (!offRunner.hidden && runnerName) {
        this.applyZDepth(ctx, offRunner.z);
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'runner', text);
        ctx.font = this.getSubPartFont(config, widgetKey, 'runner', 'bold', 13);
        ctx.fillText(runnerName, rightX + offRunner.x, y + 50 + offRunner.y);
      }
      if (location) {
        this.applyZDepth(ctx, offLoc.z);
        ctx.fillStyle = elAccent;
        ctx.font = this.getSubPartFont(config, widgetKey, 'location', 'bold', 10);
        ctx.fillText(`📍 ${location.toUpperCase()}`, rightX + offLoc.x, y + 70 + offLoc.y);
      }

      ctx.restore();
      this.recordBounds(widgetKey, 'Header', x, y, width, h);
      return y + h;
    }

    if (design === 'editorial-vogue-minimal') {
      // Style: Vogue Editorial (High-Fashion Serif & Golden Border Accent)
      const h = customH || 96;
      this.drawWidgetCardBg(ctx, widgetKey, x, y, width, h, config, theme);

      const cx = x + width / 2;

      // Top kicker label
      const editorialKicker = this.getTextOverride(config, widgetKey, 'editorialKicker', 'THE ATHLETE ISSUE • AUTUMN / WINTER');
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = elAccent;
      ctx.font = '600 9px sans-serif';
      ctx.letterSpacing = '3px';
      ctx.fillText(editorialKicker, cx, y + 22);

      // Main Editorial Title in Serif
      if (!offTitle.hidden && title) {
        this.applyZDepth(ctx, offTitle.z);
        ctx.textAlign = 'center';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'title', text);
        ctx.font = `italic 300 32px Georgia, 'Times New Roman', serif`;
        ctx.fillText(title, cx + offTitle.x, y + 56 + offTitle.y);
      }

      // Elegant Hairline Rule
      ctx.strokeStyle = elAccent;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 60, y + 68);
      ctx.lineTo(cx + 60, y + 68);
      ctx.stroke();

      // Bottom Date & Runner
      if (!offSub.hidden && dateText) {
        this.applyZDepth(ctx, offSub.z);
        ctx.textAlign = 'center';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'subtitle', textMuted);
        ctx.font = '400 11px Georgia, serif';
        ctx.letterSpacing = '1px';
        const metaStr = runnerName ? `${dateText}   |   ${runnerName}` : dateText;
        ctx.fillText(metaStr, cx + offSub.x, y + 84 + offSub.y);
      }

      ctx.restore();
      this.recordBounds(widgetKey, 'Header', x, y, width, h);
      return y + h;
    }

    // DEFAULT 'modern' / 'modern-clean':
    const padX = (cardStyle !== 'floating') ? 24 : 12;
    const padY = (cardStyle !== 'floating') ? 14 : 8;
    const h = customH || (config.weatherText ? 96 : 84);
    if (cardStyle !== 'floating') {
      this.drawWidgetCardBg(ctx, widgetKey, x, y, width, h, config, theme);
    }
    const alignMode = align || 'left';
    ctx.textAlign = alignMode;

    const titleX = (alignMode === 'center' ? x + width / 2 : alignMode === 'right' ? x + width - padX : x + padX) + offTitle.x;
    const subX = (alignMode === 'center' ? x + width / 2 : alignMode === 'right' ? x + width - padX : x + padX) + offSub.x;

    this.applyZDepth(ctx, offTitle.z);
    ctx.fillStyle = text;
    ctx.font = this.getSubPartFont(config, widgetKey, 'title', 'bold', 32);
    ctx.fillText(title, titleX, y + padY + 30 + offTitle.y);

    this.applyZDepth(ctx, offSub.z);
    ctx.font = this.getSubPartFont(config, widgetKey, 'subtitle', '500', 14);
    ctx.fillStyle = textMuted;
    ctx.fillText(dateText, subX, y + padY + 54 + offSub.y);

    if (alignMode === 'center') {
      ctx.textAlign = 'center';
      const metaParts = [runnerName, location, weatherText || config.weatherText].filter(Boolean);
      if (metaParts.length > 0) {
        ctx.save();
        this.applyZDepth(ctx, offRunner.z);
        ctx.fillStyle = elAccent;
        ctx.font = this.getSubPartFont(config, widgetKey, 'runner', 'bold', 12);
        ctx.fillText(metaParts.join('  •  '), x + width / 2, y + padY + 74 + offRunner.y);
        ctx.restore();
      }
    } else {
      const isLeft = alignMode === 'left';
      ctx.textAlign = isLeft ? 'right' : 'left';
      const metaX = isLeft ? x + width - padX : x + padX;

      if (location) {
        this.applyZDepth(ctx, offLoc.z);
        ctx.fillStyle = elAccent;
        ctx.font = this.getSubPartFont(config, widgetKey, 'location', 'bold', 12);
        ctx.fillText(location.toUpperCase(), metaX + offLoc.x, y + padY + 20 + offLoc.y);
      }

      this.applyZDepth(ctx, offRunner.z);
      ctx.fillStyle = text;
      ctx.font = this.getSubPartFont(config, widgetKey, 'runner', '600', 15);
      ctx.fillText(runnerName, metaX + offRunner.x, y + padY + (location ? 42 : 28) + offRunner.y);

      if (weatherText || config.weatherText) {
        this.applyZDepth(ctx, offWeather.z);
        ctx.fillStyle = textMuted;
        ctx.font = this.getSubPartFont(config, widgetKey, 'weather', '500', 12);
        ctx.fillText(weatherText || config.weatherText, metaX + offWeather.x, y + padY + (location ? 64 : 50) + offWeather.y);
      }
    }

    ctx.restore();
    this.recordBounds(widgetKey, 'Header', x, y, width, h);
    return y + h;
  }

  // =========================================================================
  // WIDGET 2: ROUTE MAP
  // Designs: 'glow', 'card', 'milestones', 'minimal', 'neon-pulse', 'framed-polaroid', 'gradient-speed'
  // =========================================================================
  drawRouteMap(ctx, x, y, width, height, activity, config, theme, accent, widgetKey = 'map') {
    if (!activity.hasRoute || !activity.bounds || activity.bounds.minLat === 90) return;

    ctx.save();
    const rot = this.applyWidgetRotation(ctx, config, widgetKey, x, y, width, height);
    const { accent: mapAccent, opacity: mapOpacity, cardStyle } = this.getEffectiveColors(config, theme, accent, widgetKey);
    if (mapOpacity < 1) ctx.globalAlpha = mapOpacity;
    accent = mapAccent;

    const design = config.mapDesign || 'glow';
    this.recordBounds(widgetKey, 'Route Map', x, y, width, height);

    const offRoute = this.getElementOffset(config, widgetKey, 'route');
    const offCaption = this.getElementOffset(config, widgetKey, 'caption');

    // Check if bare route (no backdrop) or floating is chosen
    const isBareRoute = design === 'bare-route' || design === 'bare-glow' || design === 'bare-speed' || this.isTextOnly(config, 'map');

    // Frame / Background
    if (isBareRoute) {
      // Zero backdrop drawn! Pure floating map
    } else if (design === 'framed-polaroid') {
      // White / bright polaroid card with bottom caption
      this.drawWidgetCardBg(ctx, widgetKey, x, y, width, height, config, theme) || (() => {
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
        ctx.font = this.getSubPartFont(config, widgetKey, 'caption', 'bold', 14);
        const capDefault = `${config.locationName || activity.title || 'Run'} • ${activity.distanceMain} ${activity.distanceUnit}`;
        const capText = this.getTextOverride(config, widgetKey, 'caption', capDefault);
        ctx.fillText(capText, x + width / 2 + offCaption.x, y + height - 16 + offCaption.y);
        ctx.restore();
      }
    } else if (design === 'cyber-wireframe') {
      // Cyber Grid & Compass HUD
      this.drawWidgetCardBg(ctx, widgetKey, x, y, width, height, config, theme);
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
      this.drawWidgetCardBg(ctx, widgetKey, x, y, width, height, config, theme);
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
      this.drawWidgetCardBg(ctx, widgetKey, x, y, width, height, config, theme);
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
      this.drawWidgetCardBg(ctx, widgetKey, x, y, width, height, config, theme);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
      ctx.lineWidth = 1;
      const gridStep = 30;
      for (let gx = x; gx < x + width; gx += gridStep) {
        ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx, y + height); ctx.stroke();
      }
      for (let gy = y; gy < y + height; gy += gridStep) {
        ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + width, gy); ctx.stroke();
      }
    } else if (design === 'neon-wire-matrix') {
      // Neon Wireframe Matrix (Vector Grid & Digital Altitude Crossings)
      this.drawWidgetCardBg(ctx, widgetKey, x, y, width, height, config, theme);
      ctx.save();
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.12)';
      ctx.lineWidth = 1;
      const step = 20;
      for (let gx = x; gx < x + width; gx += step) {
        ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx, y + height); ctx.stroke();
      }
      for (let gy = y; gy < y + height; gy += step) {
        ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + width, gy); ctx.stroke();
      }
      ctx.fillStyle = accent;
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`+ LAT ${activity.bounds.minLat.toFixed(3)}°`, x + 10, y + 14);
      ctx.textAlign = 'right';
      ctx.fillText(`LON ${activity.bounds.minLon.toFixed(3)}° +`, x + width - 10, y + 14);
      ctx.restore();
    } else if (design === 'isometric-shadow-track') {
      // Isometric 3D Track (Extruded Ground Shadow & Beacon)
      this.drawWidgetCardBg(ctx, widgetKey, x, y, width, height, config, theme);
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      this.drawRoundedRect(ctx, x + 14, y + 10, 125, 18, 4);
      ctx.fill();
      ctx.fillStyle = accent;
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('3D ISOMETRIC TRACK //', x + 76, y + 22);
      ctx.restore();
    } else {
      this.drawWidgetCardBg(ctx, widgetKey, x, y, width, height, config, theme);
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

    // 3D Extruded floor shadow for isometric-shadow-track
    if (design === 'isometric-shadow-track') {
      ctx.save();
      ctx.beginPath();
      const shadowDy = 10;
      pts.forEach((p, idx) => {
        const [px, py] = project(p.lat, p.lon);
        if (idx === 0) ctx.moveTo(px, py + shadowDy);
        else ctx.lineTo(px, py + shadowDy);
      });
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.restore();
    }

    // Glowing track shadow
    if (design === 'glow' || design === 'bare-glow' || design === 'neon-pulse' || design === 'neon-wire-matrix' || config.mapGlow) {
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
  drawHeroStat(ctx, x, y, width, activity, config, theme, accent, customH = null, widgetKey = 'hero') {
    ctx.save();
    const rot = this.applyWidgetRotation(ctx, config, widgetKey, x, y, width, customH || 105);
    const elStyle = this.getElementStyle(config, widgetKey);
    const { text, textMuted, accent: elAccent, cardStyle, align, opacity } = this.getEffectiveColors(config, theme, accent, widgetKey);
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
    } else if (heroType === 'hr') {
      mainVal = String(activity.avgHr || (activity.heartrate ? activity.heartrate.avg : 155));
      mainUnit = 'BPM';
      defaultLabel = 'AVG HEART RATE';
    }

    const labelKey = heroType === 'time' ? 'Time' : heroType === 'pace' ? 'Pace' : heroType === 'hr' ? 'HeartRate' : 'Distance';
    let label = this.getMetricLabel(config, labelKey, defaultLabel);

    // Apply individual text overrides for hero metric
    label = this.getTextOverride(config, widgetKey, 'label', label);
    mainVal = this.getTextOverride(config, widgetKey, 'value', mainVal);
    mainUnit = this.getTextOverride(config, widgetKey, 'unit', mainUnit);

    const offLabel = this.getElementOffset(config, widgetKey, 'label');
    const offVal = this.getElementOffset(config, widgetKey, 'value');
    const offUnit = this.getElementOffset(config, widgetKey, 'unit');
    const offSec = this.getElementOffset(config, widgetKey, 'secondary');

    if (offLabel.hidden) label = '';
    if (offVal.hidden) mainVal = '';
    if (offUnit.hidden) mainUnit = '';

    const h = customH || 105;
    this.recordBounds(widgetKey, 'Hero Metric', x, y, width, h);

    // TEMPLATE: MAGAZINE HEADLINE (Bold cover layout)
    if (design === 'magazine-headline') {
      this.drawWidgetCardBg(ctx, widgetKey, x, y, width, h, config, theme);
      const padX = (cardStyle !== 'floating') ? 22 : 6;

      // 1. Tagline / Issue Header
      const defaultTagline = "// RUNNER'S EDITORIAL — COVER FEATURE //";
      const taglineText = this.getTextOverride(config, widgetKey, 'tagline', (label || defaultTagline).toUpperCase());
      const offTagline = this.getElementOffset(config, widgetKey, 'tagline');
      const tagY = y + Math.max(12, Math.round(h * 0.18));
      if (!offTagline.hidden && taglineText) {
        this.applyZDepth(ctx, offTagline.z || offLabel.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'tagline', elAccent);
        const tagSize = Math.max(8, Math.min(13, Math.round(h * 0.11)));
        ctx.font = this.getSubPartFont(config, widgetKey, 'tagline', 'bold', tagSize);
        ctx.letterSpacing = '2px';
        ctx.fillText(taglineText, x + padX + offTagline.x, tagY + offTagline.y);
      }

      // 2. Giant Editorial Number and Unit
      const valY = y + Math.max(28, Math.round(h * 0.62));
      const valBaseSize = Math.max(20, Math.min(68, Math.round(h * 0.46)));
      let valFontSize = valBaseSize;
      
      if (!offVal.hidden && mainVal) {
        this.applyZDepth(ctx, offVal.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'val', text);
        ctx.font = this.getSubPartFont(config, widgetKey, 'val', 'bold', valFontSize);
        ctx.letterSpacing = '0px';

        // Auto-fit value & unit to width
        let valW = ctx.measureText(mainVal).width;
        const maxValW = (width - padX * 2) * 0.72;
        if (valW > maxValW && maxValW > 60) {
          valFontSize = Math.max(16, Math.floor(valFontSize * (maxValW / valW)));
          ctx.font = this.getSubPartFont(config, widgetKey, 'val', 'bold', valFontSize);
          valW = ctx.measureText(mainVal).width;
        }
        ctx.fillText(mainVal, x + padX + offVal.x, valY + offVal.y);

        // Unit badge next to value
        if (!offUnit.hidden && mainUnit) {
          this.applyZDepth(ctx, offUnit.z);
          const unitSize = Math.max(10, Math.min(22, Math.round(valFontSize * 0.38)));
          ctx.font = this.getSubPartFont(config, widgetKey, 'unit', 'bold', unitSize);
          ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'unit', elAccent);
          ctx.letterSpacing = '1px';
          ctx.fillText(mainUnit.toUpperCase(), x + padX + valW + 10 + offUnit.x, valY - Math.round(valFontSize * 0.12) + offUnit.y);
        }
      }

      // 3. Editorial Accent Divider Line
      const dividerY = y + Math.max(34, Math.round(h * 0.74));
      ctx.strokeStyle = elAccent;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + padX, dividerY);
      ctx.lineTo(x + width - padX, dividerY);
      ctx.stroke();

      // 4. Subtitle / Metadata row underneath divider
      const subY = y + Math.max(44, Math.round(h * 0.90));
      const subSize = Math.max(8, Math.min(13, Math.round(h * 0.12)));

      const secStats = [];
      if (heroType !== 'time' && activity.durationFormatted) secStats.push(`TIME: ${activity.durationFormatted}`);
      if (heroType !== 'pace' && activity.avgPaceFormatted) secStats.push(`PACE: ${activity.avgPaceFormatted}`);
      if (heroType !== 'hr' && (activity.avgHr || activity.heartrate?.avg)) secStats.push(`HR: ${activity.avgHr || activity.heartrate.avg} BPM`);
      const defaultSecText = secStats.join('   |   ') || 'OFFICIAL TELEMETRY RECORD';
      const secText = this.getTextOverride(config, widgetKey, 'secondary', defaultSecText);

      if (!offSec.hidden && secText) {
        this.applyZDepth(ctx, offSec.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'secondary', textMuted);
        ctx.font = this.getSubPartFont(config, widgetKey, 'secondary', '600', subSize);
        ctx.letterSpacing = '0.5px';
        ctx.fillText(secText, x + padX + offSec.x, subY + offSec.y);
      }

      // Right-aligned issue badge / status
      const issueTag = this.getTextOverride(config, widgetKey, 'issueTag', 'GPS VERIFIED');
      const offIssueTag = this.getElementOffset(config, widgetKey, 'issueTag');
      if (!offIssueTag.hidden && issueTag) {
        this.applyZDepth(ctx, offIssueTag.z);
        ctx.textAlign = 'right';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'issueTag', elAccent);
        ctx.font = `bold ${subSize}px monospace`;
        ctx.fillText(issueTag, x + width - padX + offIssueTag.x, subY + offIssueTag.y);
      }

      ctx.restore();
      this.recordBounds(widgetKey, 'Hero Metric', x, y, width, h);
      return y + h;
    }

    if (design === 'centered-radial-pod') {
      // Centered Radial Stadium Pod (Glowing Halo & Unit Badge)
      const podH = customH || 130;
      this.recordBounds(widgetKey, 'Hero Metric', x, y, width, podH);
      const effAlign = this.getWidgetAlign(align, 'center');
      const podW = Math.min(width, 280);
      const podX = effAlign === 'left' ? x : effAlign === 'right' ? x + width - podW : x + (width - podW) / 2;
      const cx = podX + podW / 2;

      // Outer glowing radial arc
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, y + podH / 2, Math.min(podW, podH) * 0.46, -Math.PI * 0.75, Math.PI * 0.75);
      ctx.strokeStyle = elAccent;
      ctx.lineWidth = 3;
      ctx.shadowColor = elAccent;
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.restore();

      // Rounded pod card
      this.drawRoundedRect(ctx, podX, y + 6, podW, podH - 12, 28);
      ctx.fillStyle = cardStyle === 'solid' ? '#111420' : 'rgba(15, 20, 32, 0.9)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Top label pill
      if (!offLabel.hidden && label) {
        ctx.save();
        this.applyZDepth(ctx, offLabel.z);
        const lPillW = Math.min(podW - 40, 140);
        this.drawRoundedRect(ctx, cx - lPillW / 2 + offLabel.x, y + 14 + offLabel.y, lPillW, 20, 10);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fill();
        ctx.strokeStyle = elAccent;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'label', elAccent);
        ctx.font = this.getSubPartFont(config, widgetKey, 'label', 'bold', 10);
        ctx.fillText(label.toUpperCase(), cx + offLabel.x, y + 28 + offLabel.y);
        ctx.restore();
      }

      // Massive Centered Value
      if (!offVal.hidden && mainVal) {
        ctx.save();
        this.applyZDepth(ctx, offVal.z);
        ctx.textAlign = 'center';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'val', text);
        ctx.font = this.getSubPartFont(config, widgetKey, 'val', 'bold', 54);
        ctx.shadowColor = elAccent;
        ctx.shadowBlur = 10;
        ctx.fillText(mainVal, cx + offVal.x, y + 78 + offVal.y);
        ctx.restore();
      }

      // Bottom Unit Badge
      if (!offUnit.hidden && mainUnit) {
        ctx.save();
        this.applyZDepth(ctx, offUnit.z);
        ctx.textAlign = 'center';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'unit', elAccent);
        ctx.font = this.getSubPartFont(config, widgetKey, 'unit', 'bold', 15);
        ctx.letterSpacing = '2px';
        ctx.fillText(mainUnit.toUpperCase(), cx + offUnit.x, y + 104 + offUnit.y);
        ctx.restore();
      }

      ctx.restore();
      return y + podH;
    }

    if (design === 'centered-stadium-capsule') {
      // Centered Stadium Capsule (Pill Frame & Centered Stack)
      const capH = customH || 110;
      this.recordBounds(widgetKey, 'Hero Metric', x, y, width, capH);
      const effAlign = this.getWidgetAlign(align, 'center');
      const cx = this.getAlignX(effAlign, x, width, 24, 'center');

      // Stadium pill frame
      this.drawRoundedRect(ctx, x, y, width, capH, Math.min(28, capH / 2));
      ctx.fillStyle = cardStyle === 'solid' ? '#101422' : 'rgba(14, 18, 30, 0.88)';
      ctx.fill();
      ctx.strokeStyle = elAccent;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Top centered beacon & label
      if (!offLabel.hidden && label) {
        ctx.save();
        this.applyZDepth(ctx, offLabel.z);
        ctx.textAlign = 'center';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'label', elAccent);
        ctx.font = this.getSubPartFont(config, widgetKey, 'label', 'bold', 11);
        ctx.letterSpacing = '1.5px';
        ctx.fillText(`●  ${label.toUpperCase()}`, cx + offLabel.x, y + 26 + offLabel.y);
        ctx.restore();
      }

      // Middle Centered Numerals + Unit
      if (!offVal.hidden && mainVal) {
        ctx.save();
        this.applyZDepth(ctx, offVal.z);
        ctx.textAlign = 'center';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'val', text);
        ctx.font = this.getSubPartFont(config, widgetKey, 'val', 'bold', 52);
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 10;
        const valStr = mainUnit ? `${mainVal} ${mainUnit}` : mainVal;
        ctx.fillText(valStr, cx + offVal.x, y + 74 + offVal.y);
        ctx.restore();
      }

      // Bottom centered telemetry bar
      if (!offSec.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offSec.z);
        ctx.textAlign = 'center';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'secondary', textMuted);
        ctx.font = this.getSubPartFont(config, widgetKey, 'secondary', 'bold', 9);
        ctx.letterSpacing = '2px';
        const secText = this.getTextOverride(config, widgetKey, 'secondary', '⚡ GPS RUN VERIFIED // TELEMETRY');
        ctx.fillText(secText, cx + offSec.x, y + 96 + offSec.y);
        ctx.restore();
      }

      ctx.restore();
      return y + capH;
    }

    if (design === 'centered-monolith') {
      // Centered Monolith (Ultra Bold Typography & Neon Underline)
      const monoH = customH || 120;
      this.recordBounds(widgetKey, 'Hero Metric', x, y, width, monoH);
      if (cardStyle !== 'floating') {
        this.drawWidgetCardBg(ctx, widgetKey, x, y, width, monoH, config, theme);
      }
      const effAlign = this.getWidgetAlign(align, 'center');
      const cx = this.getAlignX(effAlign, x, width, 24, 'center');

      const labelY = y + Math.max(12, Math.round(monoH * 0.22));
      const valY = y + Math.max(28, Math.round(monoH * 0.68));
      const barY = y + Math.max(34, Math.round(monoH * 0.77));
      const unitY = y + Math.max(44, Math.round(monoH * 0.92));

      // Top label
      if (!offLabel.hidden && label) {
        ctx.save();
        this.applyZDepth(ctx, offLabel.z);
        ctx.textAlign = effAlign;
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'label', elAccent);
        const labelSize = Math.max(8, Math.min(13, Math.round(monoH * 0.11)));
        ctx.font = this.getSubPartFont(config, widgetKey, 'label', 'bold', labelSize);
        ctx.letterSpacing = '3px';
        ctx.fillText(label.toUpperCase(), cx + offLabel.x, labelY + offLabel.y);
        ctx.restore();
      }

      // Giant centered value
      if (!offVal.hidden && mainVal) {
        ctx.save();
        this.applyZDepth(ctx, offVal.z);
        ctx.textAlign = effAlign;
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'val', text);
        const valSize = Math.max(18, Math.min(62, Math.round(monoH * 0.48)));
        ctx.font = this.getSubPartFont(config, widgetKey, 'val', 'bold', valSize);
        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = 12;
        ctx.fillText(mainVal, cx + offVal.x, valY + offVal.y);
        ctx.restore();
      }

      // Neon underline bar
      const barW = Math.min(100, width * 0.3);
      const barX = effAlign === 'left' ? x + 24 : effAlign === 'right' ? x + width - 24 - barW : cx - barW / 2;
      this.drawRoundedRect(ctx, barX, barY, barW, Math.max(2, Math.round(monoH * 0.035)), 2);
      ctx.fillStyle = elAccent;
      ctx.shadowColor = elAccent;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Bottom unit
      if (!offUnit.hidden && mainUnit) {
        ctx.save();
        this.applyZDepth(ctx, offUnit.z);
        ctx.textAlign = effAlign;
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'unit', textMuted);
        const unitSize = Math.max(9, Math.min(14, Math.round(monoH * 0.11)));
        ctx.font = this.getSubPartFont(config, widgetKey, 'unit', 'bold', unitSize);
        ctx.letterSpacing = '2px';
        ctx.fillText(mainUnit.toUpperCase(), cx + offUnit.x, unitY + offUnit.y);
        ctx.restore();
      }

      ctx.restore();
      return y + monoH;
    }

    if (design === 'boxed-bracket') {
      // Style 8: Futuristic Tech HUD Boxed Brackets with glowing corner anchors
      if (cardStyle !== 'floating') {
        this.drawWidgetCardBg(ctx, widgetKey, x, y, width, h, config, theme);
      }
      ctx.strokeStyle = elAccent;
      ctx.lineWidth = 2;
      const bLen = Math.min(16, Math.max(6, Math.round(h * 0.16)));
      ctx.beginPath();
      ctx.moveTo(x + 8, y + 8 + bLen); ctx.lineTo(x + 8, y + 8); ctx.lineTo(x + 8 + bLen, y + 8);
      ctx.moveTo(x + width - 8 - bLen, y + 8); ctx.lineTo(x + width - 8, y + 8); ctx.lineTo(x + width - 8, y + 8 + bLen);
      ctx.moveTo(x + 8, y + h - 8 - bLen); ctx.lineTo(x + 8, y + h - 8); ctx.lineTo(x + 8 + bLen, y + h - 8);
      ctx.moveTo(x + width - 8 - bLen, y + h - 8); ctx.lineTo(x + width - 8, y + h - 8); ctx.lineTo(x + width - 8, y + h - 8 - bLen);
      ctx.stroke();

      const effAlign = this.getWidgetAlign(align, 'left');
      const startX = this.getAlignX(effAlign, x, width, 24, 'left');

      const labelY = y + Math.max(14, Math.round(h * 0.30));
      const valY = y + Math.max(28, Math.round(h * 0.78));

      if (!offLabel.hidden && label) {
        ctx.textAlign = effAlign;
        ctx.fillStyle = elAccent;
        const labelSize = Math.max(8, Math.min(13, Math.round(h * 0.12)));
        ctx.font = this.getSubPartFont(config, widgetKey, 'label', 'bold', labelSize);
        const dotX = effAlign === 'left' ? startX : effAlign === 'right' ? startX - ctx.measureText(label.toUpperCase()).width - 12 : startX - ctx.measureText(label.toUpperCase()).width / 2 - 10;
        ctx.beginPath(); ctx.arc(dotX, labelY - 4, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillText(label.toUpperCase(), effAlign === 'left' ? startX + 10 : startX, labelY);
      }

      if (!offVal.hidden && mainVal) {
        ctx.fillStyle = text;
        const valFontSize = Math.max(18, Math.min(56, Math.round(h * 0.50)));
        ctx.font = this.getSubPartFont(config, widgetKey, 'val', 'bold', valFontSize);
        const valW = ctx.measureText(mainVal).width;
        ctx.fillText(mainVal, startX, valY);

        if (mainUnit && !offUnit.hidden) {
          ctx.fillStyle = elAccent;
          const unitFontSize = Math.max(10, Math.min(22, Math.round(valFontSize * 0.40)));
          ctx.font = this.getSubPartFont(config, widgetKey, 'unit', 'bold', unitFontSize);
          const uX = effAlign === 'left' ? startX + valW + 12 : effAlign === 'right' ? startX - valW - 12 : startX + valW / 2 + 12;
          ctx.fillText(mainUnit, uX, valY - 2);
        }
      }

      const statusBadge = this.getTextOverride(config, widgetKey, 'statusBadge', 'GPS ACTIVE // METRIC');
      const offStatus = this.getElementOffset(config, widgetKey, 'statusBadge');
      if (effAlign !== 'right' && !offStatus.hidden && statusBadge) {
        ctx.textAlign = 'right';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'statusBadge', textMuted);
        const statusSize = Math.max(8, Math.min(11, Math.round(h * 0.11)));
        ctx.font = `bold ${statusSize}px monospace`;
        ctx.fillText(statusBadge, x + width - 24 + offStatus.x, valY - 2 + offStatus.y);
      }

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

      if (!offLabel.hidden && label) {
        ctx.textAlign = 'center';
        ctx.fillStyle = textMuted;
        ctx.font = this.getSubPartFont(config, widgetKey, 'label', 'bold', 11);
        ctx.fillText(label, x + width / 2, y + 20);
      }

      if (!offVal.hidden && mainVal) {
        ctx.fillStyle = text;
        ctx.font = this.getSubPartFont(config, widgetKey, 'val', 'bold', 48);
        const uStr = (!offUnit.hidden && mainUnit) ? ` ${mainUnit}` : '';
        ctx.fillText(`${mainVal}${uStr}`, x + width / 2, y + topH - 12);
      }

      const runnerStatBadge = this.getTextOverride(config, widgetKey, 'runnerStatBadge', '⚡ RUN TRACKER OFFICIAL STAT');
      const offRunnerStat = this.getElementOffset(config, widgetKey, 'runnerStatBadge');
      if (!offRunnerStat.hidden && runnerStatBadge) {
        ctx.fillStyle = '#000000';
        ctx.font = this.getSubPartFont(config, widgetKey, 'runnerStatBadge', 'bold', 11);
        ctx.letterSpacing = '1px';
        ctx.fillText(runnerStatBadge, x + width / 2 + offRunnerStat.x, y + topH + 16 + offRunnerStat.y);
      }

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

      const effAlign = this.getWidgetAlign(align, 'left');
      const iconR = r - 6;
      const iconX = effAlign === 'right' ? x + width - r - 6 : effAlign === 'center' ? x + 24 : x + r + 6;
      ctx.fillStyle = elAccent;
      ctx.beginPath();
      ctx.arc(iconX, y + h / 2, iconR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.font = `bold 22px sans-serif`;
      ctx.textAlign = 'center';
      const icon = heroType === 'time' ? '⏱️' : heroType === 'pace' ? '⚡' : '🏃';
      ctx.fillText(icon, iconX, y + h / 2 + 7);

      const startTextX = this.getAlignX(effAlign, x, width, r * 2 + 20, 'left');
      ctx.textAlign = effAlign;
      if (!offVal.hidden && mainVal) {
        ctx.fillStyle = text;
        ctx.font = this.getSubPartFont(config, widgetKey, 'val', 'bold', 52);
        ctx.fillText(mainVal, startTextX, y + h / 2 + 18);

        const valW = ctx.measureText(mainVal).width;
        if (mainUnit && !offUnit.hidden) {
          ctx.fillStyle = elAccent;
          ctx.font = this.getSubPartFont(config, widgetKey, 'unit', 'bold', 20);
          const uX = effAlign === 'left' ? startTextX + valW + 10 : effAlign === 'right' ? startTextX - valW - 10 : startTextX + valW / 2 + 10;
          ctx.fillText(mainUnit, uX, y + h / 2 + 16);
        }
      }

      if (effAlign !== 'right' && !offLabel.hidden && label) {
        ctx.textAlign = 'right';
        ctx.fillStyle = textMuted;
        ctx.font = this.getSubPartFont(config, widgetKey, 'label', 'bold', 12);
        ctx.fillText(label, x + width - 24, y + h / 2 + 5);
      }

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

      const effAlign = this.getWidgetAlign(align, 'left');
      const startX = this.getAlignX(effAlign, x, width, 24, 'left');

      ctx.fillStyle = elAccent;
      const barX = effAlign === 'right' ? x + width - 6 : x;
      this.drawRoundedRect(ctx, barX, y, 6, h, 3);
      ctx.fill();

      if (!offLabel.hidden && label) {
        ctx.textAlign = effAlign;
        ctx.fillStyle = elAccent;
        ctx.font = this.getSubPartFont(config, widgetKey, 'label', 'bold', 11);
        ctx.fillText(`// ${label}`, startX, y + 26);
      }

      if (!offVal.hidden && mainVal) {
        ctx.fillStyle = text;
        ctx.font = this.getSubPartFont(config, widgetKey, 'val', 'bold', 58);
        ctx.shadowColor = elAccent;
        ctx.shadowBlur = 10;
        ctx.fillText(mainVal, startX, y + 84);
        ctx.shadowBlur = 0;

        if (mainUnit && !offUnit.hidden) {
          const vw = ctx.measureText(mainVal).width;
          ctx.fillStyle = elAccent;
          ctx.font = this.getSubPartFont(config, widgetKey, 'unit', 'bold', 22);
          const uX = effAlign === 'left' ? startX + 10 + vw : effAlign === 'right' ? startX - vw - 10 : startX + vw / 2 + 10;
          ctx.fillText(mainUnit, uX, y + 82);
        }
      }

      const liveDataBadge = this.getTextOverride(config, widgetKey, 'liveDataBadge', '● LIVE_DATA');
      const offLiveData = this.getElementOffset(config, widgetKey, 'liveDataBadge');
      if (effAlign !== 'right' && !offLiveData.hidden && liveDataBadge) {
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        this.drawRoundedRect(ctx, x + width - 110, y + 16, 96, 24, 6);
        ctx.fill();
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'liveDataBadge', elAccent);
        ctx.font = `bold 10px monospace`;
        ctx.fillText(liveDataBadge, x + width - 24 + offLiveData.x, y + 32 + offLiveData.y);
      }

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

      const effAlign = this.getWidgetAlign(align, 'center');
      const cx = this.getAlignX(effAlign, x, width, 24, 'center');

      const bibBanner = this.getTextOverride(config, widgetKey, 'bibBanner', '★ OFFICIAL RACE SPLIT ★');
      const offBibBanner = this.getElementOffset(config, widgetKey, 'bibBanner');
      if (!offBibBanner.hidden && bibBanner) {
        ctx.textAlign = effAlign;
        ctx.fillStyle = '#000000';
        ctx.font = this.getSubPartFont(config, widgetKey, 'bibBanner', 'bold', 12);
        ctx.letterSpacing = '1px';
        const bannerText = bibBanner.includes('${label}') ? bibBanner.replace('${label}', label) : `${bibBanner} // ${label}`;
        ctx.fillText(bannerText, cx + offBibBanner.x, y + 20 + offBibBanner.y);
      }

      if (!offVal.hidden && mainVal) {
        ctx.fillStyle = '#0f172a';
        ctx.font = this.getSubPartFont(config, widgetKey, 'val', 'bold', 56);
        const uStr = (!offUnit.hidden && mainUnit) ? ` ${mainUnit}` : '';
        ctx.fillText(`${mainVal}${uStr}`, cx, y + 82);
      }

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
      const alignMode = this.getWidgetAlign(align, 'left');
      ctx.textAlign = alignMode;
      const startX = alignMode === 'center' ? x + width / 2 : alignMode === 'right' ? x + width - 8 : x + 8;

      ctx.fillStyle = elAccent;
      ctx.font = this.getSubPartFont(config, widgetKey, 'label', 'bold', 12);
      ctx.letterSpacing = '1.5px';
      ctx.fillText(label.toUpperCase(), startX, y + 22);

      ctx.fillStyle = text;
      ctx.font = this.getSubPartFont(config, widgetKey, 'val', 'bold', 64);
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 10;
      ctx.fillText(mainVal, startX, y + 84);

      if (mainUnit) {
        const vw = ctx.measureText(mainVal).width;
        ctx.fillStyle = elAccent;
        ctx.font = this.getSubPartFont(config, widgetKey, 'unit', 'bold', 24);
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

      const effAlign = this.getWidgetAlign(align, 'left');
      const startX = this.getAlignX(effAlign, x, width, 24, 'left');

      ctx.textAlign = effAlign;
      ctx.fillStyle = elAccent;
      ctx.font = this.getSubPartFont(config, widgetKey, 'label', 'bold', 13);
      ctx.fillText(`⚡ ${label}`, startX, y + 36);

      ctx.fillStyle = text;
      ctx.font = this.getSubPartFont(config, widgetKey, 'val', 'bold', 58);
      ctx.fillText(mainVal, startX, y + 86);

      if (mainUnit) {
        const vw = ctx.measureText(mainVal).width;
        ctx.fillStyle = elAccent;
        ctx.font = this.getSubPartFont(config, widgetKey, 'unit', 'bold', 22);
        const uX = effAlign === 'left' ? startX + 10 + vw : effAlign === 'right' ? startX - vw - 10 : startX + vw / 2 + 10;
        ctx.fillText(mainUnit, uX, y + 84);
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

      const effAlign = this.getWidgetAlign(align, 'center');
      const cx = this.getAlignX(effAlign, x, width, 24, 'center');

      const lcdHeader = this.getTextOverride(config, widgetKey, 'lcdHeader', '[ DIGITAL TIMER ]');
      const offLcd = this.getElementOffset(config, widgetKey, 'lcdHeader');
      if (!offLcd.hidden && lcdHeader) {
        ctx.textAlign = effAlign;
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'lcdHeader', elAccent);
        ctx.font = this.getSubPartFont(config, widgetKey, 'lcdHeader', 'bold', 11);
        const headerText = lcdHeader.includes('${label}') ? lcdHeader.replace('${label}', label) : `${lcdHeader} // ${label}`;
        ctx.fillText(headerText, cx + offLcd.x, y + 15 + offLcd.y);
      }

      if (!offVal.hidden && mainVal) {
        ctx.fillStyle = text;
        ctx.font = this.getSubPartFont(config, widgetKey, 'val', 'bold', 60);
        ctx.shadowColor = elAccent;
        ctx.shadowBlur = 12;
        const uStr = (!offUnit.hidden && mainUnit) ? ` ${mainUnit}` : '';
        ctx.fillText(`${mainVal}${uStr}`, cx, y + 82);
        ctx.shadowBlur = 0;
      }

      ctx.restore();
      return y + h;
    }

    if (design === 'speedometer') {
      // Style 7: Curved Speedometer Arc Motif
      if (cardStyle !== 'floating') {
        this.drawCardBackground(ctx, x, y, width, h, config, theme);
      }
      const effAlign = this.getWidgetAlign(align, 'center');
      const cx = this.getAlignX(effAlign, x, width, 24, 'center');
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

      ctx.textAlign = effAlign;
      ctx.fillStyle = textMuted;
      ctx.font = this.getSubPartFont(config, widgetKey, 'label', 'bold', 12);
      ctx.fillText(label, cx, y + 30);

      ctx.fillStyle = text;
      ctx.font = this.getSubPartFont(config, widgetKey, 'val', 'bold', 48);
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

      const effAlign = this.getWidgetAlign(align, 'left');
      const isRight = effAlign === 'right';
      const iconBoxX = isRight ? x + width - 96 : x + 8;
      const textBoxX = isRight ? x + width - 115 : effAlign === 'center' ? x + width / 2 : x + 115;

      // Left/Right Accent Strip
      ctx.fillStyle = elAccent;
      this.drawRoundedRect(ctx, iconBoxX, y + 8, 88, h - 16, 18);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.font = `bold 24px ${font}`;
      ctx.textAlign = 'center';
      const icon = heroType === 'time' ? '⏱️' : heroType === 'pace' ? '⚡' : '🏃';
      ctx.fillText(icon, iconBoxX + 44, y + 58);

      // Right/Center Stats
      ctx.textAlign = effAlign;
      ctx.fillStyle = textMuted;
      ctx.font = this.getSubPartFont(config, widgetKey, 'label', 'bold', 12);
      ctx.fillText(label, textBoxX, y + 36);

      ctx.fillStyle = text;
      ctx.font = this.getSubPartFont(config, widgetKey, 'val', 'bold', 52);
      ctx.fillText(mainVal, textBoxX, y + 82);

      if (mainUnit) {
        ctx.fillStyle = elAccent;
        ctx.font = this.getSubPartFont(config, widgetKey, 'unit', 'bold', 20);
        const valW = ctx.measureText(mainVal).width;
        const uX = effAlign === 'left' ? textBoxX + 10 + valW : effAlign === 'right' ? textBoxX - valW - 10 : textBoxX + valW / 2 + 10;
        ctx.fillText(mainUnit, uX, y + 80);
      }

      ctx.restore();
      return y + h;
    }

    if (design === 'outline') {
      const alignMode = align || 'center';
      const centerX = alignMode === 'left' ? x + 24 : alignMode === 'right' ? x + width - 24 : x + width / 2;
      ctx.textAlign = alignMode;
      ctx.fillStyle = textMuted;
      ctx.font = this.getSubPartFont(config, widgetKey, 'label', 'bold', 13);
      ctx.fillText(label, centerX, y + 24);

      const valFont = this.getSubPartFont(config, widgetKey, 'val', 'bold', 68);
      const unitFont = this.getSubPartFont(config, widgetKey, 'unit', 'bold', 26);

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
      this.recordBounds(widgetKey, 'Hero Metric', x, y, width, totemH);
      if (cardStyle !== 'floating') {
        this.drawWidgetCardBg(ctx, widgetKey, x, y, width, totemH, config, theme);
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
      ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'label', elAccent);
      ctx.font = this.getSubPartFont(config, widgetKey, 'label', 'bold', 11);
      ctx.fillText(label.toUpperCase(), x + width / 2 + offLabel.x, y + 30 + offLabel.y);
      ctx.restore();

      // Huge stacked number
      ctx.save();
      this.applyZDepth(ctx, offVal.z);
      ctx.textAlign = 'center';
      ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'val', text);
      ctx.font = this.getSubPartFont(config, widgetKey, 'val', 'bold', 68);
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 12;
      ctx.fillText(mainVal, x + width / 2 + offVal.x, y + 96 + offVal.y);
      ctx.restore();

      // Bottom unit bar
      if (mainUnit) {
        ctx.save();
        this.applyZDepth(ctx, offUnit.z);
        ctx.textAlign = 'center';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'unit', textMuted);
        ctx.font = this.getSubPartFont(config, widgetKey, 'unit', 'bold', 14);
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
      this.recordBounds(widgetKey, 'Hero Metric', x, y, width, gaugeH);
      if (cardStyle !== 'floating') {
        this.drawWidgetCardBg(ctx, widgetKey, x, y, width, gaugeH, config, theme);
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
      ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'label', textMuted);
      ctx.font = this.getSubPartFont(config, widgetKey, 'label', 'bold', 11);
      ctx.fillText(label.toUpperCase(), cx + offLabel.x, y + 22 + offLabel.y);
      ctx.restore();

      // Center value
      ctx.save();
      this.applyZDepth(ctx, offVal.z);
      ctx.textAlign = 'center';
      ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'val', text);
      ctx.font = this.getSubPartFont(config, widgetKey, 'val', 'bold', 48);
      ctx.fillText(mainVal, cx + offVal.x, cy + 12 + offVal.y);
      ctx.restore();

      // Unit badge below value
      if (mainUnit) {
        ctx.save();
        this.applyZDepth(ctx, offUnit.z);
        ctx.textAlign = 'center';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'unit', elAccent);
        ctx.font = this.getSubPartFont(config, widgetKey, 'unit', 'bold', 12);
        ctx.fillText(mainUnit, cx + offUnit.x, cy + 30 + offUnit.y);
        ctx.restore();
      }

      ctx.restore();
      return y + gaugeH;
    }

    if (design === 'tactical-crosshair') {
      // Style: Tactical Crosshair Optic (Reticle, corner tickmarks & HUD anchors)
      const tactH = customH || 110;
      this.recordBounds(widgetKey, 'Hero Metric', x, y, width, tactH);
      if (cardStyle !== 'floating') {
        this.drawWidgetCardBg(ctx, widgetKey, x, y, width, tactH, config, theme);
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
      const tacticalSys = this.getTextOverride(config, widgetKey, 'tacticalSys', '+ SYS // OPTIC');
      const tacticalStatus = this.getTextOverride(config, widgetKey, 'tacticalStatus', 'STATUS: LOCKED');
      const offTacSys = this.getElementOffset(config, widgetKey, 'tacticalSys');
      const offTacStatus = this.getElementOffset(config, widgetKey, 'tacticalStatus');

      if (!offTacSys.hidden && tacticalSys) {
        ctx.textAlign = 'left';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'tacticalSys', elAccent);
        ctx.font = 'bold 9px monospace';
        ctx.fillText(tacticalSys, x + 16 + offTacSys.x, y + 24 + offTacSys.y);
      }

      if (!offTacStatus.hidden && tacticalStatus) {
        ctx.textAlign = 'right';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'tacticalStatus', textMuted);
        ctx.font = 'bold 9px monospace';
        ctx.fillText(tacticalStatus, x + width - 16 + offTacStatus.x, y + 24 + offTacStatus.y);
      }

      // Center value
      if (!offVal.hidden && mainVal) {
        ctx.save();
        this.applyZDepth(ctx, offVal.z);
        ctx.textAlign = 'center';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'val', text);
        ctx.font = this.getSubPartFont(config, widgetKey, 'val', 'bold', 56);
        ctx.fillText(mainVal, x + width / 2 + offVal.x, y + 74 + offVal.y);
        ctx.restore();
      }

      // Unit and label footer
      if (!offLabel.hidden || !offUnit.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offUnit.z);
        ctx.textAlign = 'center';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'unit', elAccent);
        ctx.font = this.getSubPartFont(config, widgetKey, 'unit', 'bold', 12);
        const lStr = !offLabel.hidden ? label.toUpperCase() : '';
        const uStr = !offUnit.hidden ? ` [ ${mainUnit || 'TOTAL'} ]` : '';
        ctx.fillText(`${lStr}${uStr}`.trim(), x + width / 2 + offUnit.x, y + tactH - 14 + offUnit.y);
        ctx.restore();
      }

      ctx.restore();
      return y + tactH;
    }

    if (design === 'angled-speed-slash') {
      // Style: Dynamic Speed Slash (Athletic slanted card with speed gradient)
      const slashH = customH || 105;
      this.recordBounds(widgetKey, 'Hero Metric', x, y, width, slashH);

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
      ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'label', elAccent);
      ctx.font = this.getSubPartFont(config, widgetKey, 'label', 'italic bold', 12);
      ctx.fillText(`/// ${label.toUpperCase()}`, x + slant + 16 + offLabel.x, y + 28 + offLabel.y);
      ctx.restore();

      ctx.save();
      this.applyZDepth(ctx, offVal.z);
      ctx.textAlign = 'left';
      ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'val', text);
      ctx.font = this.getSubPartFont(config, widgetKey, 'val', 'italic bold', 58);
      ctx.fillText(mainVal, x + slant + 16 + offVal.x, y + 80 + offVal.y);
      const valW = ctx.measureText(mainVal).width;
      ctx.restore();

      if (mainUnit) {
        ctx.save();
        this.applyZDepth(ctx, offUnit.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'unit', textMuted);
        ctx.font = this.getSubPartFont(config, widgetKey, 'unit', 'italic bold', 20);
        ctx.fillText(mainUnit, x + slant + 24 + valW + offUnit.x, y + 76 + offUnit.y);
        ctx.restore();
      }

      ctx.restore();
      return y + slashH;
    }

    if (design === 'kinetic-bold-slash') {
      // Style: Kinetic Racing Split (45° High-Contrast Slanted Plate)
      const slashH = customH || 116;
      this.recordBounds(widgetKey, 'Hero Stat', x, y, width, slashH);
      this.drawWidgetCardBg(ctx, widgetKey, x, y, width, slashH, config, theme);

      // 45-degree dual racing speed stripes
      ctx.save();
      ctx.fillStyle = elAccent;
      const stripeW = 12;
      const slantOff = 26;
      ctx.beginPath();
      ctx.moveTo(x + width - 70, y + 10);
      ctx.lineTo(x + width - 70 + stripeW, y + 10);
      ctx.lineTo(x + width - 70 + stripeW - slantOff, y + slashH - 10);
      ctx.lineTo(x + width - 70 - slantOff, y + slashH - 10);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.beginPath();
      ctx.moveTo(x + width - 50, y + 10);
      ctx.lineTo(x + width - 50 + stripeW, y + 10);
      ctx.lineTo(x + width - 50 + stripeW - slantOff, y + slashH - 10);
      ctx.lineTo(x + width - 50 - slantOff, y + slashH - 10);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Top Category pill
      if (!offLabel.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offLabel.z);
        this.drawRoundedRect(ctx, x + 20 + offLabel.x, y + 14 + offLabel.y, 110, 20, 4);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fill();
        ctx.fillStyle = elAccent;
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`⚡ ${label.toUpperCase()}`, x + 75 + offLabel.x, y + 27 + offLabel.y);
        ctx.restore();
      }

      // Massive Italic Bold Value
      if (!offVal.hidden && mainVal) {
        ctx.save();
        this.applyZDepth(ctx, offVal.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'val', text);
        ctx.font = this.getSubPartFont(config, widgetKey, 'val', 'italic 900', 58);
        ctx.fillText(mainVal, x + 20 + offVal.x, y + 84 + offVal.y);
        const valW = ctx.measureText(mainVal).width;
        ctx.restore();

        // Angled unit badge
        if (!offUnit.hidden && mainUnit) {
          ctx.save();
          this.applyZDepth(ctx, offUnit.z);
          ctx.textAlign = 'left';
          ctx.fillStyle = elAccent;
          ctx.font = this.getSubPartFont(config, widgetKey, 'unit', 'italic bold', 22);
          ctx.fillText(mainUnit, x + 28 + valW + offUnit.x, y + 80 + offUnit.y);
          ctx.restore();
        }
      }

      ctx.restore();
      return y + slashH;
    }

    if (design === 'neon-pulse-ring') {
      // Style: Neon Pulse Halo (Radial Orbit Ring & Center Focal Stat)
      const ringH = customH || 135;
      this.recordBounds(widgetKey, 'Hero Stat', x, y, width, ringH);
      this.drawWidgetCardBg(ctx, widgetKey, x, y, width, ringH, config, theme);

      const cx = x + width / 2;
      const cy = y + ringH / 2;
      const radius = Math.min(width * 0.44, (ringH - 32) / 2);

      // Track ring background
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Neon active orbit sweep
      ctx.beginPath();
      const progressFrac = activity.progress !== undefined ? activity.progress : 0.75;
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + Math.PI * 2 * Math.min(1, Math.max(0.1, progressFrac));
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.strokeStyle = elAccent;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.shadowColor = elAccent;
      ctx.shadowBlur = 10;
      ctx.stroke();

      // Satellite glowing dot on orbit tip
      const tipX = cx + Math.cos(endAngle) * radius;
      const tipY = cy + Math.sin(endAngle) * radius;
      ctx.beginPath();
      ctx.arc(tipX, tipY, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.restore();

      // Label on top
      if (!offLabel.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offLabel.z);
        ctx.textAlign = 'center';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'label', textMuted);
        ctx.font = this.getSubPartFont(config, widgetKey, 'label', 'bold', 10);
        ctx.letterSpacing = '1px';
        ctx.fillText(label.toUpperCase(), cx + offLabel.x, cy - radius * 0.45 + offLabel.y);
        ctx.restore();
      }

      // Massive Centered Value
      if (!offVal.hidden && mainVal) {
        ctx.save();
        this.applyZDepth(ctx, offVal.z);
        ctx.textAlign = 'center';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'val', text);
        ctx.font = this.getSubPartFont(config, widgetKey, 'val', 'bold', 42);
        ctx.fillText(mainVal, cx + offVal.x, cy + 12 + offVal.y);
        ctx.restore();
      }

      // Unit underneath
      if (!offUnit.hidden && mainUnit) {
        ctx.save();
        this.applyZDepth(ctx, offUnit.z);
        ctx.textAlign = 'center';
        ctx.fillStyle = elAccent;
        ctx.font = this.getSubPartFont(config, widgetKey, 'unit', 'bold', 13);
        ctx.letterSpacing = '1.5px';
        ctx.fillText(mainUnit.toUpperCase(), cx + offUnit.x, cy + radius * 0.65 + offUnit.y);
        ctx.restore();
      }

      ctx.restore();
      return y + ringH;
    }

    // Default 'mega' and 'card':
    if (cardStyle !== 'floating') {
      this.drawWidgetCardBg(ctx, widgetKey, x, y, width, h, config, theme, design === 'card');
    }

    const alignMode = align || 'center';
    const centerX = (alignMode === 'left' ? x + 24 : alignMode === 'right' ? x + width - 24 : x + width / 2) + offLabel.x;
    ctx.textAlign = alignMode;
    this.applyZDepth(ctx, offLabel.z);
    ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'label', textMuted);
    ctx.font = this.getSubPartFont(config, widgetKey, 'label', 'bold', 13);
    ctx.letterSpacing = '1px';
    ctx.fillText(label, centerX, y + 26 + offLabel.y);

    const valFont = this.getSubPartFont(config, widgetKey, 'val', 'bold', 64);
    const unitFont = this.getSubPartFont(config, widgetKey, 'unit', 'bold', 24);

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
    ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'val', text);
    ctx.font = valFont;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 2;
    ctx.fillText(mainVal, startX + offVal.x, y + 84 + offVal.y);

    if (mainUnit) {
      this.applyZDepth(ctx, offUnit.z);
      ctx.shadowBlur = 0;
      ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'unit', elAccent);
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
  drawMetricsGrid(ctx, x, y, width, activity, config, theme, accent, cols = 3, customH = null, widgetKey = 'metrics') {
    ctx.save();
    const rot = this.applyWidgetRotation(ctx, config, widgetKey, x, y, width, customH || 95);
    const elStyle = this.getElementStyle(config, widgetKey);
    const { text, textMuted, accent: elAccent, cardStyle, align, opacity } = this.getEffectiveColors(config, theme, accent, widgetKey);
    if (opacity < 1) ctx.globalAlpha = opacity;
    accent = elAccent;

    const font = this.getFontFamily(elStyle.fontFamily !== 'default' ? elStyle.fontFamily : config.fontFamily);
    const design = config.metricsDesign || 'grid';

    const isLive = activity.isAnimated && activity.progress < 0.999;
    const paceLabelDefault = isLive ? 'PACE' : 'AVG PACE';
    const hrLabelDefault = isLive ? 'HEART RATE' : 'AVG HR';

    const isHidden = (key) => this.isElementHidden(config, widgetKey, key) || this.getMetricItemOffsets(config, widgetKey, key).item.hidden;

    const metrics = [];
    const showDist = (config.metricShowDistance === true) || (config.metricShowDistance === undefined && config.heroMetric === 'time');
    const showTime = config.metricShowTime !== false && config.heroMetric !== 'time';
    const showPace = config.metricShowPace !== false && config.heroMetric !== 'pace';
    const showHr = config.metricShowHr !== false && Boolean(activity.avgHr);
    const showElev = config.metricShowElevation !== false && activity.elevationGain !== null && activity.elevationGain !== undefined;
    const showCad = config.metricShowCadence !== false && Boolean(activity.avgCadence);
    const showCal = config.metricShowCalories !== false && Boolean(activity.calories);
    const showBestPace = (config.metricShowBestPace === true || (config.metricShowBestPace !== false && config.metricShowBestPace !== undefined)) && Boolean(activity.bestPaceFormatted);

    if (showDist && !isHidden('distance')) {
      const distStr = `${activity.distanceMain || (activity.distance ? (activity.distance / 1000).toFixed(2) : '0.00')} ${activity.distanceUnit || 'km'}`;
      metrics.push({ key: 'distance', label: this.getMetricLabel(config, 'Distance', 'DISTANCE'), val: distStr, icon: '📍' });
    }
    if (showTime && !isHidden('time')) {
      metrics.push({ key: 'time', label: this.getMetricLabel(config, 'Time', 'TIME'), val: activity.durationFormatted, icon: '⏱️' });
    }
    if (showPace && !isHidden('pace')) {
      metrics.push({ key: 'pace', label: this.getMetricLabel(config, 'Pace', paceLabelDefault), val: activity.avgPaceFormatted, icon: '⚡' });
    }
    if (showHr && !isHidden('hr')) {
      metrics.push({ key: 'hr', label: this.getMetricLabel(config, 'Hr', hrLabelDefault), val: `${activity.avgHr} bpm`, icon: '❤️' });
    }
    if (showElev && !isHidden('elevation')) {
      metrics.push({ key: 'elevation', label: this.getMetricLabel(config, 'Elevation', 'ELEV GAIN'), val: `+${activity.elevationGain}m`, icon: '⛰️' });
    }
    if (showCad && !isHidden('cadence')) {
      metrics.push({ key: 'cadence', label: this.getMetricLabel(config, 'Cadence', 'CADENCE'), val: `${activity.avgCadence} spm`, icon: '👟' });
    }
    if (showCal && !isHidden('calories')) {
      metrics.push({ key: 'calories', label: this.getMetricLabel(config, 'Calories', 'CALORIES'), val: `${activity.calories} kcal`, icon: '🔥' });
    }
    if (showBestPace && !isHidden('bestPace')) {
      metrics.push({ key: 'bestPace', label: this.getMetricLabel(config, 'BestPace', 'BEST PACE'), val: activity.bestPaceFormatted, icon: '🚀' });
    }

    metrics.forEach((m) => {
      const customLabel = this.getTextOverride(config, widgetKey, `${m.key}Label`, null) || this.getTextOverride(config, widgetKey, m.key, null);
      if (customLabel) m.label = customLabel;
      const customVal = this.getTextOverride(config, widgetKey, `${m.key}Val`, null);
      if (customVal) m.val = customVal;
    });

    if (metrics.length === 0) {
      this.recordBounds(widgetKey, 'Secondary Metrics', x, y, width, 0);
      ctx.restore();
      return y;
    }

    const isVerticalDesign = [
      'vertical-stacked-hud',
      'vertical-minimal-stack',
      'vertical-pill-stack',
      'vertical-timeline-flow',
      'vertical-data-ladder',
      'vertical-athletic-cards'
    ].includes(design);

    let maxItems = 6;
    if (design === 'centered-pod-triad') maxItems = Math.min(metrics.length, 3);
    else if (design === 'centered-cross-quad') maxItems = Math.min(metrics.length, 4);
    else maxItems = Math.min(metrics.length, 6);

    const displayMetrics = metrics.slice(0, maxItems);
    const defaultMetH = isVerticalDesign
      ? Math.max(160, displayMetrics.length * 46)
      : ((design === 'cards-2col' || design === 'centered-cross-quad') ? 140 : 80);
    const cardH = customH || defaultMetH;
    this.recordBounds(widgetKey, 'Secondary Metrics', x, y, width, cardH);
    this.drawWidgetCardBg(ctx, widgetKey, x, y, width, cardH, config, theme);

    if (design === 'centered-pod-triad') {
      const count = Math.min(displayMetrics.length, 3);
      const gapX = 10;
      const podW = (width - (count - 1) * gapX) / count;
      const podH = customH || 95;
      this.recordBounds(widgetKey, 'Secondary Metrics', x, y, width, podH);
      const effAlign = this.getWidgetAlign(align, 'center');

      displayMetrics.slice(0, count).forEach((m, idx) => {
        const mOff = this.getMetricItemOffsets(config, widgetKey, m.key);
        if (mOff.item.hidden) return;
        const px = x + idx * (podW + gapX) + mOff.item.x;
        const py = y + mOff.item.y;
        const pcx = effAlign === 'left' ? px + 18 : effAlign === 'right' ? px + podW - 18 : px + podW / 2;

        ctx.save();
        this.applyZDepth(ctx, mOff.item.z);
        this.drawRoundedRect(ctx, px, py, podW, podH, 18);
        ctx.fillStyle = cardStyle === 'solid' ? '#121624' : 'rgba(16, 20, 32, 0.88)';
        ctx.fill();
        ctx.strokeStyle = elAccent;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();

        if (m.icon && !mOff.label.hidden) {
          ctx.beginPath();
          ctx.arc(px + podW / 2, py + 24, 12, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.textAlign = 'center';
          ctx.font = '12px sans-serif';
          ctx.fillText(m.icon, px + podW / 2, py + 28);
        }

        if (!mOff.val.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.val.z);
          ctx.textAlign = effAlign;
          ctx.fillStyle = mOff.val.color !== 'default' ? mOff.val.color : text;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'val', 'bold', 20);
          ctx.shadowColor = elAccent;
          ctx.shadowBlur = 8;
          ctx.fillText(m.val, pcx + mOff.val.x, py + (m.icon ? 56 : 46) + mOff.val.y);
          ctx.restore();
        }

        if (!mOff.label.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.label.z);
          ctx.textAlign = effAlign;
          ctx.fillStyle = mOff.label.color !== 'default' ? mOff.label.color : textMuted;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'label', 'bold', 10);
          ctx.letterSpacing = '1px';
          ctx.fillText(m.label.toUpperCase(), pcx + mOff.label.x, py + (m.icon ? 78 : 72) + mOff.label.y);
          ctx.restore();
        }
      });

      ctx.restore();
      return y + podH;
    }

    if (design === 'centered-pill-clusters') {
      const count = Math.min(displayMetrics.length, 4);
      const isTwoCol = count >= 3 && width > 420;
      const colsInCluster = isTwoCol ? 2 : 1;
      const rowsInCluster = Math.ceil(count / colsInCluster);
      const pillH = Math.max(38, Math.min(48, Math.floor((cardH - (rowsInCluster - 1) * 8) / rowsInCluster)));
      const totalH = rowsInCluster * pillH + (rowsInCluster - 1) * 8;
      this.recordBounds(widgetKey, 'Secondary Metrics', x, y, width, totalH);
      const effAlign = this.getWidgetAlign(align, 'center');
      const gapX = 10;
      const pillW = isTwoCol ? (width - gapX) / 2 : width;

      displayMetrics.slice(0, count).forEach((m, idx) => {
        const mOff = this.getMetricItemOffsets(config, widgetKey, m.key);
        if (mOff.item.hidden) return;
        const c = idx % colsInCluster;
        const r = Math.floor(idx / colsInCluster);
        const px = (isTwoCol ? x + c * (pillW + gapX) : x) + mOff.item.x;
        const py = y + r * (pillH + 8) + mOff.item.y;
        const pcx = effAlign === 'left' ? px + 18 : effAlign === 'right' ? px + pillW - 18 : px + pillW / 2;

        ctx.save();
        this.applyZDepth(ctx, mOff.item.z);
        this.drawRoundedRect(ctx, px, py, pillW, pillH, pillH / 2);
        ctx.fillStyle = cardStyle === 'solid' ? '#141824' : 'rgba(18, 22, 34, 0.85)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        if (!mOff.val.hidden || !mOff.label.hidden) {
          ctx.save();
          this.applyZDepth(ctx, Math.max(mOff.val.z, mOff.label.z));
          ctx.textAlign = effAlign;
          ctx.fillStyle = mOff.val.color !== 'default' ? mOff.val.color : text;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'val', 'bold', 13);
          const iconPrefix = m.icon ? `${m.icon} ` : '';
          const lStr = !mOff.label.hidden ? `${iconPrefix}${m.label}: ` : '';
          const vStr = !mOff.val.hidden ? m.val : '';
          ctx.fillText(`${lStr}${vStr}`, pcx + mOff.val.x, py + pillH / 2 + 5 + mOff.val.y);
          ctx.restore();
        }
      });

      ctx.restore();
      return y + totalH;
    }

    if (design === 'centered-cross-quad') {
      const quadH = customH || 110;
      this.recordBounds(widgetKey, 'Secondary Metrics', x, y, width, quadH);
      const effAlign = this.getWidgetAlign(align, 'center');

      this.drawRoundedRect(ctx, x, y, width, quadH, 16);
      ctx.fillStyle = cardStyle === 'solid' ? '#10141f' : 'rgba(12, 16, 26, 0.9)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.stroke();

      const midX = x + width / 2;
      const midY = y + quadH / 2;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 16, midY); ctx.lineTo(x + width - 16, midY);
      ctx.moveTo(midX, y + 10); ctx.lineTo(midX, y + quadH - 10);
      ctx.stroke();

      ctx.fillStyle = elAccent;
      ctx.beginPath(); ctx.arc(midX, midY, 3, 0, Math.PI * 2); ctx.fill();

      const halfW = width / 2;
      const halfH = quadH / 2;

      displayMetrics.slice(0, 4).forEach((m, idx) => {
        const mOff = this.getMetricItemOffsets(config, widgetKey, m.key);
        if (mOff.item.hidden) return;
        const c = idx % 2;
        const r = Math.floor(idx / 2);
        const cellX = x + c * halfW + mOff.item.x;
        const cellY = y + r * halfH + mOff.item.y;
        const cx = effAlign === 'left' ? cellX + 20 : effAlign === 'right' ? cellX + halfW - 20 : cellX + halfW / 2;

        if (!mOff.label.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.label.z);
          ctx.textAlign = effAlign;
          ctx.fillStyle = mOff.label.color !== 'default' ? mOff.label.color : textMuted;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'label', 'bold', 10);
          ctx.fillText(m.label.toUpperCase(), cx + mOff.label.x, cellY + 18 + mOff.label.y);
          ctx.restore();
        }

        if (!mOff.val.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.val.z);
          ctx.textAlign = effAlign;
          ctx.fillStyle = mOff.val.color !== 'default' ? mOff.val.color : text;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'val', 'bold', 17);
          ctx.fillText(m.val, cx + mOff.val.x, cellY + 38 + mOff.val.y);
          ctx.restore();
        }
      });

      ctx.restore();
      return y + quadH;
    }

    if (design === 'cards-2col') {
      const halfCols = 2;
      const count = displayMetrics.length;
      const rows = Math.ceil(count / halfCols);
      const gapX = 12;
      const gapY = 8;
      const itemW = (width - gapX) / 2;
      const singleH = Math.max(50, Math.floor((cardH - (rows - 1) * gapY) / rows));
      const totalH = rows * singleH + (rows - 1) * gapY;
      this.recordBounds(widgetKey, 'Secondary Metrics', x, y, width, totalH);

      displayMetrics.forEach((m, idx) => {
        const mOff = this.getMetricItemOffsets(config, widgetKey, m.key);
        if (mOff.item.hidden) return;
        const c = idx % 2;
        const r = Math.floor(idx / 2);
        const ix = x + c * (itemW + gapX) + mOff.item.x;
        const iy = y + r * (singleH + gapY) + mOff.item.y;

        ctx.save();
        this.applyZDepth(ctx, mOff.item.z);
        this.drawRoundedRect(ctx, ix, iy, itemW, singleH, 10);
        ctx.fillStyle = cardStyle === 'solid' ? '#14141e' : 'rgba(20, 20, 30, 0.85)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.stroke();

        ctx.fillStyle = elAccent;
        this.drawRoundedRect(ctx, ix + 2, iy + 6, 4, singleH - 12, 2);
        ctx.fill();
        ctx.restore();

        if (!mOff.label.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.label.z);
          ctx.textAlign = 'left';
          ctx.fillStyle = mOff.label.color !== 'default' ? mOff.label.color : textMuted;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'label', 'bold', 10);
          ctx.fillText(m.label, ix + 14 + mOff.label.x, iy + singleH * 0.38 + mOff.label.y);
          ctx.restore();
        }

        if (!mOff.val.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.val.z);
          ctx.textAlign = 'left';
          ctx.fillStyle = mOff.val.color !== 'default' ? mOff.val.color : text;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'val', 'bold', 18);
          ctx.fillText(m.val, ix + 14 + mOff.val.x, iy + singleH * 0.82 + mOff.val.y);
          ctx.restore();
        }
      });

      ctx.restore();
      return y + totalH;
    }

    if (design === 'vertical-stacked-hud') {
      const count = displayMetrics.length;
      const rowH = Math.max(26, Math.floor(cardH / count));
      const totalH = count * rowH;
      this.recordBounds(widgetKey, 'Secondary Metrics', x, y, width, totalH);

      if (cardStyle !== 'floating') {
        this.drawCardBackground(ctx, x, y, width, totalH, config, theme);
      }

      displayMetrics.forEach((m, idx) => {
        const mOff = this.getMetricItemOffsets(config, widgetKey, m.key);
        if (mOff.item.hidden) return;
        const ry = y + idx * rowH + mOff.item.y;
        if (idx > 0) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.beginPath(); ctx.moveTo(x + 12, ry); ctx.lineTo(x + width - 12, ry); ctx.stroke();
        }

        if (!mOff.label.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.label.z);
          ctx.textAlign = 'left';
          ctx.fillStyle = mOff.label.color !== 'default' ? mOff.label.color : elAccent;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'label', 'bold', 12);
          ctx.fillText(`${m.icon} ${m.label}`, x + 16 + mOff.item.x + mOff.label.x, ry + rowH * 0.68 + mOff.label.y);
          ctx.restore();
        }

        if (!mOff.val.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.val.z);
          ctx.textAlign = 'right';
          ctx.fillStyle = mOff.val.color !== 'default' ? mOff.val.color : text;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'val', 'bold', 14);
          ctx.fillText(m.val, x + width - 16 + mOff.item.x + mOff.val.x, ry + rowH * 0.68 + mOff.val.y);
          ctx.restore();
        }
      });

      ctx.restore();
      return y + totalH;
    }

    if (design === 'split-scoreboard') {
      const cardGap = 8;
      const itemW = (width - cardGap * (displayMetrics.length - 1)) / displayMetrics.length;

      displayMetrics.forEach((m, idx) => {
        const mOff = this.getMetricItemOffsets(config, widgetKey, m.key);
        if (mOff.item.hidden) return;
        const itemX = x + idx * (itemW + cardGap) + mOff.item.x;
        const itemY = y + mOff.item.y;

        ctx.save();
        this.applyZDepth(ctx, mOff.item.z);
        this.drawRoundedRect(ctx, itemX, itemY, itemW, cardH, 6);
        ctx.fillStyle = '#0a0a10';
        ctx.fill();
        ctx.strokeStyle = '#222230';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();

        if (!mOff.label.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.label.z);
          ctx.textAlign = 'center';
          ctx.fillStyle = mOff.label.color !== 'default' ? mOff.label.color : '#f59e0b';
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'label', 'bold', 10);
          ctx.fillText(m.label, itemX + itemW / 2 + mOff.label.x, itemY + 24 + mOff.label.y);
          ctx.restore();
        }

        if (!mOff.val.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.val.z);
          ctx.textAlign = 'center';
          ctx.fillStyle = mOff.val.color !== 'default' ? mOff.val.color : elAccent;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'val', 'bold', 19);
          ctx.shadowColor = elAccent;
          ctx.shadowBlur = 8;
          ctx.fillText(m.val, itemX + itemW / 2 + mOff.val.x, itemY + 58 + mOff.val.y);
          ctx.restore();
        }
      });

      ctx.restore();
      return y + cardH;
    }

    if (design === 'cyber-brackets') {
      const cardGap = 10;
      const itemW = (width - cardGap * (displayMetrics.length - 1)) / displayMetrics.length;

      displayMetrics.forEach((m, idx) => {
        const mOff = this.getMetricItemOffsets(config, widgetKey, m.key);
        if (mOff.item.hidden) return;
        const itemX = x + idx * (itemW + cardGap) + mOff.item.x;
        const itemY = y + mOff.item.y;

        ctx.save();
        this.applyZDepth(ctx, mOff.item.z);
        this.drawRoundedRect(ctx, itemX, itemY, itemW, cardH, 4);
        ctx.fillStyle = 'rgba(10, 16, 26, 0.88)';
        ctx.fill();

        ctx.strokeStyle = elAccent;
        ctx.lineWidth = 1.5;
        const b = 6;
        ctx.beginPath();
        ctx.moveTo(itemX, itemY + b); ctx.lineTo(itemX, itemY); ctx.lineTo(itemX + b, itemY);
        ctx.moveTo(itemX + itemW - b, itemY); ctx.lineTo(itemX + itemW, itemY); ctx.lineTo(itemX + itemW, itemY + b);
        ctx.moveTo(itemX, itemY + cardH - b); ctx.lineTo(itemX, itemY + cardH); ctx.lineTo(itemX + b, itemY + cardH);
        ctx.moveTo(itemX + itemW - b, itemY + cardH); ctx.lineTo(itemX + itemW, itemY + cardH); ctx.lineTo(itemX + itemW, itemY + cardH - b);
        ctx.stroke();
        ctx.restore();

        if (!mOff.label.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.label.z);
          ctx.textAlign = 'center';
          ctx.fillStyle = mOff.label.color !== 'default' ? mOff.label.color : elAccent;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'label', 'bold', 10);
          ctx.fillText(`[ ${m.label} ]`, itemX + itemW / 2 + mOff.label.x, itemY + 24 + mOff.label.y);
          ctx.restore();
        }

        if (!mOff.val.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.val.z);
          ctx.textAlign = 'center';
          ctx.fillStyle = mOff.val.color !== 'default' ? mOff.val.color : text;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'val', 'bold', 20);
          ctx.fillText(m.val, itemX + itemW / 2 + mOff.val.x, itemY + 56 + mOff.val.y);
          ctx.restore();
        }
      });

      ctx.restore();
      return y + cardH;
    }

    if (design === 'hex-badges') {
      const cardGap = 8;
      const itemW = (width - cardGap * (displayMetrics.length - 1)) / displayMetrics.length;

      displayMetrics.forEach((m, idx) => {
        const mOff = this.getMetricItemOffsets(config, widgetKey, m.key);
        if (mOff.item.hidden) return;
        const itemX = x + idx * (itemW + cardGap) + mOff.item.x;
        const itemY = y + mOff.item.y;

        ctx.save();
        this.applyZDepth(ctx, mOff.item.z);
        this.drawRoundedRect(ctx, itemX, itemY, itemW, cardH, 12);
        ctx.fillStyle = cardStyle === 'solid' ? '#14141e' : 'rgba(25, 25, 35, 0.85)';
        ctx.fill();
        ctx.strokeStyle = elAccent;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        if (!mOff.label.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.label.z);
          ctx.textAlign = 'center';
          ctx.fillStyle = mOff.label.color !== 'default' ? mOff.label.color : textMuted;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'label', 'bold', 10);
          ctx.fillText(m.label, itemX + itemW / 2 + mOff.label.x, itemY + 24 + mOff.label.y);
          ctx.restore();
        }

        if (!mOff.val.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.val.z);
          ctx.textAlign = 'center';
          ctx.fillStyle = mOff.val.color !== 'default' ? mOff.val.color : elAccent;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'val', 'bold', 20);
          ctx.fillText(m.val, itemX + itemW / 2 + mOff.val.x, itemY + 56 + mOff.val.y);
          ctx.restore();
        }
      });

      ctx.restore();
      return y + cardH;
    }

    if (design === 'horizontal-ticker') {
      const hTickerH = 46;
      this.drawRoundedRect(ctx, x, y, width, hTickerH, hTickerH / 2);
      ctx.fillStyle = cardStyle === 'solid' ? '#111118' : 'rgba(15, 15, 24, 0.9)';
      ctx.fill();
      ctx.strokeStyle = elAccent;
      ctx.lineWidth = 1;
      ctx.stroke();

      const itemW = width / displayMetrics.length;
      displayMetrics.forEach((m, idx) => {
        const mOff = this.getMetricItemOffsets(config, widgetKey, m.key);
        if (mOff.item.hidden) return;
        const cx = x + idx * itemW + itemW / 2 + mOff.item.x;
        const cy = y + mOff.item.y;

        if (!mOff.label.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.label.z);
          ctx.textAlign = 'center';
          ctx.fillStyle = mOff.label.color !== 'default' ? mOff.label.color : text;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'label', 'bold', 12);
          ctx.fillText(`${m.label}: `, cx - 14 + mOff.label.x, cy + 28 + mOff.label.y);
          ctx.restore();
        }

        if (!mOff.val.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.val.z);
          ctx.textAlign = 'center';
          ctx.fillStyle = mOff.val.color !== 'default' ? mOff.val.color : elAccent;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'val', 'bold', 12);
          ctx.fillText(m.val, cx + 22 + mOff.val.x, cy + 28 + mOff.val.y);
          ctx.restore();
        }
      });

      ctx.restore();
      return y + hTickerH;
    }

    if (design === 'circular-gauges') {
      if (cardStyle !== 'floating') {
        this.drawCardBackground(ctx, x, y, width, cardH, config, theme);
      }
      const colW = width / displayMetrics.length;

      displayMetrics.forEach((m, idx) => {
        const mOff = this.getMetricItemOffsets(config, widgetKey, m.key);
        if (mOff.item.hidden) return;
        const cx = x + idx * colW + colW / 2 + mOff.item.x;
        const cy = y + cardH / 2 + mOff.item.y;
        const r = Math.min(26, cardH * 0.32);

        ctx.save();
        this.applyZDepth(ctx, mOff.item.z);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.arc(cx, cy - 6, r, 0, Math.PI * 2); ctx.stroke();

        ctx.strokeStyle = elAccent;
        ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.arc(cx, cy - 6, r, -Math.PI / 2, Math.PI * 0.85); ctx.stroke();
        ctx.restore();

        if (!mOff.val.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.val.z);
          ctx.textAlign = 'center';
          ctx.fillStyle = mOff.val.color !== 'default' ? mOff.val.color : text;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'val', 'bold', 13);
          ctx.fillText(m.val.split(' ')[0], cx + mOff.val.x, cy - 2 + mOff.val.y);
          ctx.restore();
        }

        if (!mOff.label.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.label.z);
          ctx.textAlign = 'center';
          ctx.fillStyle = mOff.label.color !== 'default' ? mOff.label.color : textMuted;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'label', 'bold', 10);
          ctx.fillText(m.label, cx + mOff.label.x, y + cardH - 10 + mOff.item.y + mOff.label.y);
          ctx.restore();
        }
      });

      ctx.restore();
      return y + cardH;
    }

    if (design === 'editorial-table') {
      this.drawRoundedRect(ctx, x, y, width, cardH, 8);
      ctx.fillStyle = cardStyle === 'solid' ? '#14141d' : 'rgba(10, 10, 15, 0.9)';
      ctx.fill();
      ctx.strokeStyle = elAccent;
      ctx.lineWidth = 1;
      ctx.stroke();

      const colW = width / displayMetrics.length;
      displayMetrics.forEach((m, idx) => {
        const mOff = this.getMetricItemOffsets(config, widgetKey, m.key);
        if (mOff.item.hidden) return;
        const cx = x + idx * colW + mOff.item.x;
        const cy = y + mOff.item.y;
        if (idx % 2 === 1) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
          ctx.fillRect(cx, cy + 1, colW, cardH - 2);
        }

        if (!mOff.label.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.label.z);
          ctx.textAlign = 'left';
          ctx.fillStyle = mOff.label.color !== 'default' ? mOff.label.color : elAccent;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'label', 'bold', 10);
          ctx.fillText(`// ${m.label}`, cx + 12 + mOff.label.x, cy + 24 + mOff.label.y);
          ctx.restore();
        }

        if (!mOff.val.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.val.z);
          ctx.textAlign = 'left';
          ctx.fillStyle = mOff.val.color !== 'default' ? mOff.val.color : text;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'val', 'bold', 22);
          ctx.fillText(m.val, cx + 12 + mOff.val.x, cy + 56 + mOff.val.y);
          ctx.restore();
        }
      });

      ctx.restore();
      return y + cardH;
    }

    if (design === 'pill-row') {
      const cardGap = 8;
      const itemW = (width - cardGap * (displayMetrics.length - 1)) / displayMetrics.length;

      displayMetrics.forEach((m, idx) => {
        const mOff = this.getMetricItemOffsets(config, widgetKey, m.key);
        if (mOff.item.hidden) return;
        const itemX = x + idx * (itemW + cardGap) + mOff.item.x;
        const itemY = y + mOff.item.y;

        ctx.save();
        this.applyZDepth(ctx, mOff.item.z);
        this.drawRoundedRect(ctx, itemX, itemY, itemW, cardH, cardH / 2);
        ctx.fillStyle = cardStyle === 'solid' ? '#14141d' : 'rgba(20, 20, 30, 0.85)';
        ctx.fill();
        ctx.strokeStyle = elAccent;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();

        if (!mOff.label.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.label.z);
          ctx.textAlign = 'center';
          ctx.fillStyle = mOff.label.color !== 'default' ? mOff.label.color : elAccent;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'label', 'bold', 10);
          ctx.fillText(`${m.icon} ${m.label}`, itemX + itemW / 2 + mOff.label.x, itemY + 26 + mOff.label.y);
          ctx.restore();
        }

        if (!mOff.val.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.val.z);
          ctx.textAlign = 'center';
          ctx.fillStyle = mOff.val.color !== 'default' ? mOff.val.color : text;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'val', 'bold', 18);
          ctx.fillText(m.val, itemX + itemW / 2 + mOff.val.x, itemY + 56 + mOff.val.y);
          ctx.restore();
        }
      });

      ctx.restore();
      return y + cardH;
    }

    if (design === 'horizontal-pipeline') {
      const pipeH = customH || 56;
      this.recordBounds(widgetKey, 'Secondary Metrics', x, y, width, pipeH);
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
        const mOff = this.getMetricItemOffsets(config, widgetKey, m.key);
        if (mOff.item.hidden) return;
        const cx = x + idx * colW + mOff.item.x;
        const cy = y + mOff.item.y;
        if (idx > 0) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.beginPath();
          ctx.moveTo(cx, cy + 10); ctx.lineTo(cx, cy + pipeH - 10);
          ctx.stroke();
        }

        const itemMidX = cx + colW / 2;

        if (!mOff.label.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.label.z);
          ctx.textAlign = 'center';
          ctx.fillStyle = mOff.label.color !== 'default' ? mOff.label.color : elAccent;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'label', 'bold', 10);
          ctx.fillText(`// ${m.label}`.toUpperCase(), itemMidX + mOff.label.x, cy + 19 + mOff.label.y);
          ctx.restore();
        }

        if (!mOff.val.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.val.z);
          ctx.textAlign = 'center';
          ctx.fillStyle = mOff.val.color !== 'default' ? mOff.val.color : text;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'val', 'bold', 17);
          ctx.fillText(m.val, itemMidX + mOff.val.x, cy + pipeH - 14 + mOff.val.y);
          ctx.restore();
        }
      });

      ctx.restore();
      return y + pipeH;
    }

    if (design === 'horizontal-chips') {
      const cardGap = 8;
      const itemW = (width - cardGap * (displayMetrics.length - 1)) / displayMetrics.length;
      const chipH = customH || 48;
      this.recordBounds(widgetKey, 'Secondary Metrics', x, y, width, chipH);

      displayMetrics.forEach((m, idx) => {
        const mOff = this.getMetricItemOffsets(config, widgetKey, m.key);
        if (mOff.item.hidden) return;
        const itemX = x + idx * (itemW + cardGap) + mOff.item.x;
        const itemY = y + mOff.item.y;

        ctx.save();
        this.applyZDepth(ctx, mOff.item.z);
        this.drawRoundedRect(ctx, itemX, itemY, itemW, chipH, 8);
        ctx.fillStyle = cardStyle === 'solid' ? '#0f141c' : 'rgba(15, 20, 28, 0.88)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        if (!mOff.label.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.label.z);
          ctx.textAlign = 'left';
          ctx.fillStyle = mOff.label.color !== 'default' ? mOff.label.color : textMuted;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'label', 'bold', 9);
          const labelStr = m.icon ? `${m.icon} ${m.label}`.toUpperCase() : m.label.toUpperCase();
          ctx.fillText(labelStr, itemX + 14 + mOff.label.x, itemY + chipH / 2 + 4 + mOff.label.y);
          ctx.restore();
        }

        if (!mOff.val.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.val.z);
          ctx.textAlign = 'right';
          ctx.fillStyle = mOff.val.color !== 'default' ? mOff.val.color : elAccent;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'val', 'bold', 15);
          ctx.fillText(m.val, itemX + itemW - 14 + mOff.val.x, itemY + chipH / 2 + 5 + mOff.val.y);
          ctx.restore();
        }
      });

      ctx.restore();
      return y + chipH;
    }

    if (design === 'horizontal-slash-minimal') {
      const slashH = customH || 48;
      this.recordBounds(widgetKey, 'Secondary Metrics', x, y, width, slashH);
      const colW = width / displayMetrics.length;

      displayMetrics.forEach((m, idx) => {
        const mOff = this.getMetricItemOffsets(config, widgetKey, m.key);
        if (mOff.item.hidden) return;
        const cx = x + idx * colW + colW / 2 + mOff.item.x;
        const cy = y + mOff.item.y;

        if (idx < displayMetrics.length - 1) {
          const slashX = x + (idx + 1) * colW;
          ctx.save();
          ctx.textAlign = 'center';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.font = '300 16px sans-serif';
          ctx.fillText('/', slashX, cy + slashH / 2 + 8);
          ctx.restore();
        }

        if (!mOff.label.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.label.z);
          ctx.textAlign = 'center';
          ctx.fillStyle = mOff.label.color !== 'default' ? mOff.label.color : textMuted;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'label', 'bold', 9);
          ctx.fillText(m.label.toUpperCase(), cx + mOff.label.x, cy + 18 + mOff.label.y);
          ctx.restore();
        }

        if (!mOff.val.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.val.z);
          ctx.textAlign = 'center';
          ctx.fillStyle = mOff.val.color !== 'default' ? mOff.val.color : text;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'val', 'bold', 18);
          ctx.fillText(m.val, cx + mOff.val.x, cy + slashH - 6 + mOff.val.y);
          ctx.restore();
        }
      });

      ctx.restore();
      return y + slashH;
    }

    if (design === 'horizontal-linear-cards') {
      const cardGap = 8;
      const itemW = (width - cardGap * (displayMetrics.length - 1)) / displayMetrics.length;
      const cardH_item = customH || 62;
      this.recordBounds(widgetKey, 'Secondary Metrics', x, y, width, cardH_item);

      displayMetrics.forEach((m, idx) => {
        const mOff = this.getMetricItemOffsets(config, widgetKey, m.key);
        if (mOff.item.hidden) return;
        const itemX = x + idx * (itemW + cardGap) + mOff.item.x;
        const itemY = y + mOff.item.y;

        ctx.save();
        this.applyZDepth(ctx, mOff.item.z);
        this.drawRoundedRect(ctx, itemX, itemY, itemW, cardH_item, 6);
        ctx.fillStyle = cardStyle === 'solid' ? '#121620' : 'rgba(18, 22, 32, 0.88)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = elAccent;
        this.drawRoundedRect(ctx, itemX + 4, itemY + 2, itemW - 8, 3, 2);
        ctx.fill();
        ctx.restore();

        if (!mOff.label.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.label.z);
          ctx.textAlign = 'left';
          ctx.fillStyle = mOff.label.color !== 'default' ? mOff.label.color : textMuted;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'label', 'bold', 9);
          ctx.fillText(m.label.toUpperCase(), itemX + 12 + mOff.label.x, itemY + 20 + mOff.label.y);
          ctx.restore();
        }

        if (!mOff.val.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.val.z);
          ctx.textAlign = 'left';
          ctx.fillStyle = mOff.val.color !== 'default' ? mOff.val.color : text;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'val', 'bold', 18);
          ctx.fillText(m.val, itemX + 12 + mOff.val.x, itemY + cardH_item - 12 + mOff.val.y);
          ctx.restore();
        }
      });

      ctx.restore();
      return y + cardH_item;
    }

    if (design === 'vertical-minimal-stack') {
      const vertCount = Math.min(displayMetrics.length, 6);
      const totalH = cardH;
      const rowH = vertCount > 0 ? totalH / vertCount : 34;
      this.recordBounds(widgetKey, 'Secondary Metrics', x, y, width, totalH);

      displayMetrics.slice(0, vertCount).forEach((m, idx) => {
        const mOff = this.getMetricItemOffsets(config, widgetKey, m.key);
        if (mOff.item.hidden) return;
        const ry = y + idx * rowH + mOff.item.y;
        const rx = x + mOff.item.x;
        if (idx > 0) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
          ctx.beginPath(); ctx.moveTo(rx + 16, ry); ctx.lineTo(rx + width - 16, ry); ctx.stroke();
        }

        ctx.fillStyle = elAccent;
        ctx.beginPath(); ctx.arc(rx + 16, ry + rowH / 2, 2.5, 0, Math.PI * 2); ctx.fill();

        if (!mOff.label.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.label.z);
          ctx.textAlign = 'left';
          ctx.fillStyle = mOff.label.color !== 'default' ? mOff.label.color : textMuted;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'label', 'bold', 10);
          const labelText = m.icon ? `${m.icon} ${m.label}`.toUpperCase() : m.label.toUpperCase();
          ctx.fillText(labelText, rx + 28 + mOff.label.x, ry + rowH / 2 + 5 + mOff.label.y);
          ctx.restore();
        }

        if (!mOff.val.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.val.z);
          ctx.textAlign = 'right';
          ctx.fillStyle = mOff.val.color !== 'default' ? mOff.val.color : text;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'val', 'bold', 14);
          ctx.fillText(m.val, rx + width - 18 + mOff.val.x, ry + rowH / 2 + 6 + mOff.val.y);
          ctx.restore();
        }
      });

      ctx.restore();
      return y + totalH;
    }

    if (design === 'vertical-pill-stack') {
      const vertCount = Math.min(displayMetrics.length, 6);
      const totalH = cardH;
      const pillGap = 6;
      const pillH = vertCount > 0 ? Math.max(24, (totalH - (vertCount - 1) * pillGap) / vertCount) : 38;
      this.recordBounds(widgetKey, 'Secondary Metrics', x, y, width, totalH);

      displayMetrics.slice(0, vertCount).forEach((m, idx) => {
        const mOff = this.getMetricItemOffsets(config, widgetKey, m.key);
        if (mOff.item.hidden) return;
        const py = y + idx * (pillH + pillGap) + mOff.item.y;
        const px = x + mOff.item.x;

        ctx.save();
        this.applyZDepth(ctx, mOff.item.z);
        this.drawRoundedRect(ctx, px, py, width, pillH, pillH / 2);
        ctx.fillStyle = cardStyle === 'solid' ? '#141824' : 'rgba(20, 24, 36, 0.85)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.stroke();

        const badgeRadius = 12;
        const badgeCx = px + 20;
        const badgeCy = py + pillH / 2;
        ctx.beginPath();
        ctx.arc(badgeCx, badgeCy, badgeRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.fill();
        ctx.strokeStyle = elAccent;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.fillStyle = elAccent;
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(m.icon || '●', badgeCx, badgeCy + 4);
        ctx.restore();

        if (!mOff.label.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.label.z);
          ctx.textAlign = 'left';
          ctx.fillStyle = mOff.label.color !== 'default' ? mOff.label.color : textMuted;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'label', 'bold', 10);
          ctx.fillText(m.label.toUpperCase(), badgeCx + badgeRadius + 10 + mOff.label.x, py + pillH / 2 + 4 + mOff.label.y);
          ctx.restore();
        }

        if (!mOff.val.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.val.z);
          ctx.textAlign = 'right';
          ctx.fillStyle = mOff.val.color !== 'default' ? mOff.val.color : text;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'val', 'bold', 15);
          ctx.fillText(m.val, px + width - 18 + mOff.val.x, py + pillH / 2 + 5 + mOff.val.y);
          ctx.restore();
        }
      });

      ctx.restore();
      return y + totalH;
    }

    if (design === 'vertical-timeline-flow') {
      const vertCount = Math.min(displayMetrics.length, 6);
      const totalH = cardH;
      const rowH = vertCount > 0 ? totalH / vertCount : 46;
      this.recordBounds(widgetKey, 'Secondary Metrics', x, y, width, totalH);

      const axisX = x + 32;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(axisX, y + Math.min(20, rowH / 2));
      ctx.lineTo(axisX, y + totalH - Math.min(20, rowH / 2));
      ctx.stroke();

      displayMetrics.slice(0, vertCount).forEach((m, idx) => {
        const mOff = this.getMetricItemOffsets(config, widgetKey, m.key);
        if (mOff.item.hidden) return;
        const nodeY = y + idx * rowH + rowH / 2 + mOff.item.y;

        ctx.save();
        this.applyZDepth(ctx, mOff.item.z);
        ctx.beginPath();
        ctx.arc(axisX + mOff.item.x, nodeY, 6, 0, Math.PI * 2);
        const isBgHidden = this.isElementHidden(config, widgetKey, 'bg') || this.isTextOnly(config, widgetKey);
        ctx.fillStyle = isBgHidden ? 'rgba(13, 17, 23, 0.75)' : (cardStyle === 'solid' ? '#0d1117' : 'rgba(13, 17, 23, 0.88)');
        ctx.fill();
        ctx.strokeStyle = elAccent;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(axisX + mOff.item.x, nodeY, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = elAccent;
        ctx.fill();
        ctx.restore();

        if (!mOff.label.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.label.z);
          ctx.textAlign = 'left';
          ctx.fillStyle = mOff.label.color !== 'default' ? mOff.label.color : elAccent;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'label', 'bold', 10);
          ctx.fillText(`[ 0${idx + 1} ] // ${m.label.toUpperCase()}`, axisX + 18 + mOff.item.x + mOff.label.x, nodeY - 4 + mOff.label.y);
          ctx.restore();
        }

        if (!mOff.val.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.val.z);
          ctx.textAlign = 'left';
          ctx.fillStyle = mOff.val.color !== 'default' ? mOff.val.color : text;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'val', 'bold', 15);
          ctx.fillText(m.val, axisX + 18 + mOff.item.x + mOff.val.x, nodeY + 16 + mOff.val.y);
          ctx.restore();
        }
      });

      ctx.restore();
      return y + totalH;
    }

    if (design === 'vertical-data-ladder') {
      const vertCount = Math.min(displayMetrics.length, 6);
      const totalH = cardH;
      const rowGap = 4;
      const rowH = vertCount > 0 ? Math.max(22, (totalH - (vertCount - 1) * rowGap) / vertCount) : 36;
      this.recordBounds(widgetKey, 'Secondary Metrics', x, y, width, totalH);

      displayMetrics.slice(0, vertCount).forEach((m, idx) => {
        const mOff = this.getMetricItemOffsets(config, widgetKey, m.key);
        if (mOff.item.hidden) return;
        const ry = y + idx * (rowH + rowGap) + mOff.item.y;
        const rx = x + mOff.item.x;

        ctx.save();
        this.applyZDepth(ctx, mOff.item.z);
        this.drawRoundedRect(ctx, rx, ry, width, rowH, 6);
        ctx.fillStyle = cardStyle === 'solid' ? '#10141d' : 'rgba(16, 20, 29, 0.85)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = elAccent;
        this.drawRoundedRect(ctx, rx + 14, ry + 10, 28, rowH - 20, 3);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`0${idx + 1}`, rx + 28, ry + rowH / 2 + 4);
        ctx.restore();

        if (!mOff.label.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.label.z);
          ctx.textAlign = 'left';
          ctx.fillStyle = mOff.label.color !== 'default' ? mOff.label.color : textMuted;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'label', 'bold', 10);
          const lText = m.icon ? `${m.icon} ${m.label}`.toUpperCase() : m.label.toUpperCase();
          ctx.fillText(lText, rx + 54 + mOff.label.x, ry + rowH / 2 + 4 + mOff.label.y);
          ctx.restore();
        }

        if (!mOff.val.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.val.z);
          ctx.textAlign = 'right';
          ctx.fillStyle = mOff.val.color !== 'default' ? mOff.val.color : elAccent;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'val', 'bold', 15);
          ctx.fillText(m.val, rx + width - 16 + mOff.val.x, ry + rowH / 2 + 5 + mOff.val.y);
          ctx.restore();
        }
      });

      ctx.restore();
      return y + totalH;
    }

    if (design === 'vertical-athletic-cards') {
      const vertCount = Math.min(displayMetrics.length, 6);
      const totalH = cardH;
      const cardGap = 6;
      const cardH_item = vertCount > 0 ? Math.max(26, (totalH - (vertCount - 1) * cardGap) / vertCount) : 42;
      this.recordBounds(widgetKey, 'Secondary Metrics', x, y, width, totalH);

      displayMetrics.slice(0, vertCount).forEach((m, idx) => {
        const mOff = this.getMetricItemOffsets(config, widgetKey, m.key);
        if (mOff.item.hidden) return;
        const cy = y + idx * (cardH_item + cardGap) + mOff.item.y;
        const cx = x + mOff.item.x;

        ctx.save();
        this.applyZDepth(ctx, mOff.item.z);
        this.drawRoundedRect(ctx, cx, cy, width, cardH_item, 8);
        ctx.fillStyle = cardStyle === 'solid' ? '#14141e' : 'rgba(20, 20, 30, 0.85)';
        ctx.fill();
        ctx.strokeStyle = elAccent;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = elAccent;
        this.drawRoundedRect(ctx, cx + 2, cy + 6, 5, cardH_item - 12, 2);
        ctx.fill();

        if (m.icon) {
          ctx.textAlign = 'center';
          ctx.font = '14px sans-serif';
          ctx.fillText(m.icon, cx + 26, cy + cardH_item / 2 + 5);
        }
        ctx.restore();

        if (!mOff.label.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.label.z);
          ctx.textAlign = 'left';
          ctx.fillStyle = mOff.label.color !== 'default' ? mOff.label.color : textMuted;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'label', 'bold', 10);
          ctx.fillText(m.label.toUpperCase(), cx + 50 + mOff.label.x, cy + cardH_item / 2 + 4 + mOff.label.y);
          ctx.restore();
        }

        if (!mOff.val.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.val.z);
          ctx.textAlign = 'right';
          ctx.fillStyle = mOff.val.color !== 'default' ? mOff.val.color : text;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'val', 'bold', 16);
          ctx.fillText(m.val, cx + width - 16 + mOff.val.x, cy + cardH_item / 2 + 5 + mOff.val.y);
          ctx.restore();
        }
      });

      ctx.restore();
      return y + totalH;
    }

    if (design === 'cyber-hex-matrix') {
      // Style: Cyber Hexagon Honeycomb (Chamfered Tech Cells)
      const count = Math.min(displayMetrics.length, 6);
      const gapX = 8;
      const cellW = (width - (count - 1) * gapX) / count;
      const cellH = customH || 82;
      this.recordBounds(widgetKey, 'Secondary Metrics', x, y, width, cellH);

      displayMetrics.slice(0, count).forEach((m, idx) => {
        const mOff = this.getMetricItemOffsets(config, widgetKey, m.key);
        if (mOff.item.hidden) return;
        const cx = x + idx * (cellW + gapX) + mOff.item.x;
        const cy = y + mOff.item.y;

        ctx.save();
        this.applyZDepth(ctx, mOff.item.z);
        // Chamfered corner hexagon card
        const cut = 10;
        ctx.beginPath();
        ctx.moveTo(cx + cut, cy);
        ctx.lineTo(cx + cellW - cut, cy);
        ctx.lineTo(cx + cellW, cy + cut);
        ctx.lineTo(cx + cellW, cy + cellH - cut);
        ctx.lineTo(cx + cellW - cut, cy + cellH);
        ctx.lineTo(cx + cut, cy + cellH);
        ctx.lineTo(cx, cy + cellH - cut);
        ctx.lineTo(cx, cy + cut);
        ctx.closePath();
        ctx.fillStyle = cardStyle === 'solid' ? '#0f141f' : 'rgba(15, 20, 31, 0.88)';
        ctx.fill();
        ctx.strokeStyle = elAccent;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Corner cyan neon notch
        ctx.fillStyle = elAccent;
        ctx.beginPath();
        ctx.moveTo(cx, cy + cut);
        ctx.lineTo(cx + cut, cy);
        ctx.lineTo(cx + cut + 6, cy);
        ctx.lineTo(cx, cy + cut + 6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Label on top
        if (!mOff.label.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.label.z);
          ctx.textAlign = 'center';
          ctx.fillStyle = mOff.label.color !== 'default' ? mOff.label.color : textMuted;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'label', 'bold', 9);
          const lblStr = m.icon ? `${m.icon} ${m.label}` : m.label;
          ctx.fillText(lblStr.toUpperCase(), cx + cellW / 2 + mOff.label.x, cy + 24 + mOff.label.y);
          ctx.restore();
        }

        // Value on bottom
        if (!mOff.val.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.val.z);
          ctx.textAlign = 'center';
          ctx.fillStyle = mOff.val.color !== 'default' ? mOff.val.color : text;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'val', 'bold', 16);
          ctx.fillText(m.val, cx + cellW / 2 + mOff.val.x, cy + cellH - 16 + mOff.val.y);
          ctx.restore();
        }
      });

      ctx.restore();
      return y + cellH;
    }

    if (design === 'minimal-wire-strip') {
      // Style: Single-Line Wireframe Strip (Ultra-Thin Hairline Stream)
      const stripH = customH || 64;
      this.recordBounds(widgetKey, 'Secondary Metrics', x, y, width, stripH);

      const count = displayMetrics.length;
      const colW = width / count;

      // Single hairline across the middle
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 10, y + stripH / 2);
      ctx.lineTo(x + width - 10, y + stripH / 2);
      ctx.stroke();

      displayMetrics.forEach((m, idx) => {
        const mOff = this.getMetricItemOffsets(config, widgetKey, m.key);
        if (mOff.item.hidden) return;
        const cx = x + idx * colW + colW / 2 + mOff.item.x;
        const cy = y + mOff.item.y;

        // Vertical tick delimiter
        if (idx > 0) {
          ctx.strokeStyle = elAccent;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x + idx * colW, y + stripH / 2 - 8);
          ctx.lineTo(x + idx * colW, y + stripH / 2 + 8);
          ctx.stroke();
        }

        if (!mOff.label.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.label.z);
          ctx.textAlign = 'center';
          ctx.fillStyle = mOff.label.color !== 'default' ? mOff.label.color : elAccent;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'label', 'bold', 8.5);
          ctx.fillText(m.label.toUpperCase(), cx + mOff.label.x, cy + 18 + mOff.label.y);
          ctx.restore();
        }

        if (!mOff.val.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.val.z);
          ctx.textAlign = 'center';
          ctx.fillStyle = mOff.val.color !== 'default' ? mOff.val.color : text;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'val', 'bold', 15);
          ctx.fillText(m.val, cx + mOff.val.x, cy + stripH - 12 + mOff.val.y);
          ctx.restore();
        }
      });
      ctx.restore();

      ctx.restore();
      return y + stripH;
    }

    if (design === 'strip') {
      if (cardStyle !== 'floating') {
        this.drawCardBackground(ctx, x, y, width, cardH, config, theme);
      }
      const colW = width / displayMetrics.length;

      displayMetrics.forEach((m, idx) => {
        const mOff = this.getMetricItemOffsets(config, widgetKey, m.key);
        if (mOff.item.hidden) return;
        const cx = x + idx * colW + colW / 2 + mOff.item.x;
        const cy = y + mOff.item.y;

        if (!mOff.label.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.label.z);
          ctx.textAlign = 'center';
          ctx.fillStyle = mOff.label.color !== 'default' ? mOff.label.color : textMuted;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'label', '600', 12);
          ctx.fillText(m.label, cx + mOff.label.x, cy + 26 + mOff.label.y);
          ctx.restore();
        }

        if (!mOff.val.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.val.z);
          ctx.textAlign = 'center';
          ctx.fillStyle = mOff.val.color !== 'default' ? mOff.val.color : text;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'val', 'bold', 22);
          ctx.fillText(m.val, cx + mOff.val.x, cy + 60 + mOff.val.y);
          ctx.restore();
        }

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
        const mOff = this.getMetricItemOffsets(config, widgetKey, m.key);
        if (mOff.item.hidden) return;
        const itemX = x + idx * (itemW + cardGap) + mOff.item.x;
        const itemY = y + mOff.item.y;

        ctx.save();
        this.applyZDepth(ctx, mOff.item.z);
        this.drawRoundedRect(ctx, itemX, itemY, itemW, cardH, 20);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fill();
        ctx.strokeStyle = elAccent;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        if (!mOff.label.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.label.z);
          ctx.textAlign = 'center';
          ctx.fillStyle = mOff.label.color !== 'default' ? mOff.label.color : elAccent;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'label', 'bold', 11);
          ctx.fillText(m.label, itemX + itemW / 2 + mOff.label.x, itemY + 25 + mOff.label.y);
          ctx.restore();
        }

        if (!mOff.val.hidden) {
          ctx.save();
          this.applyZDepth(ctx, mOff.val.z);
          ctx.textAlign = 'center';
          ctx.fillStyle = mOff.val.color !== 'default' ? mOff.val.color : text;
          ctx.font = this.getMetricFont(config, widgetKey, m.key, 'val', 'bold', 20);
          ctx.fillText(m.val, itemX + itemW / 2 + mOff.val.x, itemY + 57 + mOff.val.y);
          ctx.restore();
        }
      });

      ctx.restore();
      return y + cardH;
    }

    // Default 'grid' & 'compact':
    const effAlign = this.getWidgetAlign(align, 'center');
    const cardGap = 12;
    const itemW = (width - cardGap * (displayMetrics.length - 1)) / displayMetrics.length;

    displayMetrics.forEach((m, idx) => {
      const mOff = this.getMetricItemOffsets(config, widgetKey, m.key);
      if (mOff.item.hidden) return;
      const itemX = x + idx * (itemW + cardGap) + mOff.item.x;
      const itemY = y + mOff.item.y;

      if (cardStyle !== 'floating') {
        ctx.save();
        this.applyZDepth(ctx, mOff.item.z);
        this.drawCardBackground(ctx, itemX, itemY, itemW, cardH, config, theme);
        ctx.restore();
      }
      const itemCx = effAlign === 'left' ? itemX + 16 : effAlign === 'right' ? itemX + itemW - 16 : itemX + itemW / 2;

      if (!mOff.label.hidden) {
        ctx.save();
        this.applyZDepth(ctx, mOff.label.z);
        ctx.textAlign = effAlign;
        ctx.fillStyle = mOff.label.color !== 'default' ? mOff.label.color : textMuted;
        ctx.font = this.getMetricFont(config, widgetKey, m.key, 'label', 'bold', 11);
        ctx.letterSpacing = '0.5px';
        ctx.fillText(m.label, itemCx + mOff.label.x, itemY + 26 + mOff.label.y);
        ctx.restore();
      }

      if (!mOff.val.hidden) {
        ctx.save();
        this.applyZDepth(ctx, mOff.val.z);
        ctx.textAlign = effAlign;
        ctx.fillStyle = mOff.val.color !== 'default' ? mOff.val.color : text;
        ctx.font = this.getMetricFont(config, widgetKey, m.key, 'val', 'bold', 22);
        ctx.fillText(m.val, itemCx + mOff.val.x, itemY + 58 + mOff.val.y);
        ctx.restore();
      }
    });

    ctx.restore();
    return y + cardH;
  }

  // =========================================================================
  drawSplitsBarChart(ctx, x, y, width, activity, config, theme, accent, chartH = 150, widgetKey = 'splits') {
    if (config && config.showWidgetSplits === false) return y;
    const offWidget = this.getElementOffset(config, widgetKey, 'widget');
    if (offWidget.hidden) return y;

    const isLapSource = config.splitDataSource === 'laps' && activity.hasLaps;
    const items = isLapSource ? activity.laps : activity.splits;

    if (!items || items.length === 0) return y;

    ctx.save();
    const rot = this.applyWidgetRotation(ctx, config, widgetKey, x, y, width, chartH);
    const elStyle = this.getElementStyle(config, widgetKey);
    const { text, textMuted, accent: elAccent, cardStyle, align, opacity } = this.getEffectiveColors(config, theme, accent, widgetKey);
    if (opacity < 1) ctx.globalAlpha = opacity;
    accent = elAccent;

    const font = this.getFontFamily(elStyle.fontFamily !== 'default' ? elStyle.fontFamily : config.fontFamily);
    const design = config.splitsDesign || 'vertical-bars';

    const hasCustomH = Boolean(
      config.widgetPositions &&
      config.widgetPositions[widgetKey] &&
      (config.widgetPositions[widgetKey].height || config.widgetPositions[widgetKey].h)
    );

    const totalItemsCount = items.length;
    let minNeededH = chartH;
    if (design === 'pace-table') {
      minNeededH = Math.max(chartH, 56 + totalItemsCount * 22);
    } else if (design === 'horizontal-bars') {
      minNeededH = Math.max(chartH, 48 + totalItemsCount * 22);
    } else if (design === 'centered-split-ladder' || design === 'split-ladder-timeline') {
      minNeededH = Math.max(chartH, 48 + totalItemsCount * 22);
    } else if (design === 'vertical-split-cards') {
      minNeededH = Math.max(chartH, 48 + totalItemsCount * 34);
    } else if (design === 'pace-delta-bars') {
      minNeededH = Math.max(chartH, 48 + totalItemsCount * 20);
    } else if (design === 'centered-split-pills') {
      const isTwoCol = totalItemsCount >= 6 && width > 420;
      const cols = isTwoCol ? 2 : 1;
      const rows = Math.ceil(totalItemsCount / cols);
      minNeededH = Math.max(chartH, 48 + rows * 34);
    } else if (design === 'card-grid') {
      const cols = totalItemsCount > 15 ? 4 : totalItemsCount > 5 ? 3 : 2;
      const rows = Math.ceil(totalItemsCount / cols);
      minNeededH = Math.max(chartH, 48 + rows * 48);
    }

    if (!hasCustomH) {
      chartH = minNeededH;
    }

    this.recordBounds(widgetKey, 'Splits Chart', x, y, width, chartH);
    this.drawWidgetCardBg(ctx, widgetKey, x, y, width, chartH, config, theme);

    const padX = 16;
    const titleY = y + 24;

    const offTitle = this.getElementOffset(config, widgetKey, 'title');
    const offBadge = this.getElementOffset(config, widgetKey, 'badge');
    const offTable = this.getElementOffset(config, widgetKey, 'table');
    const offLapLabels = this.getElementOffset(config, widgetKey, 'lapLabels');
    const offPaceLabels = this.getElementOffset(config, widgetKey, 'paceLabels');
    const offBars = this.getElementOffset(config, widgetKey, 'bars');

    const defaultTitle = isLapSource ? 'MANUAL LAPS & SEGMENTS' : (activity.isAnimated && activity.progress < 0.999 ? 'ACTIVE SEGMENT PROGRESS' : 'KILOMETER SPLITS');
    const chartTitle = this.getTextOverride(config, widgetKey, 'title', defaultTitle);

    if (!offTitle.hidden && chartTitle) {
      ctx.save();
      this.applyZDepth(ctx, offTitle.z);
      ctx.textAlign = 'left';
      ctx.fillStyle = offTitle.color !== 'default' ? offTitle.color : textMuted;
      ctx.font = this.getSubPartFont(config, widgetKey, 'title', 'bold', 13);
      ctx.letterSpacing = '1px';
      ctx.fillText(chartTitle, x + padX + offTitle.x, titleY + offTitle.y);
      ctx.restore();
    }

    const fastest = isLapSource ? null : activity.fastestSplit;
    const showFastest = (config.splitHighlightFastest !== false) && (config.splitsShowFastest !== false);

    if (fastest && showFastest && !offBadge.hidden) {
      ctx.save();
      this.applyZDepth(ctx, offBadge.z);
      ctx.textAlign = 'right';
      ctx.fillStyle = offBadge.color !== 'default' ? offBadge.color : elAccent;
      ctx.font = this.getSubPartFont(config, widgetKey, 'badge', 'bold', 12);
      const defaultBadge = `⚡ FASTEST: ${fastest.shortName} (${fastest.paceFormatted.split(' ')[0]})`;
      const badgeText = this.getTextOverride(config, widgetKey, 'fastestBadge', defaultBadge);
      ctx.fillText(badgeText, x + width - padX + offBadge.x, titleY + offBadge.y);
      ctx.restore();
    }

    const visibleSplits = items;
    const count = visibleSplits.length;

    if (design === 'centered-split-ladder') {
      const rowH = Math.max(24, Math.min(36, Math.floor((chartH - 45) / count)));
      const startY = y + 42;
      const midX = x + width / 2;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(midX, startY);
      ctx.lineTo(midX, startY + count * rowH - 8);
      ctx.stroke();

      visibleSplits.forEach((it, idx) => {
        const sOff = this.getSplitItemOffsets(config, widgetKey, idx);
        if (sOff.split.hidden) return;
        const sy = startY + idx * rowH + rowH / 2 + sOff.split.y;
        const isFastest = it.isFastest && showFastest;

        if (!sOff.bar.hidden) {
          ctx.save();
          this.applyZDepth(ctx, sOff.bar.z);
          ctx.beginPath();
          ctx.arc(midX + sOff.bar.x, sy + sOff.bar.y, isFastest ? 5 : 3.5, 0, Math.PI * 2);
          ctx.fillStyle = sOff.bar.color !== 'default' ? sOff.bar.color : (isFastest ? elAccent : 'rgba(255, 255, 255, 0.3)');
          ctx.fill();
          if (isFastest) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
          ctx.restore();
        }

        if (!sOff.lap.hidden) {
          ctx.save();
          this.applyZDepth(ctx, sOff.lap.z);
          ctx.textAlign = 'right';
          ctx.fillStyle = sOff.lap.color !== 'default' ? sOff.lap.color : textMuted;
          ctx.font = this.getSplitFont(config, widgetKey, idx, 'lap', 'bold', 12);
          ctx.fillText(it.name || it.shortName, midX - 16 + sOff.lap.x, sy + 4 + sOff.lap.y);
          ctx.restore();
        }

        if (!sOff.pace.hidden) {
          ctx.save();
          this.applyZDepth(ctx, sOff.pace.z);
          ctx.textAlign = 'left';
          ctx.fillStyle = sOff.pace.color !== 'default' ? sOff.pace.color : (isFastest ? elAccent : text);
          ctx.font = this.getSplitFont(config, widgetKey, idx, 'pace', 'bold', 14);
          const fastestMark = isFastest ? ' ⚡' : '';
          ctx.fillText(`${it.paceFormatted.split(' ')[0]} /km${fastestMark}`, midX + 16 + sOff.pace.x, sy + 4 + sOff.pace.y);
          ctx.restore();
        }
      });

      ctx.restore();
      return y + chartH;
    }

    if (design === 'centered-split-pills') {
      const isTwoCol = count >= 6 && width > 420;
      const cols = isTwoCol ? 2 : 1;
      const rows = Math.ceil(count / cols);
      const pillGap = 8;
      const pillH = Math.max(30, Math.min(38, Math.floor((chartH - 45 - (rows - 1) * pillGap) / rows)));
      const pillW = isTwoCol ? (width - padX * 2 - pillGap) / 2 : (width - padX * 2);

      visibleSplits.forEach((it, idx) => {
        const sOff = this.getSplitItemOffsets(config, widgetKey, idx);
        if (sOff.split.hidden) return;
        const c = idx % cols;
        const r = Math.floor(idx / cols);
        const pillX = x + padX + c * (pillW + pillGap) + sOff.split.x;
        const py = y + 40 + r * (pillH + pillGap) + sOff.split.y;
        const isFastest = it.isFastest && showFastest;

        if (!sOff.bar.hidden) {
          ctx.save();
          this.applyZDepth(ctx, sOff.bar.z);
          this.drawRoundedRect(ctx, pillX + sOff.bar.x, py + sOff.bar.y, pillW, pillH, pillH / 2);
          ctx.fillStyle = sOff.bar.color !== 'default' ? sOff.bar.color : (isFastest ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)');
          ctx.fill();
          ctx.strokeStyle = isFastest ? elAccent : 'rgba(255, 255, 255, 0.1)';
          ctx.lineWidth = isFastest ? 1.5 : 1;
          ctx.stroke();
          ctx.restore();
        }

        if (!sOff.lap.hidden) {
          ctx.save();
          this.applyZDepth(ctx, sOff.lap.z);
          ctx.textAlign = 'left';
          ctx.fillStyle = sOff.lap.color !== 'default' ? sOff.lap.color : textMuted;
          ctx.font = this.getSplitFont(config, widgetKey, idx, 'lap', 'bold', 11);
          ctx.fillText(it.name || it.shortName, pillX + 16 + sOff.lap.x, py + pillH / 2 + 4 + sOff.lap.y);
          ctx.restore();
        }

        if (!sOff.pace.hidden) {
          ctx.save();
          this.applyZDepth(ctx, sOff.pace.z);
          ctx.textAlign = 'right';
          ctx.fillStyle = sOff.pace.color !== 'default' ? sOff.pace.color : (isFastest ? elAccent : text);
          ctx.font = this.getSplitFont(config, widgetKey, idx, 'pace', 'bold', 13);
          const star = isFastest ? '★ ' : '';
          ctx.fillText(`${star}${it.paceFormatted.split(' ')[0]} /km`, pillX + pillW - 16 + sOff.pace.x, py + pillH / 2 + 4 + sOff.pace.y);
          ctx.restore();
        }
      });

      ctx.restore();
      return y + chartH;
    }

    if (design === 'speed-dots') {
      const dotAreaY = y + 42;
      const dotAreaH = chartH - 70;
      const dotAreaW = width - padX * 2;
      const isAnim = activity.isAnimated && items.some((it) => it.isCompleted !== undefined);

      let minP = Infinity, maxP = 0;
      visibleSplits.forEach((it) => {
        if (it.pace > 0) {
          if (it.pace < minP) minP = it.pace;
          if (it.pace > maxP) maxP = it.pace;
        }
      });
      if (minP === Infinity) minP = 240;
      if (maxP <= minP) maxP = minP + 60;

      const dotGap = dotAreaW / (visibleSplits.length - 1 || 1);
      const points = [];

      visibleSplits.forEach((it, idx) => {
        const sOff = this.getSplitItemOffsets(config, widgetKey, idx);
        const dx = x + padX + idx * dotGap + sOff.split.x;
        const norm = 1 - (it.pace - minP) / (maxP - minP || 1);
        const dy = dotAreaY + (1 - norm) * dotAreaH + sOff.split.y;
        points.push({ x: dx, y: dy, it, isFastest: it.isFastest && showFastest, sOff, idx });
      });

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();

      points.forEach((p) => {
        if (p.sOff.split.hidden) return;
        if (!p.sOff.bar.hidden) {
          ctx.save();
          this.applyZDepth(ctx, p.sOff.bar.z);
          ctx.beginPath();
          ctx.arc(p.x + p.sOff.bar.x, p.y + p.sOff.bar.y, p.isFastest ? 6 : 4, 0, Math.PI * 2);
          ctx.fillStyle = p.sOff.bar.color !== 'default' ? p.sOff.bar.color : (p.isFastest ? elAccent : text);
          ctx.fill();
          ctx.strokeStyle = '#14141d';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
        }

        if (!p.sOff.lap.hidden) {
          ctx.save();
          this.applyZDepth(ctx, p.sOff.lap.z);
          ctx.textAlign = 'center';
          ctx.fillStyle = p.sOff.lap.color !== 'default' ? p.sOff.lap.color : (p.isFastest ? elAccent : textMuted);
          ctx.font = this.getSplitFont(config, widgetKey, p.idx, 'lap', '600', 10);
          ctx.fillText(p.it.shortName, p.x + p.sOff.lap.x, dotAreaY + dotAreaH + 16 + p.sOff.lap.y);
          ctx.restore();
        }

        if (!p.sOff.pace.hidden) {
          ctx.save();
          this.applyZDepth(ctx, p.sOff.pace.z);
          ctx.textAlign = 'center';
          ctx.fillStyle = p.sOff.pace.color !== 'default' ? p.sOff.pace.color : (p.isFastest ? elAccent : text);
          ctx.font = this.getSplitFont(config, widgetKey, p.idx, 'pace', 'bold', 10);
          ctx.fillText(p.it.paceFormatted.split(' ')[0], p.x + p.sOff.pace.x, p.y - 10 + p.sOff.pace.y);
          ctx.restore();
        }
      });

      ctx.restore();
      return y + chartH;
    }

    if (design === 'pace-delta-bars') {
      const isAnim = activity.isAnimated && visibleSplits.some((it) => it.isCompleted !== undefined);
      const rowH = Math.max(20, Math.min(28, Math.floor((chartH - 45) / count)));
      const startY = y + 42;
      const barH = rowH - 6;

      visibleSplits.forEach((it, idx) => {
        const sOff = this.getSplitItemOffsets(config, widgetKey, idx);
        if (sOff.split.hidden) return;
        const by = startY + idx * rowH + sOff.split.y;
        const isFastest = it.isFastest && showFastest;

        if (!sOff.bar.hidden) {
          ctx.save();
          this.applyZDepth(ctx, sOff.bar.z);
          const barW = Math.max(10, width - padX * 2);
          this.drawRoundedRect(ctx, x + padX + sOff.bar.x, by + sOff.bar.y, barW, barH, 4);
          ctx.fillStyle = sOff.bar.color !== 'default' ? sOff.bar.color : (isFastest ? 'rgba(204, 255, 0, 0.15)' : 'rgba(255, 255, 255, 0.05)');
          ctx.fill();
          ctx.restore();
        }

        if (!sOff.lap.hidden) {
          ctx.save();
          this.applyZDepth(ctx, sOff.lap.z);
          ctx.textAlign = 'left';
          ctx.fillStyle = sOff.lap.color !== 'default' ? sOff.lap.color : (isFastest ? elAccent : textMuted);
          ctx.font = this.getSplitFont(config, widgetKey, idx, 'lap', 'bold', 11);
          ctx.fillText(it.shortName, x + padX + 8 + sOff.lap.x, by + barH / 2 + 4 + sOff.lap.y);
          ctx.restore();
        }

        if (!sOff.pace.hidden) {
          ctx.save();
          this.applyZDepth(ctx, sOff.pace.z);
          ctx.textAlign = 'right';
          ctx.fillStyle = sOff.pace.color !== 'default' ? sOff.pace.color : (isFastest ? elAccent : text);
          ctx.font = this.getSplitFont(config, widgetKey, idx, 'pace', 'bold', 12);
          const paceStr = it.paceFormatted.split(' ')[0];
          ctx.fillText(`${paceStr} /km`, x + width - padX - 8 + sOff.pace.x, by + barH / 2 + 4 + sOff.pace.y);
          ctx.restore();
        }
      });

      ctx.restore();
      return y + chartH;
    }

    if (design === 'card-grid') {
      const cardGap = 8;
      const cols = count > 5 ? 3 : 2;
      const rows = Math.ceil(count / cols);
      const cardW = (width - padX * 2 - cardGap * (cols - 1)) / cols;
      const cardH_item = Math.max(45, Math.floor((chartH - 45 - cardGap * (rows - 1)) / rows));

      visibleSplits.forEach((it, idx) => {
        const sOff = this.getSplitItemOffsets(config, widgetKey, idx);
        if (sOff.split.hidden) return;
        const c = idx % cols;
        const r = Math.floor(idx / cols);
        const tx = x + padX + c * (cardW + cardGap) + sOff.split.x;
        const ty = y + 42 + r * (cardH_item + cardGap) + sOff.split.y;
        const isFastest = it.isFastest && showFastest;

        if (!sOff.bar.hidden) {
          ctx.save();
          this.applyZDepth(ctx, sOff.bar.z);
          this.drawRoundedRect(ctx, tx + sOff.bar.x, ty + sOff.bar.y, cardW, cardH_item, 8);
          ctx.fillStyle = sOff.bar.color !== 'default' ? sOff.bar.color : (isFastest ? 'rgba(204, 255, 0, 0.12)' : 'rgba(255, 255, 255, 0.05)');
          ctx.fill();
          ctx.strokeStyle = isFastest ? elAccent : 'rgba(255, 255, 255, 0.1)';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.restore();
        }

        if (!sOff.lap.hidden) {
          ctx.save();
          this.applyZDepth(ctx, sOff.lap.z);
          ctx.textAlign = 'left';
          ctx.fillStyle = sOff.lap.color !== 'default' ? sOff.lap.color : textMuted;
          ctx.font = this.getSplitFont(config, widgetKey, idx, 'lap', 'bold', 10);
          ctx.fillText(`SPLIT ${it.shortName}`, tx + 8 + sOff.lap.x, ty + 16 + sOff.lap.y);
          ctx.restore();
        }

        if (!sOff.pace.hidden) {
          ctx.save();
          this.applyZDepth(ctx, sOff.pace.z);
          ctx.textAlign = 'left';
          ctx.fillStyle = sOff.pace.color !== 'default' ? sOff.pace.color : (isFastest ? elAccent : text);
          ctx.font = this.getSplitFont(config, widgetKey, idx, 'pace', 'bold', 15);
          ctx.fillText(it.paceFormatted.split(' ')[0], tx + 8 + sOff.pace.x, ty + cardH_item - 10 + sOff.pace.y);
          ctx.restore();
        }
      });

      ctx.restore();
      return y + chartH;
    }

    if (design === 'pace-table') {
      const tableW = width - padX * 2;
      const headerY = y + 44 + offTable.y;
      const defaultCols = { split: true, time: true, pace: true, delta: true, avgHr: true, maxHr: false, minHr: false, cadence: false, elevation: true };
      const splitCols = { ...defaultCols, ...(config.splitColumns || {}) };

      const colDefs = [
        { key: 'split', title: this.getTextOverride(config, widgetKey, 'headerSplit', 'SPLIT'), align: 'left', flex: 1.1 },
      ];
      if (splitCols.time !== false) colDefs.push({ key: 'time', title: this.getTextOverride(config, widgetKey, 'headerTime', 'TIME'), align: 'center', flex: 1.0 });
      if (splitCols.pace !== false) colDefs.push({ key: 'pace', title: this.getTextOverride(config, widgetKey, 'headerPace', 'PACE'), align: 'right', flex: 1.0 });
      if (splitCols.delta) colDefs.push({ key: 'delta', title: this.getTextOverride(config, widgetKey, 'headerDelta', '+/- DELTA'), align: 'right', flex: 0.95 });
      if (splitCols.avgHr) colDefs.push({ key: 'avgHr', title: this.getTextOverride(config, widgetKey, 'headerHr', 'AVG HR'), align: 'right', flex: 0.9 });
      if (splitCols.maxHr) colDefs.push({ key: 'maxHr', title: this.getTextOverride(config, widgetKey, 'headerMaxHr', 'MAX HR'), align: 'right', flex: 0.9 });
      if (splitCols.minHr) colDefs.push({ key: 'minHr', title: this.getTextOverride(config, widgetKey, 'headerMinHr', 'MIN HR'), align: 'right', flex: 0.9 });
      if (splitCols.cadence) colDefs.push({ key: 'cadence', title: this.getTextOverride(config, widgetKey, 'headerCad', 'CAD'), align: 'right', flex: 0.85 });
      if (splitCols.elevation) colDefs.push({ key: 'elevation', title: this.getTextOverride(config, widgetKey, 'headerElev', 'ELEV'), align: 'right', flex: 0.9 });

      const totalFlex = colDefs.reduce((acc, c) => acc + c.flex, 0);
      let curColX = x + padX;
      const computedCols = colDefs.map((c) => {
        const cW = (c.flex / totalFlex) * tableW;
        const posX = c.align === 'left' ? curColX : c.align === 'center' ? curColX + cW / 2 : curColX + cW;
        const res = { ...c, width: cW, posX, startX: curColX };
        curColX += cW;
        return res;
      });

      const headerFontSize = colDefs.length > 6 ? 9 : 10;

      ctx.fillStyle = textMuted;
      ctx.font = this.getSubPartFont(config, widgetKey, 'table', '600', headerFontSize);
      ctx.letterSpacing = '0.5px';
      computedCols.forEach((col) => {
        ctx.textAlign = col.align;
        ctx.fillText(col.title, col.posX, headerY);
      });

      const tableStartY = headerY + 12;
      const availableH = chartH - (tableStartY - y) - 8;
      const rowH = Math.min(24, Math.max(11, availableH / count));
      const cellFontSize = colDefs.length > 6 ? (rowH < 14 ? 8 : 9) : (rowH < 14 ? 8.5 : 10.5);
      const isImp = activity.distanceUnit === 'mi';

      visibleSplits.forEach((it, idx) => {
        const sOff = this.getSplitItemOffsets(config, widgetKey, idx);
        if (sOff.split.hidden) return;
        const rowY = tableStartY + idx * rowH + rowH * 0.75 + sOff.split.y;
        const isFastest = it.isFastest && showFastest;

        computedCols.forEach((col) => {
          if (col.key === 'split' && !sOff.lap.hidden) {
            ctx.save();
            this.applyZDepth(ctx, sOff.lap.z);
            ctx.textAlign = col.align;
            ctx.fillStyle = sOff.lap.color !== 'default' ? sOff.lap.color : (isFastest ? elAccent : textMuted);
            ctx.font = this.getSplitFont(config, widgetKey, idx, 'lap', 'bold', cellFontSize);
            ctx.fillText(it.name || it.shortName || ('Km ' + (idx + 1)), col.posX + sOff.lap.x, rowY + sOff.lap.y);
            ctx.restore();
          } else if (col.key === 'pace' && !sOff.pace.hidden) {
            ctx.save();
            const pStyle = this.getSplitTelemetryStyle(config, widgetKey, idx, 'pace', isFastest ? elAccent : text, 'bold', cellFontSize);
            this.applyZDepth(ctx, pStyle.z);
            ctx.textAlign = col.align;
            ctx.fillStyle = pStyle.color;
            ctx.font = pStyle.font;
            const paceStr = it.paceFormatted ? it.paceFormatted.split(' ')[0] : (it.pace ? (Math.floor(it.pace / 60) + ':' + String(Math.floor(it.pace % 60)).padStart(2, '0')) : '--');
            ctx.fillText(paceStr, col.posX + pStyle.x, rowY + pStyle.y);
            ctx.restore();
          } else if (col.key === 'time') {
            ctx.save();
            const tStyle = this.getSplitTelemetryStyle(config, widgetKey, idx, 'time', text, '500', cellFontSize);
            this.applyZDepth(ctx, tStyle.z);
            ctx.textAlign = col.align;
            ctx.fillStyle = tStyle.color;
            ctx.font = tStyle.font;
            let timeStr = it.timeFormatted || it.durationFormatted;
            if (!timeStr && it.duration) {
              const m = Math.floor(it.duration / 60);
              const s = Math.floor(it.duration % 60);
              timeStr = `${m}:${String(s).padStart(2, '0')}`;
            }
            ctx.fillText(timeStr || '--', col.posX + tStyle.x, rowY + tStyle.y);
            ctx.restore();
          } else if (col.key === 'delta') {
            ctx.save();
            let deltaStr = it.deltaFormatted;
            if (!deltaStr && it.pace) {
              const basePace = activity.avgPace || (items.reduce((acc, s) => acc + (s.pace || 0), 0) / (items.length || 1));
              if (basePace > 0) {
                const diff = Math.round(it.pace - basePace);
                deltaStr = (diff > 0 ? '+' : '') + diff + 's';
              }
            }
            if (!deltaStr) deltaStr = '--';
            const defDeltaColor = deltaStr.startsWith('-') ? (elAccent || '#10b981') : (isFastest ? elAccent : textMuted);
            const dStyle = this.getSplitTelemetryStyle(config, widgetKey, idx, 'delta', defDeltaColor, 'bold', cellFontSize);
            this.applyZDepth(ctx, dStyle.z);
            ctx.textAlign = col.align;
            ctx.fillStyle = dStyle.color;
            ctx.font = dStyle.font;
            ctx.fillText(deltaStr, col.posX + dStyle.x, rowY + dStyle.y);
            ctx.restore();
          } else if (col.key === 'avgHr') {
            ctx.save();
            const hrStyle = this.getSplitTelemetryStyle(config, widgetKey, idx, 'avgHr', text, '500', cellFontSize);
            this.applyZDepth(ctx, hrStyle.z);
            ctx.textAlign = col.align;
            ctx.fillStyle = hrStyle.color;
            ctx.font = hrStyle.font;
            const hr = it.avgHr || it.hr || it.heartRate;
            ctx.fillText(hr ? `${Math.round(hr)}` : '--', col.posX + hrStyle.x, rowY + hrStyle.y);
            ctx.restore();
          } else if (col.key === 'maxHr') {
            ctx.save();
            const mHrStyle = this.getSplitTelemetryStyle(config, widgetKey, idx, 'maxHr', text, '500', cellFontSize);
            this.applyZDepth(ctx, mHrStyle.z);
            ctx.textAlign = col.align;
            ctx.fillStyle = mHrStyle.color;
            ctx.font = mHrStyle.font;
            const maxH = it.maxHr ? Math.round(it.maxHr) : (it.avgHr ? Math.round(it.avgHr * 1.08) : null);
            ctx.fillText(maxH ? `${maxH}` : '--', col.posX + mHrStyle.x, rowY + mHrStyle.y);
            ctx.restore();
          } else if (col.key === 'minHr') {
            ctx.save();
            const minHrStyle = this.getSplitTelemetryStyle(config, widgetKey, idx, 'minHr', text, '500', cellFontSize);
            this.applyZDepth(ctx, minHrStyle.z);
            ctx.textAlign = col.align;
            ctx.fillStyle = minHrStyle.color;
            ctx.font = minHrStyle.font;
            const minH = it.minHr ? Math.round(it.minHr) : (it.avgHr ? Math.round(it.avgHr * 0.9) : null);
            ctx.fillText(minH ? `${minH}` : '--', col.posX + minHrStyle.x, rowY + minHrStyle.y);
            ctx.restore();
          } else if (col.key === 'cadence') {
            ctx.save();
            const cadStyle = this.getSplitTelemetryStyle(config, widgetKey, idx, 'cadence', text, '500', cellFontSize);
            this.applyZDepth(ctx, cadStyle.z);
            ctx.textAlign = col.align;
            ctx.fillStyle = cadStyle.color;
            ctx.font = cadStyle.font;
            const cad = it.avgCadence || it.cadence || it.cad;
            ctx.fillText(cad ? `${Math.round(cad)}` : '--', col.posX + cadStyle.x, rowY + cadStyle.y);
            ctx.restore();
          } else if (col.key === 'elevation') {
            ctx.save();
            const elevStyle = this.getSplitTelemetryStyle(config, widgetKey, idx, 'elevation', text, '500', cellFontSize);
            this.applyZDepth(ctx, elevStyle.z);
            ctx.textAlign = col.align;
            ctx.fillStyle = elevStyle.color;
            ctx.font = elevStyle.font;
            let elevStr = '--';
            if (it.elevationGain != null && it.elevationGain !== 0) {
              const val = isImp ? Math.round(it.elevationGain * 3.28084) : Math.round(it.elevationGain);
              elevStr = `+${val}${isImp ? 'ft' : 'm'}`;
            } else if (it.elevationLoss != null && it.elevationLoss !== 0) {
              const val = isImp ? Math.round(it.elevationLoss * 3.28084) : Math.round(it.elevationLoss);
              elevStr = `-${val}${isImp ? 'ft' : 'm'}`;
            } else if (it.elevation != null) {
              const val = isImp ? Math.round(it.elevation * 3.28084) : Math.round(it.elevation);
              elevStr = `${val}${isImp ? 'ft' : 'm'}`;
            }
            ctx.fillText(elevStr, col.posX + elevStyle.x, rowY + elevStyle.y);
            ctx.restore();
          }
        });
      });

      ctx.restore();
      return y + chartH;
    }

    if (design === 'split-bubbles') {
      const bubbleAreaW = width - padX * 2;
      const countB = visibleSplits.length;
      const gapB = countB > 1 ? bubbleAreaW / (countB - 1) : 0;
      const midY = y + 44 + (chartH - 50) / 2;

      visibleSplits.forEach((it, idx) => {
        const sOff = this.getSplitItemOffsets(config, widgetKey, idx);
        if (sOff.split.hidden) return;
        const bx = x + padX + idx * gapB + sOff.split.x;
        const by = midY + sOff.split.y;
        const isFastest = it.isFastest && showFastest;

        if (!sOff.bar.hidden) {
          ctx.save();
          this.applyZDepth(ctx, sOff.bar.z);
          ctx.beginPath();
          ctx.arc(bx + sOff.bar.x, by + sOff.bar.y, isFastest ? 18 : 14, 0, Math.PI * 2);
          ctx.fillStyle = sOff.bar.color !== 'default' ? sOff.bar.color : (isFastest ? elAccent : 'rgba(255, 255, 255, 0.08)');
          ctx.fill();
          ctx.strokeStyle = isFastest ? '#ffffff' : 'rgba(255, 255, 255, 0.15)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
        }

        if (!sOff.lap.hidden) {
          ctx.save();
          this.applyZDepth(ctx, sOff.lap.z);
          ctx.textAlign = 'center';
          ctx.fillStyle = sOff.lap.color !== 'default' ? sOff.lap.color : textMuted;
          ctx.font = this.getSplitFont(config, widgetKey, idx, 'lap', 'bold', 9);
          ctx.fillText(it.shortName, bx + sOff.lap.x, by - 22 + sOff.lap.y);
          ctx.restore();
        }

        if (!sOff.pace.hidden) {
          ctx.save();
          this.applyZDepth(ctx, sOff.pace.z);
          ctx.textAlign = 'center';
          ctx.fillStyle = sOff.pace.color !== 'default' ? sOff.pace.color : (isFastest ? '#000000' : text);
          ctx.font = this.getSplitFont(config, widgetKey, idx, 'pace', 'bold', 10);
          ctx.fillText(it.paceFormatted.split(' ')[0], bx + sOff.pace.x, by + 4 + sOff.pace.y);
          ctx.restore();
        }
      });

      ctx.restore();
      return y + chartH;
    }

    if (design === 'vertical-split-cards') {
      const cardGap = count > 15 ? 4 : 6;
      const countCards = count;
      const singleH = Math.max(18, Math.floor((chartH - 45 - (countCards - 1) * cardGap) / countCards));

      visibleSplits.forEach((it, idx) => {
        const sOff = this.getSplitItemOffsets(config, widgetKey, idx);
        if (sOff.split.hidden) return;
        const cx = x + padX + sOff.split.x;
        const cy = y + 40 + idx * (singleH + cardGap) + sOff.split.y;
        const isFastest = it.isFastest && showFastest;

        if (!sOff.bar.hidden) {
          ctx.save();
          this.applyZDepth(ctx, sOff.bar.z);
          this.drawRoundedRect(ctx, cx + sOff.bar.x, cy + sOff.bar.y, width - padX * 2, singleH, 6);
          ctx.fillStyle = sOff.bar.color !== 'default' ? sOff.bar.color : (isFastest ? 'rgba(204, 255, 0, 0.12)' : 'rgba(255, 255, 255, 0.05)');
          ctx.fill();
          ctx.strokeStyle = isFastest ? elAccent : 'rgba(255, 255, 255, 0.08)';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.restore();
        }

        if (!sOff.lap.hidden) {
          ctx.save();
          this.applyZDepth(ctx, sOff.lap.z);
          ctx.textAlign = 'left';
          ctx.fillStyle = sOff.lap.color !== 'default' ? sOff.lap.color : textMuted;
          ctx.font = this.getSplitFont(config, widgetKey, idx, 'lap', 'bold', 11);
          ctx.fillText(`SPLIT ${it.shortName}`, cx + 12 + sOff.lap.x, cy + singleH / 2 + 4 + sOff.lap.y);
          ctx.restore();
        }

        if (!sOff.pace.hidden) {
          ctx.save();
          this.applyZDepth(ctx, sOff.pace.z);
          ctx.textAlign = 'right';
          ctx.fillStyle = sOff.pace.color !== 'default' ? sOff.pace.color : (isFastest ? elAccent : text);
          ctx.font = this.getSplitFont(config, widgetKey, idx, 'pace', 'bold', 12);
          ctx.fillText(`${it.paceFormatted.split(' ')[0]} /km`, cx + width - padX * 2 - 12 + sOff.pace.x, cy + singleH / 2 + 4 + sOff.pace.y);
          ctx.restore();
        }
      });

      ctx.restore();
      return y + chartH;
    }

    if (design === 'split-ladder-timeline') {
      const countT = count;
      const rowH = Math.max(14, Math.floor((chartH - 45) / countT));
      const axisX = x + padX + 24;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(axisX, y + 42);
      ctx.lineTo(axisX, y + 42 + countT * rowH - 8);
      ctx.stroke();

      visibleSplits.forEach((it, idx) => {
        const sOff = this.getSplitItemOffsets(config, widgetKey, idx);
        if (sOff.split.hidden) return;
        const nodeY = y + 42 + idx * rowH + rowH / 2 + sOff.split.y;
        const isFastest = it.isFastest && showFastest;

        if (!sOff.bar.hidden) {
          ctx.save();
          this.applyZDepth(ctx, sOff.bar.z);
          ctx.beginPath();
          ctx.arc(axisX + sOff.bar.x, nodeY + sOff.bar.y, isFastest ? 5 : 3.5, 0, Math.PI * 2);
          ctx.fillStyle = sOff.bar.color !== 'default' ? sOff.bar.color : (isFastest ? elAccent : 'rgba(255, 255, 255, 0.4)');
          ctx.fill();
          ctx.restore();
        }

        if (!sOff.lap.hidden) {
          ctx.save();
          this.applyZDepth(ctx, sOff.lap.z);
          ctx.textAlign = 'left';
          ctx.fillStyle = sOff.lap.color !== 'default' ? sOff.lap.color : textMuted;
          ctx.font = this.getSplitFont(config, widgetKey, idx, 'lap', 'bold', 11);
          ctx.fillText(it.shortName, axisX + 16 + sOff.lap.x, nodeY - 2 + sOff.lap.y);
          ctx.restore();
        }

        if (!sOff.pace.hidden) {
          ctx.save();
          this.applyZDepth(ctx, sOff.pace.z);
          ctx.textAlign = 'right';
          ctx.fillStyle = sOff.pace.color !== 'default' ? sOff.pace.color : (isFastest ? elAccent : text);
          ctx.font = this.getSplitFont(config, widgetKey, idx, 'pace', 'bold', 12);
          ctx.fillText(`${it.paceFormatted.split(' ')[0]} /km`, x + width - padX - 8 + sOff.pace.x, nodeY - 2 + sOff.pace.y);
          ctx.restore();
        }
      });

      ctx.restore();
      return y + chartH;
    }

    if (design === 'compact-dot-matrix') {
      const dotW = (width - padX * 2) / count;
      const midY = y + 42 + (chartH - 45) / 2;

      visibleSplits.forEach((it, idx) => {
        const sOff = this.getSplitItemOffsets(config, widgetKey, idx);
        if (sOff.split.hidden) return;
        const cx = x + padX + idx * dotW + dotW / 2 + sOff.split.x;
        const cy = midY + sOff.split.y;
        const isFastest = it.isFastest && showFastest;

        if (!sOff.bar.hidden) {
          ctx.save();
          this.applyZDepth(ctx, sOff.bar.z);
          this.drawRoundedRect(ctx, cx - 12 + sOff.bar.x, cy - 14 + sOff.bar.y, 24, 28, 4);
          ctx.fillStyle = sOff.bar.color !== 'default' ? sOff.bar.color : (isFastest ? elAccent : 'rgba(255, 255, 255, 0.08)');
          ctx.fill();
          ctx.restore();
        }

        if (!sOff.lap.hidden) {
          ctx.save();
          this.applyZDepth(ctx, sOff.lap.z);
          ctx.textAlign = 'center';
          ctx.fillStyle = sOff.lap.color !== 'default' ? sOff.lap.color : textMuted;
          ctx.font = this.getSplitFont(config, widgetKey, idx, 'lap', 'bold', 9);
          ctx.fillText(it.shortName, cx + sOff.lap.x, cy - 20 + sOff.lap.y);
          ctx.restore();
        }

        if (!sOff.pace.hidden) {
          ctx.save();
          this.applyZDepth(ctx, sOff.pace.z);
          ctx.textAlign = 'center';
          ctx.fillStyle = sOff.pace.color !== 'default' ? sOff.pace.color : (isFastest ? '#000000' : text);
          ctx.font = this.getSplitFont(config, widgetKey, idx, 'pace', 'bold', 9);
          ctx.fillText(it.paceFormatted.split(' ')[0], cx + sOff.pace.x, cy + 4 + sOff.pace.y);
          ctx.restore();
        }
      });

      ctx.restore();
      return y + chartH;
    }

    if (design === 'neon-speed-wave') {
      // Style: Neon Speed Wave (Continuous Area Curve & Split Nodes)
      const countW = visibleSplits.length;
      const stepX = (width - padX * 2) / Math.max(1, countW - 1);
      const waveAreaY = y + 46;
      const waveAreaH = chartH - 72;

      let minP = Infinity, maxP = 0;
      visibleSplits.forEach((it) => {
        if (it.pace > 0) {
          if (it.pace < minP) minP = it.pace;
          if (it.pace > maxP) maxP = it.pace;
        }
      });
      if (minP === Infinity) minP = 240;
      if (maxP <= minP) maxP = minP + 60;

      const getWaveY = (pace) => {
        const norm = Math.max(0.15, Math.min(0.95, 1 - (pace - minP) / (maxP - minP || 1)));
        return waveAreaY + waveAreaH * (1 - norm);
      };

      // Draw continuous gradient area
      ctx.save();
      const grad = ctx.createLinearGradient(0, waveAreaY, 0, waveAreaY + waveAreaH);
      grad.addColorStop(0, elAccent || '#00f0ff');
      grad.addColorStop(1, 'rgba(0, 240, 255, 0.02)');

      ctx.beginPath();
      ctx.moveTo(x + padX, waveAreaY + waveAreaH);
      visibleSplits.forEach((it, idx) => {
        const px = x + padX + idx * stepX;
        const py = getWaveY(it.pace);
        ctx.lineTo(px, py);
      });
      ctx.lineTo(x + width - padX, waveAreaY + waveAreaH);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.28;
      ctx.fill();
      ctx.globalAlpha = 1.0;

      // Stroke curve
      ctx.beginPath();
      visibleSplits.forEach((it, idx) => {
        const px = x + padX + idx * stepX;
        const py = getWaveY(it.pace);
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.strokeStyle = elAccent;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Nodes & Labels
      visibleSplits.forEach((it, idx) => {
        const sOff = this.getSplitItemOffsets(config, widgetKey, idx);
        if (sOff.split.hidden) return;
        const px = x + padX + idx * stepX + sOff.split.x;
        const py = getWaveY(it.pace) + sOff.split.y;
        const isFastest = it.isFastest && showFastest;

        if (!sOff.bar.hidden) {
          ctx.save();
          this.applyZDepth(ctx, sOff.bar.z);
          ctx.beginPath();
          ctx.arc(px + sOff.bar.x, py + sOff.bar.y, isFastest ? 6 : 4, 0, Math.PI * 2);
          ctx.fillStyle = isFastest ? '#ffffff' : (cardStyle === 'solid' ? '#0d1117' : 'rgba(13, 17, 23, 0.9)');
          ctx.fill();
          ctx.strokeStyle = isFastest ? elAccent : '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
        }

        if (!sOff.lap.hidden) {
          ctx.save();
          this.applyZDepth(ctx, sOff.lap.z);
          ctx.textAlign = 'center';
          ctx.fillStyle = sOff.lap.color !== 'default' ? sOff.lap.color : (isFastest ? elAccent : textMuted);
          ctx.font = this.getSplitFont(config, widgetKey, idx, 'lap', 'bold', 9);
          ctx.fillText(it.shortName, px + sOff.lap.x, waveAreaY + waveAreaH + 16 + sOff.lap.y);
          ctx.restore();
        }

        if (!sOff.pace.hidden && (countW <= 12 || isFastest || idx === 0 || idx === countW - 1)) {
          ctx.save();
          this.applyZDepth(ctx, sOff.pace.z);
          ctx.textAlign = 'center';
          ctx.fillStyle = sOff.pace.color !== 'default' ? sOff.pace.color : (isFastest ? elAccent : text);
          ctx.font = this.getSplitFont(config, widgetKey, idx, 'pace', 'bold', 9.5);
          ctx.fillText(it.paceFormatted.split(' ')[0], px + sOff.pace.x, py - 10 + sOff.pace.y);
          ctx.restore();
        }
      });

      ctx.restore();
      return y + chartH;
    }

    if (design === 'minimal-dot-timeline') {
      // Style: Horizontal Pulse Track (Stepped Beads & Fastest Pill)
      const countT = visibleSplits.length;
      const trackY = y + 44 + (chartH - 60) / 2;
      const stepT = (width - padX * 2) / Math.max(1, countT - 1);

      // Baseline track wire
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + padX, trackY);
      ctx.lineTo(x + width - padX, trackY);
      ctx.stroke();

      visibleSplits.forEach((it, idx) => {
        const sOff = this.getSplitItemOffsets(config, widgetKey, idx);
        if (sOff.split.hidden) return;
        const bx = x + padX + idx * stepT + sOff.split.x;
        const isFastest = it.isFastest && showFastest;

        if (!sOff.bar.hidden) {
          ctx.save();
          this.applyZDepth(ctx, sOff.bar.z);
          const beadR = isFastest ? 8 : 5;
          ctx.beginPath();
          ctx.arc(bx + sOff.bar.x, trackY + sOff.bar.y, beadR, 0, Math.PI * 2);
          ctx.fillStyle = isFastest ? elAccent : 'rgba(255, 255, 255, 0.6)';
          if (isFastest) {
            ctx.shadowColor = elAccent;
            ctx.shadowBlur = 10;
          }
          ctx.fill();
          ctx.restore();
        }

        if (!sOff.lap.hidden) {
          ctx.save();
          this.applyZDepth(ctx, sOff.lap.z);
          ctx.textAlign = 'center';
          ctx.fillStyle = sOff.lap.color !== 'default' ? sOff.lap.color : textMuted;
          ctx.font = this.getSplitFont(config, widgetKey, idx, 'lap', 'bold', 9);
          ctx.fillText(it.shortName, bx + sOff.lap.x, trackY + 18 + sOff.lap.y);
          ctx.restore();
        }

        if (!sOff.pace.hidden && (countT <= 14 || isFastest)) {
          ctx.save();
          this.applyZDepth(ctx, sOff.pace.z);
          ctx.textAlign = 'center';
          ctx.fillStyle = sOff.pace.color !== 'default' ? sOff.pace.color : (isFastest ? elAccent : text);
          ctx.font = this.getSplitFont(config, widgetKey, idx, 'pace', 'bold', 9);
          ctx.fillText(it.paceFormatted.split(' ')[0], bx + sOff.pace.x, trackY - 14 + sOff.pace.y);
          ctx.restore();
        }
      });

      ctx.restore();
      return y + chartH;
    }

    if (design === 'horizontal-bars') {
      const isAnim = activity.isAnimated && items.some((it) => it.isCompleted !== undefined);
      const countH = items.length;
      const rowH = Math.max(12, Math.min(26, Math.floor((chartH - 45) / countH)));
      const startY = y + 40;

      const defaultCols = { split: true, time: true, pace: true, delta: true, avgHr: true, maxHr: false, minHr: false, cadence: false, elevation: true };
      const splitCols = { ...defaultCols, ...(config.splitColumns || {}) };
      const isImp = activity.distanceUnit === 'mi';

      let minPace = Infinity, maxPace = 0;
      items.forEach((it) => {
        if (it.pace > 0) {
          if (it.pace < minPace) minPace = it.pace;
          if (it.pace > maxPace) maxPace = it.pace;
        }
      });
      if (minPace === Infinity) minPace = 240;
      if (maxPace <= minPace) maxPace = minPace + 60;

      // 1. Define active telemetry column tracks in preferred inline order
      const candidateCols = [
        { key: 'pace', isPace: true },
        { key: 'avgHr', isHr: true },
        { key: 'maxHr' },
        { key: 'minHr' },
        { key: 'time' },
        { key: 'delta', isDelta: true },
        { key: 'cadence' },
        { key: 'elevation' }
      ];
      const activeCols = candidateCols.filter((c) => splitCols[c.key] !== false);

      // 2. Precompute text for each column across all items and determine fixed column widths
      activeCols.forEach((col) => {
        col.itemTexts = items.map((it) => {
          if (col.key === 'pace') {
            const paceVal = it.paceFormatted ? it.paceFormatted.split(' ')[0] : (it.pace ? (Math.floor(it.pace / 60) + ':' + String(Math.floor(it.pace % 60)).padStart(2, '0')) : '--');
            const unit = isImp ? '/mi' : '/km';
            return `${paceVal} ${unit}`;
          }
          if (col.key === 'avgHr') {
            const hr = it.avgHr || it.hr || it.heartRate;
            return hr ? `♥ ${Math.round(hr)}` : '--';
          }
          if (col.key === 'maxHr') {
            const mHr = it.maxHr ? Math.round(it.maxHr) : (it.avgHr ? Math.round(it.avgHr * 1.08) : null);
            return mHr ? `↑${mHr}` : '--';
          }
          if (col.key === 'minHr') {
            const minH = it.minHr ? Math.round(it.minHr) : (it.avgHr ? Math.round(it.avgHr * 0.9) : null);
            return minH ? `↓${minH}` : '--';
          }
          if (col.key === 'time') {
            let tStr = it.timeFormatted || it.durationFormatted;
            if (!tStr && it.duration) {
              const m = Math.floor(it.duration / 60);
              const s = Math.floor(it.duration % 60);
              tStr = `${m}:${String(s).padStart(2, '0')}`;
            }
            return tStr || '--';
          }
          if (col.key === 'delta') {
            let dStr = it.deltaFormatted;
            if (!dStr && it.pace) {
              const basePace = activity.avgPace || (items.reduce((acc, s) => acc + (s.pace || 0), 0) / (items.length || 1));
              if (basePace > 0) {
                const diff = Math.round(it.pace - basePace);
                dStr = (diff > 0 ? '+' : '') + diff + 's';
              }
            }
            return dStr || '--';
          }
          if (col.key === 'cadence') {
            const cad = it.avgCadence || it.cadence || it.cad;
            return cad ? `${Math.round(cad)} spm` : '--';
          }
          if (col.key === 'elevation') {
            let eStr = null;
            if (it.elevationGain != null && it.elevationGain !== 0) {
              const val = isImp ? Math.round(it.elevationGain * 3.28084) : Math.round(it.elevationGain);
              eStr = `+${val}${isImp ? 'ft' : 'm'}`;
            } else if (it.elevationLoss != null && it.elevationLoss !== 0) {
              const val = isImp ? Math.round(it.elevationLoss * 3.28084) : Math.round(it.elevationLoss);
              eStr = `-${val}${isImp ? 'ft' : 'm'}`;
            } else if (it.elevation != null) {
              const val = isImp ? Math.round(it.elevation * 3.28084) : Math.round(it.elevation);
              eStr = `${val}${isImp ? 'ft' : 'm'}`;
            }
            return eStr || '--';
          }
          return '--';
        });

        // Measure maximum text width for this column across all items
        let maxW = 0;
        items.forEach((it, idx) => {
          const cStyle = this.getSplitTelemetryStyle(config, widgetKey, idx, col.key, '#ffffff', col.isPace ? 'bold' : '600', 9.5);
          ctx.font = cStyle.font;
          const w = ctx.measureText(col.itemTexts[idx]).width;
          if (w > maxW) maxW = w;
        });
        const minW = col.isPace ? 58 : col.key === 'time' ? 44 : col.key === 'avgHr' ? 42 : 36;
        col.width = Math.max(minW, Math.ceil(maxW + 6));
      });

      // 3. Compute fixed right-aligned inline track positions
      const colGap = 8;
      const rightMarginX = x + width - padX;
      let curRightX = rightMarginX;
      for (let cIdx = activeCols.length - 1; cIdx >= 0; cIdx--) {
        const col = activeCols[cIdx];
        col.rightX = curRightX;
        col.startX = curRightX - col.width;
        curRightX -= (col.width + colGap);
      }

      const barStartX = x + padX + 32;
      const barEndX = activeCols.length > 0 ? (activeCols[0].startX - 10) : (x + width - padX);
      const maxBarW = Math.max(16, barEndX - barStartX);

      // 4. Render each split row with inline alignment
      items.forEach((it, idx) => {
        const sOff = this.getSplitItemOffsets(config, widgetKey, idx);
        if (sOff.split.hidden) return;
        const ry = startY + idx * rowH + sOff.split.y;
        const isFastest = it.isFastest && showFastest;

        // Lap / Split label on the left
        if (!sOff.lap.hidden) {
          ctx.save();
          this.applyZDepth(ctx, sOff.lap.z);
          ctx.textAlign = 'left';
          ctx.fillStyle = sOff.lap.color !== 'default' ? sOff.lap.color : textMuted;
          ctx.font = this.getSplitFont(config, widgetKey, idx, 'lap', 'bold', 10);
          ctx.fillText(it.shortName || `${idx + 1}`, x + padX + sOff.lap.x, ry + rowH / 2 + 4 + sOff.lap.y);
          ctx.restore();
        }

        // Horizontal progress bar
        if (!sOff.bar.hidden) {
          const paceNorm = Math.max(0.15, Math.min(1, 1 - (it.pace - minPace) / (maxPace - minPace || 1) * 0.75));
          const barW = maxBarW * paceNorm;
          ctx.save();
          this.applyZDepth(ctx, sOff.bar.z);
          this.drawRoundedRect(ctx, barStartX + sOff.bar.x, ry + 3 + sOff.bar.y, barW, rowH - 6, 3);
          ctx.fillStyle = sOff.bar.color !== 'default' ? sOff.bar.color : (isFastest ? elAccent : 'rgba(255, 255, 255, 0.45)');
          ctx.fill();
          ctx.restore();
        }

        // Telemetry readings arranged in neat, fixed inline columns
        activeCols.forEach((col) => {
          const textVal = col.itemTexts[idx];
          const defColor = col.isPace
            ? (isFastest ? elAccent : text)
            : (col.key === 'avgHr'
              ? '#f87171'
              : (col.key === 'delta'
                ? (textVal.startsWith('-') ? (elAccent || '#10b981') : (isFastest ? elAccent : textMuted))
                : textMuted));

          const colStyle = this.getSplitTelemetryStyle(config, widgetKey, idx, col.key, defColor, col.isPace ? 'bold' : '600', 9.5);
          if (!colStyle.hidden) {
            ctx.save();
            this.applyZDepth(ctx, colStyle.z);
            ctx.textAlign = 'right';
            ctx.fillStyle = colStyle.color;
            ctx.font = colStyle.font;
            ctx.fillText(textVal, col.rightX + colStyle.x, ry + rowH / 2 + 4 + colStyle.y);
            ctx.restore();
          }
        });
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

    const totalCount = items.length;
    const barGap = totalCount > 25 ? 2 : totalCount > 15 ? 4 : totalCount > 8 ? 6 : 10;
    const barW = Math.max(4, (barAreaW - barGap * (totalCount - 1)) / totalCount);
    const labelStep = totalCount > 24 ? 5 : totalCount > 14 ? 2 : 1;

    items.forEach((it, idx) => {
      const sOff = this.getSplitItemOffsets(config, widgetKey, idx);
      if (sOff.split.hidden) return;

      const bx = x + padX + idx * (barW + barGap) + sOff.split.x;
      const paceNorm = Math.max(0.2, Math.min(1, 1 - (it.pace - minPace) / (maxPace - minPace || 1) * 0.75));
      const fullBh = barAreaH * paceNorm;

      if (!sOff.bar.hidden) {
        ctx.save();
        this.applyZDepth(ctx, sOff.bar.z);
        if (isAnim && it.isPending) {
          const bh = Math.max(3, barAreaH * 0.08);
          const by = barAreaY + (barAreaH - bh) + sOff.split.y + sOff.bar.y;
          ctx.fillStyle = sOff.bar.color !== 'default' ? sOff.bar.color : 'rgba(255, 255, 255, 0.08)';
          this.drawRoundedRect(ctx, bx + sOff.bar.x, by, barW, bh, 3);
          ctx.fill();
        } else if (isAnim && it.isCurrent) {
          const ghostBy = barAreaY + (barAreaH - fullBh) + sOff.split.y + sOff.bar.y;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
          this.drawRoundedRect(ctx, bx + sOff.bar.x, ghostBy, barW, fullBh, 3);
          ctx.fill();

          const liveBh = Math.max(4, fullBh * (it.splitProgress || 0.1));
          const liveBy = barAreaY + (barAreaH - liveBh) + sOff.split.y + sOff.bar.y;
          ctx.fillStyle = sOff.bar.color !== 'default' ? sOff.bar.color : elAccent;
          ctx.shadowColor = elAccent;
          ctx.shadowBlur = 12;
          this.drawRoundedRect(ctx, bx + sOff.bar.x, liveBy, barW, liveBh, 3);
          ctx.fill();
        } else {
          const by = barAreaY + (barAreaH - fullBh) + sOff.split.y + sOff.bar.y;
          if (sOff.bar.color !== 'default') {
            ctx.fillStyle = sOff.bar.color;
          } else if (it.isFastest && showFastest) {
            ctx.fillStyle = elAccent;
            ctx.shadowColor = elAccent;
            ctx.shadowBlur = 8;
          } else {
            ctx.fillStyle = isAnim ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.45)';
          }
          this.drawRoundedRect(ctx, bx + sOff.bar.x, by, barW, fullBh, 3);
          ctx.fill();
        }
        ctx.restore();
      }

      const shouldShowLabel = (idx % labelStep === 0) || (it.isFastest && showFastest) || (idx === totalCount - 1) || (isAnim && it.isCurrent);
      if (shouldShowLabel && !sOff.lap.hidden) {
        ctx.save();
        this.applyZDepth(ctx, sOff.lap.z);
        ctx.textAlign = 'center';
        ctx.fillStyle = sOff.lap.color !== 'default' ? sOff.lap.color : ((isAnim && it.isCurrent) ? elAccent : ((it.isFastest && showFastest) ? elAccent : textMuted));
        ctx.font = this.getSplitFont(config, widgetKey, idx, 'lap', '600', 10);
        ctx.fillText(it.shortName, bx + barW / 2 + sOff.lap.x, barAreaY + barAreaH + 16 + sOff.split.y + sOff.lap.y);
        ctx.restore();
      }

      if (barW >= 24 && !sOff.pace.hidden) {
        let paceLabel = it.paceFormatted.split(' ')[0];
        if (isAnim && it.isPending) {
          paceLabel = '--';
        } else if (isAnim && it.isCurrent) {
          paceLabel = (it.displayPaceFormatted || it.paceFormatted).split(' ')[0];
        }

        const effectiveBy = isAnim && it.isCurrent ? (barAreaY + (barAreaH - Math.max(4, fullBh * (it.splitProgress || 0.1)))) : (barAreaY + (barAreaH - (isAnim && it.isPending ? Math.max(3, barAreaH * 0.08) : fullBh)));
        ctx.save();
        this.applyZDepth(ctx, sOff.pace.z);
        ctx.textAlign = 'center';
        ctx.fillStyle = sOff.pace.color !== 'default' ? sOff.pace.color : ((isAnim && it.isCurrent) ? elAccent : ((it.isFastest && showFastest) ? elAccent : text));
        ctx.font = this.getSplitFont(config, widgetKey, idx, 'pace', 'bold', 10);
        ctx.fillText(paceLabel, bx + barW / 2 + sOff.pace.x, effectiveBy - 6 + sOff.split.y + sOff.pace.y);
        ctx.restore();
      }
    });

    ctx.restore();
    return y + chartH;
  }

  // =========================================================================
  drawSplitHighlightCard(ctx, x, y, width, activity, config, theme, accent, customH = null, widgetKey = 'splitHighlight') {
    if (config && config.showWidgetSplitHighlight === false) return y;
    const offWidget = this.getElementOffset(config, widgetKey, 'widget');
    if (offWidget.hidden) return y;

    const isLapSource = config.splitDataSource === 'laps' && activity.hasLaps;
    const items = isLapSource ? activity.laps : activity.splits;

    if (!items || items.length === 0) return y;

    const showFastest = (config.splitHighlightFastest !== false) && (config.splitsShowFastest !== false);
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
    const rot = this.applyWidgetRotation(ctx, config, widgetKey, x, y, width, customH || 115);
    const elStyle = this.getElementStyle(config, widgetKey);
    const { text, textMuted, accent: elAccent, cardStyle, align, opacity } = this.getEffectiveColors(config, theme, accent, widgetKey);
    if (opacity < 1) ctx.globalAlpha = opacity;
    accent = elAccent;

    const font = this.getFontFamily(elStyle.fontFamily !== 'default' ? elStyle.fontFamily : config.fontFamily);
    const design = config.splitHighlightDesign || 'spotlight';
    const cardH = customH || 115;
    this.recordBounds(widgetKey, 'Split Highlight', x, y, width, cardH);
    this.drawWidgetCardBg(ctx, widgetKey, x, y, width, cardH, config, theme, true);

    const offBadge = this.getElementOffset(config, widgetKey, 'badge');
    const offVal = this.getElementOffset(config, widgetKey, 'val');
    const offTitle = this.getElementOffset(config, widgetKey, 'title');
    const offTime = this.getElementOffset(config, widgetKey, 'time');
    const offHr = this.getElementOffset(config, widgetKey, 'hr');

    const padX = 24;

    if (design === 'speed-record-banner') {
      // Speed Record Banner (Gold Metallic Champion Plaque with Laurel Stars)
      const bannerH = customH || 120;
      this.recordBounds(widgetKey, 'Split Highlight', x, y, width, bannerH);
      this.drawWidgetCardBg(ctx, widgetKey, x, y, width, bannerH, config, theme, true);

      // Metallic gold border accent line at the top
      ctx.save();
      const goldGrad = ctx.createLinearGradient(x, y, x + width, y);
      goldGrad.addColorStop(0, '#f59e0b');
      goldGrad.addColorStop(0.5, '#fef08a');
      goldGrad.addColorStop(1, '#d97706');
      ctx.fillStyle = goldGrad;
      ctx.fillRect(x + 12, y + 2, width - 24, 3);
      ctx.restore();

      const effAlign = this.getWidgetAlign(align, 'left');
      const isCenter = effAlign === 'center';
      const isRight = effAlign === 'right';

      // Left Icon & Record Badge
      if (!offBadge.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offBadge.z);
        const badgeX = isCenter ? x + width / 2 : (isRight ? x + width - padX : x + padX);
        ctx.textAlign = isCenter ? 'center' : (isRight ? 'right' : 'left');
        ctx.fillStyle = '#fbbf24';
        ctx.font = this.getSubPartFont(config, widgetKey, 'badge', 'bold', 12);
        ctx.letterSpacing = '1.5px';
        const defaultTag = isTargetLive
          ? `⚡ LIVE RECORD PACING • ${target.name.toUpperCase()}`
          : ((target.isFastest && showFastest) ? `🏆 RECORD SPLIT // ${target.name.toUpperCase()} ★★★` : `SPEED BANNER // ${target.name.toUpperCase()}`);
        const tag = this.getTextOverride(config, widgetKey, 'badge', defaultTag);
        ctx.fillText(tag, badgeX + offBadge.x, y + 32 + offBadge.y);
        ctx.restore();
      }

      // Massive Pace Numerals
      if (!offVal.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offVal.z);
        const valX = isCenter ? x + width / 2 : (isRight ? x + width - padX : x + padX);
        ctx.textAlign = isCenter ? 'center' : (isRight ? 'right' : 'left');
        ctx.fillStyle = '#ffffff';
        ctx.font = this.getSubPartFont(config, widgetKey, 'val', 'bold', 44);
        ctx.shadowColor = 'rgba(251, 191, 36, 0.45)';
        ctx.shadowBlur = 12;
        const valText = this.getTextOverride(config, widgetKey, 'val', targetPaceFormatted);
        ctx.fillText(valText, valX + offVal.x, y + 78 + offVal.y);
        ctx.restore();
      }

      // Subtitle / Label
      if (!offTitle.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offTitle.z);
        const titleX = isCenter ? x + width / 2 : (isRight ? x + padX : x + width - padX);
        ctx.textAlign = isCenter ? 'center' : (isRight ? 'left' : 'right');
        ctx.fillStyle = theme.text;
        ctx.font = this.getSubPartFont(config, widgetKey, 'title', 'bold', 13);
        const titleText = this.getTextOverride(config, widgetKey, 'title', target.name.toUpperCase());
        ctx.fillText(titleText, titleX + offTitle.x, (isCenter ? y + 98 : y + 36) + offTitle.y);
        ctx.restore();
      }

      // Split Time
      if (!offTime.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offTime.z);
        const timeX = isCenter ? x + width / 2 : (isRight ? x + padX : x + width - padX);
        ctx.textAlign = isCenter ? 'center' : (isRight ? 'left' : 'right');
        ctx.fillStyle = '#fbbf24';
        ctx.font = this.getSubPartFont(config, widgetKey, 'time', 'bold', 14);
        const timeText = this.getTextOverride(config, widgetKey, 'time', `⏱️ ${targetTimeFormatted}`);
        ctx.fillText(timeText, timeX + offTime.x, (isCenter ? y + 114 : y + 62) + offTime.y);
        ctx.restore();
      }

      // HR or Elevation
      if (!offHr.hidden && (target.avgHr || activity.avgHr || target.elevationGain !== undefined)) {
        ctx.save();
        this.applyZDepth(ctx, offHr.z);
        const hrX = isCenter ? x + width / 2 : (isRight ? x + padX : x + width - padX);
        ctx.textAlign = isCenter ? 'center' : (isRight ? 'left' : 'right');
        ctx.fillStyle = theme.textMuted;
        ctx.font = this.getSubPartFont(config, widgetKey, 'hr', '600', 12);
        const hrVal = isTargetLive && activity.liveHr ? activity.liveHr : (target.avgHr || activity.avgHr);
        const defaultStat = hrVal ? `❤️ ${hrVal} BPM` : `Gain: +${target.elevationGain || 0}m`;
        const hrText = this.getTextOverride(config, widgetKey, 'hr', defaultStat);
        if (!isCenter) {
          ctx.fillText(hrText, hrX + offHr.x, y + 84 + offHr.y);
        }
        ctx.restore();
      }

      ctx.restore();
      return y + bannerH;
    }

    if (design === 'minimal-focus-tag') {
      // Minimal Focus Tag (Swiss Monospace Badge with Vertical Color Bar)
      const tagH = customH || 105;
      this.recordBounds(widgetKey, 'Split Highlight', x, y, width, tagH);
      this.drawWidgetCardBg(ctx, widgetKey, x, y, width, tagH, config, theme, true);

      // Left vertical accent bar
      ctx.save();
      ctx.fillStyle = accent;
      this.drawRoundedRect(ctx, x + 8, y + 12, 4, tagH - 24, 2);
      ctx.fill();
      ctx.restore();

      const effAlign = this.getWidgetAlign(align, 'left');
      const isCenter = effAlign === 'center';
      const isRight = effAlign === 'right';

      const contentPad = padX + 8;

      if (!offBadge.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offBadge.z);
        const bX = isCenter ? x + width / 2 : (isRight ? x + width - contentPad : x + contentPad);
        ctx.textAlign = isCenter ? 'center' : (isRight ? 'right' : 'left');
        ctx.fillStyle = accent;
        ctx.font = this.getSubPartFont(config, widgetKey, 'badge', '600', 11);
        ctx.letterSpacing = '1px';
        const defaultTag = isTargetLive
          ? `LIVE // ${target.name.toUpperCase()}`
          : ((target.isFastest && showFastest) ? `TOP SPLIT // ${target.name.toUpperCase()}` : `FOCUS // ${target.name.toUpperCase()}`);
        const tag = this.getTextOverride(config, widgetKey, 'badge', defaultTag);
        ctx.fillText(tag, bX + offBadge.x, y + 30 + offBadge.y);
        ctx.restore();
      }

      if (!offVal.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offVal.z);
        const vX = isCenter ? x + width / 2 : (isRight ? x + width - contentPad : x + contentPad);
        ctx.textAlign = isCenter ? 'center' : (isRight ? 'right' : 'left');
        ctx.fillStyle = '#ffffff';
        ctx.font = this.getSubPartFont(config, widgetKey, 'val', 'bold', 38);
        const valText = this.getTextOverride(config, widgetKey, 'val', targetPaceFormatted);
        ctx.fillText(valText, vX + offVal.x, y + 74 + offVal.y);
        ctx.restore();
      }

      if (!offTime.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offTime.z);
        const tX = isCenter ? x + width / 2 : (isRight ? x + contentPad : x + width - contentPad);
        ctx.textAlign = isCenter ? 'center' : (isRight ? 'left' : 'right');
        ctx.fillStyle = theme.textMuted;
        ctx.font = this.getSubPartFont(config, widgetKey, 'time', 'bold', 13);
        const timeText = this.getTextOverride(config, widgetKey, 'time', targetTimeFormatted);
        ctx.fillText(timeText, tX + offTime.x, (isCenter ? y + 96 : y + 42) + offTime.y);
        ctx.restore();
      }

      if (!offHr.hidden && (target.avgHr || activity.avgHr || target.elevationGain !== undefined)) {
        ctx.save();
        this.applyZDepth(ctx, offHr.z);
        const hX = isCenter ? x + width / 2 : (isRight ? x + contentPad : x + width - contentPad);
        ctx.textAlign = isCenter ? 'center' : (isRight ? 'left' : 'right');
        ctx.fillStyle = '#f87171';
        ctx.font = this.getSubPartFont(config, widgetKey, 'hr', '600', 12);
        const hrVal = isTargetLive && activity.liveHr ? activity.liveHr : (target.avgHr || activity.avgHr);
        const defaultStat = hrVal ? `${hrVal} BPM` : `+${target.elevationGain || 0}m`;
        const hrText = this.getTextOverride(config, widgetKey, 'hr', defaultStat);
        if (!isCenter) {
          ctx.fillText(hrText, hX + offHr.x, y + 68 + offHr.y);
        }
        ctx.restore();
      }

      ctx.restore();
      return y + tagH;
    }

    if (design === 'centered-trophy-card') {
      // Centered Trophy Card (Golden Halo & Fast Split Badge)
      const trophyH = customH || 130;
      this.recordBounds(widgetKey, 'Split Highlight', x, y, width, trophyH);
      const effAlign = this.getWidgetAlign(align, 'center');
      const cx = this.getAlignX(effAlign, x, width, 24, 'center');

      this.drawRoundedRect(ctx, x, y, width, trophyH, 20);
      ctx.fillStyle = cardStyle === 'solid' ? '#14141e' : 'rgba(16, 20, 32, 0.9)';
      ctx.fill();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Top Icon Halo
      if (!offBadge.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offBadge.z);
        ctx.textAlign = 'center';
        ctx.font = '24px sans-serif';
        ctx.fillText(isTargetLive ? '🏃' : '🏆', cx + offBadge.x, y + 30 + offBadge.y);

        ctx.fillStyle = '#fbbf24';
        ctx.font = this.getSubPartFont(config, widgetKey, 'badge', 'bold', 11);
        ctx.letterSpacing = '1px';
        const defaultTag = isTargetLive
          ? `LIVE INTERVAL • ${target.name.toUpperCase()}`
          : ((target.isFastest && showFastest) ? `FASTEST SPLIT // ${target.name.toUpperCase()}` : `SPOTLIGHT // ${target.name.toUpperCase()}`);
        const tag = this.getTextOverride(config, widgetKey, 'badge', defaultTag);
        ctx.fillText(tag, cx + offBadge.x, y + 48 + offBadge.y);
        ctx.restore();
      }

      // Massive Centered Pace
      if (!offVal.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offVal.z);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.font = this.getSubPartFont(config, widgetKey, 'val', 'bold', 42);
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 10;
        const valText = this.getTextOverride(config, widgetKey, 'val', targetPaceFormatted);
        ctx.fillText(valText, cx + offVal.x, y + 88 + offVal.y);
        ctx.restore();
      }

      // Bottom centered sub-stats pill
      ctx.save();
      const timeStr = this.getTextOverride(config, widgetKey, 'time', `⏱️ ${targetTimeFormatted}`);
      const hrVal = isTargetLive && activity.liveHr ? activity.liveHr : (target.avgHr || activity.avgHr);
      const hrStr = (target.avgHr || activity.avgHr) ? this.getTextOverride(config, widgetKey, 'hr', `❤️ ${hrVal} BPM`) : '';
      const subInfo = hrStr ? `${timeStr}   •   ${hrStr}` : timeStr;
      ctx.textAlign = 'center';
      ctx.fillStyle = textMuted;
      ctx.font = this.getSubPartFont(config, widgetKey, 'time', 'bold', 12);
      ctx.fillText(subInfo, cx, y + 112);
      ctx.restore();

      ctx.restore();
      return y + trophyH;
    }

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
        ctx.font = this.getSubPartFont(config, widgetKey, 'badge', 'bold', 12);
        const defaultBadge = isTargetLive
          ? `★ LIVE SPLIT • ${target.name.toUpperCase()} (${Math.round((target.splitProgress || 0) * 100)}%) ★`
          : `★ PODIUM SPLIT • ${target.name.toUpperCase()} ★`;
        const badgeText = this.getTextOverride(config, widgetKey, 'badge', defaultBadge);
        ctx.fillText(badgeText, x + padX + 60 + offBadge.x, y + 36 + offBadge.y);
        ctx.restore();
      }

      if (!offVal.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offVal.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        ctx.font = this.getSubPartFont(config, widgetKey, 'val', 'bold', 42);
        const valText = this.getTextOverride(config, widgetKey, 'val', targetPaceFormatted);
        ctx.fillText(valText, x + padX + 60 + offVal.x, y + 80 + offVal.y);
        ctx.restore();
      }

      if (!offTime.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offTime.z);
        ctx.textAlign = 'right';
        ctx.fillStyle = theme.textMuted;
        ctx.font = this.getSubPartFont(config, widgetKey, 'time', 'bold', 14);
        const timeText = this.getTextOverride(config, widgetKey, 'time', `TIME: ${targetTimeFormatted}`);
        ctx.fillText(timeText, x + width - padX + offTime.x, y + 54 + offTime.y);
        ctx.restore();
      }

      if ((target.avgHr || activity.avgHr) && !offHr.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offHr.z);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#ef4444';
        ctx.font = this.getSubPartFont(config, widgetKey, 'hr', 'bold', 14);
        const hrVal = isTargetLive && activity.liveHr ? activity.liveHr : (target.avgHr || activity.avgHr);
        const hrText = this.getTextOverride(config, widgetKey, 'hr', `HR: ${hrVal} BPM`);
        ctx.fillText(hrText, x + width - padX + offHr.x, y + 78 + offHr.y);
        ctx.restore();
      }

      ctx.restore();
      return y + cardH;
    }


    if (design === 'trophy-cup') {
      // Style: Trophy Podium Banner (Gold Ribbon & Fast Split)
      ctx.save();
      if (!offBadge.hidden) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = '36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(isTargetLive ? '🏃' : '🏆', x + padX + 24 + offBadge.x, y + 68 + offBadge.y);
      }

      const defaultTrophyBanner = isTargetLive ? 'LIVE INTERVAL IN PROGRESS' : 'CHAMPION INTERVAL';
      const trophyBanner = this.getTextOverride(config, widgetKey, 'trophyBanner', defaultTrophyBanner);
      const offTrophy = this.getElementOffset(config, widgetKey, 'trophyBanner');
      if (!offTrophy.hidden && trophyBanner) {
        ctx.textAlign = 'left';
        ctx.fillStyle = '#fbbf24';
        ctx.font = this.getSubPartFont(config, widgetKey, 'trophyBanner', 'bold', 12);
        ctx.letterSpacing = '1px';
        ctx.fillText(trophyBanner, x + padX + 64 + offTrophy.x, y + 38 + offTrophy.y);
      }

      if (!offTitle.hidden) {
        ctx.fillStyle = text;
        ctx.font = this.getSubPartFont(config, widgetKey, 'title', 'bold', 20);
        ctx.fillText(`${target.name} (${target.shortName})`, x + padX + 64 + offTitle.x, y + 64 + offTitle.y);
      }

      if (!offVal.hidden) {
        ctx.textAlign = 'right';
        ctx.fillStyle = elAccent;
        ctx.font = this.getSubPartFont(config, widgetKey, 'val', 'bold', 32);
        ctx.fillText(targetPaceFormatted.split(' ')[0], x + width - padX + offVal.x, y + 64 + offVal.y);

        ctx.fillStyle = textMuted;
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(targetPaceFormatted.split(' ')[1] || '/KM', x + width - padX + offVal.x, y + 84 + offVal.y);
      }

      ctx.restore();
      ctx.restore();
      return y + cardH;
    }

    if (design === 'split-terminal') {
      // Style: Digital Split Terminal (Monospace Code Prompt)
      ctx.save();
      const defaultTermPrompt = isTargetLive ? `> EXEC: LIVE_SEGMENT_TELEMETRY` : `> EXEC: FASTEST_INTERVAL_QUERY`;
      const termPrompt = this.getTextOverride(config, widgetKey, 'termPrompt', defaultTermPrompt);
      const offTerm = this.getElementOffset(config, widgetKey, 'termPrompt');
      if (!offTerm.hidden && termPrompt) {
        ctx.textAlign = 'left';
        ctx.fillStyle = elAccent;
        ctx.font = 'bold 11px monospace';
        ctx.fillText(termPrompt, x + padX + offTerm.x, y + 32 + offTerm.y);
      }

      if (!offTitle.hidden) {
        ctx.fillStyle = text;
        ctx.font = this.getSubPartFont(config, widgetKey, 'title', 'bold', 20);
        ctx.fillText(`TARGET: [ ${target.shortName} ] // ${targetTimeFormatted}`, x + padX + offTitle.x, y + 62 + offTitle.y);

        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`PACE_TELEMETRY: ${targetPaceFormatted}`, x + padX + offTitle.x, y + 84 + offTitle.y);
      }

      if (!offVal.hidden) {
        ctx.textAlign = 'right';
        ctx.fillStyle = elAccent;
        ctx.font = this.getSubPartFont(config, widgetKey, 'val', 'bold', 34);
        ctx.fillText(targetPaceFormatted.split(' ')[0], x + width - padX + offVal.x, y + 70 + offVal.y);
      }

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
        ctx.font = this.getSubPartFont(config, widgetKey, 'title', 'bold', 14);
        const titleText = this.getTextOverride(config, widgetKey, 'title', isTargetLive ? `LIVE SEGMENT: ${target.name}` : `SPLIT NOTE: ${target.name}`);
        ctx.fillText(titleText, x + 50 + offTitle.x, y + 30 + offTitle.y);
        ctx.restore();
      }

      if (!offVal.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offVal.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#0284c7';
        ctx.font = this.getSubPartFont(config, widgetKey, 'val', 'bold', 46);
        const valText = this.getTextOverride(config, widgetKey, 'val', targetPaceFormatted);
        ctx.fillText(valText, x + 50 + offVal.x, y + 84 + offVal.y);
        ctx.restore();
      }

      if (!offTime.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offTime.z);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#475569';
        ctx.font = this.getSubPartFont(config, widgetKey, 'time', '600', 14);
        const timeText = this.getTextOverride(config, widgetKey, 'time', `Split Time: ${targetTimeFormatted}`);
        ctx.fillText(timeText, x + width - 20 + offTime.x, y + 52 + offTime.y);
        ctx.restore();
      }

      if (!offHr.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offHr.z);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#475569';
        ctx.font = this.getSubPartFont(config, widgetKey, 'hr', '600', 14);
        const defaultStat = isTargetLive && activity.liveHr ? `HR: ${activity.liveHr} BPM` : (target.avgHr ? `HR: ${target.avgHr} BPM` : `Elev: +${target.elevationGain || 0}m`);
        const hrText = this.getTextOverride(config, widgetKey, 'hr', defaultStat);
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
        ctx.font = this.getSubPartFont(config, widgetKey, 'badge', 'bold', 12);
        ctx.textAlign = 'center';
        const badgeText = this.getTextOverride(config, widgetKey, 'badge', isTargetLive ? 'LIVE' : target.shortName);
        ctx.fillText(badgeText, x + padX + 26 + offBadge.x, y + 33 + offBadge.y);
        ctx.restore();
      }

      if (!offTitle.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offTitle.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = theme.text;
        ctx.font = this.getSubPartFont(config, widgetKey, 'title', 'bold', 14);
        const titleText = this.getTextOverride(config, widgetKey, 'title', target.name.toUpperCase());
        ctx.fillText(titleText, x + padX + 64 + offTitle.x, y + 33 + offTitle.y);
        ctx.restore();
      }

      if (!offVal.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offVal.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = accent;
        ctx.font = this.getSubPartFont(config, widgetKey, 'val', 'bold', 48);
        const valText = this.getTextOverride(config, widgetKey, 'val', targetPaceFormatted);
        ctx.fillText(valText, x + padX + offVal.x, y + 88 + offVal.y);
        ctx.restore();
      }

      if (!offTime.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offTime.z);
        ctx.textAlign = 'right';
        ctx.fillStyle = theme.textMuted;
        ctx.font = this.getSubPartFont(config, widgetKey, 'time', '600', 13);
        const timeText = this.getTextOverride(config, widgetKey, 'time', `SPLIT TIME: ${targetTimeFormatted}`);
        ctx.fillText(timeText, x + width - padX + offTime.x, y + 52 + offTime.y);
        ctx.restore();
      }

      if (!offHr.hidden && (target.avgHr || activity.avgHr)) {
        ctx.save();
        this.applyZDepth(ctx, offHr.z);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#ef4444';
        ctx.font = this.getSubPartFont(config, widgetKey, 'hr', '600', 13);
        const hrVal = isTargetLive && activity.liveHr ? activity.liveHr : (target.avgHr || activity.avgHr);
        const hrText = this.getTextOverride(config, widgetKey, 'hr', `HEART RATE: ${hrVal} BPM`);
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

    const effAlign = this.getWidgetAlign(align, 'left');
    const isCenter = effAlign === 'center';
    const isRight = effAlign === 'right';

    const leftX = x + padX;
    const rightX = x + width - padX;
    const centerX = x + width / 2;

    const mainX = isCenter ? centerX : (isRight ? rightX : leftX);
    const subX = isCenter ? centerX : (isRight ? leftX : rightX);
    const mainAlign = isCenter ? 'center' : (isRight ? 'right' : 'left');
    const subAlign = isCenter ? 'center' : (isRight ? 'left' : 'right');

    if (!offBadge.hidden) {
      ctx.save();
      this.applyZDepth(ctx, offBadge.z);
      ctx.textAlign = mainAlign;
      ctx.fillStyle = accent;
      ctx.font = this.getSubPartFont(config, widgetKey, 'badge', 'bold', 12);
      ctx.letterSpacing = '1px';
      const defaultTag = isTargetLive
        ? `★ LIVE SPLIT • ${target.name.toUpperCase()} (${Math.round((target.splitProgress || 0) * 100)}%) ★`
        : ((target.isFastest && showFastest) ? '⚡ FASTEST SPLIT SPOTLIGHT' : 'HIGHLIGHTED SPLIT');
      const tag = this.getTextOverride(config, widgetKey, 'badge', defaultTag);
      ctx.fillText(tag, mainX + offBadge.x, (isCenter ? y + 26 : y + 30) + offBadge.y);
      ctx.restore();
    }

    if (!offVal.hidden) {
      ctx.save();
      this.applyZDepth(ctx, offVal.z);
      ctx.textAlign = mainAlign;
      ctx.fillStyle = '#ffffff';
      ctx.font = this.getSubPartFont(config, widgetKey, 'val', 'bold', isCenter ? 40 : 44);
      const valText = this.getTextOverride(config, widgetKey, 'val', targetPaceFormatted);
      ctx.fillText(valText, mainX + offVal.x, (isCenter ? y + 68 : y + 82) + offVal.y);
      ctx.restore();
    }

    if (!offTitle.hidden) {
      ctx.save();
      this.applyZDepth(ctx, offTitle.z);
      ctx.textAlign = subAlign;
      ctx.fillStyle = theme.text;
      ctx.font = this.getSubPartFont(config, widgetKey, 'title', 'bold', isCenter ? 14 : 18);
      const titleText = this.getTextOverride(config, widgetKey, 'title', target.name);
      ctx.fillText(titleText, subX + offTitle.x, (isCenter ? y + 90 : y + 36) + offTitle.y);
      ctx.restore();
    }

    if (!offTime.hidden) {
      ctx.save();
      this.applyZDepth(ctx, offTime.z);
      ctx.textAlign = subAlign;
      ctx.fillStyle = theme.textMuted;
      ctx.font = this.getSubPartFont(config, widgetKey, 'time', '600', 13);
      const timeText = this.getTextOverride(config, widgetKey, 'time', `Time: ${targetTimeFormatted}`);
      ctx.fillText(timeText, subX + offTime.x, (isCenter ? y + 106 : y + 62) + offTime.y);
      ctx.restore();
    }

    if (!offHr.hidden && (target.elevationGain !== undefined || target.avgHr || activity.avgHr)) {
      ctx.save();
      this.applyZDepth(ctx, offHr.z);
      ctx.textAlign = subAlign;
      ctx.fillStyle = theme.textMuted;
      ctx.font = this.getSubPartFont(config, widgetKey, 'hr', '600', 13);
      const defaultStat = isTargetLive && activity.liveHr
        ? `HR: ${activity.liveHr} BPM`
        : (target.avgHr ? `HR: ${target.avgHr} BPM` : (activity.avgHr ? `HR: ${activity.avgHr} BPM` : `Gain: +${target.elevationGain}m`));
      const hrText = this.getTextOverride(config, widgetKey, 'hr', defaultStat);
      if (!isCenter) {
        ctx.fillText(hrText, subX + offHr.x, y + 84 + offHr.y);
      }
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
  drawElevationProfile(ctx, x, y, width, height, activity, config, theme, accent, widgetKey = 'elevation') {
    const pts = activity.trackpoints || [];
    if (!pts || pts.length < 3) return;

    ctx.save();
    const rot = this.applyWidgetRotation(ctx, config, widgetKey, x, y, width, height);
    const elStyle = this.getElementStyle(config, widgetKey);
    const { text, textMuted, accent: elAccent, cardStyle, align, opacity } = this.getEffectiveColors(config, theme, accent, widgetKey);
    if (opacity < 1) ctx.globalAlpha = opacity;
    accent = elAccent;

    const font = this.getFontFamily(elStyle.fontFamily !== 'default' ? elStyle.fontFamily : config.fontFamily);
    const design = config.elevationDesign || 'area';
    this.recordBounds(widgetKey, 'Elevation Profile', x, y, width, height);

    this.drawWidgetCardBg(ctx, widgetKey, x, y, width, height, config, theme);

    const offTitle = this.getElementOffset(config, widgetKey, 'title');
    const offStat = this.getElementOffset(config, widgetKey, 'stat');
    const offChart = this.getElementOffset(config, widgetKey, 'chart');

    const pad = 16;
    const chartW = width - pad * 2;
    const chartH = height - 36;
    const chartX = x + pad;
    const chartY = y + 26;

    const elevTitle = this.getTextOverride(config, widgetKey, 'title', 'ELEVATION PROFILE');
    const effAlign = this.getWidgetAlign(align, 'left');
    const isCenter = effAlign === 'center';
    const isRight = effAlign === 'right';

    if (!offTitle.hidden && elevTitle) {
      ctx.save();
      this.applyZDepth(ctx, offTitle.z);
      ctx.textAlign = isCenter ? 'center' : (isRight ? 'right' : 'left');
      ctx.fillStyle = theme.textMuted;
      ctx.font = this.getSubPartFont(config, widgetKey, 'title', 'bold', 11);
      const titleX = isCenter ? x + width / 2 : (isRight ? chartX + chartW : chartX);
      ctx.fillText(elevTitle, titleX + offTitle.x, y + 18 + offTitle.y);
      ctx.restore();
    }

    if (!offStat.hidden) {
      ctx.save();
      this.applyZDepth(ctx, offStat.z);
      const defaultElevStat = `+${activity.elevationGain || 0}M GAIN  •  PEAK ${activity.maxElevation || 0}M`;
      const elevStat = this.getTextOverride(config, widgetKey, 'stat', defaultElevStat);
      if (isCenter) {
        ctx.textAlign = 'center';
        ctx.fillStyle = accent;
        ctx.font = this.getSubPartFont(config, widgetKey, 'stat', 'bold', 10);
        ctx.fillText(elevStat, x + width / 2 + offStat.x, y + 30 + offStat.y);
      } else {
        ctx.textAlign = isRight ? 'left' : 'right';
        ctx.fillStyle = accent;
        ctx.font = this.getSubPartFont(config, widgetKey, 'stat', 'bold', 11);
        const statX = isRight ? chartX : chartX + chartW;
        ctx.fillText(elevStat, statX + offStat.x, y + 18 + offStat.y);
      }
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

    if (design === 'centered-mountain-peak') {
      // Centered Mountain Peak (Symmetrical Mountain Peak & Summit Banner)
      const midX = chartX + chartW / 2;
      const peakY = chartY + 18;
      const baseY = chartY + chartH - 4;
      const peakW = chartW * 0.72;

      // Symmetrical Mountain Gradient Fill
      ctx.beginPath();
      ctx.moveTo(midX - peakW / 2, baseY);
      ctx.lineTo(midX, peakY);
      ctx.lineTo(midX + peakW / 2, baseY);
      ctx.closePath();

      const mGrad = ctx.createLinearGradient(midX, peakY, midX, baseY);
      mGrad.addColorStop(0, elAccent);
      mGrad.addColorStop(0.5, 'rgba(251, 191, 36, 0.4)');
      mGrad.addColorStop(1, 'rgba(15, 23, 42, 0.05)');
      ctx.fillStyle = mGrad;
      ctx.fill();

      ctx.strokeStyle = elAccent;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Ridge inner lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(midX, peakY);
      ctx.lineTo(midX, baseY);
      ctx.stroke();

      // Summit Banner Pill
      const defaultSummit = `⛰️ SUMMIT ${maxEle}M`;
      const summitText = this.getTextOverride(config, widgetKey, 'summitBadge', defaultSummit);
      const offSummit = this.getElementOffset(config, widgetKey, 'summitBadge');
      if (!offSummit.hidden && summitText) {
        const sumW = 120;
        this.drawRoundedRect(ctx, midX - sumW / 2 + offSummit.x, peakY - 14 + offSummit.y, sumW, 20, 10);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.strokeStyle = elAccent;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'summitBadge', elAccent);
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(summitText, midX + offSummit.x, peakY + offSummit.y);
      }

      // Baseline with tick marks
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(chartX, baseY);
      ctx.lineTo(chartX + chartW, baseY);
      ctx.stroke();

      ctx.restore();
      return y + height;
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

    if (design === 'stepped-elevation-terrace') {
      // Stepped Elevation Terrace (Quantized Multi-Tier Elevation Slabs)
      const tiers = 4;
      for (let t = 1; t <= tiers; t++) {
        const tierRatio = t / tiers;
        ctx.beginPath();
        ctx.moveTo(chartX, chartY + chartH);
        pts.forEach((p) => {
          const px = chartX + (p.dist / totalDist) * chartW;
          const rawNorm = (p.ele - minEle) / dEle;
          const terraceNorm = Math.min(tierRatio, Math.floor(rawNorm * tiers + 0.5) / tiers);
          const py = chartY + chartH - terraceNorm * chartH;
          ctx.lineTo(px, py);
        });
        ctx.lineTo(chartX + chartW, chartY + chartH);
        ctx.closePath();
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.12 * t;
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;

      // Top terrace contour stroke
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

      // Peak summit flag
      let peakPt = pts[0];
      pts.forEach((p) => { if (p.ele > peakPt.ele) peakPt = p; });
      const peakX = chartX + (peakPt.dist / totalDist) * chartW;
      const peakY = getY(peakPt.ele);
      ctx.fillStyle = accent;
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`▲ ${Math.round(peakPt.ele)}m`, peakX, peakY - 8);

      if (activity.runnerPoint) {
        const curY = getY(activity.runnerPoint.ele);
        this.drawChartScanningCursor(ctx, chartX, chartY, chartW, chartH, activity.runnerPoint.dist, totalDist, curY, `▲ ${Math.round(activity.runnerPoint.ele)}m`, accent, font);
      }
      ctx.restore();
      return y + height;
    }

    if (design === 'cyber-altitude-grid') {
      // Cyber Altitude Grid (Neon Sci-Fi Elevation Grid & High-Tech Summit Beacon)
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.1)';
      ctx.lineWidth = 1;
      // Horizontal altitude lines
      for (let i = 0; i <= 3; i++) {
        const gy = chartY + (chartH / 3) * i;
        ctx.beginPath();
        ctx.moveTo(chartX, gy);
        ctx.lineTo(chartX + chartW, gy);
        ctx.stroke();
      }
      // Vertical distance gridlines
      for (let i = 1; i <= 4; i++) {
        const gx = chartX + (chartW / 4) * i;
        ctx.beginPath();
        ctx.moveTo(gx, chartY);
        ctx.lineTo(gx, chartY + chartH);
        ctx.stroke();
      }
      ctx.restore();

      // Glowing Cyan Fill
      const grad = ctx.createLinearGradient(0, chartY, 0, chartY + chartH);
      grad.addColorStop(0, 'rgba(0, 240, 255, 0.45)');
      grad.addColorStop(1, 'rgba(0, 240, 255, 0.02)');

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
      ctx.fill();

      // Top glowing neon curve
      ctx.beginPath();
      pts.forEach((p, idx) => {
        const px = chartX + (p.dist / totalDist) * chartW;
        const py = getY(p.ele);
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Summit peak pill
      let peakPt = pts[0];
      pts.forEach((p) => { if (p.ele > peakPt.ele) peakPt = p; });
      const peakX = chartX + (peakPt.dist / totalDist) * chartW;
      const peakY = getY(peakPt.ele);
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.arc(peakX, peakY, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#00f0ff';
      ctx.fillText(`ALT MAX: ${Math.round(peakPt.ele)}M`, peakX, peakY - 8);

      if (activity.runnerPoint) {
        const curY = getY(activity.runnerPoint.ele);
        this.drawChartScanningCursor(ctx, chartX, chartY, chartW, chartH, activity.runnerPoint.dist, totalDist, curY, `▲ ${Math.round(activity.runnerPoint.ele)}m`, '#00f0ff', font);
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
  drawPaceGraph(ctx, x, y, width, height, activity, config, theme, accent, widgetKey = 'paceGraph') {
    const pts = activity.paceCurve || [];
    if (!pts || pts.length < 3) return y;

    ctx.save();
    const rot = this.applyWidgetRotation(ctx, config, widgetKey, x, y, width, height);
    const elStyle = this.getElementStyle(config, widgetKey);
    const { text, textMuted, accent: elAccent, cardStyle, align, opacity } = this.getEffectiveColors(config, theme, accent, widgetKey);
    if (opacity < 1) ctx.globalAlpha = opacity;
    accent = elAccent;

    const font = this.getFontFamily(elStyle.fontFamily !== 'default' ? elStyle.fontFamily : config.fontFamily);
    const design = config.paceGraphDesign || 'area';
    this.recordBounds(widgetKey, 'Pace Graph', x, y, width, height);

    this.drawWidgetCardBg(ctx, widgetKey, x, y, width, height, config, theme);

    const offTitle = this.getElementOffset(config, widgetKey, 'title');
    const offStat = this.getElementOffset(config, widgetKey, 'stat');
    const offChart = this.getElementOffset(config, widgetKey, 'chart');

    const pad = 16;
    const chartW = width - pad * 2;
    const chartH = height - 38;
    const chartX = x + pad;
    const chartY = y + 28;

    const paceTitle = this.getTextOverride(config, widgetKey, 'title', 'PACE PROFILE');
    const effAlign = this.getWidgetAlign(align, 'left');
    const isCenter = effAlign === 'center';
    const isRight = effAlign === 'right';

    if (!offTitle.hidden && paceTitle) {
      ctx.save();
      this.applyZDepth(ctx, offTitle.z);
      ctx.textAlign = isCenter ? 'center' : (isRight ? 'right' : 'left');
      ctx.fillStyle = theme.textMuted;
      ctx.font = this.getSubPartFont(config, widgetKey, 'title', 'bold', 11);
      const titleX = isCenter ? x + width / 2 : (isRight ? chartX + chartW : chartX);
      ctx.fillText(paceTitle, titleX + offTitle.x, y + 18 + offTitle.y);
      ctx.restore();
    }

    if (!offStat.hidden) {
      ctx.save();
      this.applyZDepth(ctx, offStat.z);
      const defaultPaceStat = activity.isAnimated && activity.livePaceFormatted
        ? `LIVE: ${activity.livePaceFormatted.split(' ')[0]}  •  AVG: ${activity.avgPaceFormatted.split(' ')[0]}`
        : `AVG: ${activity.avgPaceFormatted}  •  BEST: ${activity.bestPaceFormatted || '--'}`;
      const paceStat = this.getTextOverride(config, widgetKey, 'stat', defaultPaceStat);
      if (isCenter) {
        ctx.textAlign = 'center';
        ctx.fillStyle = accent;
        ctx.font = this.getSubPartFont(config, widgetKey, 'stat', 'bold', 10);
        ctx.fillText(paceStat, x + width / 2 + offStat.x, y + 30 + offStat.y);
      } else {
        ctx.textAlign = isRight ? 'left' : 'right';
        ctx.fillStyle = accent;
        ctx.font = this.getSubPartFont(config, widgetKey, 'stat', 'bold', 11);
        const statX = isRight ? chartX : chartX + chartW;
        ctx.fillText(paceStat, statX + offStat.x, y + 18 + offStat.y);
      }
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

    if (design === 'centered-speed-pulse') {
      // Centered Speed Pulse (Oscilloscope Telemetry Wave with Target Pace Centerline)
      const midY = chartY + chartH / 2;

      // Centerline target pace
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(chartX, midY);
      ctx.lineTo(chartX + chartW, midY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Telemetry Waveform
      ctx.beginPath();
      pts.forEach((p, idx) => {
        const px = chartX + (p.dist / totalDist) * chartW;
        const py = getY(p.pace);
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.strokeStyle = elAccent;
      ctx.lineWidth = 3;
      ctx.shadowColor = elAccent;
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Centered Top HUD Readout Pill
      const defaultSpeedPulse = `⚡ SPEED // ${activity.avgPaceFormatted}`;
      const speedPulseText = this.getTextOverride(config, widgetKey, 'speedPulseTag', defaultSpeedPulse);
      const offSpeedPulse = this.getElementOffset(config, widgetKey, 'speedPulseTag');
      if (!offSpeedPulse.hidden && speedPulseText) {
        const hudW = 150;
        const hudX = chartX + (chartW - hudW) / 2;
        this.drawRoundedRect(ctx, hudX + offSpeedPulse.x, chartY - 2 + offSpeedPulse.y, hudW, 18, 9);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fill();
        ctx.strokeStyle = elAccent;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'speedPulseTag', elAccent);
        ctx.font = 'bold 9px monospace';
        ctx.fillText(speedPulseText, chartX + chartW / 2 + offSpeedPulse.x, chartY + 11 + offSpeedPulse.y);
      }

      if (activity.runnerPoint) {
        const curY = getY(activity.avgPace);
        this.drawChartScanningCursor(ctx, chartX, chartY, chartW, chartH, activity.runnerPoint.dist, totalDist, curY, activity.avgPaceFormatted, elAccent, font);
      }
      ctx.restore();
      return y + height;
    }

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

    if (design === 'candlestick-pace-bars') {
      // Candlestick Pace Bars (Financial Interval Candles with High-Low Wicks)
      const candleCount = Math.min(28, Math.max(12, Math.floor(chartW / 14)));
      const ptsPerCandle = Math.max(1, Math.floor(pts.length / candleCount));
      const cW = Math.max(4, chartW / candleCount - 3);

      for (let i = 0; i < candleCount; i++) {
        const startIdx = i * ptsPerCandle;
        const endIdx = Math.min(pts.length - 1, (i + 1) * ptsPerCandle);
        const candlePts = pts.slice(startIdx, endIdx + 1);
        if (candlePts.length === 0) continue;

        let lowPace = Infinity, highPace = 0;
        candlePts.forEach((p) => {
          if (p.pace < lowPace) lowPace = p.pace;
          if (p.pace > highPace) highPace = p.pace;
        });
        const openPace = candlePts[0].pace;
        const closePace = candlePts[candlePts.length - 1].pace;
        const isBullish = closePace <= openPace; // Lower pace number = faster running = positive!

        const cx = chartX + i * (cW + 3) + cW / 2;
        const openY = getY(openPace);
        const closeY = getY(closePace);
        const highY = getY(lowPace);  // Fastest = lowest pace = highest on chart
        const lowY = getY(highPace);  // Slowest = lowest on chart

        const candleColor = isBullish ? (elAccent || '#10b981') : '#f87171';

        // Draw wick
        ctx.strokeStyle = candleColor;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx, highY);
        ctx.lineTo(cx, lowY);
        ctx.stroke();

        // Draw candle body
        const topY = Math.min(openY, closeY);
        const bodyH = Math.max(3, Math.abs(closeY - openY));
        ctx.fillStyle = candleColor;
        this.drawRoundedRect(ctx, cx - cW / 2, topY, cW, bodyH, 1.5);
        ctx.fill();
      }

      // Dashed avg pace line
      const avgY = getY(activity.avgPace);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(chartX, avgY);
      ctx.lineTo(chartX + chartW, avgY);
      ctx.stroke();
      ctx.setLineDash([]);

      if (activity.runnerPoint) {
        const curY = getY(activity.avgPace);
        this.drawChartScanningCursor(ctx, chartX, chartY, chartW, chartH, activity.runnerPoint.dist, totalDist, curY, activity.avgPaceFormatted, elAccent, font);
      }
      ctx.restore();
      return y + height;
    }

    if (design === 'neon-speed-ribbon') {
      // Neon Speed Ribbon (Dual Glowing Velocity Streamers & Speed Apex)
      const grad = ctx.createLinearGradient(0, chartY, 0, chartY + chartH);
      grad.addColorStop(0, elAccent || '#38bdf8');
      grad.addColorStop(1, 'rgba(56, 189, 248, 0.04)');

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
      ctx.globalAlpha = 1.0;

      // Primary glowing line
      ctx.beginPath();
      pts.forEach((p, idx) => {
        const px = chartX + (p.dist / totalDist) * chartW;
        const py = getY(p.pace);
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.strokeStyle = elAccent || '#38bdf8';
      ctx.lineWidth = 3;
      ctx.shadowColor = elAccent || '#38bdf8';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Secondary parallel streamer ribbon
      ctx.beginPath();
      pts.forEach((p, idx) => {
        const px = chartX + (p.dist / totalDist) * chartW;
        const py = Math.min(chartY + chartH, getY(p.pace) + 4);
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Apex speed pill
      let fastestPt = pts[0];
      pts.forEach((p) => { if (p.pace < fastestPt.pace) fastestPt = p; });
      const apexX = chartX + (fastestPt.dist / totalDist) * chartW;
      const apexY = getY(fastestPt.pace);
      ctx.fillStyle = elAccent || '#38bdf8';
      ctx.beginPath();
      ctx.arc(apexX, apexY, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ FASTEST', apexX, apexY - 8);

      if (activity.runnerPoint) {
        const curY = getY(activity.avgPace);
        this.drawChartScanningCursor(ctx, chartX, chartY, chartW, chartH, activity.runnerPoint.dist, totalDist, curY, activity.avgPaceFormatted, elAccent, font);
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
  drawHeartRateGraph(ctx, x, y, width, height, activity, config, theme, accent, widgetKey = 'hrGraph') {
    const pts = activity.hrCurve || [];
    if (!pts || pts.length < 3) return y;

    ctx.save();
    const rot = this.applyWidgetRotation(ctx, config, widgetKey, x, y, width, height);
    const elStyle = this.getElementStyle(config, widgetKey);
    const { text, textMuted, accent: elAccent, cardStyle, align, opacity } = this.getEffectiveColors(config, theme, accent, widgetKey);
    if (opacity < 1) ctx.globalAlpha = opacity;
    accent = elAccent;

    const font = this.getFontFamily(elStyle.fontFamily !== 'default' ? elStyle.fontFamily : config.fontFamily);
    const design = config.hrGraphDesign || 'filled-area';
    this.recordBounds(widgetKey, 'Heart Rate Graph', x, y, width, height);

    this.drawWidgetCardBg(ctx, widgetKey, x, y, width, height, config, theme);

    const offTitle = this.getElementOffset(config, widgetKey, 'title');
    const offStat = this.getElementOffset(config, widgetKey, 'stat');
    const offChart = this.getElementOffset(config, widgetKey, 'chart');

    const pad = 16;
    const chartW = width - pad * 2;
    const chartH = height - 38;
    const chartX = x + pad;
    const chartY = y + 28;

    const hrTitle = this.getTextOverride(config, widgetKey, 'title', 'HEART RATE PROFILE');
    const effAlign = this.getWidgetAlign(align, 'left');
    const isCenter = effAlign === 'center';
    const isRight = effAlign === 'right';

    if (!offTitle.hidden && hrTitle) {
      ctx.save();
      this.applyZDepth(ctx, offTitle.z);
      ctx.textAlign = isCenter ? 'center' : (isRight ? 'right' : 'left');
      ctx.fillStyle = theme.textMuted;
      ctx.font = this.getSubPartFont(config, widgetKey, 'title', 'bold', 11);
      const titleX = isCenter ? x + width / 2 : (isRight ? chartX + chartW : chartX);
      ctx.fillText(hrTitle, titleX + offTitle.x, y + 18 + offTitle.y);
      ctx.restore();
    }

    if (!offStat.hidden) {
      ctx.save();
      this.applyZDepth(ctx, offStat.z);
      const defaultHrStat = activity.isAnimated && activity.liveHr
        ? `LIVE: ${activity.liveHr} BPM  •  AVG: ${activity.avgHr || '--'} BPM`
        : `AVG: ${activity.avgHr || '--'} BPM  •  MAX: ${activity.maxHr || '--'}`;
      const hrStat = this.getTextOverride(config, widgetKey, 'stat', defaultHrStat);
      if (isCenter) {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ef4444';
        ctx.font = this.getSubPartFont(config, widgetKey, 'stat', 'bold', 10);
        ctx.fillText(hrStat, x + width / 2 + offStat.x, y + 30 + offStat.y);
      } else {
        ctx.textAlign = isRight ? 'left' : 'right';
        ctx.fillStyle = '#ef4444';
        ctx.font = this.getSubPartFont(config, widgetKey, 'stat', 'bold', 11);
        const statX = isRight ? chartX : chartX + chartW;
        ctx.fillText(hrStat, statX + offStat.x, y + 18 + offStat.y);
      }
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

    if (design === 'centered-cardiac-halo') {
      // Centered Cardiac Halo (Glowing ECG Waveform & Centered Heart Readout)
      const midY = chartY + chartH / 2;

      // Centerline baseline
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(chartX, midY);
      ctx.lineTo(chartX + chartW, midY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Cardiac ECG Waveform
      ctx.beginPath();
      pts.forEach((p, idx) => {
        const px = chartX + (p.dist / totalDist) * chartW;
        const py = getY(p.hr);
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Top Centered Cardiac Readout Pill
      const defaultCardiacHalo = `❤️ CARDIAC // ${activity.avgHr || '--'} BPM`;
      const cardiacHaloText = this.getTextOverride(config, widgetKey, 'cardiacHaloTag', defaultCardiacHalo);
      const offCardiacHalo = this.getElementOffset(config, widgetKey, 'cardiacHaloTag');
      if (!offCardiacHalo.hidden && cardiacHaloText) {
        const pillW = 150;
        const pillX = chartX + (chartW - pillW) / 2;
        this.drawRoundedRect(ctx, pillX + offCardiacHalo.x, chartY - 2 + offCardiacHalo.y, pillW, 18, 9);
        ctx.fillStyle = 'rgba(20, 10, 14, 0.88)';
        ctx.fill();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'cardiacHaloTag', '#ef4444');
        ctx.font = 'bold 9px monospace';
        ctx.fillText(cardiacHaloText, chartX + chartW / 2 + offCardiacHalo.x, chartY + 11 + offCardiacHalo.y);
      }

      if (activity.runnerPoint) {
        const curY = getY(activity.avgHr || 140);
        this.drawChartScanningCursor(ctx, chartX, chartY, chartW, chartH, activity.runnerPoint.dist, totalDist, curY, `${activity.avgHr || '--'} bpm`, '#ef4444', font);
      }
      ctx.restore();
      return y + height;
    }

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

    if (design === 'ecg-cyber-pulse') {
      // ECG Cyber Pulse (Phosphor CRT Oscilloscope Matrix & Bio-Telemetry)
      ctx.save();
      // CRT phosphor green grid
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.12)';
      ctx.lineWidth = 1;
      for (let gy = chartY; gy <= chartY + chartH; gy += chartH / 4) {
        ctx.beginPath(); ctx.moveTo(chartX, gy); ctx.lineTo(chartX + chartW, gy); ctx.stroke();
      }
      for (let gx = chartX; gx <= chartX + chartW; gx += chartW / 6) {
        ctx.beginPath(); ctx.moveTo(gx, chartY); ctx.lineTo(gx, chartY + chartH); ctx.stroke();
      }

      // Phosphor Green Wash
      const grad = ctx.createLinearGradient(0, chartY, 0, chartY + chartH);
      grad.addColorStop(0, 'rgba(16, 229, 152, 0.35)');
      grad.addColorStop(1, 'rgba(16, 229, 152, 0.02)');

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

      // Glowing phosphor trace
      ctx.beginPath();
      pts.forEach((p, idx) => {
        const px = chartX + (p.dist / totalDist) * chartW;
        const py = getY(p.hr);
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.strokeStyle = '#10e598';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#10e598';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Avg HR reference dashed line
      if (activity.avgHr) {
        const avgY = getY(activity.avgHr);
        ctx.strokeStyle = 'rgba(16, 229, 152, 0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(chartX, avgY); ctx.lineTo(chartX + chartW, avgY); ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();

      if (activity.runnerPoint) {
        const curY = getY(activity.runnerPoint.hr);
        this.drawChartScanningCursor(ctx, chartX, chartY, chartW, chartH, activity.runnerPoint.dist, totalDist, curY, `${activity.runnerPoint.hr} BPM`, '#10e598', font);
      }
      ctx.restore();
      return y + height;
    }

    if (design === 'cardiac-zone-flame') {
      // Cardiac Zone Flame (Thermal Multi-Zone Fire Gradient Spectrum)
      const grad = ctx.createLinearGradient(0, chartY + chartH, 0, chartY);
      grad.addColorStop(0, '#3b82f6');    // Z1 Blue
      grad.addColorStop(0.3, '#10b981');  // Z2 Green
      grad.addColorStop(0.55, '#f59e0b'); // Z3 Amber
      grad.addColorStop(0.8, '#f97316');  // Z4 Orange
      grad.addColorStop(1.0, '#ef4444');  // Z5 Red

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
      ctx.globalAlpha = 1.0;

      // Top glowing flame stroke
      ctx.beginPath();
      pts.forEach((p, idx) => {
        const px = chartX + (p.dist / totalDist) * chartW;
        const py = getY(p.hr);
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.8;
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Peak HR beacon
      let peakPt = pts[0];
      pts.forEach((p) => { if (p.hr > peakPt.hr) peakPt = p; });
      const peakX = chartX + (peakPt.dist / totalDist) * chartW;
      const peakY = getY(peakPt.hr);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(peakX, peakY, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fca5a5';
      ctx.fillText(`🔥 MAX ${peakPt.hr}`, peakX, peakY - 8);

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
  drawAvgHeartRateBadge(ctx, x, y, width, activity, config, theme, accent, customH = null, widgetKey = 'hrBadge') {
    if (!activity.avgHr) return y;

    ctx.save();
    const rot = this.applyWidgetRotation(ctx, config, widgetKey, x, y, width, customH || 60);
    const elStyle = this.getElementStyle(config, widgetKey);
    const { text, textMuted, accent: elAccent, cardStyle, align, opacity } = this.getEffectiveColors(config, theme, accent, widgetKey);
    if (opacity < 1) ctx.globalAlpha = opacity;

    const font = this.getFontFamily(elStyle.fontFamily !== 'default' ? elStyle.fontFamily : config.fontFamily);
    const design = config.hrBadgeDesign || 'pill';
    const h = customH || 60;
    this.recordBounds(widgetKey, 'Avg HR Badge', x, y, width, h);
    this.drawWidgetCardBg(ctx, widgetKey, x, y, width, h, config, theme, true);

    const offIcon = this.getElementOffset(config, widgetKey, 'icon');
    const offLabel = this.getElementOffset(config, widgetKey, 'label');
    const offVal = this.getElementOffset(config, widgetKey, 'val');
    const offUnit = this.getElementOffset(config, widgetKey, 'unit');
    const offPeak = this.getElementOffset(config, widgetKey, 'peak');

    const isLive = activity.isAnimated && activity.progress < 0.999;
    const labelOverride = this.getTextOverride(config, widgetKey, 'label', null);
    const unitOverride = this.getTextOverride(config, widgetKey, 'unit', 'BPM');

    if (design === 'minimal-cardiac-pill') {
      // Minimal Cardiac Pill (Floating Translucent Capsule & Live Zone Pip)
      const pillH = customH || 58;
      this.recordBounds(widgetKey, 'Avg HR Badge', x, y, width, pillH);
      this.drawWidgetCardBg(ctx, widgetKey, x, y, width, pillH, config, theme, true);

      let zoneCol = '#10b981';
      if (activity.avgHr > 175) zoneCol = '#ef4444';
      else if (activity.avgHr > 160) zoneCol = '#f97316';
      else if (activity.avgHr > 145) zoneCol = '#f59e0b';
      else if (activity.avgHr < 125) zoneCol = '#3b82f6';

      const effAlign = this.getWidgetAlign(align, 'left');
      const isCenter = effAlign === 'center';
      const isRight = effAlign === 'right';

      // Left heart icon + colored zone dot
      if (!offIcon.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offIcon.z);
        const iconX = isCenter ? x + width / 2 - 40 : (isRight ? x + width - 36 : x + 24);
        ctx.textAlign = 'center';
        ctx.font = '18px sans-serif';
        ctx.fillText('❤️', iconX + offIcon.x, y + pillH / 2 + 6 + offIcon.y);

        // Zone Pip dot
        ctx.fillStyle = zoneCol;
        ctx.shadowColor = zoneCol;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(iconX + 10 + offIcon.x, y + pillH / 2 - 6 + offIcon.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      // HR Value
      if (!offVal.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offVal.z);
        const valX = isCenter ? x + width / 2 + 8 : (isRight ? x + width - 64 : x + 54);
        ctx.textAlign = isCenter ? 'center' : (isRight ? 'right' : 'left');
        ctx.fillStyle = '#ffffff';
        ctx.font = this.getSubPartFont(config, widgetKey, 'val', 'bold', 24);
        const valStr = offUnit.hidden ? `${activity.avgHr}` : `${activity.avgHr} ${unitOverride}`;
        ctx.fillText(valStr, valX + offVal.x, y + pillH / 2 + 7 + offVal.y);
        ctx.restore();
      }

      // Peak or Label on opposite side
      if (!offPeak.hidden && !isCenter) {
        ctx.save();
        this.applyZDepth(ctx, offPeak.z);
        const peakX = isRight ? x + 20 : x + width - 20;
        ctx.textAlign = isRight ? 'left' : 'right';
        ctx.fillStyle = theme.textMuted;
        ctx.font = this.getSubPartFont(config, widgetKey, 'peak', '600', 12);
        const peakDefault = `MAX ${activity.maxHr || '--'}`;
        const peakText = this.getTextOverride(config, widgetKey, 'peak', peakDefault);
        ctx.fillText(peakText, peakX + offPeak.x, y + pillH / 2 + 5 + offPeak.y);
        ctx.restore();
      }

      ctx.restore();
      return y + pillH;
    }

    if (design === 'cyber-hud-cardiac-gauge') {
      // Cyber HUD Cardiac Gauge (Segmented 5-Zone Arc & Digital Telemetry)
      const gaugeH = customH || 86;
      this.recordBounds(widgetKey, 'Avg HR Badge', x, y, width, gaugeH);
      this.drawWidgetCardBg(ctx, widgetKey, x, y, width, gaugeH, config, theme, true);

      const effAlign = this.getWidgetAlign(align, 'left');
      const isCenter = effAlign === 'center';
      const isRight = effAlign === 'right';

      const dialR = 26;
      const dialCx = isCenter ? x + width / 2 : (isRight ? x + width - dialR - 24 : x + dialR + 24);
      const dialCy = y + gaugeH / 2;

      // Draw 5 segmented radial zone arcs
      const zoneColors = ['#3b82f6', '#10b981', '#f59e0b', '#f97316', '#ef4444'];
      const startAngle = Math.PI * 0.75;
      const totalSweep = Math.PI * 1.5;
      const segSweep = totalSweep / 5;
      const segGap = 0.08;

      let activeZone = 1;
      if (activity.avgHr > 175) activeZone = 5;
      else if (activity.avgHr > 160) activeZone = 4;
      else if (activity.avgHr > 145) activeZone = 3;
      else if (activity.avgHr > 125) activeZone = 2;

      ctx.save();
      for (let z = 0; z < 5; z++) {
        const a1 = startAngle + z * segSweep + segGap / 2;
        const a2 = startAngle + (z + 1) * segSweep - segGap / 2;
        ctx.beginPath();
        ctx.arc(dialCx, dialCy, dialR, a1, a2);
        ctx.strokeStyle = z < activeZone ? zoneColors[z] : 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 4;
        if (z === activeZone - 1) {
          ctx.shadowColor = zoneColors[z];
          ctx.shadowBlur = 8;
        } else {
          ctx.shadowBlur = 0;
        }
        ctx.stroke();
      }
      ctx.restore();

      // Dial Center Heart or Numeral
      if (!offIcon.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offIcon.z);
        ctx.textAlign = 'center';
        ctx.font = '16px sans-serif';
        ctx.fillText('❤️', dialCx + offIcon.x, dialCy + 6 + offIcon.y);
        ctx.restore();
      }

      // Telemetry texts
      const textX = isCenter ? dialCx : (isRight ? x + 24 : dialCx + dialR + 20);
      const textAlign = isCenter ? 'center' : (isRight ? 'left' : 'left');

      if (!offLabel.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offLabel.z);
        ctx.textAlign = textAlign;
        ctx.fillStyle = zoneColors[activeZone - 1];
        ctx.font = this.getSubPartFont(config, widgetKey, 'label', 'bold', 11);
        ctx.letterSpacing = '1px';
        const defaultLabel = `ZONE ${activeZone} • ${isLive ? 'LIVE' : 'AVG'}`;
        const labelText = this.getTextOverride(config, widgetKey, 'label', defaultLabel);
        ctx.fillText(labelText, textX + offLabel.x, (isCenter ? y + 20 : y + 32) + offLabel.y);
        ctx.restore();
      }

      if (!offVal.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offVal.z);
        ctx.textAlign = textAlign;
        ctx.fillStyle = '#ffffff';
        ctx.font = this.getSubPartFont(config, widgetKey, 'val', 'bold', 30);
        const valStr = offUnit.hidden ? `${activity.avgHr}` : `${activity.avgHr} ${unitOverride}`;
        ctx.fillText(valStr, textX + offVal.x, (isCenter ? y + gaugeH - 12 : y + 64) + offVal.y);
        ctx.restore();
      }

      if (!offPeak.hidden && !isCenter) {
        ctx.save();
        this.applyZDepth(ctx, offPeak.z);
        const peakX = isRight ? x + width - dialR * 2 - 40 : x + width - 20;
        ctx.textAlign = 'right';
        ctx.fillStyle = theme.textMuted;
        ctx.font = this.getSubPartFont(config, widgetKey, 'peak', '600', 12);
        const peakDefault = `MAX ${activity.maxHr} ${unitOverride}`;
        const peakText = this.getTextOverride(config, widgetKey, 'peak', peakDefault);
        ctx.fillText(peakText, peakX + offPeak.x, y + 48 + offPeak.y);
        ctx.restore();
      }

      ctx.restore();
      return y + gaugeH;
    }

    if (design === 'centered-heart-crest') {
      // Centered Heart Crest (Glowing Heart & Centered BPM)
      const crestH = customH || 95;
      this.recordBounds(widgetKey, 'Avg HR Badge', x, y, width, crestH);
      const effAlign = this.getWidgetAlign(align, 'center');
      const cx = this.getAlignX(effAlign, x, width, 24, 'center');

      this.drawRoundedRect(ctx, x, y, width, crestH, 20);
      ctx.fillStyle = cardStyle === 'solid' ? '#1a0f14' : 'rgba(26, 15, 20, 0.9)';
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Top Centered Pulsing Heart
      if (!offIcon.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offIcon.z);
        ctx.textAlign = 'center';
        ctx.font = '22px sans-serif';
        ctx.fillText('❤️', cx + offIcon.x, y + 26 + offIcon.y);
        ctx.restore();
      }

      // Center Big BPM Value
      if (!offVal.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offVal.z);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.font = this.getSubPartFont(config, widgetKey, 'val', 'bold', 34);
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 8;
        ctx.fillText(`${activity.avgHr} ${unitOverride}`, cx + offVal.x, y + 62 + offVal.y);
        ctx.restore();
      }

      // Bottom Centered Label / Zone Pill
      if (!offLabel.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offLabel.z);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fca5a5';
        ctx.font = this.getSubPartFont(config, widgetKey, 'label', 'bold', 10);
        ctx.letterSpacing = '1px';
        const defaultLabel = isLive ? 'LIVE HEART RATE' : (activity.maxHr ? `AVG HR • PEAK ${activity.maxHr}` : 'AVG HEART RATE');
        const badgeLabel = labelOverride || defaultLabel;
        ctx.fillText(badgeLabel.toUpperCase(), cx + offLabel.x, y + 80 + offLabel.y);
        ctx.restore();
      }

      ctx.restore();
      return y + crestH;
    }

    if (design === 'zone-badge') {
      // Style 5: Multi-Zone Telemetry Capsule
      const cardH = customH || 86;
      this.drawWidgetCardBg(ctx, widgetKey, x, y, width, cardH, config, theme, true);

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
        ctx.font = this.getSubPartFont(config, widgetKey, 'label', 'bold', 11);
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
        ctx.font = this.getSubPartFont(config, widgetKey, 'val', '900', 36);
        ctx.fillText(`${activity.avgHr}`, x + 20 + offVal.x, y + 68 + offVal.y);
        ctx.restore();
      }

      // Unit
      if (!offUnit.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offUnit.z);
        const valW = offVal.hidden ? 0 : ctx.measureText(`${activity.avgHr}`).width;
        ctx.fillStyle = zoneCol;
        ctx.font = this.getSubPartFont(config, widgetKey, 'unit', 'bold', 16);
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
        ctx.font = this.getSubPartFont(config, widgetKey, 'peak', '900', 11);
        const defaultZoneText = `ZONE ${zoneNum} • ${zoneName}`;
        const zoneText = this.getTextOverride(config, widgetKey, 'peak', defaultZoneText);
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
        ctx.font = this.getSubPartFont(config, widgetKey, 'label', 'bold', 11);
        ctx.letterSpacing = '1.5px';
        ctx.fillText(labelOverride || 'CARDIAC PULSE TELEMETRY', x + 38 + offLabel.x, y + 30 + offLabel.y);
        ctx.restore();
      }

      if (!offVal.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offVal.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        ctx.font = this.getSubPartFont(config, widgetKey, 'val', '900', 36);
        ctx.fillText(`${activity.avgHr}`, x + 24 + offVal.x, y + 68 + offVal.y);
        ctx.restore();
      }

      if (!offUnit.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offUnit.z);
        const valW = offVal.hidden ? 0 : ctx.measureText(`${activity.avgHr}`).width;
        ctx.fillStyle = '#00f5d4';
        ctx.font = this.getSubPartFont(config, widgetKey, 'unit', 'bold', 16);
        ctx.fillText(unitOverride, x + 28 + valW + offUnit.x, y + 66 + offUnit.y);
        ctx.restore();
      }

      if (!offPeak.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offPeak.z);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#94a3b8';
        ctx.font = this.getSubPartFont(config, widgetKey, 'peak', 'bold', 12);
        const peakDefault = `PEAK: ${activity.maxHr} ${unitOverride}`;
        const peakText = this.getTextOverride(config, widgetKey, 'peak', peakDefault);
        ctx.fillText(peakText, x + width - 20 + offPeak.x, y + 66 + offPeak.y);
        ctx.restore();
      }

      ctx.restore();
      return y + cardH;
    }


    if (design === 'vertical-hr-thermometer') {
      // Style: Vertical Zone Thermometer (5-Zone Meter Column)
      const cardH = customH || 86;
      this.drawWidgetCardBg(ctx, widgetKey, x, y, width, cardH, config, theme, true);

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
      ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'val', text);
      ctx.font = this.getSubPartFont(config, widgetKey, 'val', 'bold', 28);
      ctx.fillText(String(activity.avgHr), x + 44 + offVal.x, y + 42 + offVal.y);
      ctx.restore();

      ctx.save();
      this.applyZDepth(ctx, offLabel.z);
      ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'label', textMuted);
      ctx.font = this.getSubPartFont(config, widgetKey, 'label', 'bold', 10);
      const defaultThermometerLabel = isLive ? 'LIVE HEART RATE' : 'AVG HEART RATE';
      ctx.fillText(labelOverride || defaultThermometerLabel, x + 16 + offLabel.x, y + 66 + offLabel.y);
      ctx.restore();

      ctx.restore();
      return y + cardH;
    }

    if (design === 'tactical-ecg-card') {
      // Style: ECG Telemetry Strip (Oscilloscope CRT Strip)
      const cardH = customH || 68;
      this.drawWidgetCardBg(ctx, widgetKey, x, y, width, cardH, config, theme, true);

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
      ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'val', text);
      ctx.font = this.getSubPartFont(config, widgetKey, 'val', 'bold', 24);
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
        ctx.font = this.getSubPartFont(config, widgetKey, 'label', 'bold', 11);
        const defaultGaugeLabel = isLive ? 'LIVE HEART RATE' : 'HEART RATE ZONE';
        ctx.fillText(labelOverride || defaultGaugeLabel, x + 84 + offLabel.x, y + 30 + offLabel.y);
        ctx.restore();
      }

      if (!offVal.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offVal.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        ctx.font = this.getSubPartFont(config, widgetKey, 'val', 'bold', 32);
        const valStr = offUnit.hidden ? `${activity.avgHr}` : `${activity.avgHr} ${unitOverride}`;
        ctx.fillText(valStr, x + 84 + offVal.x, y + 64 + offVal.y);
        ctx.restore();
      }

      if (!offPeak.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offPeak.z);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#fca5a5';
        ctx.font = this.getSubPartFont(config, widgetKey, 'peak', 'bold', 13);
        const peakDefault = `MAX ${activity.maxHr} ${unitOverride}`;
        const peakText = this.getTextOverride(config, widgetKey, 'peak', peakDefault);
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
        ctx.font = this.getSubPartFont(config, widgetKey, 'unit', 'bold', 16);
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
        ctx.font = this.getSubPartFont(config, widgetKey, 'val', 'bold', 22);
        ctx.fillText(`${activity.avgHr}`, x + 82 + offVal.x, y + h / 2 + 6 + offVal.y);
        ctx.restore();
      }

      if (!offPeak.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offPeak.z);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#fca5a5';
        ctx.font = this.getSubPartFont(config, widgetKey, 'peak', 'bold', 12);
        const peakDefault = `PEAK: ${activity.maxHr}`;
        const peakText = this.getTextOverride(config, widgetKey, 'peak', peakDefault);
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
        ctx.font = this.getSubPartFont(config, widgetKey, 'label', 'bold', 12);
        const defaultCardLabel = isLive ? 'LIVE HEART RATE' : 'AVERAGE HEART RATE';
        ctx.fillText(labelOverride || defaultCardLabel, x + 20 + offLabel.x, y + 26 + offLabel.y);
        ctx.restore();
      }

      if (!offVal.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offVal.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ef4444';
        ctx.font = this.getSubPartFont(config, widgetKey, 'val', 'bold', 38);
        ctx.fillText(`${activity.avgHr}`, x + 20 + offVal.x, y + 64 + offVal.y);
        ctx.restore();
      }

      if (!offUnit.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offUnit.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = theme.text;
        ctx.font = this.getSubPartFont(config, widgetKey, 'unit', 'bold', 18);
        ctx.fillText(unitOverride, x + 90 + offUnit.x, y + 62 + offUnit.y);
        ctx.restore();
      }

      if (!offPeak.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offPeak.z);
        ctx.textAlign = 'right';
        ctx.fillStyle = theme.textMuted;
        ctx.font = this.getSubPartFont(config, widgetKey, 'peak', '600', 13);
        const peakDefault = `PEAK: ${activity.maxHr} ${unitOverride}`;
        const peakText = this.getTextOverride(config, widgetKey, 'peak', peakDefault);
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

    const effAlign = this.getWidgetAlign(align, 'left');
    const isCenter = effAlign === 'center';
    const isRight = effAlign === 'right';

    const defaultPillLabel = isLive ? 'LIVE HEART RATE' : 'AVG HEART RATE';
    const labelPart = offLabel.hidden ? '' : (labelOverride || defaultPillLabel) + ': ';
    const valPart = offVal.hidden ? '' : `${activity.avgHr} `;
    const unitPart = offUnit.hidden ? '' : unitOverride;
    const fullText = `${labelPart}${valPart}${unitPart}`.trim();

    if (isCenter) {
      const cx = x + width / 2;
      if (!offVal.hidden || !offLabel.hidden || !offUnit.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offVal.z);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.font = this.getSubPartFont(config, widgetKey, 'val', 'bold', 20);
        const iconPrefix = offIcon.hidden ? '' : '❤️ ';
        ctx.fillText(`${iconPrefix}${fullText}`, cx + offVal.x, y + 36 + offVal.y);
        ctx.restore();
      }
    } else if (isRight) {
      if (!offPeak.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offPeak.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#fca5a5';
        ctx.font = this.getSubPartFont(config, widgetKey, 'peak', 'bold', 14);
        const peakDefault = `MAX: ${activity.maxHr} ${unitOverride}`;
        const peakText = this.getTextOverride(config, widgetKey, 'peak', peakDefault);
        ctx.fillText(peakText, x + 24 + offPeak.x, y + 36 + offPeak.y);
        ctx.restore();
      }

      if (!offVal.hidden || !offLabel.hidden || !offUnit.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offVal.z);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#ffffff';
        ctx.font = this.getSubPartFont(config, widgetKey, 'val', 'bold', 20);
        const iconPrefix = offIcon.hidden ? '' : '❤️ ';
        ctx.fillText(`${iconPrefix}${fullText}`, x + width - 24 + offVal.x, y + 36 + offVal.y);
        ctx.restore();
      }
    } else {
      if (!offIcon.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offIcon.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ef4444';
        ctx.font = this.getSubPartFont(config, widgetKey, 'icon', 'bold', 22);
        ctx.fillText('❤️', x + 20 + offIcon.x, y + 37 + offIcon.y);
        ctx.restore();
      }

      if (!offVal.hidden || !offLabel.hidden || !offUnit.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offVal.z);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        ctx.font = this.getSubPartFont(config, widgetKey, 'val', 'bold', 20);
        ctx.fillText(fullText, x + 54 + offVal.x, y + 36 + offVal.y);
        ctx.restore();
      }

      if (!offPeak.hidden) {
        ctx.save();
        this.applyZDepth(ctx, offPeak.z);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#fca5a5';
        ctx.font = this.getSubPartFont(config, widgetKey, 'peak', 'bold', 14);
        const peakDefault = `MAX: ${activity.maxHr} ${unitOverride}`;
        const peakText = this.getTextOverride(config, widgetKey, 'peak', peakDefault);
        ctx.fillText(peakText, x + width - 24 + offPeak.x, y + 36 + offPeak.y);
        ctx.restore();
      }
    }

    ctx.restore();
    return y + h;
  }

  // =========================================================================
  // WIDGET 11: HR ZONES BAR
  // =========================================================================
  drawHrZonesBar(ctx, x, y, width, activity, config, theme, accent, customH = null, widgetKey = 'hrZones') {
    const zones = activity.hrZones;
    if (!zones) return y;

    ctx.save();
    const rot = this.applyWidgetRotation(ctx, config, widgetKey, x, y, width, customH || 48);
    const elStyle = this.getElementStyle(config, widgetKey);
    const { text, textMuted, accent: elAccent, align, opacity } = this.getEffectiveColors(config, theme, accent, widgetKey);
    if (opacity < 1) ctx.globalAlpha = opacity;
    accent = elAccent;

    const font = this.getFontFamily(elStyle.fontFamily !== 'default' ? elStyle.fontFamily : config.fontFamily);
    const h = customH || 48;
    this.recordBounds(widgetKey, 'HR Zones Bar', x, y, width, h);

    const effAlign = this.getWidgetAlign(align, 'left');
    const isCenter = effAlign === 'center';
    const isRight = effAlign === 'right';

    const pad = 12;
    const barW = width - pad * 2;
    const barY = y + 20;
    const barH = 10;

    const offTitle = this.getElementOffset(config, widgetKey, 'title');
    const defaultTitle = 'HEART RATE ZONES';
    const titleText = this.getTextOverride(config, widgetKey, 'title', defaultTitle);

    if (!offTitle.hidden && titleText) {
      ctx.save();
      this.applyZDepth(ctx, offTitle.z);
      ctx.textAlign = isCenter ? 'center' : (isRight ? 'right' : 'left');
      ctx.fillStyle = textMuted;
      ctx.font = this.getSubPartFont(config, widgetKey, 'title', 'bold', 10);
      ctx.letterSpacing = '1px';
      const titleX = isCenter ? x + width / 2 : (isRight ? x + width - pad : x + pad);
      ctx.fillText(titleText.toUpperCase(), titleX + offTitle.x, y + 12 + offTitle.y);
      ctx.restore();
    }

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

  drawBrandWatermark(ctx, x, y, width, config, theme, accent, customH = null, widgetKey = 'brand') {
    ctx.save();
    const rot = this.applyWidgetRotation(ctx, config, widgetKey, x, y - 14, width, customH || 28);
    const elStyle = this.getElementStyle(config, widgetKey);
    const { text, textMuted, accent: elAccent, align, opacity } = this.getEffectiveColors(config, theme, accent, widgetKey);
    if (opacity < 1) ctx.globalAlpha = opacity;
    accent = elAccent;

    const font = this.getFontFamily(elStyle.fontFamily !== 'default' ? elStyle.fontFamily : config.fontFamily);
    const h = customH || 28;
    this.recordBounds(widgetKey, 'Watermark / Brand', x, y - 14, width, h);

    const brandStyle = config.brandStyle || 'runcut';
    let brandText = '⚡ RUNOVERLAY';

    if (brandStyle === 'strava') {
      brandText = 'STRAVA RUNNER';
    } else if (brandStyle === 'nike') {
      brandText = 'JUST DO IT • RUN CLUB';
    } else if (brandStyle === 'custom' && config.customWatermark) {
      brandText = config.customWatermark.toUpperCase();
    }

    brandText = this.getTextOverride(config, widgetKey, 'text', brandText);

    const offText = this.getElementOffset(config, widgetKey, 'text');
    if (offText.hidden) {
      ctx.restore();
      return;
    }

    const effAlign = this.getWidgetAlign(align, 'center');
    const bx = this.getAlignX(effAlign, x, width, 16, 'center');

    if (brandStyle === 'centered-cinematic-stamp') {
      // Centered Cinematic Stamp
      this.applyZDepth(ctx, offText.z);
      ctx.textAlign = 'center';
      ctx.font = this.getSubPartFont(config, widgetKey, 'text', 'bold', 11);
      ctx.letterSpacing = '3px';
      ctx.fillStyle = elAccent;
      ctx.shadowColor = elAccent;
      ctx.shadowBlur = 8;
      ctx.fillText(`◆  ${brandText}  ◆`, bx + offText.x, y + offText.y);
      ctx.shadowBlur = 0;
      ctx.restore();
      return;
    }

    this.applyZDepth(ctx, offText.z);
    ctx.textAlign = effAlign;
    ctx.font = this.getSubPartFont(config, widgetKey, 'text', 'bold', 12);
    ctx.letterSpacing = '2px';
    const brandDefColor = config.brandStyle === 'strava' ? '#fc5200' : 'rgba(255, 255, 255, 0.6)';
    ctx.fillStyle = this.getSubPartColor(config, widgetKey, 'text', brandDefColor);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 6;
    ctx.fillText(brandText, bx + offText.x, y + offText.y);

    const subtext = this.getTextOverride(config, widgetKey, 'subtext', '');
    const offSubtext = this.getElementOffset(config, widgetKey, 'subtext');
    if (!offSubtext.hidden && subtext) {
      ctx.save();
      this.applyZDepth(ctx, offSubtext.z);
      ctx.textAlign = effAlign;
      ctx.font = this.getSubPartFont(config, widgetKey, 'subtext', '500', 10);
      ctx.letterSpacing = '1px';
      ctx.fillStyle = textMuted;
      ctx.shadowBlur = 0;
      ctx.fillText(subtext, bx + offSubtext.x, y + 14 + offSubtext.y);
      ctx.restore();
    }

    ctx.restore();
  }

  // =========================================================================
  // CUSTOM TEXTS & STICKERS RENDERER
  // =========================================================================

  renderExtraWidgetInstances(ctx, baseW, baseH, activity, config, theme, accent) {
    if (!config.extraWidgetInstances || !Array.isArray(config.extraWidgetInstances)) return;

    config.extraWidgetInstances.forEach((inst, idx) => {
      if (inst.enabled === false) return;
      const widgetKey = inst.id;
      const category = inst.category;
      const instConfig = { ...config, ...(inst.options || {}) };

      const defaultPad = 40;
      const defaultW = Math.min(baseW - defaultPad * 2, 420);
      const defaultY = Math.min(baseH - 250, 180 + idx * 110);
      const defaultX = Math.max(defaultPad, Math.round((baseW - defaultW) / 2));

      switch (category) {
        case 'hero': {
          let heroH = 120;
          if (instConfig.heroDesign === 'mega' || instConfig.heroDesign === 'vertical-totem') heroH = 160;
          else if (instConfig.heroDesign === 'speedometer' || instConfig.heroDesign === 'precision-hud-gauge') heroH = 145;
          const pos = this.getWidgetPos(instConfig, widgetKey, defaultX, defaultY, defaultW, heroH);
          this.drawHeroStat(ctx, pos.x, pos.y, pos.width, activity, instConfig, theme, accent, pos.height, widgetKey);
          break;
        }
        case 'metrics': {
          let metH = 95;
          if (['vertical-stacked-hud', 'vertical-minimal-stack', 'vertical-pill-stack', 'vertical-timeline-flow', 'vertical-data-ladder', 'vertical-athletic-cards'].includes(instConfig.metricsDesign)) {
            metH = 220;
          } else if (instConfig.metricsDesign === 'cards-2col' || instConfig.metricsDesign === 'centered-cross-quad') {
            metH = 140;
          }
          const pos = this.getWidgetPos(instConfig, widgetKey, defaultX, defaultY, defaultW, metH);
          this.drawMetricsGrid(ctx, pos.x, pos.y, pos.width, activity, instConfig, theme, accent, 3, pos.height, widgetKey);
          break;
        }
        case 'splits': {
          let chartH = 150;
          if (instConfig.splitsDesign === 'pace-table' || instConfig.splitsDesign === 'split-ladder-timeline' || instConfig.splitsDesign === 'vertical-split-cards') chartH = 200;
          const pos = this.getWidgetPos(instConfig, widgetKey, defaultX, defaultY, defaultW, chartH);
          this.drawSplitsBarChart(ctx, pos.x, pos.y, pos.width, activity, instConfig, theme, accent, pos.height, widgetKey);
          break;
        }
        case 'splitHighlight': {
          const hlH = 100;
          const pos = this.getWidgetPos(instConfig, widgetKey, defaultX, defaultY, defaultW, hlH);
          this.drawSplitHighlightCard(ctx, pos.x, pos.y, pos.width, activity, instConfig, theme, accent, pos.height, widgetKey);
          break;
        }
        case 'elevation': {
          const elevH = 110;
          const pos = this.getWidgetPos(instConfig, widgetKey, defaultX, defaultY, defaultW, elevH);
          this.drawElevationProfile(ctx, pos.x, pos.y, pos.width, pos.height, activity, instConfig, theme, accent, widgetKey);
          break;
        }
        case 'paceGraph': {
          const pgH = 110;
          const pos = this.getWidgetPos(instConfig, widgetKey, defaultX, defaultY, defaultW, pgH);
          this.drawPaceGraph(ctx, pos.x, pos.y, pos.width, pos.height, activity, instConfig, theme, accent, widgetKey);
          break;
        }
        case 'hrGraph': {
          const hrH = 110;
          const pos = this.getWidgetPos(instConfig, widgetKey, defaultX, defaultY, defaultW, hrH);
          this.drawHeartRateGraph(ctx, pos.x, pos.y, pos.width, pos.height, activity, instConfig, theme, accent, widgetKey);
          break;
        }
        case 'hrBadge': {
          const hbH = 70;
          const pos = this.getWidgetPos(instConfig, widgetKey, defaultX, defaultY, Math.min(defaultW, 200), hbH);
          this.drawAvgHeartRateBadge(ctx, pos.x, pos.y, pos.width, activity, instConfig, theme, accent, pos.height, widgetKey);
          break;
        }
        case 'hrZones': {
          const hzH = 130;
          const pos = this.getWidgetPos(instConfig, widgetKey, defaultX, defaultY, defaultW, hzH);
          this.drawHrZonesBar(ctx, pos.x, pos.y, pos.width, activity, instConfig, theme, accent, pos.height, widgetKey);
          break;
        }
        case 'map': {
          const mapH = 260;
          const pos = this.getWidgetPos(instConfig, widgetKey, defaultX, defaultY, defaultW, mapH);
          this.drawRouteMap(ctx, pos.x, pos.y, pos.width, pos.height, activity, instConfig, theme, accent, widgetKey);
          break;
        }
        case 'brand': {
          const brandH = 50;
          const pos = this.getWidgetPos(instConfig, widgetKey, defaultX, defaultY, defaultW, brandH);
          this.drawBrandWatermark(ctx, pos.x, pos.y, pos.width, instConfig, theme, accent, pos.height, widgetKey);
          break;
        }
        case 'header': {
          const headH = 120;
          const pos = this.getWidgetPos(instConfig, widgetKey, defaultX, defaultY, defaultW, headH);
          this.drawHeader(ctx, pos.x, pos.y, pos.width, activity, instConfig, theme, accent, pos.height, widgetKey);
          break;
        }
      }
    });
  }

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

      // Rotation around item center
      const itemRot = typeof item.rotation === 'number' ? item.rotation : 0;
      if (itemRot !== 0) {
        ctx.translate(x + boxW / 2, y + boxH / 2);
        ctx.rotate((itemRot * Math.PI) / 180);
        ctx.translate(-(x + boxW / 2), -(y + boxH / 2));
      }

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

      let drawTextX = x + boxW / 2;
      if (align === 'left') drawTextX = x + padX;
      else if (align === 'right') drawTextX = x + boxW - padX;

      const hasShadow = item.textShadow !== false && (item.textShadow || item.shadowColor);
      const hasOutline = !!item.textOutline;

      if (hasOutline) {
        ctx.save();
        ctx.lineWidth = (item.textOutlineWidth || 2) * 2;
        ctx.strokeStyle = item.textOutlineColor || '#000000';
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        ctx.textAlign = align;
        ctx.textBaseline = 'middle';
        if (hasShadow) {
          ctx.shadowColor = item.textShadowColor || item.shadowColor || 'rgba(0, 0, 0, 0.8)';
          ctx.shadowBlur = item.textShadowBlur !== undefined ? item.textShadowBlur : 8;
          ctx.shadowOffsetX = item.textShadowOffsetX || 0;
          ctx.shadowOffsetY = item.textShadowOffsetY || 3;
        }
        ctx.strokeText(item.text, drawTextX, y + boxH / 2);
        ctx.restore();
      }

      // Draw Text
      ctx.fillStyle = color;
      ctx.textAlign = align;
      ctx.textBaseline = 'middle';
      if (hasShadow && !hasOutline) {
        ctx.shadowColor = item.textShadowColor || item.shadowColor || 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = item.textShadowBlur !== undefined ? item.textShadowBlur : 8;
        ctx.shadowOffsetX = item.textShadowOffsetX || 0;
        ctx.shadowOffsetY = item.textShadowOffsetY || 3;
      } else {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }

      ctx.fillText(item.text, drawTextX, y + boxH / 2);
      ctx.restore();

      // Record bounds for drag & drop hit test
      const itemId = item.id || `custom_${index}`;
      this.recordBounds(itemId, item.text, x, y, boxW, boxH, itemRot);
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
      case 'teko':
        return "'Teko', 'Anton', 'Bebas Neue', sans-serif";
      case 'bungee':
        return "'Bungee', 'Impact', sans-serif";
      case 'russo':
        return "'Russo One', 'Anton', sans-serif";
      case 'oswald':
        return "'Oswald', 'Anton', sans-serif";
      case 'outfit':
        return "'Outfit', -apple-system, sans-serif";
      case 'montserrat':
        return "'Montserrat', -apple-system, sans-serif";
      case 'barlow':
        return "'Barlow Condensed', 'Bebas Neue', sans-serif";
      case 'orbitron':
        return "'Orbitron', 'Rajdhani', sans-serif";
      case 'chakra':
        return "'Chakra Petch', 'Rajdhani', sans-serif";
      case 'fira':
        return "'Fira Code', 'JetBrains Mono', monospace";
      case 'cinzel':
        return "'Cinzel', 'Playfair Display', serif";
      case 'righteous':
        return "'Righteous', 'Montserrat', sans-serif";
      case 'syne':
        return "'Syne', 'Anton', sans-serif";
      case 'marker':
        return "'Permanent Marker', 'Impact', cursive";
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
