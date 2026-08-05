/* CommandCrafter — NPC dialogue, vendor and gameplay-logic generators */

/* ---------------- shared bits ---------------- */

/* Score range for "can afford" / "has enough": cost 10 -> "10.." */
function atLeast(n) { return n + '..'; }
/* Score range for "cannot afford": cost 10 -> "..9" */
function below(n) { return '..' + (n - 1); }

function colored(text, code) {
  if (!text) return '';
  return (!code || code === 'none') ? text : code + text;
}

/* Parses a textarea of "item_id [amount]" lines into [{id, amount}]. */
function parseItemLines(raw) {
  var out = [];
  var lines = String(raw || '').split('\n');
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;
    var bits = line.split(/[\s,]+/);
    var id = cleanId(bits[0]);
    if (!id) continue;
    var amount = bits.length > 1 ? parseInt(bits[1], 10) : 1;
    out.push({ id: id, amount: isNaN(amount) || amount < 1 ? 1 : amount });
  }
  return out;
}

/* "@initiator[scores={Coins=10..}]" */
function initiatorScores(objective, range) {
  return '@initiator[scores={' + objective + '=' + range + '}]';
}

/* "@initiator[hasitem={item=iron_ore,quantity=1..}]" */
function initiatorHasItem(item, range) {
  return '@initiator[hasitem={item=' + item + ',quantity=' + range + '}]';
}

/* cleanName, requireName and scoreRange live in common.js -- the scoreboard
   page needs them too. */

/* ---------------- dialogue: open a scene ---------------- */

function generateDialogue() {
  var problems = [];
  var tag = cleanName(requireName(val('dlg-tag'), 'NPC tag', problems));
  if (problems.length) return renderError('dlg-output', problems);

  var scene = cleanName(val('dlg-scene'));
  var target = val('dlg-target') || '@initiator';

  var cmd = '/dialogue open @e[tag=' + tag + '] ' + target;
  if (scene) cmd += ' ' + scene;

  var messages = [{
    type: 'info',
    text: 'Tag the NPC first with /tag, while looking at it: /tag @e[type=npc,c=1] add ' + tag
  }];
  if (!scene) {
    messages.push({
      type: 'info',
      text: 'No scene tag given, so this opens the NPC’s default dialogue.'
    });
  }

  render('dlg-output', {
    messages: messages,
    groups: [
      { title: 'Open the dialogue', commands: [cmd] },
      { title: 'Tag the NPC (run once, looking at it)',
        commands: ['/tag @e[type=npc,c=1] add ' + tag] }
    ]
  });
}

/* ---------------- vendor sells to the player ---------------- */

function generateSell() {
  var problems = [];
  var vendor = requireName(val('sell-vendor'), 'Vendor name', problems);
  var objective = cleanName(val('sell-score') || 'Coins');
  var cost = intVal('sell-cost');
  var items = parseItemLines(val('sell-items'));
  var label = String(val('sell-label') || '').trim();

  if (cost === null || cost < 1) problems.push('Cost must be a whole number of 1 or more.');
  if (!items.length) problems.push('List at least one item to give.');
  if (problems.length) return renderError('sell-output', problems);

  var rich = initiatorScores(objective, atLeast(cost));
  var poor = initiatorScores(objective, below(cost));

  var failColor = val('sell-fail-color');
  var okColor = val('sell-ok-color');
  var failMsg = colored(val('sell-fail-msg') ||
    ('You need ' + cost + ' ' + objective.toLowerCase() + ' to buy this.'), failColor);
  var okMsg = colored(val('sell-ok-msg') ||
    ('You bought ' + (label || items[0].id) + '!'), okColor);

  var failSound = val('sell-fail-sound') || 'mob.villager.haggle';
  var okSound = val('sell-ok-sound') || 'random.orb';

  var success = [
    '/playsound ' + okSound + ' ' + rich,
    '/title ' + rich + ' actionbar ' + okMsg
  ];
  for (var i = 0; i < items.length; i++) {
    success.push('/give ' + rich + ' ' + items[i].id + ' ' + items[i].amount);
  }
  /* Charging last matters: once the score drops the selector stops matching,
     so anything after it would silently do nothing. */
  success.push('/scoreboard players remove ' + rich + ' ' + objective + ' ' + cost);

  render('sell-output', {
    messages: [{
      type: 'info',
      text: 'Paste every line into the same dialogue button, in this order. ' +
        'The charge goes last on purpose — deduct the ' + objective +
        ' first and the player stops matching ' + objective + '=' + atLeast(cost) +
        ', so the items never arrive.'
    }],
    groups: [
      {
        title: 'Not enough ' + objective + ' (' + objective + ' ' + below(cost) + ')',
        tone: 'fail',
        commands: [
          '/playsound ' + failSound + ' ' + poor,
          '/title ' + poor + ' actionbar ' + failMsg
        ]
      },
      {
        title: 'Purchase goes through (' + objective + ' ' + atLeast(cost) + ')',
        tone: 'ok',
        commands: success,
        note: vendor ? 'Vendor: ' + vendor : ''
      }
    ]
  });
}

