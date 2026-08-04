/* CommandCrafter — inline SVG icon set.

   Icons are built in JS rather than linked from a sprite file or a CDN so the
   site still works opened straight off disk, where fetching anything external
   is blocked. Every icon is a 24x24 stroke drawing that inherits currentColor,
   so it picks up the colour of whatever it sits in. */

window.CC_ICONS = {

  /* --- navigation --- */
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',

  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>' +
        '<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>' +
        '<path d="M8 7h8M8 11h5"/>',

  /* --- build --- */
  cube: '<path d="M12 2.5 20.5 7v10L12 21.5 3.5 17V7z"/>' +
        '<path d="M3.5 7 12 11.8 20.5 7"/><path d="M12 11.8v9.7"/>',

  clone: '<path d="M3.5 4.2 9 1.5l5.5 2.7v5.6L9 12.5 3.5 9.8z"/>' +
         '<path d="M9.5 14.2 15 11.5l5.5 2.7v5.6L15 22.5l-5.5-2.7z"/>' +
         '<path d="M9.5 14.2 15 16.6l5.5-2.4M15 16.6v5.9"/>',

  block: '<path d="M3 3h18v18H3z"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>' +
         '<path d="M9 9h6v6H9z" fill="currentColor" stroke="none" opacity=".85"/>',

  broom: '<path d="M4 20h16"/><path d="M14.5 3.5 9 9"/>' +
         '<path d="m8 8 8 8-2.4 2.4a3 3 0 0 1-4.2 0l-3.8-3.8a3 3 0 0 1 0-4.2z"/>' +
         '<path d="M18 4.5 19.5 3M20 8h2M16 2v-.5"/>',

  /* --- NPC --- */
  npc: '<path d="M12 12.5a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5z"/>' +
       '<path d="M4.5 21v-1.2A5.8 5.8 0 0 1 10.3 14h3.4a5.8 5.8 0 0 1 5.8 5.8V21"/>',

  speech: '<path d="M21 14.5a2.5 2.5 0 0 1-2.5 2.5H9l-5 4V5.5A2.5 2.5 0 0 1 6.5 3h12A2.5 2.5 0 0 1 21 5.5z"/>' +
          '<path d="M8.5 10h.01M12 10h.01M15.5 10h.01"/>',

  tag: '<path d="M20.6 13.4 12 4.8H4.5v7.5l8.6 8.6a2 2 0 0 0 2.8 0l4.7-4.7a2 2 0 0 0 0-2.8z"/>' +
       '<path d="M8 8h.01"/>',

  coins: '<path d="M12 8.5c4.1 0 7.5-1.2 7.5-2.75S16.1 3 12 3 4.5 4.2 4.5 5.75 7.9 8.5 12 8.5z"/>' +
         '<path d="M19.5 5.75v6c0 1.55-3.4 2.75-7.5 2.75s-7.5-1.2-7.5-2.75v-6"/>' +
         '<path d="M19.5 11.75v6c0 1.55-3.4 2.75-7.5 2.75s-7.5-1.2-7.5-2.75v-6"/>',

  chart: '<path d="M4 20.5V13M10 20.5V4M16 20.5v-5.5M20.5 20.5h-17"/>',

  egg: '<path d="M12 21.2c3.9 0 6.8-2.8 6.8-6.6C18.8 10.3 15.9 2.8 12 2.8S5.2 10.3 5.2 14.6c0 3.8 2.9 6.6 6.8 6.6z"/>' +
       '<path d="M10 11h.01M13.5 14h.01M10.5 16.5h.01"/>',

  link: '<path d="M10.2 13.8a4.5 4.5 0 0 0 6.8.5l2.7-2.7a4.5 4.5 0 0 0-6.4-6.4l-1.5 1.6"/>' +
        '<path d="M13.8 10.2a4.5 4.5 0 0 0-6.8-.5l-2.7 2.7a4.5 4.5 0 0 0 6.4 6.4l1.5-1.6"/>',

  lock: '<path d="M5.5 10.5h13a1 1 0 0 1 1 1v8.5a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-8.5a1 1 0 0 1 1-1z"/>' +
        '<path d="M8.25 10.5V7a3.75 3.75 0 0 1 7.5 0v3.5"/><path d="M12 15v2"/>',

  note: '<path d="M14 3H6.5a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8z"/>' +
        '<path d="M14 3v5h5"/><path d="M8.5 12.5h7M8.5 16h4.5"/>',

  /* --- interface --- */
  plus: '<path d="M12 5v14M5 12h14"/>',

  pencil: '<path d="M4 20.5h4l10.5-10.5a2.5 2.5 0 0 0-3.5-3.5L4.5 17z"/><path d="M14.5 7.5l2 2"/>',

  trash: '<path d="M4 6.5h16"/><path d="M10 11v6M14 11v6"/>' +
         '<path d="m5.5 6.5 1 13.1a1.4 1.4 0 0 0 1.4 1.4h8.2a1.4 1.4 0 0 0 1.4-1.4l1-13.1"/>' +
         '<path d="M9 6.5v-2A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5v2"/>',

  download: '<path d="M12 3.5v12"/><path d="m7.5 11 4.5 4.5 4.5-4.5"/>' +
            '<path d="M4.5 17.5v2a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-2"/>',

  upload: '<path d="M12 15.5v-12"/><path d="m7.5 8 4.5-4.5L16.5 8"/>' +
          '<path d="M4.5 17.5v2a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-2"/>',

  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.9-4.9"/>',

  copy: '<path d="M10 9h9.5a1 1 0 0 1 1 1v9.5a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1z"/>' +
        '<path d="M5.5 15h-1a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1H14a1 1 0 0 1 1 1v1"/>',

  check: '<path d="M20 6.5 9.5 17 4 11.5"/>',

  info: '<circle cx="12" cy="12" r="9.25"/><path d="M12 16.5v-5M12 7.75h.01"/>',

  warn: '<path d="M10.3 4 2.2 17.9a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 4a2 2 0 0 0-3.4 0z"/>' +
        '<path d="M12 9.5v4.25M12 17.5h.01"/>',

  error: '<circle cx="12" cy="12" r="9.25"/><path d="M15 9l-6 6M9 9l6 6"/>'
};

/* Returns a fresh <svg> element. Built through a wrapper div so the SVG
   namespace is applied by the parser rather than by hand. */
function iconEl(name, extraClass) {
  var paths = window.CC_ICONS[name];
  if (!paths) return document.createTextNode('');

  var wrap = document.createElement('div');
  wrap.innerHTML =
    '<svg class="icon' + (extraClass ? ' ' + extraClass : '') + '" viewBox="0 0 24 24" ' +
    'fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" ' +
    'stroke-linejoin="round" aria-hidden="true" focusable="false">' + paths + '</svg>';
  return wrap.firstChild;
}

/* Replaces every <span data-icon="name"> in the document with its drawing. */
function injectIcons(root) {
  var holders = (root || document).querySelectorAll('[data-icon]');
  for (var i = 0; i < holders.length; i++) {
    var holder = holders[i];
    if (holder.getAttribute('data-icon-done')) continue;
    var svg = iconEl(holder.getAttribute('data-icon'));
    holder.appendChild(svg);
    holder.setAttribute('data-icon-done', '1');
  }
}
