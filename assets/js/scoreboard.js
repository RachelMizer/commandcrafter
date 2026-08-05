/* CommandCrafter — scoreboard generators.

   Bedrock only has one objective criteria, `dummy`: scores never change on their
   own, so everything is driven by commands. That is why the rest of this page is
   mostly about editing scores rather than setting them up. */

var DISPLAY_SLOTS = ['sidebar', 'list', 'belowname'];

/* Reads a target selector built from a target dropdown plus an optional score
   filter. A plain player or fake-player name cannot take [scores={...}], so the
   filter is ignored for those. */
function readTarget(prefix, problems, label) {
  var kind = val(prefix + '-target');
  var base;

  if (kind === 'custom') {
    base = cleanName(val(prefix + '-custom'));
    if (!base) problems.push(label + ': type a player or fake-player name.');
    return base;
  }

  base = kind || '@a';
  if (!isChecked(prefix + '-filter-enable')) return base;

  var objective = cleanName(val(prefix + '-filter-obj'));
  var range = scoreRange(val(prefix + '-filter-min'), val(prefix + '-filter-max'));
  if (!objective) {
    problems.push(label + ': the score filter needs an objective, or untick it.');
    return base;
  }
  if (!range) {
    problems.push(label + ': the score filter needs a minimum, a maximum, or both.');
    return base;
  }
  return base + '[scores={' + objective + '=' + range + '}]';
}

/* Shows the custom-name box only when the dropdown asks for one, and hides the
   score filter for targets that cannot carry it. */
function syncTargetControls(prefix) {
  var kind = val(prefix + '-target');
  var custom = kind === 'custom';
  var box = $(prefix + '-custom-field');
  var filter = $(prefix + '-filter-row');
  var fields = $(prefix + '-filter-fields');
  if (box) box.style.display = custom ? '' : 'none';
  if (filter) filter.style.display = custom ? 'none' : '';
  if (fields) {
    fields.style.display =
      (!custom && isChecked(prefix + '-filter-enable')) ? '' : 'none';
  }
}

function objectiveNameWarnings(name) {
  var out = [];
  if (/[^A-Za-z0-9_.\-]/.test(name)) {
    out.push({
      type: 'warn',
      text: 'Objective names are safest with letters, numbers, underscores, dots ' +
        'and hyphens only. Anything else tends to break selector syntax.'
    });
  }
  return out;
}

/* ---------------- create an objective ---------------- */

function generateCreate() {
  var problems = [];
  var objective = cleanName(requireName(val('cr-name'), 'Objective name', problems));
  if (problems.length) return renderError('cr-output', problems);

  var display = String(val('cr-display') || '').trim();
  var slot = val('cr-slot') || 'sidebar';
  var sort = val('cr-sort') || '';

  var setup = ['/scoreboard objectives add ' + objective + ' dummy' +
    (display ? ' "' + display + '"' : '')];

  if (slot !== 'none') {
    var line = '/scoreboard objectives setdisplay ' + slot + ' ' + objective;
    /* belowname has no ordering to apply. */
    if (sort && slot !== 'belowname') line += ' ' + sort;
    setup.push(line);
  }

  if (isChecked('cr-register')) {
    setup.push('/scoreboard players add @a ' + objective + ' 0');
  }

  var messages = objectiveNameWarnings(objective);
  messages.push({
    type: 'info',
    text: 'dummy is the only criteria Bedrock has. Scores change only when a ' +
      'command changes them, which is what makes them useful for currency and ' +
      'quest flags.'
  });
  if (isChecked('cr-register')) {
    messages.push({
      type: 'info',
      text: 'Adding 0 puts every player on the board without altering scores that ' +
        'already exist. Using set here would wipe them.'
    });
  }

  render('cr-output', {
    messages: messages,
    groups: [{ commands: setup }]
  });
}

/* ---------------- change a score ---------------- */

function generateChange() {
  var problems = [];
  var objective = cleanName(requireName(val('ch-obj'), 'Objective', problems));
  var target = readTarget('ch', problems, 'Target');
  var action = val('ch-action') || 'add';
  var amount = intVal('ch-amount');

  if (action !== 'reset' && amount === null) {
    problems.push('Enter an amount.');
  }
  if (problems.length) return renderError('ch-output', problems);

  var cmd;
  if (action === 'reset') {
    cmd = '/scoreboard players reset ' + target + ' ' + objective;
  } else {
    cmd = '/scoreboard players ' + action + ' ' + target + ' ' + objective + ' ' + amount;
  }

  var messages = [];
  if (action === 'set') {
    messages.push({
      type: 'warn',
      text: 'set overwrites whatever was there. Use add or remove to adjust a ' +
        'balance without destroying it.'
    });
  }
  if (action === 'reset') {
    messages.push({
      type: 'warn',
      text: 'reset removes the player from the objective entirely rather than ' +
        'setting them to 0. They stop matching scores={' + objective +
        '=...} until something puts them back on the board.'
    });
  }
  if (action === 'remove' && amount !== null) {
    messages.push({
      type: 'info',
      text: 'Scores can go negative. Gate this behind scores={' + objective + '=' +
        amount + '..} if it is a purchase.'
    });
  }

  render('ch-output', {
    messages: messages,
    groups: [{ commands: [cmd] }]
  });
}

