/* CommandCrafter — notes.

   Notes live in the browser's localStorage, on this machine and this browser
   only. Nothing is uploaded anywhere. That also means clearing site data will
   take them with it, so there is an export button — use it.

   Opened straight from disk some browsers refuse localStorage entirely, so
   every read and write is guarded and the page says so rather than pretending
   to have saved. */

var NOTES_KEY = 'commandcrafter.notes.v1';
var storageBroken = false;
var editingId = null;

function storageAvailable() {
  try {
    var probe = '__cc_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch (e) {
    return false;
  }
}

function loadNotes() {
  try {
    var raw = window.localStorage.getItem(NOTES_KEY);
    if (!raw) return [];
    var parsed = JSON.parse(raw);
    return Object.prototype.toString.call(parsed) === '[object Array]' ? parsed : [];
  } catch (e) {
    return [];
  }
}

function saveNotes(notes) {
  try {
    window.localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    return true;
  } catch (e) {
    storageBroken = true;
    showStorageWarning('Could not save — the browser refused local storage. ' +
      'Export your notes before closing this tab.');
    return false;
  }
}

function newId() {
  return 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function stamp() {
  var d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0') + ' ' +
    String(d.getHours()).padStart(2, '0') + ':' +
    String(d.getMinutes()).padStart(2, '0');
}

/* ---------------- editing ---------------- */

function currentDraft() {
  return {
    title: val('note-title'),
    body: $('note-body') ? $('note-body').value : ''
  };
}

function clearForm() {
  editingId = null;
  $('note-title').value = '';
  $('note-body').value = '';
  $('note-save').querySelector('.btn-label').textContent = 'Save note';
  $('note-cancel').style.display = 'none';
  $('note-editing-label').textContent = '';
}

function saveNote() {
  var draft = currentDraft();
  if (!draft.title && !draft.body.trim()) {
    showStorageWarning('Nothing to save — add a title or some text first.');
    return;
  }

  var notes = loadNotes();

  if (editingId) {
    for (var i = 0; i < notes.length; i++) {
      if (notes[i].id === editingId) {
        notes[i].title = draft.title;
        notes[i].body = draft.body;
        notes[i].updated = stamp();
        break;
      }
    }
  } else {
    notes.unshift({
      id: newId(),
      title: draft.title || 'Untitled',
      body: draft.body,
      created: stamp(),
      updated: stamp()
    });
  }

  if (saveNotes(notes)) {
    clearForm();
    clearStorageWarning();
    renderNotes();
  }
}

function editNote(id) {
  var notes = loadNotes();
  for (var i = 0; i < notes.length; i++) {
    if (notes[i].id !== id) continue;
    editingId = id;
    $('note-title').value = notes[i].title === 'Untitled' ? '' : notes[i].title;
    $('note-body').value = notes[i].body;
    $('note-save').querySelector('.btn-label').textContent = 'Update note';
    $('note-cancel').style.display = '';
    $('note-editing-label').textContent = 'Editing "' + notes[i].title + '"';
    $('note-title').focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
}

function deleteNote(id) {
  var notes = loadNotes();
  var target = null;
  for (var i = 0; i < notes.length; i++) {
    if (notes[i].id === id) { target = notes[i]; break; }
  }
  if (!target) return;
  if (!window.confirm('Delete "' + target.title + '"? This cannot be undone.')) return;

  var kept = [];
  for (var j = 0; j < notes.length; j++) {
    if (notes[j].id !== id) kept.push(notes[j]);
  }
  if (saveNotes(kept)) {
    if (editingId === id) clearForm();
    renderNotes();
  }
}

/* ---------------- rendering ---------------- */

function matchesFilter(note, needle) {
  if (!needle) return true;
  var hay = (note.title + '\n' + note.body).toLowerCase();
  return hay.indexOf(needle) !== -1;
}

function renderNotes() {
  var list = $('notes-list');
  var notes = loadNotes();
  var needle = val('note-search').toLowerCase();
  var shown = [];

  for (var i = 0; i < notes.length; i++) {
    if (matchesFilter(notes[i], needle)) shown.push(notes[i]);
  }

  list.innerHTML = '';
  $('notes-count').textContent = notes.length
    ? (needle ? shown.length + ' of ' + notes.length + ' notes' :
        notes.length + (notes.length === 1 ? ' note' : ' notes'))
    : '';

  if (!notes.length) {
    list.appendChild(emptyState(
      'No notes yet.',
      'Coordinates, block palettes, half-finished command chains — anything you ' +
      'would otherwise lose in a text file.'));
    return;
  }
  if (!shown.length) {
    list.appendChild(emptyState('Nothing matches "' + val('note-search') + '".', ''));
    return;
  }

  for (var j = 0; j < shown.length; j++) {
    list.appendChild(noteCard(shown[j]));
  }
}

function emptyState(headline, detail) {
  var box = document.createElement('div');
  box.className = 'note-empty';
  var h = document.createElement('div');
  h.className = 'note-empty-head';
  h.textContent = headline;
  box.appendChild(h);
  if (detail) {
    var p = document.createElement('p');
    p.textContent = detail;
    box.appendChild(p);
  }
  return box;
}

function noteCard(note) {
  var card = document.createElement('article');
  card.className = 'note';

  var head = document.createElement('div');
  head.className = 'note-head';

  var title = document.createElement('h3');
  title.className = 'note-title';
  title.textContent = note.title;
  head.appendChild(title);

  var actions = document.createElement('div');
  actions.className = 'note-actions';
  actions.appendChild(copyButton(note.body, 'Copy'));
  actions.appendChild(iconButton('pencil', 'Edit', function () { editNote(note.id); }));
  actions.appendChild(iconButton('trash', 'Delete', function () { deleteNote(note.id); }, 'danger'));
  head.appendChild(actions);

  card.appendChild(head);

  var meta = document.createElement('div');
  meta.className = 'note-meta';
  meta.textContent = note.updated && note.updated !== note.created
    ? 'Edited ' + note.updated
    : 'Added ' + (note.created || note.updated || '');
  card.appendChild(meta);

  if (note.body) {
    var body = document.createElement('pre');
    body.className = 'note-body';
    body.textContent = note.body;
    card.appendChild(body);
  }

  return card;
}

function iconButton(icon, label, handler, extraClass) {
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'small' + (extraClass ? ' ' + extraClass : '');

  var slot = document.createElement('span');
  slot.className = 'icon-slot';
  slot.appendChild(iconEl(icon));
  btn.appendChild(slot);

  var caption = document.createElement('span');
  caption.className = 'btn-label';
  caption.textContent = label;
  btn.appendChild(caption);

  btn.addEventListener('click', handler);
  return btn;
}

/* ---------------- warnings ---------------- */

function showStorageWarning(text) {
  var box = $('notes-warning');
  box.innerHTML = '';
  var msg = document.createElement('div');
  msg.className = 'msg warn';
  var badge = document.createElement('span');
  badge.setAttribute('data-icon', 'warn');
  badge.appendChild(iconEl('warn'));
  msg.appendChild(badge);
  var body = document.createElement('span');
  body.textContent = text;
  msg.appendChild(body);
  box.appendChild(msg);
}

function clearStorageWarning() {
  if (!storageBroken) $('notes-warning').innerHTML = '';
}

/* ---------------- export / import ---------------- */

function downloadFile(filename, text, mime) {
  var blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}

function today() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
    '-' + String(d.getDate()).padStart(2, '0');
}

function exportJson() {
  var notes = loadNotes();
  if (!notes.length) return showStorageWarning('There are no notes to export yet.');
  downloadFile('commandcrafter-notes-' + today() + '.json',
    JSON.stringify(notes, null, 2), 'application/json');
}

function exportText() {
  var notes = loadNotes();
  if (!notes.length) return showStorageWarning('There are no notes to export yet.');
  var out = [];
  for (var i = 0; i < notes.length; i++) {
    out.push('== ' + notes[i].title);
    if (notes[i].updated) out.push('(' + notes[i].updated + ')');
    out.push('');
    out.push(notes[i].body);
    out.push('');
  }
  downloadFile('commandcrafter-notes-' + today() + '.txt', out.join('\n'));
}

/* Imported notes are added alongside what is already here. Nothing is
   overwritten -- a duplicate is easier to delete than a lost note is to get back. */
function importJson(file) {
  var reader = new FileReader();
  reader.onload = function () {
    var incoming;
    try {
      incoming = JSON.parse(String(reader.result));
    } catch (e) {
      return showStorageWarning('That file is not valid JSON.');
    }
    if (Object.prototype.toString.call(incoming) !== '[object Array]') {
      return showStorageWarning('That file does not look like a CommandCrafter export.');
    }

    var notes = loadNotes();
    var existing = {};
    for (var i = 0; i < notes.length; i++) existing[notes[i].id] = true;

    var added = 0;
    for (var j = 0; j < incoming.length; j++) {
      var n = incoming[j];
      if (!n || typeof n.title === 'undefined') continue;
      notes.unshift({
        id: (n.id && !existing[n.id]) ? n.id : newId(),
        title: String(n.title || 'Untitled'),
        body: String(n.body || ''),
        created: n.created || stamp(),
        updated: n.updated || stamp()
      });
      added++;
    }

    if (saveNotes(notes)) {
      renderNotes();
      showStorageWarning('Imported ' + added + (added === 1 ? ' note.' : ' notes.'));
    }
  };
  reader.readAsText(file);
}

/* ---------------- wiring ---------------- */

document.addEventListener('DOMContentLoaded', function () {
  if (!storageAvailable()) {
    storageBroken = true;
    showStorageWarning('This browser will not let the page save anything locally, ' +
      'so notes will disappear when you close the tab. Serving the folder over ' +
      'http://localhost instead of opening the file directly usually fixes it.');
  }

  on('note-save', 'click', saveNote);
  on('note-cancel', 'click', function () { clearForm(); renderNotes(); });
  on('note-search', 'input', renderNotes);
  on('note-export-json', 'click', exportJson);
  on('note-export-txt', 'click', exportText);

  on('note-import', 'click', function () { $('note-import-file').click(); });
  on('note-import-file', 'change', function (e) {
    if (e.target.files && e.target.files[0]) importJson(e.target.files[0]);
    e.target.value = '';
  });

  /* Ctrl+Enter saves, so a long note does not need a trip to the mouse. */
  var body = $('note-body');
  if (body) {
    body.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        saveNote();
      }
    });
  }

  clearForm();
  renderNotes();
});
