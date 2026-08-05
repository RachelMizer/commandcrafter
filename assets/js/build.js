/* CommandCrafter — build command generators (/fill, /clone, /setblock, area cleanup) */

/* ---------------- shared bits ---------------- */

/* Returns the "block + variant" chunk of a command, e.g.
   "stone", "stone 0", or 'stone["stone_type"="granite"]'.
   `forcedData` supplies a data value when a later positional argument
   requires one and the user left the field blank. */
function blockChunk(blockId, variant, dataVal, statesVal, forcedData) {
  var block = cleanId(blockId);
  if (variant === 'states') {
    var states = String(statesVal || '').trim();
    return states ? block + states : block;
  }
  if (variant === 'data') {
    var d = String(dataVal == null ? '' : dataVal).trim();
    if (d === '') d = forcedData ? '0' : '';
    return d === '' ? block : block + ' ' + d;
  }
  return forcedData ? block + ' 0' : block;
}

function sizeStats(size) {
  var stats = [];
  if (size.x !== null && size.y !== null && size.z !== null) {
    stats.push({ label: 'Size', value: size.x + ' × ' + size.y + ' × ' + size.z });
  }
  if (size.volume !== null) {
    stats.push({ label: 'Blocks', value: size.volume.toLocaleString() });
  }
  return stats;
}

function limitWarning(size, commandName) {
  if (size.volume === null || size.volume <= BLOCK_LIMIT) return null;
  var over = Math.ceil(size.volume / BLOCK_LIMIT);
  return {
    type: 'warn',
    text: 'This region is ' + size.volume.toLocaleString() + ' blocks. Bedrock caps /' +
      commandName + ' at ' + BLOCK_LIMIT.toLocaleString() +
      ' blocks per command, so this will fail. Split it into about ' + over +
      ' slices — stepping the Y range is usually easiest.'
  };
}

/* ---------------- /fill ---------------- */

function generateFill() {
  var from = readCoords('fill-from');
  var to = readCoords('fill-to');
  var problems = badCoords(from, 'From').concat(badCoords(to, 'To'));

  var block = cleanId(val('fill-block'));
  if (!block) problems.push('Choose a block to fill with.');

  var mode = val('fill-mode') || 'replace';
  var useFilter = isChecked('fill-filter-enable');
  var filterBlock = cleanId(val('fill-filter-block'));

  if (useFilter && !filterBlock) {
    problems.push('"Only replace" is checked — name the block to replace, or uncheck it.');
  }
  if (problems.length) return renderError('fill-output', problems);

  var variant = val('fill-variant') || 'none';
  var messages = [];

  /* A data value is positionally required before `replace <block>` in the
     legacy form. Supply 0 when the field is blank -- this is the "they do
     require a number, if there's only one kind it's zero" rule. */
  var needsData = useFilter && variant !== 'states';
  var chunk = blockChunk(block, variant, val('fill-data'), val('fill-states'), needsData);

  var parts = ['/fill', from.text, to.text, chunk];

  if (useFilter) {
    parts.push('replace');
    parts.push(filterBlock);
    var fd = val('fill-filter-data');
    if (fd !== '') parts.push(fd);
    if (needsData && val('fill-data') === '') {
      messages.push({
        type: 'info',
        text: 'Added the data value 0 after "' + block +
          '" — Bedrock needs it there before the "replace" filter.'
      });
    }
  } else if (mode !== 'replace') {
    parts.push(mode);
  }

  var size = regionSize(from, to);
  var warn = limitWarning(size, 'fill');
  if (warn) messages.push(warn);

  if (mode === 'hollow' && size.volume !== null &&
      (size.x < 3 || size.y < 3 || size.z < 3)) {
    messages.push({
      type: 'warn',
      text: 'hollow needs the region to be at least 3 blocks on every side, ' +
        'otherwise it behaves the same as a solid fill.'
    });
  }

  render('fill-output', {
    messages: messages,
    stats: sizeStats(size),
    groups: [{ commands: [parts.join(' ')] }]
  });
}

