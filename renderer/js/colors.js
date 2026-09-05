// ── Colors Popup ──────────────────────────────────────────────

const COLOR_SWATCHES = [
  '#ff4444', '#ff8800', '#ffcc00', '#44dd44',
  '#00cccc', '#4488ff', '#9966ff', '#ff44bb',
  '#888888', '#ffffff',
];

let _colorsSnapshot = null; // snapshot pris à l'ouverture (pour Annuler)

// Rafraîchit le panneau droit si le câble sélectionné est du type modifié
function _refreshCablePanel(type) {
  if (!APP.selCable) return;
  const sel = APP.cables.find(c => c.id === APP.selCable);
  if (sel && sel.type === type && typeof openCablePanel === 'function') {
    openCablePanel(APP.selCable);
  }
}

function openColorsPopup() {
  _colorsSnapshot = captureState(); // état AVANT toute modif couleur
  _renderColorsPopup();

  const modal = document.getElementById('modal-colors');
  if (modal) modal.classList.add('open');

  // Câblage boutons footer
  const applyBtn  = document.getElementById('colors-apply-btn');
  const cancelBtn = document.getElementById('colors-cancel-btn');
  if (applyBtn)  applyBtn.onclick  = () => modal.classList.remove('open');
  if (cancelBtn) cancelBtn.onclick = () => {
    modal.classList.remove('open');
    if (_colorsSnapshot) applyState(_colorsSnapshot);
  };
}

// ── CSS gradient selon l'état dash ───────────────────────────
function _dashGradient(color, dash) {
  if (dash === 'long')
    return `repeating-linear-gradient(90deg,${color} 0,${color} 10px,transparent 10px,transparent 16px)`;
  if (dash && dash !== 'solid')
    return `repeating-linear-gradient(90deg,${color} 0,${color} 4px,transparent 4px,transparent 8px)`;
  return color;
}

function _isDash(d) { return d && d !== 'solid'; }

