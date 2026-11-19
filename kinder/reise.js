const $ = (id) => document.getElementById(id);
const places = {
  port: [
    'Saint-Martin · Hafen',
    'saint-martin',
    'Welche Bewegung verrät dir, dass ein Boot schwimmt?',
  ],
  ice: ['Glace am Hafen', 'glace', 'Welche Farbe würdest du den Grosseltern zeigen?'],
};
const signs = { Sonne: '☀', Mond: '☾', Stern: '★' };
const button = (text, action) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = text;
  b.onclick = action;
  return b;
};
const status = (text) => ($('status').textContent = text);
const database = indexedDB.open('sommer2027-kinder-reisefuehrer', 2);
database.onupgradeneeded = () => {
  for (const name of ['profiles', 'films', 'days', 'media'])
    if (!database.result.objectStoreNames.contains(name))
      database.result.createObjectStore(name, { keyPath: 'id' });
};
database.onerror = () =>
  status('Der Gerätespeicher lässt sich nicht öffnen. Bitte prüfe die Browsereinstellungen.');
function access(store, method, ...args) {
  return new Promise((resolve, reject) => {
    const tx = database.result.transaction(
      store,
      ['put', 'delete'].includes(method) ? 'readwrite' : 'readonly',
    );
    const req = tx.objectStore(store)[method](...args);
    tx.oncomplete = () => resolve(req.result);
    tx.onabort = () => reject(tx.error);
  });
}
// Commit metadata and bytes together. Older entries may hold a File directly.
function changeFilm(id, metadata, bytes) {
  return new Promise((resolve, reject) => {
    const tx = database.result.transaction(['films', 'media'], 'readwrite');
    if (metadata) {
      tx.objectStore('films').put(metadata);
      tx.objectStore('media').put({ id, bytes });
    } else {
      tx.objectStore('films').delete(id);
      tx.objectStore('media').delete(id);
    }
    tx.oncomplete = resolve;
    tx.onabort = () => reject(tx.error);
  });
}
let profiles = [],
  active,
  day,
  pending,
  previewURL,
  busy = false;
