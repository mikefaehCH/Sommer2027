'use strict';
const $ = (s) => document.querySelector(s);
const SLOTS = ['Morgen', 'Mittag', 'Nachmittag', 'Abend'];
const START = '2027-07-07',
  END = '2027-07-20';
const DAYS = Array.from({ length: 14 }, (_, i) => {
  const d = new Date(2027, 6, 7 + i);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
});
const byId = Object.fromEntries(ACTIVITIES.map((x) => [x.id, x]));
let activityPhotos = {};
const PHOTO_REFERENCES = {
  'la-flotte': {
    title: 'La Flotte – Leuchtturm',
    source: 'https://unsplash.com/photos/white-lighthouse-on-dock-during-daytime-hWmoQVTE_Ag',
    author: 'Thomas de LUZE',
    provider: 'Unsplash',
  },
  'saint-martin': {
    title: 'Saint-Martin-de-Ré – Dächer und Meer',
    source:
      'https://www.pexels.com/photo/aerial-view-of-saint-martin-de-re-rooftops-and-ocean-33503828/',
    author: 'lemapuche breton',
    provider: 'Pexels',
  },
  vauban: {
    title: 'Saint-Martin – Festungsanlage',
    source:
      'https://unsplash.com/photos/white-concrete-wall-on-green-grass-field-under-blue-sky-during-daytime-Ne7D-r77AYg',
    author: 'Armand Khoury',
    provider: 'Unsplash',
  },
  phare: {
    title: 'Phare des Baleines – Küste',
    source: 'https://unsplash.com/photos/an-aerial-view-of-a-lighthouse-on-a-beach-quTBF1FY8VQ',
    author: 'Lucas Gallone',
    provider: 'Unsplash',
  },
  chenonceau: {
    title: 'Chenonceau – Schloss am Wasser',
    source:
      'https://unsplash.com/photos/a-large-castle-sitting-on-top-of-a-body-of-water-LvqAWNFKSxQ',
    author: 'Colin Watts',
    provider: 'Unsplash',
  },
  rochelle: {
    title: 'La Rochelle – Alter Hafen',
    source: 'https://www.pexels.com/photo/scenic-view-of-la-rochelle-harbor-and-towers-32821994/',
    author: 'Pablo',
    provider: 'Pexels',
  },
};
const REGIONS = { amboise: 'Amboise', re: 'Île de Ré', pal: 'Le PAL' };
const KEY = 'sommer27-v3';
const escapeHTML = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
function fresh() {
  return {
    version: 3,
    days: Object.fromEntries(DAYS.map((d) => [d, Object.fromEntries(SLOTS.map((s) => [s, []]))])),
    favorites: [],
    custom: [],
  };
}
function valid(v) {
  return (
    v &&
    v.version === 3 &&
    v.days &&
    typeof v.days === 'object' &&
    Array.isArray(v.favorites) &&
    Array.isArray(v.custom)
  );
}
function normalize(v) {
  if (!valid(v)) return fresh();
  const base = fresh();
  for (const d of DAYS)
    for (const slot of SLOTS) {
      const values = v.days[d]?.[slot];
      if (Array.isArray(values))
        base.days[d][slot] = values.filter((id) => typeof id === 'string').slice(0, 30);
    }
  base.favorites = v.favorites.filter((id) => typeof id === 'string');
  base.custom = v.custom
    .filter((a) => a && typeof a.id === 'string' && typeof a.name === 'string')
    .slice(0, 100);
  return base;
}
function load() {
  try {
    return normalize(JSON.parse(localStorage.getItem(KEY)));
  } catch {
    return fresh();
  }
}
let state = load(),
  selected = DAYS[0],
  history = [],
  region = 'all',
  map = null;
let cloud = null,
  cloudStamp = null,
  cloudBusy = true,
  cloudMode = false,
  cloudUser = null,
  cloudMember = null,
  votes = [],
  familyMembers = [];