function _renderColorsPopup() {
  const body = document.getElementById('colors-popup-body');
  if (!body) return;
  body.innerHTML = '';

  // ── Picker couleur + (optionnel) sélecteur trait ──────────
  function _makePicker(currentColor, onColorChange, dashOpts, sectionTitle) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'padding:10px 14px 12px;background:#070c18;border-top:1px solid #1e2d45;';

    if (sectionTitle) {
      const titleEl = document.createElement('div');
      titleEl.style.cssText = 'font-family:var(--mono);font-size:9px;letter-spacing:2px;color:var(--textdim);text-transform:uppercase;margin-bottom:8px;user-select:none;';
      titleEl.textContent = sectionTitle;
      wrap.appendChild(titleEl);
    }

    // ── Swatches ──────────────────────────────────────────────
    const swRow = document.createElement('div');
    swRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px;';

    const _highlightSwatch = (c) => {
      swRow.querySelectorAll('button').forEach(b => {
        b.style.borderColor = b.title.toLowerCase() === c.toLowerCase() ? '#fff' : 'transparent';
      });
    };

    COLOR_SWATCHES.forEach(c => {
      const s = document.createElement('button');
      s.style.cssText = `width:22px;height:22px;border-radius:4px;background:${c};border:2px solid ${c.toLowerCase() === currentColor.toLowerCase() ? '#fff' : 'transparent'};cursor:pointer;transition:border-color .15s;flex-shrink:0;`;
      s.title = c;
      s.addEventListener('click', () => {
        try { pushUndo(); } catch(e) { console.warn('colors pushUndo', e); } // undo avant chaque swatch
        _highlightSwatch(c);
        colorIn.value = c;
        onColorChange(c);
      });
      swRow.appendChild(s);
    });
    wrap.appendChild(swRow);

    // ── Roue couleur ──────────────────────────────────────────
    const wheelRow = document.createElement('div');
    wheelRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:' + (dashOpts ? '12px' : '0') + ';';

    const colorIn = document.createElement('input');
    colorIn.type  = 'color';
    colorIn.value = currentColor;
    colorIn.style.cssText = 'width:34px;height:26px;border:none;background:none;cursor:pointer;padding:0;border-radius:4px;outline:none;';

    // pushUndo une seule fois par session de drag (pas à chaque pixel)
    let _wheelUndoPushed = false;
    colorIn.addEventListener('input', () => {
      if (!_wheelUndoPushed) {
        try { pushUndo(); } catch(e) { console.warn('colors pushUndo wheel', e); }
        _wheelUndoPushed = true;
      }
      _highlightSwatch(colorIn.value); // désactive les swatches si roue
      swRow.querySelectorAll('button').forEach(b => { b.style.borderColor = 'transparent'; });
      onColorChange(colorIn.value);
    });
    colorIn.addEventListener('change', () => {
      _wheelUndoPushed = false; // reset pour la prochaine session de drag
    });

    const hint = document.createElement('span');
    hint.style.cssText = 'font-family:var(--mono);font-size:10px;color:var(--textdim);user-select:none;';
    hint.setAttribute('data-i18n', 'color_wheel_hint');
    hint.textContent = t('color_wheel_hint');
    wheelRow.appendChild(colorIn);
    wheelRow.appendChild(hint);
    wrap.appendChild(wheelRow);

    // ── Sélecteur de trait (câbles seulement) ─────────────────
    if (dashOpts) {
      const sep = document.createElement('div');
      sep.style.cssText = 'height:1px;background:#1e2d45;margin-bottom:10px;';
      wrap.appendChild(sep);

      const dashRow = document.createElement('div');
      dashRow.style.cssText = 'display:flex;align-items:center;gap:6px;';

      const lbl = document.createElement('span');
      lbl.style.cssText = 'font-family:var(--mono);font-size:10px;color:var(--textdim);margin-right:4px;user-select:none;flex-shrink:0;';
      lbl.setAttribute('data-i18n', 'dash_style_label');
      lbl.textContent = t('dash_style_label');
      dashRow.appendChild(lbl);

      const DASH_OPTIONS = [
        { key: 'solid', i18n: 'dash_solid',
          css: 'background:#aec6e8;height:2px;width:28px;border-radius:1px;' },
        { key: 'short', i18n: 'dash_short',
          css: 'background:repeating-linear-gradient(90deg,#aec6e8 0,#aec6e8 4px,transparent 4px,transparent 8px);height:2px;width:28px;' },
        { key: 'long',  i18n: 'dash_long',
          css: 'background:repeating-linear-gradient(90deg,#aec6e8 0,#aec6e8 10px,transparent 10px,transparent 16px);height:2px;width:28px;' },
      ];

      let _activeDash = dashOpts.current;
      const dashBtns  = {};

      DASH_OPTIONS.forEach(opt => {
        const btn = document.createElement('button');
        btn.title = t(opt.i18n);
        const isActive = _activeDash === opt.key;
        btn.style.cssText = `display:flex;align-items:center;justify-content:center;width:46px;height:26px;border-radius:4px;border:2px solid ${isActive ? '#4a8fff' : '#1e2d45'};background:${isActive ? '#111e35' : 'transparent'};cursor:pointer;transition:border-color .15s,background .15s;`;
        const preview = document.createElement('div');
        preview.style.cssText = opt.css;
        btn.appendChild(preview);
        btn.addEventListener('click', () => {
          if (_activeDash === opt.key) return; // pas de changement, pas d'undo
          try { pushUndo(); } catch(e) { console.warn('colors pushUndo dash', e); }
          _activeDash = opt.key;
          Object.entries(dashBtns).forEach(([k, b]) => {
            b.style.borderColor = k === opt.key ? '#4a8fff' : '#1e2d45';
            b.style.background  = k === opt.key ? '#111e35' : 'transparent';
          });
          dashOpts.onChange(opt.key);
        });
        dashBtns[opt.key] = btn;
        dashRow.appendChild(btn);
      });

      wrap.appendChild(dashRow);
    }

    return wrap;
  }

  // Picker zone : toggle Intérieur / Bordure → un seul picker partagé
  function _makeZonePicker(fillColor, onFillChange, borderColor, onBorderChange, dashOpts) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'padding:10px 14px 12px;background:#070c18;border-top:1px solid #1e2d45;';

    let activeTab = 'interior';
    let _fill = fillColor, _border = borderColor;
    let _wheelUndoPushed = false;

    // ── Toggle ──────────────────────────────────────────────
    const toggleRow = document.createElement('div');
    toggleRow.style.cssText = 'display:flex;gap:4px;margin-bottom:10px;';

    const _styleTab = (btn, active) => {
      btn.style.cssText = `flex:1;padding:5px 0;font-family:var(--mono);font-size:10px;border-radius:4px;cursor:pointer;border:1px solid ${active ? '#4a8fff' : '#1e2d45'};background:${active ? '#111e35' : 'transparent'};color:${active ? '#fff' : 'var(--textdim)'};transition:all .15s;`;
    };
    const btnIn = document.createElement('button');
    btnIn.textContent = t('colors_interior');
    const btnBd = document.createElement('button');
    btnBd.textContent = t('colors_border');
    _styleTab(btnIn, true);
    _styleTab(btnBd, false);
    toggleRow.appendChild(btnIn);
    toggleRow.appendChild(btnBd);
    wrap.appendChild(toggleRow);

    // ── Swatches ────────────────────────────────────────────
    const swRow = document.createElement('div');
    swRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px;';

    const colorIn = document.createElement('input');
    colorIn.type = 'color';
    colorIn.style.cssText = 'width:34px;height:26px;border:none;background:none;cursor:pointer;padding:0;border-radius:4px;outline:none;';

    const _curColor  = () => activeTab === 'interior' ? _fill : _border;
    const _applyColor = (c) => {
      if (activeTab === 'interior') { _fill   = c; onFillChange(c);   }
      else                          { _border = c; onBorderChange(c); }
    };
    const _highlightSwatch = (c) => {
      swRow.querySelectorAll('button').forEach(b => {
        b.style.borderColor = b.title.toLowerCase() === c.toLowerCase() ? '#fff' : 'transparent';
      });
    };

    COLOR_SWATCHES.forEach(c => {
      const s = document.createElement('button');
      s.style.cssText = `width:22px;height:22px;border-radius:4px;background:${c};border:2px solid transparent;cursor:pointer;transition:border-color .15s;flex-shrink:0;`;
      s.title = c;
      s.addEventListener('click', () => {
        try { pushUndo(); } catch(e) {}
        _highlightSwatch(c);
        colorIn.value = c;
        _applyColor(c);
      });
      swRow.appendChild(s);
    });
    wrap.appendChild(swRow);

    // ── Color wheel ─────────────────────────────────────────
    const wheelRow = document.createElement('div');
    wheelRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:' + (dashOpts ? '12px' : '0') + ';';
    colorIn.value = _curColor();
    colorIn.addEventListener('input', () => {
      if (!_wheelUndoPushed) { try { pushUndo(); } catch(e) {} _wheelUndoPushed = true; }
      swRow.querySelectorAll('button').forEach(b => b.style.borderColor = 'transparent');
      _applyColor(colorIn.value);
    });
    colorIn.addEventListener('change', () => { _wheelUndoPushed = false; });
    const hint = document.createElement('span');
    hint.style.cssText = 'font-family:var(--mono);font-size:10px;color:var(--textdim);user-select:none;';
    hint.textContent = t('color_wheel_hint');
    wheelRow.appendChild(colorIn);
    wheelRow.appendChild(hint);
    wrap.appendChild(wheelRow);

    // ── Dash (bordure uniquement, caché par défaut) ──────────
    let dashSection = null;
    if (dashOpts) {
      dashSection = document.createElement('div');
      dashSection.style.display = 'none';

      const sep = document.createElement('div');
      sep.style.cssText = 'height:1px;background:#1e2d45;margin-bottom:10px;';
      dashSection.appendChild(sep);

      const dashRow = document.createElement('div');
      dashRow.style.cssText = 'display:flex;align-items:center;gap:6px;';
      const lbl = document.createElement('span');
      lbl.style.cssText = 'font-family:var(--mono);font-size:10px;color:var(--textdim);margin-right:4px;user-select:none;flex-shrink:0;';
      lbl.textContent = t('dash_style_label');
      dashRow.appendChild(lbl);

      const DASH_OPTS = [
        { key: 'solid', i18n: 'dash_solid', css: 'background:#aec6e8;height:2px;width:28px;border-radius:1px;' },
        { key: 'short', i18n: 'dash_short', css: 'background:repeating-linear-gradient(90deg,#aec6e8 0,#aec6e8 4px,transparent 4px,transparent 8px);height:2px;width:28px;' },
        { key: 'long',  i18n: 'dash_long',  css: 'background:repeating-linear-gradient(90deg,#aec6e8 0,#aec6e8 10px,transparent 10px,transparent 16px);height:2px;width:28px;' },
      ];
      let _activeDash = dashOpts.current;
      const dashBtns  = {};
      DASH_OPTS.forEach(opt => {
        const btn = document.createElement('button');
        btn.title = t(opt.i18n);
        const active = _activeDash === opt.key;
        btn.style.cssText = `display:flex;align-items:center;justify-content:center;width:46px;height:26px;border-radius:4px;border:2px solid ${active ? '#4a8fff' : '#1e2d45'};background:${active ? '#111e35' : 'transparent'};cursor:pointer;transition:border-color .15s,background .15s;`;
        const preview = document.createElement('div');
        preview.style.cssText = opt.css;
        btn.appendChild(preview);
        btn.addEventListener('click', () => {
          if (_activeDash === opt.key) return;
          try { pushUndo(); } catch(e) {}
          _activeDash = opt.key;
          Object.entries(dashBtns).forEach(([k, b]) => {
            b.style.borderColor = k === opt.key ? '#4a8fff' : '#1e2d45';
            b.style.background  = k === opt.key ? '#111e35' : 'transparent';
          });
          dashOpts.onChange(opt.key);
        });
        dashBtns[opt.key] = btn;
        dashRow.appendChild(btn);
      });
      dashSection.appendChild(dashRow);
      wrap.appendChild(dashSection);
    }

    // ── Switch tab ──────────────────────────────────────────
    const _switchTab = (tab) => {
      activeTab = tab;
      _styleTab(btnIn, tab === 'interior');
      _styleTab(btnBd, tab === 'border');
      colorIn.value = _curColor();
      _highlightSwatch(_curColor());
      if (dashSection) dashSection.style.display = tab === 'border' ? 'block' : 'none';
    };
    btnIn.addEventListener('click', () => _switchTab('interior'));
    btnBd.addEventListener('click', () => _switchTab('border'));

    return wrap;
  }

  // ── Colonne ───────────────────────────────────────────────
  function _makeColumn(i18nKey, items, isLast) {
    const col = document.createElement('div');
    col.style.cssText = `flex:1;display:flex;flex-direction:column;overflow:hidden;${isLast ? '' : 'border-right:1px solid #1e2d45;'}`;

    const hdr = document.createElement('div');
    hdr.style.cssText = 'padding:11px 14px;font-family:var(--mono);font-size:10px;letter-spacing:2px;color:var(--textdim);border-bottom:1px solid #1e2d45;background:#070c18;flex-shrink:0;text-transform:uppercase;';
    hdr.setAttribute('data-i18n', i18nKey);
    hdr.textContent = t(i18nKey);
    col.appendChild(hdr);

    const list = document.createElement('div');
    list.style.cssText = 'flex:1;overflow-y:auto;';

    if (!items.length) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding:18px 14px;color:var(--textdim);font-size:10px;font-family:var(--mono);text-align:center;';
      empty.setAttribute('data-i18n', 'col_empty');
      empty.textContent = t('col_empty');
      list.appendChild(empty);
      col.appendChild(list);
      return col;
    }

    let openPicker = null;
    let openRow    = null;

    items.forEach(item => {
      const rowWrap = document.createElement('div');

      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:9px;padding:9px 14px;cursor:pointer;border-bottom:1px solid #0d1424;transition:background .1s;user-select:none;';
      row.addEventListener('mouseenter', () => { if (openRow !== row) row.style.background = '#0d1628'; });
      row.addEventListener('mouseleave', () => { if (openRow !== row) row.style.background = ''; });

      const swatch = document.createElement('div');
      if (item.borderColor !== undefined) {
        // Zone : swatch bicolore (fond + bordure distincte)
        swatch.style.cssText = `width:14px;height:14px;border-radius:3px;background:${item.color};flex-shrink:0;border:2px solid ${item.borderColor};`;
      } else {
        swatch.style.cssText = `width:14px;height:14px;border-radius:3px;background:${item.color};flex-shrink:0;border:1px solid rgba(255,255,255,.18);`;
      }

      const label = document.createElement('span');
      label.style.cssText = 'font-family:var(--mono);font-size:11px;color:var(--text);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      label.textContent = tType(item.label);

      row.appendChild(swatch);
      row.appendChild(label);

      // Indicateur ligne (si dashStyle défini)
      if (item.dashStyle !== undefined) {
        const lineEl = document.createElement('div');
        lineEl.style.cssText = 'width:24px;height:2px;flex-shrink:0;';
        const updateLine = (color, dash) => {
          if (dash === 'long')
            lineEl.style.background = `repeating-linear-gradient(90deg,${color} 0,${color} 10px,transparent 10px,transparent 16px)`;
          else if (_isDash(dash))
            lineEl.style.background = `repeating-linear-gradient(90deg,${color} 0,${color} 4px,transparent 4px,transparent 8px)`;
          else
            lineEl.style.background = color;
        };
        updateLine(item.lineColor ?? item.color, item.dashStyle);
        item._lineEl     = lineEl;
        item._updateLine = updateLine;
        row.appendChild(lineEl);
      }

      item._swatchEl = swatch;

      row.addEventListener('click', () => {
        if (openPicker) {
          openPicker.remove();
          openPicker = null;
          const wasThis = openRow === row;
          if (openRow) openRow.style.background = '';
          openRow = null;
          if (wasThis) return;
        }
        openRow = row;
        row.style.background = '#111e35';

        const dashOpts = item.dashStyle !== undefined ? {
          current:  item.dashStyle,
          onChange: (newDash) => {
            item.dashStyle = newDash;
            if (item._updateLine) item._updateLine(item.lineColor ?? item.color, newDash);
            item.onDashChange(newDash);
          },
        } : null;

        let picker;
        if (item.borderColor !== undefined) {
          // Zone : picker deux sections (intérieur + bordure)
          picker = _makeZonePicker(
            item.color,
            (newFill) => {
              item.color = newFill;
              swatch.style.background = newFill;
              item.onColorChange(newFill);
            },
            item.borderColor,
            (newBorder) => {
              item.borderColor = newBorder;
              item.lineColor   = newBorder;
              swatch.style.borderColor = newBorder;
              if (item._updateLine) item._updateLine(newBorder, item.dashStyle);
              item.onBorderColorChange(newBorder);
            },
            dashOpts,
          );
        } else {
          picker = _makePicker(item.color, (newColor) => {
            item.color = newColor;
            swatch.style.background = newColor;
            if (item._updateLine) item._updateLine(newColor, item.dashStyle);
            item.onColorChange(newColor);
          }, dashOpts);
        }

        openPicker = picker;
        rowWrap.appendChild(picker);
      });

      rowWrap.appendChild(row);
      list.appendChild(rowWrap);
    });

    col.appendChild(list);
    return col;
  }

  // ── Catégories ────────────────────────────────────────────
  const catItems = APP.categories
    .filter(c => !c.virtual)
    .map(cat => ({
      label: getCat(cat.id).label,
      color: cat.color || '#888888',
      dashStyle: undefined,
      onColorChange: (newColor) => {
        cat.color = newColor;
        if (cat.label_key) NATIVE_CAT_COLOR_OVERRIDES[cat.id] = newColor;
        saveUserCats();
        if (typeof renderSidebarCats === 'function') renderSidebarCats();
        if (typeof renderNodes       === 'function') renderNodes();
      },
      onDashChange: null,
    }));
  body.appendChild(_makeColumn('col_categories', catItems, false));

  // ── Câbles ────────────────────────────────────────────────
  // Source de vérité : les câbles réels en APP.cables (évite les incohérences
  // si un override n'a pas été sauvegardé proprement)
  const _firstCableOf = (type) => APP.cables.find(c => c.type === type);

  const nativeEntries = Object.entries(CABLE_META).map(([type, meta]) => {
    const m = getCableMeta(type);
    const actual = _firstCableOf(type);
    // Priorité : override stocké → câble réel → méta par défaut
    const dashStyle = USER_CABLE_DASH_OVERRIDES[type] !== undefined
      ? USER_CABLE_DASH_OVERRIDES[type]
      : actual ? _normDash(actual.dashed) : m.dashed;
    const color = USER_CABLE_COLOR_OVERRIDES[type] || (actual ? actual.color : m.color);
    return { label: type, color, dashStyle, isCustom: false };
  });
  const customEntries = USER_CABLE_TYPES.map(ct => {
    const actual = _firstCableOf(ct.id);
    const dashStyle = ct.dash || (actual ? _normDash(actual.dashed) : 'solid');
    const color = actual ? actual.color : ct.color;
    return { label: ct.id, color, dashStyle, isCustom: true };
  });

  const cableItems = [...nativeEntries, ...customEntries].map(entry => ({
    ...entry,
    onColorChange: (newColor) => {
      USER_CABLE_COLOR_OVERRIDES[entry.label] = newColor;
      const uc = USER_CABLE_TYPES.find(t => t.id === entry.label);
      if (uc) uc.color = newColor;
      APP.cables.forEach(c => { if (c.type === entry.label) c.color = newColor; });
      saveUserCats();
      if (typeof redrawOnlyCables    === 'function') redrawOnlyCables();
      if (typeof renderSidebarCables === 'function') renderSidebarCables();
      _refreshCablePanel(entry.label);
    },
    onDashChange: (newDash) => {
      USER_CABLE_DASH_OVERRIDES[entry.label] = newDash;
      const uc = USER_CABLE_TYPES.find(t => t.id === entry.label);
      if (uc) uc.dash = newDash;
      APP.cables.forEach(c => { if (c.type === entry.label) c.dashed = newDash; });
      saveUserCats();
      if (typeof redrawOnlyCables    === 'function') redrawOnlyCables();
      if (typeof renderSidebarCables === 'function') renderSidebarCables();
      _refreshCablePanel(entry.label);
    },
  }));
  body.appendChild(_makeColumn('col_cables', cableItems, false));

  // ── Zones ─────────────────────────────────────────────────
  const zoneItems = Object.values(APP.zones || {}).map(zone => {
    const fillColor   = zone.color       || '#00d4ff';
    const borderColor = zone.borderColor || fillColor;
    const _applyZone  = () => {
      const el = document.getElementById(`zone-${zone.id}`);
      if (el && typeof _applyZoneStyles === 'function') _applyZoneStyles(zone.id, el);
      if (APP.selZone === zone.id && typeof openZonePanel === 'function') openZonePanel(zone.id);
      setDirty();
    };
    return {
      label:       zone.name || t('untitled'),
      color:       fillColor,
      borderColor,
      lineColor:   borderColor,
      dashStyle:   zone.dash || 'solid',
      onColorChange: (newColor) => {
        zone.color = newColor;
        _applyZone();
      },
      onBorderColorChange: (newColor) => {
        zone.borderColor = newColor;
        _applyZone();
      },
      onDashChange: (newDash) => {
        zone.dash = newDash;
        _applyZone();
      },
    };
  });
  body.appendChild(_makeColumn('col_zones', zoneItems, true));
}