const playbackURLs = new Set();
const date = new Date();
const today = [date.getFullYear(), date.getMonth() + 1, date.getDate()].join('-');
database.onsuccess = async () => {
  try {
    profiles = await access('profiles', 'getAll');
    day = (await access('days', 'get', today)) ?? {
      id: today,
      allowed: [],
      votes: {},
      done: [],
      ended: false,
    };
    for (const [id, [name]] of Object.entries(places)) $('location').add(new Option(name, id));
    renderProfiles();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('../sw.js').catch(() => {});
  } catch {
    status('Der Reiseführer konnte nicht geöffnet werden.');
  }
};
function clearPreview() {
  $('preview').removeAttribute('src');
  $('preview').load();
  if (previewURL) URL.revokeObjectURL(previewURL);
  previewURL = null;
  pending = null;
  $('camera').value = '';
  $('draft').hidden = true;
}
function renderProfiles() {
  $('profiles').replaceChildren();
  for (const id of [1, 2]) {
    const p = profiles.find((p) => p.id === id);
    const b = button(p ? signs[p.avatar] + ' ' + p.nickname : 'Profil ' + id + ' anlegen', () =>
      select(id),
    );
    b.setAttribute('aria-pressed', String(id === active));
    $('profiles').append(b);
  }
}
function select(id) {
  if (busy || (pending && !confirm('Offenen Film verwerfen und Profil wechseln?'))) return;
  clearPreview();
  active = id;
  status('');
  const p = profiles.find((p) => p.id === id);
  renderProfiles();
  $('editor').hidden = !!p;
  $('desk').hidden = !p;
  $('editor').reset();
  if (p) {
    for (const key of ['nickname', 'avatar', 'pet', 'petname', 'scarf'])
      $('editor').elements[key].value = p[key];
    renderDesk();
  }
}
$('edit').onclick = () => {
  $('editor').hidden = false;
  $('editor').elements.nickname.focus();
};
$('editor').onsubmit = async (event) => {
  event.preventDefault();
  if (busy) return;
  const p = { ...Object.fromEntries(new FormData(event.target)), id: active };
  p.nickname = p.nickname.trim();
  p.petname = p.petname.trim();
  if (!p.nickname || !p.petname) return status('Gib dir und deinem Tier einen Namen.');
  busy = true;
  try {
    await access('profiles', 'put', p);
    profiles = profiles.filter((x) => x.id !== p.id).concat(p);
    $('editor').hidden = true;
    $('desk').hidden = false;
    renderProfiles();
    renderDesk();
    status('Profil gespeichert.');
  } catch {
    status('Profil konnte nicht gespeichert werden.');
  } finally {
    busy = false;
  }
};
async function updateDay(change) {
  if (busy) return;
  busy = true;
  const next = structuredClone(day);
  change(next);
  try {
    await access('days', 'put', next);
    day = next;
    renderPlan();
  } catch {
    status('Der Plan konnte nicht gespeichert werden.');
    renderPlan();
  } finally {
    busy = false;
  }
}
function renderPlan() {
  $('allow').replaceChildren();
  $('places').replaceChildren();
  for (const [id, [name, image]] of Object.entries(places)) {
    const allowed = day.allowed.includes(id);
    const b = button(name, () =>
      updateDay((d) => {
        d.allowed = allowed ? d.allowed.filter((x) => x !== id) : [...d.allowed, id];
        if (allowed)
          for (const child of Object.keys(d.votes))
            if (d.votes[child] === id) delete d.votes[child];
      }),
    );
    b.setAttribute('aria-pressed', String(allowed));
    b.disabled = day.ended;
    $('allow').append(b);
    if (!allowed) continue;
    const choice = button(name, () =>
      updateDay((d) => {
        d.votes[active] = id;
        $('location').value = id;
        mission();
      }),
    );
    const img = new Image();
    img.alt = '';
    img.src = '../assets/activity-photos/' + image + '.jpg';
    choice.prepend(img);
    choice.disabled = day.ended;
    choice.setAttribute('aria-pressed', String(day.votes[active] === id));
    $('places').append(choice);
  }
  const stops = [...new Set(Object.values(day.votes))];
  const next = stops.find((x) => !day.done.includes(x));
  $('plan').textContent = day.ended
    ? 'Nachmittag beendet. Eure Entdeckungen bleiben im Reiseführer.'
    : next
      ? 'Nächster Halt: ' +
        places[next][0] +
        '. Gemeinsam gewählt: ' +
        stops.map((x) => places[x][0]).join(' und ')
      : stops.length
        ? 'Alle gewählten Stopps besucht.'
        : day.allowed.length
          ? 'Wählt je einen Wunsch.'
          : 'Lasst zuerst eure Eltern Ziele freigeben.';
  $('next').disabled = !next || day.ended;
  $('next').onclick = () => updateDay((d) => d.done.push(next));
  $('end').disabled = day.ended;
}
$('end').onclick = () => {
  if (confirm('Nachmittag für euch beide beenden?')) updateDay((d) => (d.ended = true));
};
function mission() {
  const p = profiles.find((x) => x.id === active);
  $('mission').textContent = p.petname + ' fragt: ' + places[$('location').value][2];
}
$('location').onchange = mission;
function renderDesk() {
  const p = profiles.find((x) => x.id === active);
  $('owner').textContent = signs[p.avatar] + ' ' + p.nickname;
  for (const [species, id] of Object.entries({ Fuchs: 'fox', Möwe: 'gull', Otter: 'otter' }))
    $(id).setAttribute('display', species === p.pet ? 'inline' : 'none');
  $('scarf').setAttribute(
    'fill',
    { Koralle: '#ad503c', Türkis: '#247773', Gold: '#b98725' }[p.scarf],
  );
  $('companion').textContent = p.petname + ' · ' + p.pet + ' mit Halstuch in ' + p.scarf;
  $('location').value = day.votes[active] || 'port';
  mission();
  renderPlan();
  listFilms().catch(() => status('Filme konnten nicht geladen werden.'));
}
$('camera').onchange = () => {
  const file = $('camera').files[0];
  if (!file) return;
  if (!file.type.startsWith('video/') || file.size > 100 * 1024 * 1024) {
    status('Bitte wähle einen kurzen Film unter 100 MB.');
    return;
  }
  clearPreview();
  pending = {
    id: crypto.randomUUID(),
    child: active,
    day: today,
    place: $('location').value,
    file,
  };
  previewURL = URL.createObjectURL(file);
  $('preview').src = previewURL;
  $('draft').hidden = false;
  status(
    'Vorschau für ' +
      profiles.find((x) => x.id === active).nickname +
      ' · ' +
      places[pending.place][0],
  );
};
$('discard').onclick = () => {
  if (!busy) {
    clearPreview();
    status('Vorschau verworfen.');
  }
};
$('keep').onclick = async () => {
  if (!pending || busy) return;
  busy = true;
  $('camera').disabled = true;
  try {
    const { file, ...metadata } = pending;
    await changeFilm(
      metadata.id,
      { ...metadata, name: file.name, type: file.type },
      await file.arrayBuffer(),
    );
    clearPreview();
    await listFilms();
    status('Gespeichert. Dein Film ist im Reiseführer.');
  } catch {
    status('Speichern fehlgeschlagen. Prüfe den freien Speicher und versuche es erneut.');
  } finally {
    busy = false;
    $('camera').disabled = false;
  }
};
let listing = 0;
async function listFilms() {
  const version = ++listing;
  $('films').replaceChildren();
  for (const url of playbackURLs) URL.revokeObjectURL(url);
  playbackURLs.clear();
  const keys = await access('films', 'getAllKeys');
  if (version !== listing) return;
  for (const key of keys) {
    const entry = await access('films', 'get', key);
    if (version !== listing) return;
    if (entry?.child !== active) continue;
    const row = document.createElement('article');
    const title = places[entry.place][0] + ' · ' + entry.day;
    row.append(
      button('Film ansehen · ' + title, async (e) => {
        const source =
          entry.file ?? new Blob([(await access('media', 'get', key)).bytes], { type: entry.type });
        if (version !== listing) return;
        const url = URL.createObjectURL(source);
        playbackURLs.add(url);
        const v = document.createElement('video');
        v.controls = true;
        v.playsInline = true;
        v.src = url;
        e.target.replaceWith(v);
        v.play().catch(() => {});
        const a = document.createElement('a');
        a.href = url;
        a.download = entry.name || entry.file?.name || 'Ferienfilm';
        a.textContent = 'Datei exportieren';
        row.append(a);
      }),
      button('Film löschen', async () => {
        if (!confirm('Diesen Film endgültig vom Gerät löschen?')) return;
        try {
          await changeFilm(key);
          await listFilms();
          status('Film gelöscht.');
        } catch {
          status('Löschen fehlgeschlagen.');
        }
      }),
    );
    $('films').append(row);
  }
}