/* ---------------- score maths ---------------- */

function generateOperation() {
  var problems = [];
  var target = readTarget('op', problems, 'Target');
  var targetObj = cleanName(requireName(val('op-target-obj'), 'Target objective', problems));
  var source = readTarget('op-src', problems, 'Source');
  var sourceObj = cleanName(requireName(val('op-source-obj'), 'Source objective', problems));
  var operation = val('op-operation') || '+=';
  if (problems.length) return renderError('op-output', problems);

  var messages = [];
  if (operation === '/=' || operation === '%=') {
    messages.push({
      type: 'warn',
      text: 'Dividing by zero fails and leaves the target score untouched. Check ' +
        'the source is not 0 before running this.'
    });
  }
  if (operation === '><') {
    messages.push({
      type: 'info',
      text: 'The swap exchanges the two scores. Both sides change.'
    });
  }
  messages.push({
    type: 'info',
    text: 'Both sides must already be on their objective. A player who has never ' +
      'been scored is skipped entirely.'
  });

  render('op-output', {
    messages: messages,
    groups: [{
      commands: ['/scoreboard players operation ' + target + ' ' + targetObj + ' ' +
        operation + ' ' + source + ' ' + sourceObj]
    }]
  });
}

/* ---------------- random number ---------------- */

function generateRandom() {
  var problems = [];
  var target = readTarget('rn', problems, 'Target');
  var objective = cleanName(requireName(val('rn-obj'), 'Objective', problems));
  var min = intVal('rn-min');
  var max = intVal('rn-max');

  if (min === null || max === null) problems.push('Enter both a minimum and a maximum.');
  else if (min > max) problems.push('The minimum cannot be larger than the maximum.');
  if (problems.length) return renderError('rn-output', problems);

  render('rn-output', {
    messages: [{
      type: 'info',
      text: 'Both ends are included, so ' + min + ' to ' + max + ' can produce ' +
        (max - min + 1) + ' different values.'
    }],
    groups: [{
      commands: ['/scoreboard players random ' + target + ' ' + objective + ' ' +
        min + ' ' + max]
    }]
  });
}

/* ---------------- check a score ---------------- */