const cloudStatus = (message) => {
  const el = $('#cloudStatus');
  if (el) el.textContent = message;
};
const isCloudReady = () => !cloudBusy;
async function refreshHistory() {
  if (!cloudMode) return;
  const { data, error } = await cloud
    .from('change_log')
    .select('action,details,actor_id,created_at')
    .order('created_at', { ascending: false })
    .limit(15);
  const target = $('#changeHistory');
  if (error || !target) return;
  target.replaceChildren();
  for (const item of data || []) {
    const li = document.createElement('li');
    const name =
      familyMembers.find((m) => m.user_id === item.actor_id)?.display_name || 'Familienmitglied';
    const when = new Date(item.created_at).toLocaleString('de-CH', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    const detail = item.details || {};
    const label = getActivity(detail.activity_id)?.name || detail.activity_id || 'eine Aktivität';
    const where = detail.day
      ? ' am ' +
        new Intl.DateTimeFormat('de-CH', { day: 'numeric', month: 'short' }).format(
          new Date(detail.day + 'T12:00:00'),
        ) +
        (detail.slot ? ' (' + detail.slot + ')' : '')
      : '';
    const action =
      item.action === 'plan_add'
        ? 'hat «' + label + '»' + where + ' eingeplant'
        : item.action === 'plan_remove'
          ? 'hat «' + label + '»' + where + ' entfernt'
          : item.action === 'plan_move'
            ? 'hat «' +
              label +
              '» auf ' +
              (detail.to_day || detail.day) +
              ' / ' +
              (detail.to_slot || detail.slot) +
              ' verschoben'
            : item.action === 'plan_favorite'
              ? 'hat Favoriten aktualisiert'
              : item.action === 'plan_updated'
                ? 'hat den Kalender aktualisiert'
                : item.action.startsWith('vote_')
                  ? 'hat bei «' +
                    label +
                    '» ' +
                    (item.action === 'vote_delete' ? 'die Stimme entfernt' : 'abgestimmt')
                  : 'hat etwas geändert';
    li.textContent = `${when} · ${name} ${action}`;
    target.append(li);
  }
}
async function refreshCloud() {
  if (!cloud || !cloudMember) return;
  const { data, error } = await cloud
    .from('family_plans')
    .select('data,updated_at')
    .eq('id', 'summer2027')
    .single();
  if (error) throw error;
  state = normalize(data.data);
  cloudStamp = data.updated_at;
  renderAll();
  const [v, m] = await Promise.all([
    cloud.from('activity_votes').select('activity_id,voter_id,vote'),
    cloud.from('family_members').select('user_id,display_name'),
  ]);
  if (!v.error) votes = v.data || [];
  if (!m.error) familyMembers = m.data || [];
  renderDiscover();
  await refreshHistory();
}
async function initCloud() {
  const cfg = window.SOMMER2027_SUPABASE;
  if (!cfg || !window.supabase) {
    cloudBusy = false;
    cloudStatus('Nur lokal · Für gemeinsame Planung ist eine Internetverbindung erforderlich.');
    return;
  }
  cloud = window.supabase.createClient(cfg.url, cfg.publishableKey);
  try {
    const { data } = await cloud.auth.getUser();
    if (!data?.user) {
      cloudBusy = false;
      cloudStatus('Lokaler Modus · Für gemeinsame Planung bitte mit Google anmelden.');
      return;
    }
    cloudUser = data.user;
    const { data: member, error } = await cloud
      .from('family_members')
      .select('display_name,role')
      .eq('user_id', cloudUser.id)
      .maybeSingle();
    if (error) throw error;
    if (!member) {
      cloudBusy = false;
      cloudStatus(
        'Konto noch nicht als Familienmitglied freigeschaltet · Änderungen bleiben lokal.',
      );
      return;
    }
    cloudMember = member;
    cloudMode = true;
    await refreshCloud();
    cloudStatus('Gemeinsamer Plan · ' + member.display_name + ' · Synchronisiert');
  } catch (e) {
    cloudMode = Boolean(cloudMember);
    cloudStatus('Synchronisation fehlgeschlagen: ' + e.message + ' · Bitte neu laden.');
  } finally {
    cloudBusy = false;
  }
}
async function persistCloud(previous) {
  const expected = cloudStamp;
  try {
    const { data, error } = await cloud
      .from('family_plans')
      .update({ data: state })
      .eq('id', 'summer2027')
      .eq('updated_at', expected)
      .select('updated_at')
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      state = previous;
      history.pop();
      await refreshCloud();
      toast('Jemand hat den Plan geändert. Neu geladen – bitte Änderung wiederholen.');
      return;
    }
    cloudStamp = data.updated_at;
    cloudStatus('Gemeinsamer Plan · ' + cloudMember.display_name + ' · Gespeichert');
    await refreshHistory();
  } catch (e) {
    state = previous;
    history.pop();
    cloudStatus('Speichern fehlgeschlagen: ' + e.message);
    toast('Nicht gespeichert – bitte Verbindung prüfen');
  } finally {
    cloudBusy = false;
    renderAll();
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    toast('Speichern nicht möglich – bitte Speicherplatz prüfen');
  }
}
function change(fn) {
  if (!isCloudReady()) {
    toast('Bitte warten: Plan wird synchronisiert');
    return false;
  }
  const previous = structuredClone(state);
  history.push(JSON.stringify(state));
  if (history.length > 30) history.shift();
  fn();
  if (cloudMode) {
    cloudBusy = true;
    renderAll();
    persistCloud(previous);
  } else {
    save();
    renderAll();
  }
  return true;
}
function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.style.display = 'block';
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => (el.style.display = 'none'), 2500);
}
function allActivities() {
  return [...ACTIVITIES, ...state.custom];
}
function getActivity(id) {
  return allActivities().find((a) => a.id === id);
}
function dateTitle(s) {
  return new Intl.DateTimeFormat('de-CH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(s + 'T12:00:00'));
}
const SPECIAL_DAYS = {
  '2027-07-14': { label: 'Nationalfeiertag', icon: '🇫🇷', type: 'national' },
  '2027-07-16': { label: 'Emilias 7. Geburtstag', icon: '🎂', type: 'birthday' },
};
function renderDates() {
  $('#dateStrip').innerHTML = DAYS.map((d) => {
    const dt = new Date(d + 'T12:00:00');
    const special = SPECIAL_DAYS[d];
    return `<button class="datebtn ${d === selected ? 'active' : ''} ${special ? 'special-' + special.type : ''}" data-date="${d}" aria-pressed="${d === selected}" ${special ? 'aria-label="' + escapeHTML(dateTitle(d) + ': ' + special.label) + '"' : ''}><small>${new Intl.DateTimeFormat('de-CH', { weekday: 'short' }).format(dt)}</small><strong>${dt.getDate()}</strong><small>Juli</small>${special ? `<span class="date-event" aria-hidden="true">${special.icon}</span><span class="date-event-label">${escapeHTML(special.label)}</span>` : ''}</button>`;
  }).join('');
}
const AGREED_ITINERARY = {
  "2027-07-10": {
    "Morgen": "Direktfahrt Amboise → Île de Ré",
    "Mittag": "Mittagspause unterwegs",
    "Nachmittag": "Ankunft und Unterkunft beziehen",
    "Abend": "Hafen La Flotte und Abendessen"
  },
  "2027-07-11": {
    "Morgen": "Markt von La Flotte und Hafen",
    "Mittag": "Mittagessen spontan",
    "Nachmittag": "Strandnachmittag",
    "Abend": "Freier Abend"
  },
  "2027-07-12": {
    "Morgen": "Spaziergang durch die Salzgärten bei Loix",
    "Mittag": "Mittagessen in einer Brasserie",
    "Nachmittag": "Optional Strand oder Erholung",
    "Abend": "Abend frei"
  },
  "2027-07-13": {
    "Morgen": "La Rochelle: Alter Hafen",
    "Mittag": "Französisches Mittagessen",
    "Nachmittag": "Altstadt La Rochelle; Aquarium heute optional",
    "Abend": "Abend frei"
  },
  "2027-07-14": {
    "Morgen": "Entspannter Strandtag am Nationalfeiertag 🇫🇷",
    "Mittag": "Picknick oder Strandrestaurant",
    "Nachmittag": "Strand und freie Zeit",
    "Abend": "Abend nahe Unterkunft; Feuerwerk optional"
  },
  "2027-07-15": {
    "Morgen": "Ars-en-Ré und Dorfspaziergang",
    "Mittag": "Mittagessen im Restaurant",
    "Nachmittag": "Strand Plage de la Conche; Leuchtturm optional",
    "Abend": "Abend frei"
  },
  "2027-07-16": {
    "Morgen": "🎂 Emilias 7. Geburtstag: Aquarium La Rochelle",
    "Mittag": "Geburtstagsmittagessen; Maja optional",
    "Nachmittag": "Schatzsuche und Glacé in Saint-Martin-de-Ré",
    "Abend": "Gemütlicher Geburtstagsabend"
  },
  "2027-07-17": {
    "Morgen": "Letzter Inselmorgen, packen und auschecken",
    "Mittag": "Fahrt Richtung Le PAL, Pause unterwegs",
    "Nachmittag": "Ankunft Safari-Hotel am späten Nachmittag",
    "Abend": "Safari-Hotel und Abendessen"
  },
  "2027-07-18": {
    "Morgen": "Le PAL: Tiere und Safari",
    "Mittag": "Mittagessen im Park",
    "Nachmittag": "Attraktionen und Tiererlebnisse",
    "Abend": "Abend im Safari-Hotel"
  },
  "2027-07-19": {
    "Morgen": "Le PAL: Lieblingsattraktionen",
    "Mittag": "Mittagessen im Park",
    "Nachmittag": "Fahrgeschäfte, Shows und Tiere",
    "Abend": "Abend im Safari-Hotel"
  },
  "2027-07-20": {
    "Morgen": "Frühstück und Auschecken",
    "Mittag": "Heimfahrt Richtung Baden",
    "Nachmittag": "Fahrt / Ankunft zuhause",
    "Abend": "Wieder daheim"
  },
  "2027-07-07": {
    "Morgen": "Autofahrt Baden → Amboise, Abfahrt ca. 07:00",
    "Mittag": "Mittagspause unterwegs",
    "Nachmittag": "Ankunft und Unterkunft beziehen",
    "Abend": "Abendessen spontan in Amboise"
  },
  "2027-07-08": {
    "Morgen": "Château du Clos Lucé – Leonardo da Vinci",
    "Mittag": "Restaurant in der Altstadt von Amboise",
    "Nachmittag": "Château Royal d’Amboise",
    "Abend": "Freier Abend"
  },
  "2027-07-09": {
    "Morgen": "Château de Chenonceau",
    "Mittag": "Crêpes im Le Médicis",
    "Nachmittag": "Freizeit / optional Bootsfahrt",
    "Abend": "Abendessen spontan"
  }
};
function renderSlots() {
  $('#dayTitle').textContent = dateTitle(selected);
  $('#planRegion').textContent =
    selected < '2027-07-10'
      ? 'AMBOISE & LOIRE'
      : selected < '2027-07-17'
        ? 'ÎLE DE RÉ'
        : selected < '2027-07-20'
          ? 'LE PAL'
          : 'HEIMFAHRT NACH BADEN';
  $('#slots').innerHTML = SLOTS.map((slot) => {
    const entries = state.days[selected]?.[slot] || [];
    return `<div class="slot"><span class="slotname">${slot}</span><div>${
      entries.length
        ? entries
            .map((id, i) => {
              const a = getActivity(id);
              return `<div class="slotentry"><div><strong>${escapeHTML(a?.name || 'Unbekannte Aktivität')}</strong><small>${escapeHTML(a?.area || 'Eigene Idee')}</small></div><div class="slotbuttons"><button data-move="${escapeHTML(id)}" data-slot="${slot}" title="Verschieben">↕</button><button data-remove="${escapeHTML(id)}" data-slot="${slot}" aria-label="${escapeHTML(a?.name || 'Eintrag')} entfernen">✕</button></div></div>`;
            })
            .join('')
        : `<div class="slotentry"><div><strong>${escapeHTML(AGREED_ITINERARY[selected]?.[slot] || "Zeit für spontane Ideen")}</strong><small>Gemeinsam geplanter Reiseentwurf · nicht gespeichert</small></div><button data-empty="${slot}" aria-label="Eigene Idee für ${slot} hinzufügen">＋</button></div>`
    }</div></div>`;
  }).join('');
}
function renderSuggestions() {
  const candidates = allActivities()
    .filter(
      (a) =>
        a.region ===
          (selected < '2027-07-10' ? 'amboise' : selected < '2027-07-17' ? 're' : 'pal') &&
        !Object.values(state.days[selected]).flat().includes(a.id),
    )
    .sort((a, b) => (a.priority === 'Top' ? -1 : 0) - (b.priority === 'Top' ? -1 : 0))
    .slice(0, 7);
  $('#suggestions').innerHTML = candidates
    .map(
      (a) =>
        `<div class="suggestionrow"><div><strong>${escapeHTML(a.name)}</strong><small>${escapeHTML(a.area)} · ${escapeHTML(a.category)}</small></div><button data-add="${a.id}">+ Planen</button></div>`,
    )
    .join('');
}
function voteControls(a) {
  if (!cloudMode) return '';
  const own = votes.find((v) => v.activity_id === a.id && v.voter_id === cloudUser.id);
  const tally = votes.filter((v) => v.activity_id === a.id);
  return `<div class="vote-controls" role="group" aria-label="Abstimmung ${escapeHTML(a.name)}">${[
    ['yes', 'Unbedingt'],
    ['maybe', 'Vielleicht'],
    ['no', 'Eher nicht'],
  ]
    .map(
      ([value, label]) =>
        `<button type="button" data-vote="${escapeHTML(a.id)}" data-vote-value="${value}" aria-pressed="${own?.vote === value}">${label} · ${tally.filter((v) => v.vote === value).length}</button>`,
    )
    .join('')}</div>`;
}
async function castVote(id, value) {
  if (!cloudMode || cloudBusy) return;
  cloudBusy = true;
  try {
    const own = votes.find((v) => v.activity_id === id && v.voter_id === cloudUser.id);
    const result =
      own?.vote === value
        ? await cloud
            .from('activity_votes')
            .delete()
            .eq('activity_id', id)
            .eq('voter_id', cloudUser.id)
        : await cloud
            .from('activity_votes')
            .upsert(
              { activity_id: id, voter_id: cloudUser.id, vote: value },
              { onConflict: 'activity_id,voter_id' },
            );
    if (result.error) throw result.error;
    const { data, error } = await cloud.from('activity_votes').select('activity_id,voter_id,vote');
    if (error) throw error;
    votes = data || [];
    renderDiscover();
    await refreshHistory();
    toast('Stimme gespeichert');
  } catch (e) {
    toast('Abstimmung fehlgeschlagen: ' + e.message);
  } finally {
    cloudBusy = false;
  }
}

/* Individuelle Fotos aus Wikimedia Commons: Quellen und Lizenzen bleiben am Bild sichtbar.
   Kein Foto wird als Ortsaufnahme ausgegeben, bevor eine passende Dateibeschreibung vorliegt. */
function showCommonsPhoto(id, photo) {
  document.querySelectorAll('[data-photo-id]').forEach((node) => {
    if (node.dataset.photoId !== id) return;
    node.replaceChildren();
    if (!photo) {
      const t = document.createElement('span');
      t.textContent = 'Foto nicht verfügbar';
      const l = document.createElement('a');
      l.href =
        'https://commons.wikimedia.org/w/index.php?search=' +
        encodeURIComponent(getActivity(id)?.name || '') +
        '&title=Special:MediaSearch&type=image';
      l.target = '_blank';
      l.rel = 'noopener noreferrer';
      l.textContent = 'Fotos ansehen';
      node.append(t, l);
      return;
    }
    const img = document.createElement('img');
    img.className = 'activity-photo';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.alt = (photo.provider || 'Wikimedia') + '-Foto: ' + photo.title;
    img.src = photo.url;
    img.onerror = () => {
      img.remove();
      node.classList.remove('has-photo');
    };
    const credit = document.createElement('a');
    credit.className = 'photo-commons-credit';
    credit.href = photo.source;
    credit.target = '_blank';
    credit.rel = 'noopener noreferrer';
    credit.textContent =
      photo.author +
      ' · ' +
      photo.license +
      ' · ' +
      (photo.provider || 'Wikimedia Commons') +
      (photo.motif === 'Symbolbild' ? ' · Symbolbild' : '');
    node.classList.add('has-photo');
    node.append(img, credit);
  });
}
function observeActivityPhotos() {
  document
    .querySelectorAll('[data-photo-id]')
    .forEach((node) =>
      showCommonsPhoto(node.dataset.photoId, activityPhotos[node.dataset.photoId] || null),
    );
}
fetch('ACTIVITY_PHOTOS.json')
  .then((response) => {
    if (!response.ok) throw Error('Bildkatalog nicht verfügbar');
    return response.json();
  })
  .then((entries) => {
    activityPhotos = Object.fromEntries(
      entries
        .filter(
          (entry) =>
            entry.status === 'approved' && entry.photo && entry.checkedAt && entry.reviewer,
        )
        .map((entry) => [entry.id, entry.photo]),
    );
    observeActivityPhotos();
  })
  .catch(() => observeActivityPhotos());
function renderDiscover() {
  const q = $('#search').value.toLocaleLowerCase('de');
  const category = $('#categoryFilter').value;
  const fav = $('#favFilter').value;
  const matches = allActivities().filter(
    (a) =>
      (region === 'all' || a.region === region) &&
      (category === 'all' || a.category === category) &&
      (fav === 'all' ||
        (fav === 'favorites' ? state.favorites.includes(a.id) : a.priority === 'Top')) &&
      [a.name, a.area, a.description, a.category].join(' ').toLocaleLowerCase('de').includes(q),
  );
  $('#resultCount').textContent = `${matches.length} Ideen`;
  matches.sort((a, b) => {
    if (!cloudMode) return 0;
    const score = (id) =>
      votes
        .filter((v) => v.activity_id === id)
        .reduce((n, v) => n + (v.vote === 'yes' ? 2 : v.vote === 'maybe' ? 1 : 0), 0);
    return score(b.id) - score(a.id);
  });
  $('#activityGrid').innerHTML = matches
    .map(
      (a) =>
        `<article class="activity"><div class="activity-photo-placeholder" data-photo-id="${escapeHTML(a.id)}" aria-label="Aktivitätsfoto"><span>${escapeHTML(a.category)}</span><small>Foto nicht verfügbar</small></div><span class="tag">${escapeHTML(REGIONS[a.region])} · ${escapeHTML(a.priority)}</span><h3>${escapeHTML(a.name)}</h3><div class="location">${escapeHTML(a.area)} · ${escapeHTML(a.category)}</div><p>${escapeHTML(a.description)}</p>${PHOTO_REFERENCES[a.id] ? `<div class="photo-reference"><span>Ortsfoto: ${escapeHTML(PHOTO_REFERENCES[a.id].provider)}</span><a href="${escapeHTML(PHOTO_REFERENCES[a.id].source)}" target="_blank" rel="noopener noreferrer">Foto ansehen ↗</a></div>` : ''}${voteControls(a)}<div class="cardactions"><button class="smallbtn" data-add="${a.id}">+ Planen</button><button class="fav ${state.favorites.includes(a.id) ? 'on' : ''}" data-fav="${a.id}" aria-pressed="${state.favorites.includes(a.id)}" aria-label="Favorit markieren">♡ ${state.favorites.includes(a.id) ? 'Gemerkt' : 'Merken'}</button><a href="${escapeHTML(a.source || 'https://www.iledere.com/')}" target="_blank" rel="noopener noreferrer">Quelle ↗</a><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.name + ' ' + a.area + ' France')}" target="_blank" rel="noopener noreferrer">Karte ↗</a></div></article>`,
    )
    .join('');
  observeActivityPhotos();
}
function renderAll() {
  renderDates();
  renderSlots();
  renderSuggestions();
  renderDiscover();
}
let pendingActivity = null;
function add(id) {
  const a = getActivity(id);
  if (!a) return;
  pendingActivity = id;
  const dialog = $('#slotDialog');
  $('#slotDialogTitle').textContent = a.name;
  $('#slotDialogDate').textContent = dateTitle(selected);
  dialog.showModal();
}
function chooseSlot(slot) {
  if (!pendingActivity || !SLOTS.includes(slot)) return;
  const id = pendingActivity;
  pendingActivity = null;
  $('#slotDialog').close();
  if (change(() => state.days[selected][slot].push(id))) toast('Im Kalender eingetragen');
}
function remove(id, slot) {
  change(() => {
    const arr = state.days[selected][slot];
    const i = arr.indexOf(id);
    if (i >= 0) arr.splice(i, 1);
  });
  toast('Eintrag entfernt');
}
let movingActivity = null;
function move(id, slot) {
  const a = getActivity(id);
  if (!a) return;
  movingActivity = { id, slot, from: selected };
  $('#moveDialogTitle').textContent = a.name;
  $('#moveDate').innerHTML = DAYS.map(
    (d) =>
      `<option value="${d}" ${d === selected ? 'selected' : ''}>${escapeHTML(dateTitle(d))}</option>`,
  ).join('');
  $('#moveSlot').value = slot;
  $('#moveDialog').showModal();
}
function finishMove() {
  if (!movingActivity) return;
  const { id, slot, from } = movingActivity;
  const day = $('#moveDate').value,
    target = $('#moveSlot').value;
  if (!DAYS.includes(day) || !SLOTS.includes(target)) return;
  $('#moveDialog').close();
  movingActivity = null;
  if (
    change(() => {
      const arr = state.days[from][slot];
      const idx = arr.indexOf(id);
      if (idx >= 0) arr.splice(idx, 1);
      state.days[day][target].push(id);
    })
  ) {
    selected = day;
    renderAll();
    toast('Aktivität verschoben');
  }
}
function undo() {
  if (cloudBusy) {
    toast('Bitte warten: Plan wird synchronisiert');
    return;
  }
  if (!history.length) {
    toast('Keine Änderung vorhanden');
    return;
  }
  const previous = structuredClone(state);
  state = JSON.parse(history.pop());
  if (cloudMode) {
    cloudBusy = true;
    persistCloud(previous);
  } else {
    save();
    renderAll();
  }
  toast('Rückgängig gemacht');
}
function download() {
  const blob = new Blob(
    [JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2)],
    { type: 'application/json' },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sommer2027-reiseplan.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function importFile(file) {
  if (!file) return;
  file
    .text()
    .then((t) => {
      try {
        const data = JSON.parse(t);
        if (
          !valid(data) ||
          Object.keys(data.days).some((k) => !DAYS.includes(k)) ||
          DAYS.some(
            (d) =>
              !data.days[d] ||
              SLOTS.some(
                (s) =>
                  !Array.isArray(data.days[d][s]) ||
                  data.days[d][s].some((id) => typeof id !== 'string'),
              ),
          )
        )
          throw Error('invalid');
        if (
          !confirm(
            'Vorhandenen Plan durch die importierte Version ersetzen? Vorher bei Bedarf exportieren.',
          )
        )
          return;
        change(() => {
          state = normalize(data);
        });
        toast('Plan importiert');
      } catch {
        toast('Ungültige oder nicht unterstützte Datei');
      }
    })
    .catch(() => toast('Datei konnte nicht gelesen werden'));
}
function custom() {
  const name = prompt('Wie heisst deine eigene Idee?');
  if (!name || !name.trim()) return;
  const clean = name.trim().slice(0, 100);
  const id = 'custom-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
  change(() => {
    state.custom.push({
      id,
      name: clean,
      region: selected < '2027-07-10' ? 'amboise' : selected < '2027-07-17' ? 're' : 'pal',
      area: 'Eigene Idee',
      category: 'Eigene Ideen',
      description: 'Selbst hinzugefügt',
      priority: 'Optional',
      source: '',
    });
    const slot = SLOTS.find((x) => state.days[selected][x].length === 0) || 'Nachmittag';
    state.days[selected][slot].push(id);
  });
}
let mapRegion = 'amboise',
  mapMarkers = { amboise: [], re: [], pal: [] };
function focusMap(region) {
  mapRegion = region;
  document.querySelectorAll('[data-map-region]').forEach((b) => {
    const active = b.dataset.mapRegion === region;
    b.classList.toggle('active', active);
    b.setAttribute('aria-pressed', String(active));
  });
  if (!map) return;
  Object.entries(mapMarkers).forEach(([key, markers]) =>
    markers.forEach((marker) => {
      if (key === region) marker.addTo(map);
      else map.removeLayer(marker);
    }),
  );
  const points = mapMarkers[region].map((m) => m.getLatLng());
  if (points.length) {
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds.pad(0.16), {
      padding: [28, 28],
      maxZoom: region === 're' ? 12 : 11,
      animate: false,
    });
  } else {
    const centers = { amboise: [47.41, 0.98], re: [46.2, -1.39], pal: [46.51, 3.62] };
    map.setView(centers[region], 10);
  }
}
function initMap() {
  if (map || !window.L) return;
  map = L.map('map', { scrollWheelZoom: false }).setView([47.41, 0.98], 10);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18,
  }).addTo(map);
  ACTIVITIES.forEach((a) => {
    if (!Number.isFinite(a.lat) || !Number.isFinite(a.lon) || !mapMarkers[a.region]) return;
    const marker = L.circleMarker([a.lat, a.lon], {
      radius: 11,
      color: '#ffffff',
      weight: 3,
      fillColor: a.region === 're' ? '#075c78' : a.region === 'amboise' ? '#a43c1c' : '#633c87',
      fillOpacity: 1,
      opacity: 1,
    }).bindPopup(
      '<div class="map-popup"><strong>' +
        escapeHTML(a.name) +
        '</strong><p>' +
        escapeHTML(a.area) +
        ' · ' +
        escapeHTML(a.category) +
        '</p><button type="button" data-map-add="' +
        escapeHTML(a.id) +
        '">+ Zum Plan hinzufügen</button><button type="button" data-map-show="' +
        escapeHTML(a.id) +
        '">Details ansehen</button></div>',
    );
    marker.bindTooltip(a.name, { direction: 'top', offset: [0, -10] });
    mapMarkers[a.region].push(marker);
  });
  focusMap(mapRegion);
}
document.querySelectorAll('[data-map-region]').forEach((button) =>
  button.addEventListener('click', () => {
    initMap();
    focusMap(button.dataset.mapRegion);
  }),
);