/* Preset buttons on the fill card. */
function fillPreset(kind) {
  var setBlock = function (id) { $('fill-block').value = id; };
  var setMode = function (m) { $('fill-mode').value = m; };
  var setFilter = function (on, id) {
    $('fill-filter-enable').checked = on;
    if (id) $('fill-filter-block').value = id;
    syncFillFilter();
  };

  if (kind === 'air') { setBlock('air'); setMode('replace'); setFilter(false); }
  if (kind === 'grass') { setBlock('air'); setMode('replace'); setFilter(true, 'tall_grass'); }
  if (kind === 'outline') { setMode('outline'); setFilter(false); }
  if (kind === 'hollow') { setMode('hollow'); setFilter(false); }
  if (kind === 'water') { setBlock('air'); setMode('replace'); setFilter(true, 'water'); }
  generateFill();
}

/* Bedrock only accepts a replace-filter alongside `replace` mode -- there is no
   "hollow, but only where there is cobblestone". Rather than greying the mode
   dropdown out, the two settings give way to whichever one was touched last, so
   neither ever becomes unreachable. */

function syncFillFilter() {
  var on = isChecked('fill-filter-enable');
  $('fill-filter-fields').style.display = on ? '' : 'none';
  if (on && val('fill-mode') !== 'replace') $('fill-mode').value = 'replace';
}

function syncFillMode() {
  if (val('fill-mode') !== 'replace' && isChecked('fill-filter-enable')) {
    $('fill-filter-enable').checked = false;
    syncFillFilter();
  }
}

function syncFillVariant() {
  var variant = val('fill-variant');
  $('fill-data-field').style.display = variant === 'data' ? '' : 'none';
  $('fill-states-field').style.display = variant === 'states' ? '' : 'none';
}

/* ---------------- /clone ---------------- */

function generateClone() {
  var from = readCoords('clone-from');
  var to = readCoords('clone-to');
  var dest = readCoords('clone-dest');

  var problems = badCoords(from, 'Source corner 1')
    .concat(badCoords(to, 'Source corner 2'))
    .concat(badCoords(dest, 'Destination'));

  var mask = val('clone-mask') || 'replace';
  var mode = val('clone-mode') || 'normal';
  var filterBlock = cleanId(val('clone-filter-block'));

  if (mask === 'filtered' && !filterBlock) {
    problems.push('Filtered mode needs the block to copy.');
  }
  if (problems.length) return renderError('clone-output', problems);

  var parts = ['/clone', from.text, to.text, dest.text];

  /* maskMode has to be present before cloneMode, and both before the filter block. */
  if (mask !== 'replace' || mode !== 'normal' || mask === 'filtered') {
    parts.push(mask);
  }
  if (mode !== 'normal' || mask === 'filtered') {
    parts.push(mode);
  }
  if (mask === 'filtered') {
    parts.push(filterBlock);
    var fd = val('clone-filter-data');
    if (fd !== '') parts.push(fd);
  }

  var size = regionSize(from, to);
  var messages = [];
  var warn = limitWarning(size, 'clone');
  if (warn) messages.push(warn);

  messages.push({
    type: 'info',
    text: 'The destination is the lowest north-west corner of where the copy lands ' +
      '— smallest X, smallest Y, smallest Z.'
  });

  if (mode === 'move') {
    messages.push({
      type: 'warn',
      text: 'move deletes the original and leaves air behind. Use normal if you want to keep it.'
    });
  }

  render('clone-output', {
    messages: messages,
    stats: sizeStats(size),
    groups: [{ commands: [parts.join(' ')] }]
  });
}

function syncCloneFilter() {
  var show = val('clone-mask') === 'filtered' ? '' : 'none';
  $('clone-filter-fields').style.display = show;
  $('clone-filter-data-field').style.display = show;
}

/* ---------------- /setblock ---------------- */

function generateSetblock() {
  var at = readCoords('sb-at');
  var problems = badCoords(at, 'Position');

  var block = cleanId(val('sb-block'));
  if (!block) problems.push('Choose a block to place.');
  if (problems.length) return renderError('sb-output', problems);

  var mode = val('sb-mode') || 'replace';
  var variant = val('sb-variant') || 'none';
  var needsData = mode !== 'replace' && variant === 'none';

  var parts = ['/setblock', at.text,
    blockChunk(block, variant, val('sb-data'), val('sb-states'), needsData)];
  if (mode !== 'replace') parts.push(mode);

  var messages = [];
  if (needsData) {
    messages.push({
      type: 'info',
      text: 'Added the data value 0 — Bedrock needs it before the "' + mode + '" keyword.'
    });
  }

  render('sb-output', {
    messages: messages,
    groups: [{ commands: [parts.join(' ')] }]
  });
}

