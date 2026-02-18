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


  /* ==========================================================================
   * INJECT COMPONENT STYLES (once)
   * ========================================================================== */

  if (!document.getElementById('kn-components-css')) {
    var style = document.createElement('style');
    style.id = 'kn-components-css';
    style.textContent = [

      /* --- poly-display --- */
      'poly-display { display: inline; }',
      'poly-display .coeff-pos { color: var(--positive, #60c080); }',
      'poly-display .coeff-neg { color: var(--negative, #e06070); }',
      'poly-display .var-a { color: var(--accent-poly, #c4a0e8); font-style: italic; }',
      'poly-display .sup { font-size: 0.8em; vertical-align: super; }',

      /* --- selector-bar --- */
      'selector-bar { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }',
      'selector-bar button {' +
        'font-family: "Crimson Pro", serif; font-size: 1rem; padding: 0.55rem 1.3rem;' +
        'background: var(--surface, #14171e); border: 1px solid var(--border, #2a2f3d);' +
        'color: var(--text-dim, #6b7394); cursor: pointer; border-radius: 2px;' +
        'transition: all 0.25s ease; letter-spacing: 0.02em; }',
      'selector-bar button:hover {' +
        'border-color: var(--accent, var(--accent-poly, #c4a0e8));' +
        'color: var(--text, #d4d8e4); }',
      'selector-bar button[aria-pressed="true"] {' +
        'background: var(--surface2, #1a1e28);' +
        'border-color: var(--accent, var(--accent-poly, #c4a0e8));' +
        'color: var(--accent, var(--accent-poly, #c4a0e8)); }',

      /* --- panel-card --- */
      'panel-card {' +
        'display: block; background: var(--surface, #14171e);' +
        'border: 1px solid var(--border, #2a2f3d); border-radius: 3px;' +
        'padding: 1.25rem; animation: knFadeIn 0.4s ease both; }',
      'panel-card .kn-panel-title {' +
        'font-family: "JetBrains Mono", monospace; font-size: 0.65rem;' +
        'text-transform: uppercase; letter-spacing: 0.12em;' +
        'color: var(--text-dim, #6b7394); margin-bottom: 1rem;' +
        'padding-bottom: 0.5rem; border-bottom: 1px solid var(--border, #2a2f3d); }',
      '@keyframes knFadeIn {' +
        'from { opacity: 0; transform: translateY(6px); }' +
        'to { opacity: 1; transform: translateY(0); } }',

      /* --- formula-box --- */
      'formula-box {' +
        'display: block; background: var(--surface, #14171e);' +
        'border-left: 3px solid var(--accent, var(--accent-poly, #c4a0e8));' +
        'padding: 1rem 1.25rem; margin: 1.25rem 0 1.5rem;' +
        'font-family: "Crimson Pro", serif; font-size: 1.15rem;' +
        'text-align: center; line-height: 1.9; }',
      'formula-box .var-a { color: var(--accent-poly, #c4a0e8); font-style: italic; }',
      'formula-box sup { font-size: 0.7em; }',
      'formula-box .kn-formula-label {' +
        'display: block; font-family: "JetBrains Mono", monospace; font-size: 0.62rem;' +
        'color: var(--text-dim, #6b7394); text-transform: uppercase;' +
        'letter-spacing: 0.1em; margin-bottom: 0.5rem; text-align: left; }',

      /* --- step-box --- */
      'step-box {' +
        'display: block; background: var(--surface2, #1a1e28);' +
        'border: 1px solid var(--border, #2a2f3d); border-radius: 3px;' +
        'padding: 1rem 1.25rem; margin: 1rem 0; }',
      'step-box .kn-step-label {' +
        'font-family: "JetBrains Mono", monospace; font-size: 0.65rem;' +
        'color: var(--accent, var(--accent-poly, #c4a0e8));' +
        'text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.3rem; }',

      /* --- state-table --- */
      'state-table { display: block; }',
      'state-table .kn-st-wrap {' +
        'max-height: 420px; overflow-y: auto; scrollbar-width: thin;' +
        'scrollbar-color: var(--border, #2a2f3d) transparent; }',
      'state-table table {' +
        'width: 100%; border-collapse: collapse;' +
        'font-family: "JetBrains Mono", monospace; font-size: 0.72rem; }',
      'state-table th {' +
        'position: sticky; top: 0; background: var(--surface, #14171e);' +
        'color: var(--text-dim, #6b7394); font-weight: 400;' +
        'text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.6rem;' +
        'padding: 0.5rem 0.4rem; border-bottom: 1px solid var(--border, #2a2f3d);' +
        'text-align: left; }',
      'state-table td {' +
        'padding: 0.4rem 0.4rem; border-bottom: 1px solid rgba(42,47,61,0.5);' +
        'vertical-align: middle; }',
      'state-table tbody tr { transition: background 0.15s; cursor: pointer; }',
      'state-table tbody tr:hover { background: rgba(255,255,255,0.02); }',
      'state-table tbody tr.kn-active { background: rgba(255,255,255,0.05); }',
      'state-table tbody tr.kn-active td {' +
        'color: var(--accent, var(--accent-poly, #c4a0e8)); }',
      'state-table .kn-bits { display: inline-flex; gap: 2px; }',
      'state-table .kn-bit {' +
        'display: inline-block; width: 16px; height: 16px; line-height: 16px;' +
        'text-align: center; border-radius: 2px; font-size: 0.6rem; font-weight: 500; }',
      'state-table .kn-bit-a { background: rgba(91,155,213,0.15); color: var(--accent-a, #5b9bd5); }',
      'state-table .kn-bit-b { background: rgba(212,132,90,0.15); color: var(--accent-b, #d4845a); }',
      'state-table .kn-loops {' +
        'display: inline-block; background: rgba(123,199,123,0.12);' +
        'color: var(--accent-loop, #7bc77b); padding: 1px 6px; border-radius: 2px; }',
      'state-table .coeff-pos { color: var(--positive, #60c080); }',
      'state-table .coeff-neg { color: var(--negative, #e06070); }',
      'state-table .var-a { color: var(--accent-poly, #c4a0e8); font-style: italic; }',
      'state-table .sup { font-size: 0.8em; vertical-align: super; }',

      /* --- accum-controls --- */
      'accum-controls {' +
        'display: flex; gap: 0.75rem; justify-content: center;' +
        'align-items: center; flex-wrap: wrap; }',
      'accum-controls button {' +
        'font-family: "JetBrains Mono", monospace; font-size: 0.7rem;' +
        'padding: 0.4rem 1rem; background: var(--surface2, #1a1e28);' +
        'border: 1px solid var(--border, #2a2f3d);' +
        'color: var(--text-dim, #6b7394); cursor: pointer; border-radius: 2px;' +
        'transition: all 0.2s; letter-spacing: 0.03em; }',
      'accum-controls button:hover {' +
        'border-color: var(--accent, var(--accent-poly, #c4a0e8));' +
        'color: var(--text, #d4d8e4); }',
      'accum-controls button[aria-pressed="true"] {' +
        'border-color: var(--accent-loop, #7bc77b);' +
        'color: var(--accent-loop, #7bc77b); }',
      'accum-controls .kn-accum-label {' +
        'font-family: "JetBrains Mono", monospace; font-size: 0.65rem;' +
        'color: var(--text-dim, #6b7394); }'

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

})();