/* ---------------- vendor buys from the player ---------------- */

function generateBuy() {
  var problems = [];
  var vendor = requireName(val('buy-vendor'), 'Vendor name', problems);
  var objective = cleanName(val('buy-score') || 'Coins');
  var item = cleanId(requireName(val('buy-item'), 'Item', problems));
  var needQty = intVal('buy-qty', 1);
  var takeQty = intVal('buy-take', needQty);
  var pay = intVal('buy-pay');

  if (needQty === null || needQty < 1) problems.push('Required quantity must be 1 or more.');
  if (pay === null || pay < 1) problems.push('Payment must be a whole number of 1 or more.');
  if (takeQty !== null && needQty !== null && takeQty > needQty) {
    problems.push('You cannot take more than the quantity you check for.');
  }
  if (problems.length) return renderError('buy-output', problems);

  var has = initiatorHasItem(item, atLeast(needQty));
  var hasNot = initiatorHasItem(item, below(needQty));

  var failMsg = colored(val('buy-fail-msg') ||
    ('You have no ' + item.replace(/_/g, ' ') + ' to sell.'), val('buy-fail-color'));
  var okMsg = colored(val('buy-ok-msg') ||
    (vendor + ' bought your ' + item.replace(/_/g, ' ') + '.'), val('buy-ok-color'));

  var failSound = val('buy-fail-sound') || 'mob.villager.haggle';
  var okSound = val('buy-ok-sound') || 'random.orb';

  /* Pay before taking the item. /clear can drop the player below the hasitem
     threshold, and every later command in the button would then be skipped. */
  var success = [
    '/playsound ' + okSound + ' ' + has,
    '/title ' + has + ' actionbar ' + okMsg,
    '/scoreboard players add ' + has + ' ' + objective + ' ' + pay,
    '/clear ' + has + ' ' + item + ' 0 ' + takeQty
  ];

  render('buy-output', {
    messages: [{
      type: 'warn',
      text: 'Pay first, clear second. If /clear runs first it can take the player ' +
        'below ' + item + ' ' + atLeast(needQty) + ', and the /scoreboard line after ' +
        'it no longer matches — so they hand over the item and get nothing.'
    }],
    groups: [
      {
        title: 'Nothing to sell (' + item + ' ' + below(needQty) + ')',
        tone: 'fail',
        commands: [
          '/playsound ' + failSound + ' ' + hasNot,
          '/title ' + hasNot + ' actionbar ' + failMsg
        ]
      },
      {
        title: 'Sale goes through (' + item + ' ' + atLeast(needQty) + ')',
        tone: 'ok',
        commands: success,
        note: 'Takes ' + takeQty + ', pays ' + pay + ' ' + objective + '.'
      }
    ]
  });
}

/* Scoreboard setup lives on scoreboard.html now -- one implementation instead
   of two that drift. */

/* ---------------- redstone-triggered summon ----------------

   The NPC dialogue button cannot summon at a location the player is standing
   at, so the button sets a score and powers a redstone block; command blocks
   in the world do the summoning and then reset themselves. */

