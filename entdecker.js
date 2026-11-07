const worlds = {
  loire: {
    name: 'Loire',
    number: '01',
    scene: 'Schlossdetektiv',
    easy: 'Entdecke einen Turm. Zeig ihn jemandem.',
    hard: 'Finde zwei verschiedene Türme. Zeichne, woran du sie unterscheiden kannst.',
    plan: [
      '30 Min. · Schau dir mit einem Erwachsenen ein Schloss von aussen an.',
      '45 Min. · Suche Türen, Türme und ein Tier auf einem Wappen.',
      '45 Min. · Mach eine Pause und zeichne deinen Lieblingsturm.',
    ],
    colour: '#f4ca7c',
  },
  sea: {
    name: 'Atlantik',
    number: '02',
    scene: 'Küstenforscher',
    easy: 'Finde am Strand drei verschiedene Formen. Lass sie an ihrem Platz.',
    hard: 'Schau nach drei Spuren im Sand. Wer oder was könnte sie gemacht haben?',
    plan: [
      '30 Min. · Geht zusammen an die Küste und hört auf die Wellen.',
      '45 Min. · Findet Formen und Spuren im Sand.',
      '45 Min. · Macht eine Pause und malt euer Fundstück aus dem Kopf.',
    ],
    colour: '#badbd1',
  },
  safari: {
    name: 'Safari',
    number: '03',
    scene: 'Tierbeobachter',
    easy: 'Such ein Tier und mach seine Bewegung nach.',
    hard: 'Beobachte zwei Tiere und erfinde für jedes ein passendes Zeichen.',
    plan: [
      '30 Min. · Sucht euch mit einem Erwachsenen einen Bereich zum Beobachten aus.',
      '45 Min. · Beobachtet zwei Tiere und merkt euch eine Bewegung.',
      '45 Min. · Macht eine Pause und ratet gegenseitig eure Tierbewegungen.',
    ],
    colour: '#eac4a2',
  },
};
const key = 'sommer2027-entdecker-stamps-v1';
const get = (id) => document.getElementById(id);
const make = (tag, text, className) => {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
};
const knownStamps = new Set(Object.keys(worlds).flatMap((id) => ['easy:' + id, 'hard:' + id]));
let saved = [];
try {
  const stored = JSON.parse(localStorage.getItem(key));
  if (Array.isArray(stored)) saved = stored.filter((stamp) => knownStamps.has(stamp));
} catch {
  // The pass remains playable in memory if storage is unavailable.
}
const stamps = new Set(saved);
let level = 'easy';
let persists = true;

function renderProgress() {
  const completed = Object.entries(worlds).filter(([id]) => stamps.has(level + ':' + id));
  get('score').textContent =
    completed.length +
    ' von 3 Stempeln' +
    (completed.length === 3 ? ' · Pass komplett!' : '') +
    (persists ? '' : ' · Bleibt nur in diesem offenen Fenster.');
  get('recap').replaceChildren(
    ...completed.map(([, world]) => make('li', world.name + ' · ' + world.scene)),
  );
  get('recap-empty').hidden = completed.length > 0;
}
function renderMissions() {
  get('missions').replaceChildren(
    ...Object.entries(worlds).map(([id, world]) => {
      const stamp = level + ':' + id;
      const tile = make('article', '', 'tile');
      const title = make('h3', world.scene);
      const button = make('button', 'Stempel sammeln', 'button');
      button.type = 'button';
      function updateButton() {
        button.setAttribute('aria-pressed', String(stamps.has(stamp)));
      }
      updateButton();
      button.setAttribute('aria-label', world.scene + ' · Stempel sammeln');
      button.addEventListener('click', () => {
        if (stamps.has(stamp)) stamps.delete(stamp);
        else stamps.add(stamp);
        try {
          localStorage.setItem(key, JSON.stringify([...stamps]));
        } catch {
          persists = false;
        }
        updateButton();
        renderProgress();
      });
      tile.append(make('span', world.number, 'marker'), title, make('p', world[level]), button);
      return tile;
    }),
  );
  renderProgress();
}
for (const input of document.querySelectorAll('[name="level"]')) {
  input.addEventListener('change', () => {
    level = input.value;
    renderMissions();
  });
}
function renderPlan() {
  get('two-hours').replaceChildren(
    ...worlds[get('region').value].plan.map((item) => make('li', item)),
  );
}
get('region').addEventListener('change', renderPlan);
renderPlan();
renderMissions();

