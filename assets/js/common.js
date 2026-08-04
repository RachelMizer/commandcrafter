/* CommandCrafter — shared helpers
   Plain script (no ES modules) so the site works opened straight from disk. */

/* ---------------- element helpers ---------------- */

function $(id) { return document.getElementById(id); }

function val(id) {
  var el = $(id);
  return el ? el.value.trim() : '';
}

function intVal(id, fallback) {
  var v = val(id);
  if (v === '') return fallback === undefined ? null : fallback;
  var n = parseInt(v, 10);
  return isNaN(n) ? (fallback === undefined ? null : fallback) : n;
}

function isChecked(id) {
  var el = $(id);
  return el ? el.checked : false;
}

function on(id, event, fn) {
  var el = $(id);
  if (el) el.addEventListener(event, fn);
}

/* ---------------- coordinates ----------------
   A coordinate is a text token: "607", "~", "~-1", "^2".
   The "relative" checkbox on a group auto-prefixes "~" so you can just
   type the offset. */

function coordToken(raw, relative) {
  var v = String(raw == null ? '' : raw).trim().replace(/\s+/g, '');
  if (relative) {
    if (v === '' || v === '0') return '~';
    if (v.charAt(0) === '~' || v.charAt(0) === '^') return v === '~0' ? '~' : v;
    return '~' + v;
  }
  if (v === '~0') return '~';
  return v;
}

/* Reads a coord group built by coordGroupHTML(). Returns
   { tokens: ["607","62","1238"], text: "607 62 1238", missing: [...] } */
function readCoords(prefix) {
  var rel = isChecked(prefix + '-rel');
  var axes = ['x', 'y', 'z'];
  var tokens = [];
  var missing = [];
  for (var i = 0; i < axes.length; i++) {
    var raw = val(prefix + '-' + axes[i]);
    var tok = coordToken(raw, rel);
    if (tok === '') missing.push(axes[i].toUpperCase());
    tokens.push(tok);
  }
  return { tokens: tokens, text: tokens.join(' '), missing: missing, relative: rel };
}

/* Splits a token into { rel: '' | '~' | '^', n: Number } or null if unparseable. */
function parseCoordToken(tok) {
  var m = /^(~|\^)?(-?\d+(?:\.\d+)?)?$/.exec(tok);
  if (!m) return null;
  if (!m[1] && m[2] === undefined) return null;
  return { rel: m[1] || '', n: m[2] === undefined ? 0 : Number(m[2]) };
}

/* Size in blocks along one axis between two tokens, or null if it can't be known
   (e.g. one is absolute and the other is relative). */
function axisSize(tokA, tokB) {
  var a = parseCoordToken(tokA), b = parseCoordToken(tokB);
  if (!a || !b || a.rel !== b.rel) return null;
  return Math.floor(Math.abs(b.n - a.n)) + 1;
}

/* { x, y, z, volume } — any field null when not computable. */
function regionSize(coordsA, coordsB) {
  var x = axisSize(coordsA.tokens[0], coordsB.tokens[0]);
  var y = axisSize(coordsA.tokens[1], coordsB.tokens[1]);
  var z = axisSize(coordsA.tokens[2], coordsB.tokens[2]);
  var volume = (x === null || y === null || z === null) ? null : x * y * z;
  return { x: x, y: y, z: z, volume: volume };
}

/* Bedrock caps /fill and /clone at 32768 blocks per command. */
var BLOCK_LIMIT = 32768;

/* ---------------- validation ---------------- */

var COORD_OK = /^(~-?\d*(\.\d+)?|\^-?\d*(\.\d+)?|-?\d+(\.\d+)?)$/;

function badCoords(coords, label) {
  var problems = [];
  if (coords.missing.length) {
    problems.push(label + ': fill in ' + coords.missing.join(', '));
    return problems;
  }
  for (var i = 0; i < coords.tokens.length; i++) {
    if (!COORD_OK.test(coords.tokens[i])) {
      problems.push(label + ': "' + coords.tokens[i] + '" is not a valid coordinate');
    }
  }
  return problems;
}

/* Block / item IDs: lowercase, underscores, optional namespace. */
function cleanId(raw) {
  return String(raw == null ? '' : raw).trim().toLowerCase().replace(/\s+/g, '_');
}

/* ---------------- clipboard ---------------- */

function copyText(text, btn) {
  function done() {
    if (!btn) return;
    var original = btn.getAttribute('data-label') || btn.textContent;
    btn.setAttribute('data-label', original);
    btn.textContent = 'Copied';
    btn.classList.add('copied');
    setTimeout(function () {
      btn.textContent = original;
      btn.classList.remove('copied');
    }, 1200);
  }

  function fallback() {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* nothing else to try */ }
    document.body.removeChild(ta);
    done();
  }

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(done, fallback);
  } else {
    fallback();
  }
}