document.addEventListener('click', (e) => {
  const t = e.target.closest(
    '[data-date],[data-add],[data-remove],[data-move],[data-fav],[data-region],[data-empty],[data-vote]',
  );
  if (!t) return;
  if (t.dataset.vote) {
    castVote(t.dataset.vote, t.dataset.voteValue);
  } else if (t.dataset.date) {
    selected = t.dataset.date;
    renderAll();
  } else if (t.dataset.add) add(t.dataset.add);
  else if (t.dataset.remove) remove(t.dataset.remove, t.dataset.slot);
  else if (t.dataset.move) move(t.dataset.move, t.dataset.slot);
  else if (t.dataset.fav) {
    change(() => {
      const i = state.favorites.indexOf(t.dataset.fav);
      i < 0 ? state.favorites.push(t.dataset.fav) : state.favorites.splice(i, 1);
    });
  } else if (t.dataset.region) {
    region = t.dataset.region;
    $('#regionFilter').value = region;
    location.hash = 'entdecken';
    renderDiscover();
  } else if (t.dataset.empty) {
    location.hash = 'entdecken';
  }
});
$('#regionFilter').addEventListener('change', (e) => {
  region = e.target.value;
  renderDiscover();
});
['search', 'categoryFilter', 'favFilter'].forEach((id) =>
  $('#' + id).addEventListener(id === 'search' ? 'input' : 'change', renderDiscover),
);
$('#undo').addEventListener('click', undo);
$('#custom').addEventListener('click', custom);
$('#export').addEventListener('click', download);
$('#import').addEventListener('click', () => $('#importInput').click());
$('#importInput').addEventListener('change', (e) => {
  importFile(e.target.files?.[0]);
  e.target.value = '';
});
$('#menuToggle').addEventListener('click', () => {
  const el = $('#menu');
  el.hidden = !el.hidden;
  $('#menuToggle').setAttribute('aria-expanded', String(!el.hidden));
});
const cats = [...new Set(ACTIVITIES.map((a) => a.category))].sort();
$('#categoryFilter').innerHTML += [...cats, 'Eigene Ideen']
  .map((c) => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`)
  .join('');
const observer = new IntersectionObserver(
  (entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      initMap();
      observer.disconnect();
    }
  },
  { rootMargin: '300px' },
);
observer.observe($('#map'));
window.addEventListener('load', () => {
  if (location.hash === '#karte') initMap();
});
if ('serviceWorker' in navigator && location.protocol.startsWith('http'))
  navigator.serviceWorker.register('./sw.js').catch(() => {});
renderAll();

initCloud();

$('#refreshShared').addEventListener('click', async () => {
  if (!cloudMode || cloudBusy) {
    toast('Bitte zuerst als Familienmitglied anmelden');
    return;
  }
  cloudBusy = true;
  try {
    await refreshCloud();
    cloudStatus('Gemeinsamer Plan · Aktualisiert');
    toast('Plan neu geladen');
  } catch (e) {
    toast('Aktualisierung fehlgeschlagen: ' + e.message);
  } finally {
    cloudBusy = false;
  }
});
window.addEventListener('focus', () => {
  if (cloudMode && !cloudBusy) refreshCloud().catch(() => {});
});

$('#slotDialog')
  .querySelectorAll('[data-slot-choice]')
  .forEach((b) => b.addEventListener('click', () => chooseSlot(b.dataset.slotChoice)));
$('#slotDialog')
  .querySelector('[data-close-slot]')
  .addEventListener('click', () => $('#slotDialog').close());
$('#slotDialog').addEventListener('close', () => {
  pendingActivity = null;
});

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-map-add],[data-map-show]');
  if (!b) return;
  if (b.dataset.mapAdd) {
    add(b.dataset.mapAdd);
    return;
  }
  const a = getActivity(b.dataset.mapShow);
  if (!a) return;
  region = a.region;
  $('#regionFilter').value = region;
  $('#search').value = a.name;
  renderDiscover();
  location.hash = 'entdecken';
});

$('#moveDialog')
  .querySelector('[data-move-cancel]')
  .addEventListener('click', () => $('#moveDialog').close());
$('#moveDialog').querySelector('[data-move-save]').addEventListener('click', finishMove);
$('#moveDialog').addEventListener('close', () => {
  movingActivity = null;
});