function syncSetblockVariant() {
  var variant = val('sb-variant');
  $('sb-data-field').style.display = variant === 'data' ? '' : 'none';
  $('sb-states-field').style.display = variant === 'states' ? '' : 'none';
}

/* ---------------- clear entities in a region ----------------

   Bedrock's volume selector is an origin plus a SIZE (dx/dy/dz), not a second
   corner. Feeding it the far corner -- easy mistake -- selects the wrong box,
   so this works out the sizes from the two corners you actually clicked. */

function generateClearEntities() {
  var from = readCoords('ce-from');
  var to = readCoords('ce-to');
  var problems = badCoords(from, 'Corner 1').concat(badCoords(to, 'Corner 2'));
  if (problems.length) return renderError('ce-output', problems);

  var axes = ['x', 'y', 'z'];
  var origin = [], sizes = [];
  for (var i = 0; i < 3; i++) {
    var a = parseCoordToken(from.tokens[i]);
    var b = parseCoordToken(to.tokens[i]);
    if (!a || !b || a.rel !== b.rel) {
      return renderError('ce-output', [
        'The ' + axes[i].toUpperCase() + ' coordinates must both be absolute ' +
        'or both relative so the region size can be worked out.'
      ]);
    }
    var lo = Math.min(a.n, b.n), hi = Math.max(a.n, b.n);
    origin.push(a.rel + (a.rel && lo === 0 ? '' : lo));
    sizes.push(hi - lo);
  }

  var type = cleanId(val('ce-type'));
  var messages = [];
  var selector = [];

  if (type) {
    selector.push('type=' + type);
  } else {
    selector.push('type=!player');
    messages.push({
      type: 'warn',
      text: 'No entity type given, so this targets everything except players ' +
        '(type=!player). That includes item frames, armor stands, minecarts ' +
        'and dropped items inside the region.'
    });
  }

  for (var j = 0; j < 3; j++) {
    selector.push(axes[j] + '=' + origin[j]);
  }
  for (var k = 0; k < 3; k++) {
    selector.push('d' + axes[k] + '=' + sizes[k]);
  }

  messages.push({
    type: 'info',
    text: 'dx/dy/dz are the size of the box measured from the first corner, not ' +
      'the second corner’s coordinates. Sizes here: ' + sizes.join(', ') + '.'
  });

  render('ce-output', {
    messages: messages,
    stats: sizeStats(regionSize(from, to)),
    groups: [{ commands: ['/kill @e[' + selector.join(',') + ']'] }]
  });
}

/* ---------------- wiring ---------------- */

document.addEventListener('DOMContentLoaded', function () {
  on('fill-generate', 'click', generateFill);
  on('fill-filter-enable', 'change', syncFillFilter);
  on('fill-mode', 'change', syncFillMode);
  on('fill-variant', 'change', syncFillVariant);
  syncFillFilter();
  syncFillVariant();

  var presets = document.querySelectorAll('[data-fill-preset]');
  for (var i = 0; i < presets.length; i++) {
    (function (btn) {
      btn.addEventListener('click', function () {
        fillPreset(btn.getAttribute('data-fill-preset'));
      });
    })(presets[i]);
  }

  on('clone-generate', 'click', generateClone);
  on('clone-mask', 'change', syncCloneFilter);
  syncCloneFilter();

  on('sb-generate', 'click', generateSetblock);
  on('sb-variant', 'change', syncSetblockVariant);
  syncSetblockVariant();

  on('ce-generate', 'click', generateClearEntities);

  submitOnEnter('tool-fill', generateFill);
  submitOnEnter('tool-clone', generateClone);
  submitOnEnter('tool-setblock', generateSetblock);
  submitOnEnter('tool-clear-entities', generateClearEntities);
});
