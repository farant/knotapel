/* web-components.js — Shared polynomial library and web components for Knotapel demos
 *
 * Components use the page's CSS custom properties for theming:
 *   --bg, --surface, --surface2, --border, --text, --text-dim, --text-bright
 *   --accent-a, --accent-b, --accent-loop, --accent-poly
 *   --positive, --negative
 *
 * Set --accent on any component (or a parent) to override its accent color.
 * Default accent is var(--accent-poly).
 */
(function () {
  'use strict';

  /* ==========================================================================
   * POLYNOMIAL ARITHMETIC — Laurent polynomials over Z[A, A^-1]
   * ========================================================================== */

  function Poly(c, lo) {
    this.c = c ? c.slice() : [];
    this.lo = lo || 0;
  }

  Poly.zero = function () { return new Poly([], 0); };

  Poly.mono = function (coeff, exp) {
    if (coeff === 0) return Poly.zero();
    return new Poly([coeff], exp);
  };

  Poly.prototype.trim = function () {
    var a = 0, b = this.c.length - 1;
    while (a <= b && this.c[a] === 0) a++;
    if (a > b) { this.c = []; this.lo = 0; return this; }
    while (b > a && this.c[b] === 0) b--;
    this.c = this.c.slice(a, b + 1);
    this.lo += a;
    return this;
  };

  Poly.prototype.isZero = function () {
    return this.c.length === 0;
  };

  function polyAdd(a, b) {
    if (!a.c.length) return new Poly(b.c, b.lo);
    if (!b.c.length) return new Poly(a.c, a.lo);
    var lo = Math.min(a.lo, b.lo);
    var hi = Math.max(a.lo + a.c.length - 1, b.lo + b.c.length - 1);
    var c = new Array(hi - lo + 1);
    for (var i = 0; i < c.length; i++) c[i] = 0;
    for (var i = 0; i < a.c.length; i++) c[a.lo + i - lo] += a.c[i];
    for (var i = 0; i < b.c.length; i++) c[b.lo + i - lo] += b.c[i];
    return new Poly(c, lo).trim();
  }

  function polyMul(a, b) {
    if (!a.c.length || !b.c.length) return Poly.zero();
    var len = a.c.length + b.c.length - 1;
    var c = new Array(len);
    for (var i = 0; i < len; i++) c[i] = 0;
    for (var i = 0; i < a.c.length; i++)
      for (var j = 0; j < b.c.length; j++)
        c[i + j] += a.c[i] * b.c[j];
    return new Poly(c, a.lo + b.lo).trim();
  }

  function polyEq(a, b) {
    if (a.c.length !== b.c.length) return false;
    if (!a.c.length) return true;
    if (a.lo !== b.lo) return false;
    for (var i = 0; i < a.c.length; i++)
      if (a.c[i] !== b.c[i]) return false;
    return true;
  }

  /* Mirror: replace A with A^{-1} (reverse coefficients, negate exponents) */
  function polyMirror(p) {
    if (!p.c.length) return Poly.zero();
    var c = p.c.slice().reverse();
    var lo = -(p.lo + p.c.length - 1);
    return new Poly(c, lo).trim();
  }

  /* Check if coefficients are symmetric and exponent range is centered on 0 */
  function polyIsPalindromic(p) {
    if (!p.c.length) return true;
    for (var i = 0; i < Math.floor(p.c.length / 2); i++)
      if (p.c[i] !== p.c[p.c.length - 1 - i]) return false;
    return (p.lo + p.lo + p.c.length - 1) === 0;
  }

  /* Render to styled HTML spans */
  function polyToHTML(p) {
    if (!p.c.length) return '<span class="coeff-pos">0</span>';
    var parts = [];
    for (var i = 0; i < p.c.length; i++) {
      if (p.c[i] === 0) continue;
      var e = p.lo + i, coeff = p.c[i], s = '';
      if (parts.length > 0) s += coeff > 0 ? ' + ' : ' \u2212 ';
      else if (coeff < 0) s += '\u2212';
      var ac = Math.abs(coeff);
      var cls = coeff > 0 ? 'coeff-pos' : 'coeff-neg';
      if (ac !== 1 || e === 0) s += ac;
      if (e === 1) s += '<span class="var-a">A</span>';
      else if (e === -1) s += '<span class="var-a">A</span><span class="sup">\u22121</span>';
      else if (e !== 0) s += '<span class="var-a">A</span><span class="sup">' + e + '</span>';
      parts.push('<span class="' + cls + '">' + s + '</span>');
    }
    return parts.join('');
  }

  /* Render to plain text */
  function polyToText(p) {
    if (!p.c.length) return '0';
    var parts = [];
    for (var i = 0; i < p.c.length; i++) {
      if (p.c[i] === 0) continue;
      var e = p.lo + i, c = p.c[i], s = '';
      if (parts.length > 0) s += c > 0 ? ' + ' : ' - ';
      else if (c < 0) s += '-';
      var ac = Math.abs(c);
      if (ac !== 1 || e === 0) s += ac;
      if (e === 1) s += 'A';
      else if (e === -1) s += 'A\u207b\u00b9';
      else if (e > 0) s += 'A^' + e;
      else if (e < 0) s += 'A^(' + e + ')';
      parts.push(s);
    }
    return parts.join('');
  }

  /* The loop value delta = -A^2 - A^{-2} */
  var D_POLY = polyAdd(Poly.mono(-1, 2), Poly.mono(-1, -2));

  /* Expose polynomial library globally */
  window.Poly = Poly;
  window.polyAdd = polyAdd;
  window.polyMul = polyMul;
  window.polyEq = polyEq;
  window.polyMirror = polyMirror;
  window.polyIsPalindromic = polyIsPalindromic;
  window.polyToHTML = polyToHTML;
  window.polyToText = polyToText;
  window.D_POLY = D_POLY;

  /* Color helpers for canvas code */
  function getCSSColor(varName) {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(varName).trim();
  }
  function hexToRgba(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }
  window.getCSSColor = getCSSColor;
  window.hexToRgba = hexToRgba;


  /* ==========================================================================
   * INJECT COMPONENT STYLES (once)
   * ========================================================================== */

  if (!document.getElementById('kn-components-css')) {
    var style = document.createElement('style');
    style.id = 'kn-components-css';
    style.textContent = [

      /* --- poly-display --- */
      'poly-display { display: inline; }',
      'poly-display .coeff-pos { color: var(--positive, #418220); }',
      'poly-display .coeff-neg { color: var(--negative, #FF1871); }',
      'poly-display .var-a { color: var(--accent-poly, #7D5D7D); font-style: italic; }',
      'poly-display .sup { font-size: 0.8em; vertical-align: super; }',

      /* --- selector-bar --- */
      'selector-bar { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }',
      'selector-bar button {' +
        'font-family: "Crimson Pro", serif; font-size: 1rem; padding: 0.55rem 1.3rem;' +
        'background: var(--surface, #CABAA2); border: 1px solid var(--border, #7D5D7D);' +
        'color: var(--text-dim, #7D5D7D); cursor: pointer; border-radius: 2px;' +
        'transition: all 0.25s ease; letter-spacing: 0.02em; }',
      'selector-bar button:hover {' +
        'border-color: var(--accent, var(--accent-poly, #7D5D7D));' +
        'color: var(--text, #354524); }',
      'selector-bar button[aria-pressed="true"] {' +
        'background: var(--surface2, #EBDBC2);' +
        'border-color: var(--accent, var(--accent-poly, #7D5D7D));' +
        'color: var(--accent, var(--accent-poly, #7D5D7D)); }',

      /* --- panel-card --- */
      'panel-card {' +
        'display: block; background: var(--surface, #CABAA2);' +
        'border: 1px solid var(--border, #7D5D7D); border-radius: 3px;' +
        'padding: 1.25rem; animation: knFadeIn 0.4s ease both; }',
      'panel-card .kn-panel-title {' +
        'font-family: "JetBrains Mono", monospace; font-size: 0.65rem;' +
        'text-transform: uppercase; letter-spacing: 0.12em;' +
        'color: var(--text-dim, #7D5D7D); margin-bottom: 1rem;' +
        'padding-bottom: 0.5rem; border-bottom: 1px solid var(--border, #7D5D7D); }',
      '@keyframes knFadeIn {' +
        'from { opacity: 0; transform: translateY(6px); }' +
        'to { opacity: 1; transform: translateY(0); } }',

      /* --- formula-box --- */
      'formula-box {' +
        'display: block; background: var(--surface, #CABAA2);' +
        'border-left: 3px solid var(--accent, var(--accent-poly, #7D5D7D));' +
        'padding: 1rem 1.25rem; margin: 1.25rem 0 1.5rem;' +
        'font-family: "Crimson Pro", serif; font-size: 1.15rem;' +
        'text-align: center; line-height: 1.9; }',
      'formula-box .var-a { color: var(--accent-poly, #7D5D7D); font-style: italic; }',
      'formula-box sup { font-size: 0.7em; }',
      'formula-box .kn-formula-label {' +
        'display: block; font-family: "JetBrains Mono", monospace; font-size: 0.62rem;' +
        'color: var(--text-dim, #7D5D7D); text-transform: uppercase;' +
        'letter-spacing: 0.1em; margin-bottom: 0.5rem; text-align: left; }',

      /* --- step-box --- */
      'step-box {' +
        'display: block; background: var(--surface2, #EBDBC2);' +
        'border: 1px solid var(--border, #7D5D7D); border-radius: 3px;' +
        'padding: 1rem 1.25rem; margin: 1rem 0; }',
      'step-box .kn-step-label {' +
        'font-family: "JetBrains Mono", monospace; font-size: 0.65rem;' +
        'color: var(--accent, var(--accent-poly, #7D5D7D));' +
        'text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.3rem; }',

      /* --- state-table --- */
      'state-table { display: block; }',
      'state-table .kn-st-wrap {' +
        'max-height: 420px; overflow-y: auto; scrollbar-width: thin;' +
        'scrollbar-color: var(--border, #7D5D7D) transparent; }',
      'state-table table {' +
        'width: 100%; border-collapse: collapse;' +
        'font-family: "JetBrains Mono", monospace; font-size: 0.72rem; }',
      'state-table th {' +
        'position: sticky; top: 0; background: var(--surface, #CABAA2);' +
        'color: var(--text-dim, #7D5D7D); font-weight: 400;' +
        'text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.6rem;' +
        'padding: 0.5rem 0.4rem; border-bottom: 1px solid var(--border, #7D5D7D);' +
        'text-align: left; }',
      'state-table td {' +
        'padding: 0.4rem 0.4rem; border-bottom: 1px solid rgba(125,93,125,0.3);' +
        'vertical-align: middle; }',
      'state-table tbody tr { transition: background 0.15s; cursor: pointer; }',
      'state-table tbody tr:hover { background: rgba(0,0,0,0.04); }',
      'state-table tbody tr.kn-active { background: rgba(0,0,0,0.08); }',
      'state-table tbody tr.kn-active td {' +
        'color: var(--accent, var(--accent-poly, #7D5D7D)); }',
      'state-table .kn-bits { display: inline-flex; gap: 2px; }',
      'state-table .kn-bit {' +
        'display: inline-block; width: 16px; height: 16px; line-height: 16px;' +
        'text-align: center; border-radius: 2px; font-size: 0.6rem; font-weight: 500; }',
      'state-table .kn-bit-a { background: rgba(97,190,255,0.15); color: var(--accent-a, #61BEFF); }',
      'state-table .kn-bit-b { background: rgba(166,105,0,0.15); color: var(--accent-b, #A66900); }',
      'state-table .kn-loops {' +
        'display: inline-block; background: rgba(65,130,32,0.12);' +
        'color: var(--accent-loop, #418220); padding: 1px 6px; border-radius: 2px; }',
      'state-table .coeff-pos { color: var(--positive, #418220); }',
      'state-table .coeff-neg { color: var(--negative, #FF1871); }',
      'state-table .var-a { color: var(--accent-poly, #7D5D7D); font-style: italic; }',
      'state-table .sup { font-size: 0.8em; vertical-align: super; }',

      /* --- accum-controls --- */
      'accum-controls {' +
        'display: flex; gap: 0.75rem; justify-content: center;' +
        'align-items: center; flex-wrap: wrap; }',
      'accum-controls button {' +
        'font-family: "JetBrains Mono", monospace; font-size: 0.7rem;' +
        'padding: 0.4rem 1rem; background: var(--surface2, #EBDBC2);' +
        'border: 1px solid var(--border, #7D5D7D);' +
        'color: var(--text-dim, #7D5D7D); cursor: pointer; border-radius: 2px;' +
        'transition: all 0.2s; letter-spacing: 0.03em; }',
      'accum-controls button:hover {' +
        'border-color: var(--accent, var(--accent-poly, #7D5D7D));' +
        'color: var(--text, #354524); }',
      'accum-controls button[aria-pressed="true"] {' +
        'border-color: var(--accent-loop, #418220);' +
        'color: var(--accent-loop, #418220); }',
      'accum-controls .kn-accum-label {' +
        'font-family: "JetBrains Mono", monospace; font-size: 0.65rem;' +
        'color: var(--text-dim, #7D5D7D); }',

      /* --- knot-viewer --- */
      'knot-viewer { display: block; position: relative; overflow: hidden; }',
      'knot-viewer canvas { display: block; }'

    ].join('\n');
    document.head.appendChild(style);
  }


  /* ==========================================================================
   * <poly-display> — Renders a Laurent polynomial with styled coefficients
   *
   * Usage:
   *   <poly-display></poly-display>
   *   element.poly = new Poly([1, 0, -1], -3);
   * ========================================================================== */

  customElements.define('poly-display', class extends HTMLElement {
    constructor() {
      super();
      this._poly = null;
    }

    get poly() { return this._poly; }
    set poly(p) {
      this._poly = p;
      this.innerHTML = p ? polyToHTML(p) : '';
    }
  });


  /* ==========================================================================
   * <selector-bar> — Row of toggle buttons
   *
   * Usage:
   *   <selector-bar value="trefoil" style="--accent: var(--accent-braid)">
   *     <button value="trefoil">Trefoil 3₁</button>
   *     <button value="figure-eight">Figure-Eight 4₁</button>
   *   </selector-bar>
   *
   * Properties: value (string)
   * Events:     change — detail: { value }
   * ========================================================================== */

  customElements.define('selector-bar', class extends HTMLElement {
    connectedCallback() {
      this._buttons = Array.from(this.querySelectorAll('button'));
      this._handleClick = this._handleClick.bind(this);
      this._buttons.forEach(function (btn) {
        btn.addEventListener('click', this._handleClick);
      }, this);
      this._sync();
    }

    disconnectedCallback() {
      (this._buttons || []).forEach(function (btn) {
        btn.removeEventListener('click', this._handleClick);
      }, this);
    }

    _handleClick(e) {
      var v = e.currentTarget.getAttribute('value');
      if (v !== this.value) {
        this.setAttribute('value', v);
        this.dispatchEvent(new CustomEvent('change', { detail: { value: v }, bubbles: true }));
      }
    }

    get value() { return this.getAttribute('value'); }
    set value(v) { this.setAttribute('value', v); }

    _sync() {
      var val = this.value;
      (this._buttons || []).forEach(function (btn) {
        btn.setAttribute('aria-pressed', btn.getAttribute('value') === val ? 'true' : 'false');
      });
    }

    static get observedAttributes() { return ['value']; }
    attributeChangedCallback() { this._sync(); }
  });


  /* ==========================================================================
   * <panel-card> — Surface panel with a titled header
   *
   * Usage:
   *   <panel-card panel-title="Crossings — click to toggle">
   *     ...content...
   *   </panel-card>
   *
   * The panel-title attribute supports HTML (e.g. for <sup> tags).
   * ========================================================================== */

  customElements.define('panel-card', class extends HTMLElement {
    connectedCallback() {
      if (this._initialized) return;
      this._initialized = true;
      var title = this.getAttribute('panel-title');
      if (title) {
        var el = document.createElement('div');
        el.className = 'kn-panel-title';
        el.innerHTML = title;
        this.prepend(el);
      }
    }
  });


  /* ==========================================================================
   * <formula-box> — Accented formula callout with label
   *
   * Usage:
   *   <formula-box label="Kauffman Bracket" style="--accent: var(--accent-tl)">
   *     ⟨K⟩ = Σ ...
   *   </formula-box>
   * ========================================================================== */

  customElements.define('formula-box', class extends HTMLElement {
    connectedCallback() {
      if (this._initialized) return;
      this._initialized = true;
      var label = this.getAttribute('label');
      if (label) {
        var el = document.createElement('span');
        el.className = 'kn-formula-label';
        el.textContent = label;
        this.prepend(el);
      }
    }
  });


  /* ==========================================================================
   * <step-box> — Step callout with a colored label
   *
   * Usage:
   *   <step-box label="A-smoothing" style="--accent: var(--accent-a)">
   *     <p>Connect arc 0 with arc 3...</p>
   *   </step-box>
   *
   * The label attribute supports HTML.
   * ========================================================================== */

  customElements.define('step-box', class extends HTMLElement {
    connectedCallback() {
      if (this._initialized) return;
      this._initialized = true;
      var label = this.getAttribute('label');
      if (label) {
        var el = document.createElement('div');
        el.className = 'kn-step-label';
        el.innerHTML = label;
        this.prepend(el);
      }
    }
  });


  /* ==========================================================================
   * <state-table> — Data-driven state-sum table
   *
   * Usage:
   *   <state-table></state-table>
   *
   *   el.data = {
   *     crossingCount: 3,
   *     states: [
   *       { index: 0, aCount: 3, bCount: 0, loops: 3, weightExp: 3, contribution: poly },
   *       ...
   *     ]
   *   };
   *   el.activeState = 0;
   *
   * Properties: data (object), activeState (number)
   * Events:     state-select — detail: { index }
   * ========================================================================== */

  customElements.define('state-table', class extends HTMLElement {
    constructor() {
      super();
      this._data = null;
      this._activeState = 0;
    }

    get data() { return this._data; }
    set data(d) {
      this._data = d;
      this._render();
    }

    get activeState() { return this._activeState; }
    set activeState(idx) {
      this._activeState = idx;
      var rows = this.querySelectorAll('tbody tr');
      rows.forEach(function (tr) {
        tr.classList.toggle('kn-active',
          parseInt(tr.getAttribute('data-index'), 10) === idx);
      });
    }

    _render() {
      var d = this._data;
      if (!d || !d.states) { this.innerHTML = ''; return; }

      var h = '<div class="kn-st-wrap"><table><thead><tr>' +
        '<th>#</th><th>Smoothings</th><th>Loops</th><th>Weight</th><th>Contribution</th>' +
        '</tr></thead><tbody>';

      for (var s = 0; s < d.states.length; s++) {
        var st = d.states[s];
        var cls = st.index === this._activeState ? ' class="kn-active"' : '';
        h += '<tr data-index="' + st.index + '"' + cls + '>';
        h += '<td style="color:var(--text-dim)">#' + st.index + '</td>';

        /* Smoothing bits */
        h += '<td><span class="kn-bits">';
        for (var b = 0; b < d.crossingCount; b++) {
          var isB = (st.index >> b) & 1;
          h += '<span class="kn-bit ' + (isB ? 'kn-bit-b' : 'kn-bit-a') + '">' +
            (isB ? 'B' : 'A') + '</span>';
        }
        h += '</span></td>';

        /* Loops */
        h += '<td><span class="kn-loops">' + st.loops + '</span></td>';

        /* Weight */
        h += '<td>A<sup style="font-size:0.6rem">' + st.weightExp +
          '</sup>\u00b7d<sup style="font-size:0.6rem">' + (st.loops - 1) + '</sup></td>';

        /* Contribution */
        h += '<td style="font-size:0.68rem">' + polyToHTML(st.contribution) + '</td>';
        h += '</tr>';
      }
      h += '</tbody></table></div>';
      this.innerHTML = h;

      /* Row click handlers */
      var self = this;
      this.querySelectorAll('tbody tr').forEach(function (tr) {
        tr.addEventListener('click', function () {
          self.dispatchEvent(new CustomEvent('state-select', {
            detail: { index: parseInt(this.getAttribute('data-index'), 10) },
            bubbles: true
          }));
        });
      });
    }
  });


  /* ==========================================================================
   * <accum-controls> — Playback controls for stepping through states
   *
   * Usage:
   *   <accum-controls current="0" total="7"></accum-controls>
   *
   * Properties: current (number), total (number), playing (boolean)
   * Events:     accum-reset, accum-prev, accum-next, accum-play, accum-pause
   * ========================================================================== */

  customElements.define('accum-controls', class extends HTMLElement {
    connectedCallback() {
      this._playing = false;
      this.innerHTML =
        '<button data-action="reset" title="Reset to state 0">\u27F2 Reset</button>' +
        '<button data-action="prev" title="Previous state">\u25C2 Prev</button>' +
        '<button data-action="next" title="Next state">Next \u25B8</button>' +
        '<button data-action="play" title="Auto-play through states">\u25B6 Play</button>' +
        '<span class="kn-accum-label"></span>';

      this._label = this.querySelector('.kn-accum-label');
      this._playBtn = this.querySelector('[data-action="play"]');
      this._syncLabel();

      var self = this;
      this.querySelectorAll('button').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var action = this.getAttribute('data-action');
          if (action === 'play') {
            self._playing = !self._playing;
            self._syncPlayBtn();
            self.dispatchEvent(new CustomEvent(
              self._playing ? 'accum-play' : 'accum-pause', { bubbles: true }));
          } else {
            self.dispatchEvent(new CustomEvent('accum-' + action, { bubbles: true }));
          }
        });
      });
    }

    get current() { return parseInt(this.getAttribute('current') || '0', 10); }
    set current(v) { this.setAttribute('current', String(v)); }

    get total() { return parseInt(this.getAttribute('total') || '0', 10); }
    set total(v) { this.setAttribute('total', String(v)); }

    get playing() { return this._playing; }
    set playing(v) { this._playing = !!v; this._syncPlayBtn(); }

    _syncLabel() {
      if (this._label) this._label.textContent = 'State ' + this.current + ' / ' + this.total;
    }

    _syncPlayBtn() {
      if (!this._playBtn) return;
      this._playBtn.textContent = this._playing ? '\u23F8 Pause' : '\u25B6 Play';
      this._playBtn.setAttribute('aria-pressed', this._playing ? 'true' : 'false');
    }

    static get observedAttributes() { return ['current', 'total']; }
    attributeChangedCallback() { this._syncLabel(); }
  });


  /* ==========================================================================
   * <knot-viewer> — 3D knot visualization from braid words using Three.js
   *
   * Usage:
   *   <knot-viewer preset="trefoil" interactive auto-rotate></knot-viewer>
   *   <knot-viewer braid="1,-2,1,-2" strands="3" interactive></knot-viewer>
   *
   * Requires Three.js via import map or classic <script> tag.
   * ========================================================================== */

  /* --- Braid-to-3D helpers (private to IIFE) --- */

  function parseBraidWord(str) {
    if (!str || !str.trim()) return [];
    return str.split(',').map(function (s) {
      return parseInt(s.trim(), 10);
    }).filter(function (v) { return !isNaN(v) && v !== 0; });
  }

  function autoDetectStrands(word) {
    if (!word.length) return 1;
    var mx = 0;
    for (var i = 0; i < word.length; i++) {
      var a = Math.abs(word[i]);
      if (a > mx) mx = a;
    }
    return mx + 1;
  }

  function knotBraidPerm(n, word) {
    var perm = [];
    for (var i = 0; i < n; i++) perm[i] = i;
    for (var l = 0; l < word.length; l++) {
      var gi = Math.abs(word[l]) - 1;
      var tmp = perm[gi];
      perm[gi] = perm[gi + 1];
      perm[gi + 1] = tmp;
    }
    return perm;
  }

  function knotFindComponents(n, perm) {
    var visited = [];
    var components = [];
    for (var i = 0; i < n; i++) visited[i] = false;
    for (var i = 0; i < n; i++) {
      if (visited[i]) continue;
      var cycle = [];
      var j = i;
      while (!visited[j]) {
        visited[j] = true;
        cycle.push(j);
        j = perm[j];
      }
      components.push(cycle);
    }
    return components;
  }

  function knotStrandPositions(n, word, strand) {
    var positions = [strand];
    var pos = strand;
    for (var l = 0; l < word.length; l++) {
      var gi = Math.abs(word[l]) - 1;
      if (pos === gi) pos = gi + 1;
      else if (pos === gi + 1) pos = gi;
      positions.push(pos);
    }
    return positions;
  }

  function knotBuildCurve(n, word, component, params) {
    var ss = params.strandSpacing || 1.0;
    var ls = params.levelSpacing || 1.5;
    var bh = params.bumpHeight || 0.35;
    var cr = params.closureRadius || 2.0;
    var sub = 8;
    var arcSub = 16;
    var L = word.length;

    /* Special case: no crossings — generate circles */
    if (L === 0) {
      var pts = [];
      var numP = 48;
      var r = 0.8;
      var ox = component[0] * 0.6;
      for (var i = 0; i < numP; i++) {
        var a = (i / numP) * Math.PI * 2;
        pts.push([r * Math.cos(a) + ox, 0, r * Math.sin(a)]);
      }
      return pts;
    }

    function xp(p) { return (p - (n - 1) / 2) * ss; }

    var points = [];

    for (var ci = 0; ci < component.length; ci++) {
      var strand = component[ci];
      var nextStrand = component[(ci + 1) % component.length];
      var pos = knotStrandPositions(n, word, strand);

      /* Starting point of this strand at top */
      points.push([xp(pos[0]), 0, 0]);

      /* Trace through each crossing level */
      for (var l = 0; l < L; l++) {
        var gi = Math.abs(word[l]) - 1;
        var sign = word[l] > 0 ? 1 : -1;
        var pp = pos[l];     /* position before crossing */
        var cp = pos[l + 1]; /* position after crossing */

        if (pp === gi || pp === gi + 1) {
          /* Strand participates in this crossing */
          var isOver = sign > 0 ? (pp === gi) : (pp === gi + 1);
          var yPk = isOver ? bh : -bh;
          var px = xp(pp);
          var cx = xp(cp);
          var zs = l * ls;

          for (var t = 1; t <= sub; t++) {
            var f = t / sub;
            points.push([
              px + (cx - px) * f,
              yPk * Math.sin(Math.PI * f),
              zs + ls * f
            ]);
          }
        } else {
          /* Strand doesn't participate — straight through */
          points.push([xp(cp), 0, (l + 1) * ls]);
        }
      }

      /* Closure arc: cubic Bezier from bottom of this strand to top of next */
      var bx = xp(pos[L]);
      var tx = xp(nextStrand);
      var bz = L * ls;
      var arcX = xp(n - 1) + cr + ci * 0.3;

      for (var t = 1; t < arcSub; t++) {
        var f = t / arcSub;
        var u = 1 - f;
        points.push([
          u * u * u * bx + 3 * u * u * f * arcX +
            3 * u * f * f * arcX + f * f * f * tx,
          0,
          u * u * u * bz + 3 * u * u * f * bz +
            3 * u * f * f * 0 + f * f * f * 0
        ]);
      }
    }

    return points;
  }

  /* --- Three.js lazy loading --- */

  var _threeP = null;
  function ensureThree() {
    if (_threeP) return _threeP;
    if (window.THREE) return (_threeP = Promise.resolve(window.THREE));
    _threeP = import('three').then(function (m) {
      window.THREE = m;
      return m;
    });
    return _threeP;
  }

  var _orbitP = null;
  function ensureOrbitControls() {
    if (_orbitP) return _orbitP;
    if (window.THREE && window.THREE.OrbitControls)
      return (_orbitP = Promise.resolve(window.THREE.OrbitControls));
    _orbitP = import('three/addons/controls/OrbitControls.js').then(function (m) {
      return m.OrbitControls;
    });
    return _orbitP;
  }

  /* --- Knot presets --- */

  var KNOT_PRESETS = {
    unknot:         { n: 1, word: [] },
    trefoil:        { n: 2, word: [1, 1, 1] },
    'trefoil-left': { n: 2, word: [-1, -1, -1] },
    'figure-eight': { n: 3, word: [1, -2, 1, -2] },
    hopf:           { n: 2, word: [1, 1] },
    cinquefoil:     { n: 2, word: [1, 1, 1, 1, 1] }
  };

  /* --- <knot-viewer> component definition --- */

  var KnotViewerClass = class extends HTMLElement {
    static get observedAttributes() {
      return ['braid', 'strands', 'preset', 'width', 'height',
              'tube-radius', 'color', 'background',
              'interactive', 'auto-rotate', 'rotate-speed', 'mode'];
    }

    constructor() {
      super();
      this._scene = null;
      this._camera = null;
      this._renderer = null;
      this._controls = null;
      this._animId = null;
      this._meshes = [];
      this._knotGroup = null;
      this._ready = false;
      this._curveFunc = null;
      this._relaxState = null;
    }

    connectedCallback() {
      var self = this;
      var w = parseInt(this.getAttribute('width') || '400', 10);
      var h = parseInt(this.getAttribute('height') || '400', 10);

      this._canvas = document.createElement('canvas');
      this.appendChild(this._canvas);

      ensureThree().then(function (THREE) {
        return self._setupScene(THREE, w, h);
      }).then(function () {
        self._buildKnot();
        self._fitCamera();
        self._ready = true;
        self._startLoop();
      }).catch(function (err) {
        console.error('knot-viewer: failed to load Three.js', err);
        if (self._canvas) self._canvas.style.display = 'none';
        var msg = document.createElement('div');
        msg.style.cssText =
          'padding:1rem;color:var(--text-dim,#6b7394);font-family:monospace;' +
          'font-size:0.8rem;text-align:center;';
        msg.textContent =
          'Three.js required \u2014 add an import map or script tag';
        self.appendChild(msg);
      });
    }

    disconnectedCallback() {
      this._clearRelax();
      if (this._animId) cancelAnimationFrame(this._animId);
      for (var i = 0; i < this._meshes.length; i++) {
        this._meshes[i].geometry.dispose();
        this._meshes[i].material.dispose();
      }
      if (this._controls) this._controls.dispose();
      if (this._renderer) this._renderer.dispose();
      this._meshes = [];
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this._ready || oldVal === newVal) return;
      this._clearRelax();
      this._buildKnot();
      this._fitCamera();
    }

    _setupScene(THREE, w, h) {
      var self = this;
      var bgStr = this.getAttribute('background') ||
        getComputedStyle(this).getPropertyValue('--bg').trim() || '#0c0e13';
      var isAlpha = bgStr === 'transparent';

      this._renderer = new THREE.WebGLRenderer({
        canvas: this._canvas, antialias: true, alpha: isAlpha
      });
      this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this._renderer.setSize(w, h);
      if (!isAlpha) this._renderer.setClearColor(new THREE.Color(bgStr));

      this._scene = new THREE.Scene();
      this._camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
      this._camera.position.set(0, 3, 10);

      /* 3-point lighting */
      this._scene.add(new THREE.AmbientLight(0x404040, 0.6));
      var d1 = new THREE.DirectionalLight(0xffffff, 0.8);
      d1.position.set(5, 5, 5);
      this._scene.add(d1);
      var d2 = new THREE.DirectionalLight(0x8888ff, 0.4);
      d2.position.set(-3, -2, 3);
      this._scene.add(d2);

      this._knotGroup = new THREE.Group();
      this._scene.add(this._knotGroup);

      if (this.hasAttribute('interactive')) {
        return ensureOrbitControls().then(function (OC) {
          self._controls = new OC(self._camera, self._canvas);
          self._controls.enableDamping = true;
          self._controls.dampingFactor = 0.05;
          if (self.hasAttribute('auto-rotate')) {
            self._controls.autoRotate = true;
            self._controls.autoRotateSpeed =
              parseFloat(self.getAttribute('rotate-speed') || '1.0');
          }
        }).catch(function () {
          /* OrbitControls unavailable — render without interaction */
        });
      }
      return Promise.resolve();
    }

    _buildKnot() {
      var T = window.THREE;
      if (!T) return;
      var grp = this._knotGroup;

      /* Clear previous meshes */
      for (var i = this._meshes.length - 1; i >= 0; i--) {
        grp.remove(this._meshes[i]);
        this._meshes[i].geometry.dispose();
        this._meshes[i].material.dispose();
      }
      this._meshes = [];

      var tubeR = parseFloat(this.getAttribute('tube-radius') || '0.12');

      /* Custom parametric curve */
      if (this._curveFunc) {
        var vecs = [];
        for (var i = 0; i < 200; i++) {
          var t = i / 200;
          var p = this._curveFunc(t);
          vecs.push(new T.Vector3(p[0], p[1], p[2]));
        }
        var crv = new T.CatmullRomCurve3(vecs, true, 'centripetal');
        var col = this.getAttribute('color') ||
          getComputedStyle(this).getPropertyValue('--accent-braid').trim() ||
          '#e8c86a';
        var geo = new T.TubeGeometry(crv, 200, tubeR, 8, true);
        var mat = new T.MeshPhongMaterial({
          color: new T.Color(col), shininess: 60
        });
        var mesh = new T.Mesh(geo, mat);
        grp.add(mesh);
        this._meshes.push(mesh);
        this._centerGroup(T);
        return;
      }

      /* Smooth mode: energy-minimized relaxation */
      var mode = this.getAttribute('mode') || 'braid';
      if (mode === 'smooth') { this._initRelax(); return; }

      /* Braid data from preset or attributes */
      var preset = this.getAttribute('preset');
      var word, sn;
      if (preset && KNOT_PRESETS[preset]) {
        word = KNOT_PRESETS[preset].word.slice();
        sn = KNOT_PRESETS[preset].n;
      } else {
        word = parseBraidWord(this.getAttribute('braid') || '1,1,1');
        sn = parseInt(this.getAttribute('strands'), 10) ||
          autoDetectStrands(word);
      }

      var perm = knotBraidPerm(sn, word);
      var comps = knotFindComponents(sn, perm);

      /* Component colors — primary from attribute/CSS, others from theme */
      var mainCol = this.getAttribute('color') ||
        getComputedStyle(this).getPropertyValue('--accent-braid').trim() ||
        '#e8c86a';
      var compCols = [
        mainCol,
        getComputedStyle(this).getPropertyValue('--accent-poly').trim() ||
          '#c4a0e8',
        getComputedStyle(this).getPropertyValue('--accent-loop').trim() ||
          '#7bc77b',
        getComputedStyle(this).getPropertyValue('--accent-a').trim() ||
          '#5b9bd5',
        getComputedStyle(this).getPropertyValue('--accent-b').trim() ||
          '#d4845a'
      ];

      var params = {
        strandSpacing: 1.0, levelSpacing: 1.5,
        bumpHeight: 0.35, closureRadius: 2.0
      };

      for (var ci = 0; ci < comps.length; ci++) {
        var pts = knotBuildCurve(sn, word, comps[ci], params);
        var vecs = [];
        for (var j = 0; j < pts.length; j++) {
          vecs.push(new T.Vector3(pts[j][0], pts[j][1], pts[j][2]));
        }
        var crv = new T.CatmullRomCurve3(vecs, true, 'centripetal');
        var segs = Math.max(pts.length * 4, 100);
        var geo = new T.TubeGeometry(crv, segs, tubeR, 8, true);
        var mat = new T.MeshPhongMaterial({
          color: new T.Color(compCols[ci % compCols.length]),
          shininess: 60
        });
        var mesh = new T.Mesh(geo, mat);
        grp.add(mesh);
        this._meshes.push(mesh);
      }

      this._centerGroup(T);
    }

    /* Translate meshes so geometry center sits at the group origin */
    _centerGroup(T) {
      if (!this._meshes.length) return;
      var box = new T.Box3();
      for (var i = 0; i < this._meshes.length; i++) {
        box.expandByObject(this._meshes[i]);
      }
      var c = new T.Vector3();
      box.getCenter(c);
      for (var i = 0; i < this._meshes.length; i++) {
        this._meshes[i].position.set(
          this._meshes[i].position.x - c.x,
          this._meshes[i].position.y - c.y,
          this._meshes[i].position.z - c.z
        );
      }
    }

    /* --- Energy-minimized smooth rendering --- */

    _initRelax() {
      var T = window.THREE;
      if (!T) return;
      var grp = this._knotGroup;

      var preset = this.getAttribute('preset');
      var word, sn;
      if (preset && KNOT_PRESETS[preset]) {
        word = KNOT_PRESETS[preset].word.slice();
        sn = KNOT_PRESETS[preset].n;
      } else {
        word = parseBraidWord(this.getAttribute('braid') || '1,1,1');
        sn = parseInt(this.getAttribute('strands'), 10) ||
          autoDetectStrands(word);
      }

      var perm = knotBraidPerm(sn, word);
      var comps = knotFindComponents(sn, perm);

      var tubeR = parseFloat(this.getAttribute('tube-radius') || '0.12');
      var mainCol = this.getAttribute('color') ||
        getComputedStyle(this).getPropertyValue('--accent-braid').trim() ||
        '#e8c86a';
      var compCols = [
        mainCol,
        getComputedStyle(this).getPropertyValue('--accent-poly').trim() || '#c4a0e8',
        getComputedStyle(this).getPropertyValue('--accent-loop').trim() || '#7bc77b',
        getComputedStyle(this).getPropertyValue('--accent-a').trim() || '#5b9bd5',
        getComputedStyle(this).getPropertyValue('--accent-b').trim() || '#d4845a'
      ];

      var params = {
        strandSpacing: 1.0, levelSpacing: 1.5,
        bumpHeight: 0.35, closureRadius: 2.0
      };

      var numPts = 150;
      var components = [];
      var targetLens = [];
      var meshes = [];
      var materials = [];
      var allPoints = [];

      for (var ci = 0; ci < comps.length; ci++) {
        var pts = knotBuildCurve(sn, word, comps[ci], params);
        var vecs = [];
        for (var j = 0; j < pts.length; j++) {
          vecs.push(new T.Vector3(pts[j][0], pts[j][1], pts[j][2]));
        }
        var crv = new T.CatmullRomCurve3(vecs, true, 'centripetal');
        var spaced = crv.getSpacedPoints(numPts);
        spaced.pop();

        var compPts = [];
        for (var j = 0; j < spaced.length; j++) {
          compPts.push([spaced[j].x, spaced[j].y, spaced[j].z]);
        }
        components.push(compPts);

        var totalLen = 0;
        for (var j = 0; j < compPts.length; j++) {
          var nj = (j + 1) % compPts.length;
          var dx = compPts[nj][0] - compPts[j][0];
          var dy = compPts[nj][1] - compPts[j][1];
          var dz = compPts[nj][2] - compPts[j][2];
          totalLen += Math.sqrt(dx * dx + dy * dy + dz * dz);
        }
        targetLens.push(totalLen / compPts.length);

        for (var j = 0; j < compPts.length; j++) {
          allPoints.push({ ci: ci, pi: j });
        }

        var col = compCols[ci % compCols.length];
        var mat = new T.MeshPhongMaterial({
          color: new T.Color(col), shininess: 60
        });
        var segs = Math.max(compPts.length * 4, 100);
        var geo = new T.TubeGeometry(crv, segs, tubeR, 8, true);
        var mesh = new T.Mesh(geo, mat);
        grp.add(mesh);
        this._meshes.push(mesh);
        meshes.push(mesh);
        materials.push(mat);
      }

      this._centerGroup(T);

      /* Measure initial bounding size for auto-scaling during relaxation */
      var ibox = new T.Box3();
      for (var ci2 = 0; ci2 < meshes.length; ci2++) {
        ibox.expandByObject(meshes[ci2]);
      }
      var isize = new T.Vector3();
      ibox.getSize(isize);
      var initialRadius = Math.max(isize.x, isize.y, isize.z);

      this._relaxState = {
        components: components,
        targetLens: targetLens,
        allPoints: allPoints,
        totalSteps: 0,
        maxDisp: Infinity,
        converged: false,
        meshes: meshes,
        materials: materials,
        tubeRadius: tubeR,
        colors: compCols,
        initialRadius: initialRadius,
        kRep: 0.02,
        kBarrier: 0.5,
        kSpring: 0.3,
        kSmooth: 0.05,
        dt: 0.5,
        maxDispClamp: 0.04,
        stepsPerFrame: 10,
        resampleInterval: 50,
        maxSteps: 5000,
        convergenceThresh: 0.001
      };
    }

    _stepRelax(n) {
      var rs = this._relaxState;
      if (!rs || rs.converged) return;

      for (var step = 0; step < n; step++) {
        var comps = rs.components;
        var all = rs.allPoints;
        var N = all.length;

        var forces = [];
        for (var i = 0; i < N; i++) {
          forces.push([0, 0, 0]);
        }

        /* Spring forces between adjacent pairs */
        var idx = 0;
        for (var ci = 0; ci < comps.length; ci++) {
          var comp = comps[ci];
          var cLen = comp.length;
          var target = rs.targetLens[ci];
          for (var pi = 0; pi < cLen; pi++) {
            var ni = (pi + 1) % cLen;
            var p = comp[pi];
            var q = comp[ni];
            var dx = q[0] - p[0];
            var dy = q[1] - p[1];
            var dz = q[2] - p[2];
            var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (dist < 0.0001) dist = 0.0001;
            var f = rs.kSpring * (dist - target) / dist;
            var fx = f * dx, fy = f * dy, fz = f * dz;
            forces[idx + pi][0] += fx;
            forces[idx + pi][1] += fy;
            forces[idx + pi][2] += fz;
            forces[idx + ni][0] -= fx;
            forces[idx + ni][1] -= fy;
            forces[idx + ni][2] -= fz;
          }
          idx += cLen;
        }

        /* Laplacian smoothing */
        idx = 0;
        for (var ci = 0; ci < comps.length; ci++) {
          var comp = comps[ci];
          var cLen = comp.length;
          for (var pi = 0; pi < cLen; pi++) {
            var prev = (pi - 1 + cLen) % cLen;
            var next = (pi + 1) % cLen;
            var p = comp[pi];
            var mid0 = (comp[prev][0] + comp[next][0]) * 0.5 - p[0];
            var mid1 = (comp[prev][1] + comp[next][1]) * 0.5 - p[1];
            var mid2 = (comp[prev][2] + comp[next][2]) * 0.5 - p[2];
            forces[idx + pi][0] += rs.kSmooth * mid0;
            forces[idx + pi][1] += rs.kSmooth * mid1;
            forces[idx + pi][2] += rs.kSmooth * mid2;
          }
          idx += cLen;
        }

        /* Coulomb repulsion + barrier force O(N^2) */
        var barrierDist = rs.tubeRadius * 4;
        for (var i = 0; i < N; i++) {
          var ai = all[i];
          var pi = comps[ai.ci][ai.pi];
          for (var j = i + 1; j < N; j++) {
            var aj = all[j];
            if (ai.ci === aj.ci) {
              var cLen = comps[ai.ci].length;
              var arcDist = Math.abs(ai.pi - aj.pi);
              arcDist = Math.min(arcDist, cLen - arcDist);
              if (arcDist <= 5) continue;
            }
            var pj = comps[aj.ci][aj.pi];
            var dx = pi[0] - pj[0];
            var dy = pi[1] - pj[1];
            var dz = pi[2] - pj[2];
            var rawDistSq = dx * dx + dy * dy + dz * dz;
            var distSq = rawDistSq < 0.01 ? 0.01 : rawDistSq;
            var dist = Math.sqrt(distSq);
            var f = rs.kRep / (distSq * dist);

            /* Barrier: steep repulsion prevents strand crossing */
            var rawDist = Math.sqrt(rawDistSq > 0 ? rawDistSq : 0.0001);
            if (rawDist < barrierDist) {
              var pen = barrierDist - rawDist;
              f += rs.kBarrier * pen * pen / distSq;
            }

            forces[i][0] += f * dx;
            forces[i][1] += f * dy;
            forces[i][2] += f * dz;
            forces[j][0] -= f * dx;
            forces[j][1] -= f * dy;
            forces[j][2] -= f * dz;
          }
        }

        /* Apply forces with clamped displacement */
        var maxDisp = 0;
        idx = 0;
        for (var ci = 0; ci < comps.length; ci++) {
          var comp = comps[ci];
          var cLen = comp.length;
          for (var pi = 0; pi < cLen; pi++) {
            var fi = idx + pi;
            var dispX = forces[fi][0] * rs.dt;
            var dispY = forces[fi][1] * rs.dt;
            var dispZ = forces[fi][2] * rs.dt;
            var dispMag = Math.sqrt(dispX * dispX + dispY * dispY + dispZ * dispZ);
            if (dispMag > rs.maxDispClamp) {
              var scale = rs.maxDispClamp / dispMag;
              dispX *= scale;
              dispY *= scale;
              dispZ *= scale;
              dispMag = rs.maxDispClamp;
            }
            comp[pi][0] += dispX;
            comp[pi][1] += dispY;
            comp[pi][2] += dispZ;
            if (dispMag > maxDisp) maxDisp = dispMag;
          }
          idx += cLen;
        }

        rs.totalSteps++;
        rs.maxDisp = maxDisp;

        if (rs.totalSteps % rs.resampleInterval === 0) {
          this._resampleRelax();
        }

        if (maxDisp < rs.convergenceThresh || rs.totalSteps >= rs.maxSteps) {
          rs.converged = true;
          break;
        }
      }
    }

    _rebuildFromRelax() {
      var T = window.THREE;
      var rs = this._relaxState;
      if (!T || !rs) return;

      /* Reset group scale so bounding box is computed in local space */
      this._knotGroup.scale.set(1, 1, 1);
      this._knotGroup.updateMatrixWorld(true);

      for (var ci = 0; ci < rs.components.length; ci++) {
        var comp = rs.components[ci];
        var vecs = [];
        for (var j = 0; j < comp.length; j++) {
          vecs.push(new T.Vector3(comp[j][0], comp[j][1], comp[j][2]));
        }
        var crv = new T.CatmullRomCurve3(vecs, true, 'centripetal');
        var segs = Math.max(comp.length * 4, 100);
        rs.meshes[ci].geometry.dispose();
        rs.meshes[ci].geometry = new T.TubeGeometry(crv, segs, rs.tubeRadius, 8, true);
      }

      this._centerGroup(T);

      /* Scale group to keep knot within its initial bounding size */
      var box = new T.Box3();
      for (var i = 0; i < rs.meshes.length; i++) {
        box.expandByObject(rs.meshes[i]);
      }
      var size = new T.Vector3();
      box.getSize(size);
      var currentMax = Math.max(size.x, size.y, size.z);
      if (currentMax > 0.001 && rs.initialRadius > 0.001) {
        var s = rs.initialRadius / currentMax;
        this._knotGroup.scale.set(s, s, s);
      }
    }

    _resampleRelax() {
      var T = window.THREE;
      var rs = this._relaxState;
      if (!T || !rs) return;

      var allPoints = [];
      for (var ci = 0; ci < rs.components.length; ci++) {
        var comp = rs.components[ci];
        var vecs = [];
        for (var j = 0; j < comp.length; j++) {
          vecs.push(new T.Vector3(comp[j][0], comp[j][1], comp[j][2]));
        }
        var crv = new T.CatmullRomCurve3(vecs, true, 'centripetal');
        var numPts = comp.length;
        var spaced = crv.getSpacedPoints(numPts);
        spaced.pop();

        var newComp = [];
        for (var j = 0; j < spaced.length; j++) {
          newComp.push([spaced[j].x, spaced[j].y, spaced[j].z]);
        }
        rs.components[ci] = newComp;

        var totalLen = 0;
        for (var j = 0; j < newComp.length; j++) {
          var nj = (j + 1) % newComp.length;
          var dx = newComp[nj][0] - newComp[j][0];
          var dy = newComp[nj][1] - newComp[j][1];
          var dz = newComp[nj][2] - newComp[j][2];
          totalLen += Math.sqrt(dx * dx + dy * dy + dz * dz);
        }
        rs.targetLens[ci] = totalLen / newComp.length;

        for (var j = 0; j < newComp.length; j++) {
          allPoints.push({ ci: ci, pi: j });
        }
      }
      rs.allPoints = allPoints;
    }

    _clearRelax() {
      if (this._relaxState) {
        this._relaxState.converged = true;
        this._relaxState = null;
      }
    }

    _fitCamera() {
      var T = window.THREE;
      if (!T || !this._meshes.length) return;

      var box = new T.Box3();
      for (var i = 0; i < this._meshes.length; i++) {
        box.expandByObject(this._meshes[i]);
      }
      var center = new T.Vector3();
      box.getCenter(center);
      var size = new T.Vector3();
      box.getSize(size);
      var maxDim = Math.max(size.x, size.y, size.z);
      var fov = this._camera.fov * (Math.PI / 180);
      var dist = maxDim / (2 * Math.tan(fov / 2));

      this._camera.position.set(
        center.x, center.y + maxDim * 0.3, center.z + dist * 1.4
      );
      this._camera.lookAt(center);
      if (this._controls) {
        this._controls.target.copy(center);
        this._controls.update();
      }
    }

    _startLoop() {
      var self = this;
      var rotSpeed = parseFloat(
        this.getAttribute('rotate-speed') || '1.0'
      );
      var manualRotate =
        this.hasAttribute('auto-rotate') && !this._controls;

      function tick() {
        self._animId = requestAnimationFrame(tick);
        if (self._controls) self._controls.update();
        if (manualRotate && self._knotGroup) {
          self._knotGroup.rotation.y += 0.005 * rotSpeed;
        }
        if (self._relaxState && !self._relaxState.converged) {
          self._stepRelax(self._relaxState.stepsPerFrame);
          self._rebuildFromRelax();
        }
        if (self._renderer && self._scene && self._camera) {
          self._renderer.render(self._scene, self._camera);
        }
      }
      tick();
    }

    get curve() { return this._curveFunc; }
    set curve(fn) {
      this._curveFunc = fn;
      if (this._ready) { this._buildKnot(); this._fitCamera(); }
    }

    static register(name, data) { KNOT_PRESETS[name] = data; }
  };

  customElements.define('knot-viewer', KnotViewerClass);
  window.KnotViewer = KnotViewerClass;

})();