function generateSummonShop() {
  var problems = [];
  var flag = cleanName(requireName(val('ss-flag'), 'Flag objective', problems));
  var objective = cleanName(val('ss-score') || 'Coins');
  var cost = intVal('ss-cost');
  var entity = cleanId(requireName(val('ss-entity'), 'Entity', problems));

  var spawn = readCoords('ss-spawn');
  var redstone = readCoords('ss-redstone');
  problems = problems
    .concat(badCoords(spawn, 'Spawn point'))
    .concat(badCoords(redstone, 'Redstone block'));

  if (cost === null || cost < 0) problems.push('Cost must be 0 or more.');
  if (problems.length) return renderError('ss-output', problems);

  var checkCost = isChecked('ss-check-cost') && cost > 0;
  var rich = checkCost ? initiatorScores(objective, atLeast(cost)) : '@initiator';
  var poor = initiatorScores(objective, below(cost));

  var extraItem = cleanId(val('ss-extra-item'));
  var okMsg = colored(val('ss-ok-msg') || ('You bought a ' + entity.replace(/_/g, ' ') + '!'), '§a');

  var button = ['/scoreboard players add @initiator ' + flag + ' 0'];
  button.push('/playsound random.orb ' + rich);
  button.push('/title ' + rich + ' actionbar ' + okMsg);
  if (extraItem) button.push('/give ' + rich + ' ' + extraItem + ' 1');
  button.push('/scoreboard players set ' + rich + ' ' + flag + ' 1');
  if (cost > 0) {
    button.push('/scoreboard players remove ' + rich + ' ' + objective + ' ' + cost);
  }
  /* Powering the redstone goes last. The command blocks test for the flag, so
     firing them before the flag is set means block 1 finds nobody and the
     purchase silently does nothing. */
  button.push('/setblock ' + redstone.text + ' redstone_block');

  var blocks = [
    '/execute as @a[scores={' + flag + '=1..}] at @s run summon ' + entity + ' ' + spawn.text,
    '/scoreboard players set @a[scores={' + flag + '=1..}] ' + flag + ' 0',
    '/setblock ' + redstone.text + ' air'
  ];

  var groups = [];
  if (checkCost) {
    groups.push({
      title: 'Dialogue button — not enough ' + objective,
      tone: 'fail',
      commands: [
        '/playsound mob.villager.haggle ' + poor,
        '/title ' + poor + ' actionbar ' + colored('You need ' + cost + ' ' +
          objective.toLowerCase() + '.', '§c')
      ]
    });
  }
  groups.push({
    title: 'Dialogue button — purchase',
    tone: 'ok',
    commands: button,
    note: 'The /setblock is last on purpose — it powers the chain below, and the ' +
      'flag has to already be set when that happens.'
  });
  groups.push({
    title: 'Command blocks, in a row',
    commands: blocks,
    note: 'Block 1: Impulse, Unconditional, Needs Redstone. ' +
      'Blocks 2 and 3: Chain, Unconditional, Always Active — pointed at each other in order.'
  });

  render('ss-output', {
    messages: [
      { type: 'info', text: 'Create the flag objective first: /scoreboard objectives add ' +
        flag + ' dummy' },
      { type: 'info', text: 'Give each vendor its own flag objective (buyCow_aaron, ' +
        'buyPig_aaron …) so two shops never fire each other’s command blocks.' }
    ],
    groups: groups
  });
}

/* ---------------- tag-driven success / failure chain ---------------- */