function generateCheck() {
  var problems = [];
  var objective = cleanName(requireName(val('ck-obj'), 'Objective', problems));
  var base = val('ck-target') || '@a';
  var minRaw = val('ck-min');
  var maxRaw = val('ck-max');
  var range = scoreRange(minRaw, maxRaw);

  if (!range) problems.push('Enter a minimum, a maximum, or both.');
  if (problems.length) return renderError('ck-output', problems);

  var selector = base + '[scores={' + objective + '=' + range + '}]';
  var command = String(val('ck-command') || '').trim().replace(/^\//, '');

  var groups = [{
    title: 'Selector — use this inside any command',
    commands: [selector],
    note: 'This is the form worth learning. It filters the players a command ' +
      'affects, instead of just reporting a result.'
  }];

  groups.push({
    title: 'Run a command for everyone who matches',
    commands: ['/execute as ' + selector + ' at @s run ' +
      (command || 'say I qualify')]
  });

  /* players test works on one entity and reports into the chat, so it is only
     really useful for eyeballing a value while building. */
  var testTarget = base === '@a' ? '@p' : base;
  groups.push({
    title: 'Read one player’s score in chat',
    commands: ['/scoreboard players test ' + testTarget + ' ' + objective + ' ' +
      (String(minRaw).trim() === '' ? '*' : String(minRaw).trim()) + ' ' +
      (String(maxRaw).trim() === '' ? '*' : String(maxRaw).trim())],
    note: '* means unbounded on that end. This one prints a result rather than ' +
      'doing anything, so it is for checking your work by hand.'
  });

  render('ck-output', {
    messages: [{
      type: 'info',
      text: 'Ranges are inclusive: ' + range + ' includes every value shown. ' +
        'A bare number is an exact match, which usually is not what a price ' +
        'check wants.'
    }],
    groups: groups
  });
}

/* ---------------- display ---------------- */

function generateDisplay() {
  var problems = [];
  var objective = cleanName(val('dp-obj'));
  var slot = val('dp-slot') || 'sidebar';
  var sort = val('dp-sort') || '';
  var action = val('dp-action') || 'show';

  if (action === 'show' && !objective) {
    problems.push('Name the objective to display, or switch to "clear the slot".');
  }
  if (problems.length) return renderError('dp-output', problems);

  var cmd = '/scoreboard objectives setdisplay ' + slot;
  if (action === 'show') {
    cmd += ' ' + objective;
    if (sort && slot !== 'belowname') cmd += ' ' + sort;
  }

  var messages = [];
  if (action === 'clear') {
    messages.push({
      type: 'info',
      text: 'Leaving the objective off empties that slot. The objective and every ' +
        'score it holds stay exactly as they were.'
    });
  }
  if (sort && slot === 'belowname' && action === 'show') {
    messages.push({
      type: 'warn',
      text: 'belowname shows one number under each player’s nametag, so there is ' +
        'nothing to sort — the sort order was left off.'
    });
  }

  var others = [];
  for (var i = 0; i < DISPLAY_SLOTS.length; i++) {
    if (DISPLAY_SLOTS[i] !== slot) {
      others.push('/scoreboard objectives setdisplay ' + DISPLAY_SLOTS[i]);
    }
  }

  render('dp-output', {
    messages: messages,
    groups: [
      { commands: [cmd] },
      { title: 'Clear the other slots', commands: others }
    ]
  });
}

/* ---------------- fake players / global counters ---------------- */

function generateGlobal() {
  var problems = [];
  var name = cleanName(requireName(val('gl-name'), 'Counter name', problems));
  var objective = cleanName(requireName(val('gl-obj'), 'Objective', problems));
  var value = intVal('gl-value', 0);
  if (problems.length) return renderError('gl-output', problems);

  var handle = /^[#$.]/.test(name) ? name : '#' + name;

  render('gl-output', {
    messages: [{
      type: 'info',
      text: 'Any name that is not a real player becomes a standalone counter on ' +
        'the objective — no player attached. Starting it with # keeps it out of ' +
        'the sidebar display.'
    }, {
      type: 'warn',
      text: 'Fake players are matched by exact name, so the spelling has to agree ' +
        'everywhere. There is no selector that finds them for you.'
    }],
    groups: [
      { title: 'Set it up', commands: [
        '/scoreboard players set ' + handle + ' ' + objective + ' ' + value
      ] },
      { title: 'Change it', commands: [
        '/scoreboard players add ' + handle + ' ' + objective + ' 1',
        '/scoreboard players remove ' + handle + ' ' + objective + ' 1',
        '/scoreboard players set ' + handle + ' ' + objective + ' ' + value
      ] },
      { title: 'Read it', commands: [
        '/scoreboard players test ' + handle + ' ' + objective + ' * *'
      ] },
      { title: 'Copy it onto every player', commands: [
        '/scoreboard players operation @a ' + objective + ' = ' + handle + ' ' + objective
      ], note: 'Handy for a shared timer or a global difficulty level.' }
    ]
  });
}

/* ---------------- housekeeping ---------------- */

function generateManage() {
  var problems = [];
  var objective = cleanName(requireName(val('mg-obj'), 'Objective', problems));
  if (problems.length) return renderError('mg-output', problems);

  render('mg-output', {
    messages: [{
      type: 'warn',
      text: 'Removing an objective deletes every score on it, for everyone, with ' +
        'no undo. Nothing warns you first.'
    }],
    groups: [
      { title: 'Look at what exists', commands: [
        '/scoreboard objectives list',
        '/scoreboard players list',
        '/scoreboard players list @p'
      ] },
      { title: 'Wipe the scores, keep the objective', commands: [
        '/scoreboard players set @a ' + objective + ' 0',
        '/scoreboard players reset @a ' + objective
      ], note: 'set 0 leaves everyone on the board. reset takes them off it.' },
      { title: 'Delete the objective outright', commands: [
        '/scoreboard objectives remove ' + objective
      ] }
    ]
  });
}

/* ---------------- wiring ---------------- */

document.addEventListener('DOMContentLoaded', function () {
  var targets = ['ch', 'op', 'op-src', 'rn'];
  for (var i = 0; i < targets.length; i++) {
    (function (prefix) {
      on(prefix + '-target', 'change', function () { syncTargetControls(prefix); });
      on(prefix + '-filter-enable', 'change', function () { syncTargetControls(prefix); });
      syncTargetControls(prefix);
    })(targets[i]);
  }

  on('cr-generate', 'click', generateCreate);
  on('ch-generate', 'click', generateChange);
  on('op-generate', 'click', generateOperation);
  on('rn-generate', 'click', generateRandom);
  on('ck-generate', 'click', generateCheck);
  on('dp-generate', 'click', generateDisplay);
  on('gl-generate', 'click', generateGlobal);
  on('mg-generate', 'click', generateManage);

  on('ch-action', 'change', function () {
    $('ch-amount-field').style.display = val('ch-action') === 'reset' ? 'none' : '';
  });
  on('dp-action', 'change', function () {
    var show = val('dp-action') === 'show';
    $('dp-obj-field').style.display = show ? '' : 'none';
    $('dp-sort-field').style.display = show ? '' : 'none';
  });

  submitOnEnter('tool-create', generateCreate);
  submitOnEnter('tool-change', generateChange);
  submitOnEnter('tool-operation', generateOperation);
  submitOnEnter('tool-random', generateRandom);
  submitOnEnter('tool-check', generateCheck);
  submitOnEnter('tool-display', generateDisplay);
  submitOnEnter('tool-global', generateGlobal);
  submitOnEnter('tool-manage', generateManage);
});