/* ---------------- output rendering ----------------

   render(containerId, {
     messages: [{ type: 'warn', text: '...' }],
     stats:    [{ label: 'Size', value: '13 x 1 x 10' }],
     groups:   [{ title: 'Success branch', tone: 'ok',
                  commands: ['/fill ...'], note: '...' }]
   })

   "Copy all" copies the commands only — no headers, no comments — so the
   result can be pasted straight into an NPC dialogue button or a command block. */

function render(containerId, result) {
  var box = $(containerId);
  if (!box) return;
  box.innerHTML = '';

  var messages = result.messages || [];
  var i, j;

  for (i = 0; i < messages.length; i++) {
    var m = document.createElement('div');
    m.className = 'msg ' + (messages[i].type || 'info');
    m.textContent = messages[i].text;
    box.appendChild(m);
  }

  var groups = result.groups || [];
  var allCommands = [];
  for (i = 0; i < groups.length; i++) {
    allCommands = allCommands.concat(groups[i].commands || []);
  }
  if (!allCommands.length) return;

  if (result.stats && result.stats.length) {
    var stats = document.createElement('div');
    stats.className = 'stats';
    for (i = 0; i < result.stats.length; i++) {
      var s = document.createElement('span');
      s.textContent = result.stats[i].label + ': ';
      var b = document.createElement('b');
      b.textContent = result.stats[i].value;
      s.appendChild(b);
      stats.appendChild(s);
    }
    box.appendChild(stats);
  }

  for (i = 0; i < groups.length; i++) {
    var g = groups[i];
    if (!g.commands || !g.commands.length) continue;

    var wrap = document.createElement('div');
    wrap.className = 'out-group';

    if (g.title || groups.length > 1) {
      var head = document.createElement('div');
      head.className = 'out-group-head';

      var title = document.createElement('span');
      title.className = 'out-group-title' + (g.tone ? ' ' + g.tone : '');
      title.textContent = g.title || '';
      head.appendChild(title);

      if (g.commands.length > 1) {
        head.appendChild(copyButton(g.commands.join('\n'), 'Copy group'));
      }
      wrap.appendChild(head);
    }

    for (j = 0; j < g.commands.length; j++) {
      wrap.appendChild(commandLine(g.commands[j]));
    }

    if (g.note) {
      var note = document.createElement('div');
      note.className = 'cmd-note';
      note.textContent = g.note;
      wrap.appendChild(note);
    }

    box.appendChild(wrap);
  }

  if (allCommands.length > 1) {
    var footer = document.createElement('div');
    footer.className = 'actions';
    footer.appendChild(copyButton(allCommands.join('\n'),
      'Copy all ' + allCommands.length + ' commands'));
    box.appendChild(footer);
  }
}

function commandLine(cmd) {
  var line = document.createElement('div');
  line.className = 'cmd-line';

  var code = document.createElement('code');
  code.textContent = cmd;
  line.appendChild(code);

  line.appendChild(copyButton(cmd, 'Copy'));
  return line;
}

function copyButton(text, label) {
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'small';
  btn.textContent = label;
  btn.addEventListener('click', function () { copyText(text, btn); });
  return btn;
}

function renderError(containerId, problems) {
  render(containerId, {
    messages: problems.map(function (p) { return { type: 'error', text: p }; })
  });
}

/* ---------------- shared UI wiring ---------------- */

/* Populates every <datalist> whose id matches a list in data.js. */
function fillDatalists() {
  var lists = {
    'blocks-list': window.CC_BLOCKS,
    'items-list': window.CC_ITEMS,
    'entities-list': window.CC_ENTITIES,
    'sounds-list': window.CC_SOUNDS
  };
  Object.keys(lists).forEach(function (id) {
    var el = $(id), values = lists[id];
    if (!el || !values) return;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < values.length; i++) {
      var opt = document.createElement('option');
      opt.value = values[i];
      frag.appendChild(opt);
    }
    el.appendChild(frag);
  });
}

/* Marks the current page in the nav. */
function markActiveNav() {
  var here = location.pathname.split('/').pop() || 'index.html';
  var links = document.querySelectorAll('.site-nav a');
  for (var i = 0; i < links.length; i++) {
    if (links[i].getAttribute('href') === here) links[i].classList.add('active');
  }
}

/* Regenerates on Enter anywhere in a tool card. */
function submitOnEnter(toolId, generateFn) {
  var tool = $(toolId);
  if (!tool) return;
  tool.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      generateFn();
    }
  });
}

document.addEventListener('DOMContentLoaded', function () {
  fillDatalists();
  markActiveNav();
});