function generateTagChain() {
  var problems = [];
  var tag = cleanName(requireName(val('tc-tag'), 'Tag', problems));
  var objective = cleanName(val('tc-score') || 'Coins');
  var cost = intVal('tc-cost');
  if (cost === null || cost < 1) problems.push('Cost must be 1 or more.');

  var reset = readCoords('tc-reset');
  problems = problems.concat(badCoords(reset, 'Redstone reset block'));
  if (problems.length) return renderError('tc-output', problems);

  var rich = '@a[tag=' + tag + ',scores={' + objective + '=' + atLeast(cost) + '}]';
  var poor = '@a[tag=' + tag + ',scores={' + objective + '=' + below(cost) + '}]';

  var rewardEntity = cleanId(val('tc-entity'));
  var rewardItem = cleanId(val('tc-item'));
  var sound = val('tc-sound') || 'random.orb';
  var okMsg = colored(val('tc-ok-msg') || 'Purchase complete!', '§a');
  var failMsg = colored(val('tc-fail-msg') || 'You don’t have enough ' +
    objective.toLowerCase() + '!', '§c');

  var success = [
    '/execute as ' + rich + ' at @s run playsound ' + sound + ' @s ~ ~ ~ 1 1',
    '/title ' + rich + ' actionbar ' + okMsg
  ];
  if (rewardEntity) {
    success.push('/execute as ' + rich + ' at @s run summon ' + rewardEntity + ' ~ ~1 ~');
  }
  if (rewardItem) success.push('/give ' + rich + ' ' + rewardItem + ' 1');
  /* Both of these break the selector, so they come after every reward. */
  success.push('/scoreboard players remove ' + rich + ' ' + objective + ' ' + cost);
  success.push('/tag ' + rich + ' remove ' + tag);
  success.push('/setblock ' + reset.text + ' air');

  render('tc-output', {
    messages: [{
      type: 'warn',
      text: 'Removing the tag and charging the ' + objective + ' both stop the player ' +
        'matching the selector, so they have to come after every reward line.'
    }, {
      type: 'info',
      text: 'Bedrock sound IDs look like random.orb and mob.cow.say. The Java-style ' +
        'entity.cow.ambient names, and the "master" category argument, do not work here.'
    }],
    groups: [
      {
        title: 'Success chain',
        tone: 'ok',
        commands: success,
        note: 'Chain, Unconditional, Always Active — running off the redstone block.'
      },
      {
        title: 'Failure chain',
        tone: 'fail',
        commands: [
          '/title ' + poor + ' actionbar ' + failMsg,
          '/tag ' + poor + ' remove ' + tag,
          '/setblock ' + reset.text + ' air'
        ]
      }
    ]
  });
}

/* ---------------- area access lock ---------------- */

function generateAccessLock() {
  var problems = [];
  var tag = cleanName(requireName(val('al-tag'), 'Access tag', problems));
  var area = readCoords('al-area');
  var send = readCoords('al-send');
  problems = problems
    .concat(badCoords(area, 'Protected area centre'))
    .concat(badCoords(send, 'Send trespassers to'));

  var radius = intVal('al-radius', 20);
  if (radius === null || radius < 1) problems.push('Radius must be 1 or more.');
  if (problems.length) return renderError('al-output', problems);

  var warnRadius = intVal('al-warn-radius', radius * 2);
  var here = 'x=' + area.tokens[0] + ',y=' + area.tokens[1] + ',z=' + area.tokens[2];
  var msg = colored(val('al-msg') || 'You don’t have access to this property.', '§c');

  render('al-output', {
    messages: [{
      type: 'info',
      text: 'Grant access with /tag <player> add ' + tag +
        ' and take it back with /tag <player> remove ' + tag + '.'
    }],
    groups: [
      {
        title: 'Command block 1 — Repeat, Unconditional, Always Active',
        commands: ['/execute as @a[' + here + ',r=' + radius + '] unless entity @s[tag=' +
          tag + '] run tp @s ' + send.text]
      },
      {
        title: 'Command block 2 — Chain, Unconditional, Always Active',
        commands: ['/title @a[' + here + ',r=' + warnRadius + ',tag=!' + tag +
          '] actionbar ' + msg],
        note: 'Warns people just outside the boundary before they get sent back.'
      },
      {
        title: 'Managing access',
        commands: [
          '/tag @p add ' + tag,
          '/tag @p remove ' + tag,
          '/tag @p list'
        ]
      }
    ]
  });
}

/* ---------------- wiring ---------------- */

document.addEventListener('DOMContentLoaded', function () {
  on('dlg-generate', 'click', generateDialogue);
  on('sell-generate', 'click', generateSell);
  on('buy-generate', 'click', generateBuy);
  on('ss-generate', 'click', generateSummonShop);
  on('tc-generate', 'click', generateTagChain);
  on('al-generate', 'click', generateAccessLock);

  submitOnEnter('tool-dialogue', generateDialogue);
  submitOnEnter('tool-sell', generateSell);
  submitOnEnter('tool-buy', generateBuy);
  submitOnEnter('tool-summon-shop', generateSummonShop);
  submitOnEnter('tool-tag-chain', generateTagChain);
  submitOnEnter('tool-access-lock', generateAccessLock);
});