const canvas = get('card');
const ctx = canvas.getContext('2d');
let photo = null;
let photoRevision = 0;
function drawPhoto(image) {
  const scale = Math.max(210 / image.naturalWidth, 150 / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  ctx.save();
  ctx.beginPath();
  ctx.rect(613, 59, 210, 150);
  ctx.clip();
  ctx.drawImage(image, 613 + (210 - width) / 2, 59 + (150 - height) / 2, width, height);
  ctx.restore();
}
function renderCard() {
  if (!ctx) return;
  const world = worlds[get('card-region').value];
  ctx.fillStyle = world.colour;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#193e38';
  ctx.lineWidth = 4;
  ctx.strokeRect(30, 30, 840, 500);
  ctx.fillStyle = '#193e38';
  ctx.font = 'bold 29px system-ui';
  ctx.fillText('FERIENPOST  /  ' + world.number, 68, 100);
  ctx.font = 'bold 82px Georgia';
  ctx.fillText(world.name, 63, 210);
  if (photo) drawPhoto(photo);
  ctx.font = '36px system-ui';
  const message = get('greeting').value.trim() || 'Grüsse aus den Ferien!';
  const lines = [];
  for (const paragraph of message.split('\n')) {
    let line = '';
    for (const char of paragraph) {
      if (ctx.measureText(line + char).width > 750) {
        lines.push(line);
        line = '';
      }
      line += char;
    }
    lines.push(line);
  }
  const visible = lines.slice(0, 5);
  if (lines.length > visible.length) visible[4] = visible[4].slice(0, -1) + '…';
  visible.forEach((line, index) => ctx.fillText(line, 68, 290 + 43 * index));
  canvas.setAttribute('aria-label', 'Postkarte aus ' + world.name + '. ' + message);
}
get('card-photo').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const revision = ++photoRevision;
  const status = get('export-status');
  if (
    file.size > 20 * 1024 * 1024 ||
    !/^image\/(jpeg|png|webp|gif|avif|heic|heif)$/.test(file.type)
  ) {
    status.textContent = 'Wähle ein unterstütztes Foto bis 20 MB, zum Beispiel JPEG oder PNG.';
    return;
  }
  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    image.src = url;
    await image.decode();
    if (revision !== photoRevision) return;
    photo = image;
    get('remove-photo').hidden = false;
    renderCard();
    status.textContent = 'Foto eingefügt. Es bleibt auf diesem Gerät.';
  } catch {
    if (revision === photoRevision) status.textContent = 'Das Foto konnte nicht geöffnet werden.';
  } finally {
    URL.revokeObjectURL(url);
  }
});
get('remove-photo').addEventListener('click', () => {
  photoRevision++;
  photo = null;
  get('card-photo').value = '';
  get('remove-photo').hidden = true;
  get('export-status').textContent = 'Foto entfernt.';
  renderCard();
});
get('card-region').addEventListener('change', renderCard);
get('greeting').addEventListener('input', renderCard);
get('save').addEventListener('click', () => {
  if (!ctx) {
    get('export-status').textContent = 'Die Bildvorschau ist in diesem Browser nicht verfügbar.';
    return;
  }
  const link = make('a', '');
  link.href = canvas.toDataURL('image/png');
  link.download = 'meine-ferienpost.png';
  document.body.append(link);
  link.click();
  link.remove();
  get('export-status').textContent = 'Postkarte als PNG zum Speichern geöffnet.';
});
renderCard();

const packageFiles = [
  'entdecker.html',
  'entdecker.css',
  'entdecker.js',
  'entdecker.webmanifest',
  'assets/icons/apple-touch-icon.png',
  'assets/icons/icon-192.png',
];
const registration = navigator.serviceWorker?.register('./sw.js').catch(() => null);
get('offline').addEventListener('click', async () => {
  const button = get('offline');
  const status = get('offline-status');
  button.disabled = true;
  status.textContent = 'Paket wird geprüft …';
  try {
    if (!(await registration) || !window.caches) throw Error('Offline-Speicher fehlt');
    const names = (await caches.keys()).filter((name) => /^sommer2027-v\d+$/.test(name));
    const matches = await Promise.all(
      names.map(async (name) => {
        const cache = await caches.open(name);
        return (
          await Promise.all(packageFiles.map((file) => cache.match(new URL(file, location.href))))
        ).every((response) => response?.ok);
      }),
    );
    status.textContent =
      matches.some(Boolean) && navigator.serviceWorker.controller
        ? 'Dein Entdeckerpass ist offline bereit.'
        : 'Das Paket wird vorbereitet. Lass die Seite mit Internet offen und prüfe erneut.';
  } catch {
    status.textContent = 'Offline-Paket derzeit nicht verfügbar.';
  } finally {
    button.disabled = false;
  }
});
