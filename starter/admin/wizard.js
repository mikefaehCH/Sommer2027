import { makeSite, MODULES } from './site-schema.js';
import { generateProject, loadBrowserTemplates } from '../modules/site-generator.js';
import { createZip } from '../modules/zip.js';
const form = document.querySelector('#wizard');
form.elements.namedItem('description').value = 'Meine neue Website';
const message = document.querySelector('#message');
const preview = document.querySelector('#preview');
const download = document.querySelector('#download');
const create = document.querySelector('#create');
let busy = false;
let revision = 0;
let valid = null;
function config() {
  const values = new FormData(form);
  const modules = Object.fromEntries(MODULES.map((name) => [name, values.has(name)]));
  return makeSite({
    ...(values.get('start') || values.get('end')
      ? { start: values.get('start'), end: values.get('end') }
      : {}),
    category: values.get('category'),
    id: values.get('id'),
    title: values.get('title'),
    description: values.get('description'),
    color: values.get('color'),
    modules,
  });
}
function refresh() {
  revision++;
  valid = null;
  download.disabled = true;
  create.disabled = true;
  try {
    const site = config();
    preview.style.borderTopColor = site.color;
    preview.replaceChildren();
    const heading = document.createElement('h3');
    heading.textContent = site.title;
    const paragraph = document.createElement('p');
    paragraph.textContent = site.description || 'Deine Beschreibung erscheint hier.';
    preview.append(heading, paragraph);
    message.textContent = '';
  } catch (error) {
    message.textContent = error.message;
  }
}
form.addEventListener('input', refresh);
form.addEventListener('change', refresh);
form.addEventListener('submit', (event) => {
  event.preventDefault();
  try {
    valid = config();
    download.disabled = false;
    create.disabled = busy;
    message.textContent = 'Konfiguration gültig. Du kannst site.json herunterladen.';
  } catch (error) {
    valid = null;
    download.disabled = true;
    create.disabled = true;
    message.textContent = error.message;
  }
});
download.addEventListener('click', () => {
  if (!valid) return;
  const blob = new Blob([JSON.stringify(valid, null, 2) + '\n'], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'site.json';
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
});
create.addEventListener('click', async () => {
  if (!valid || busy) return;
  const snapshot = valid,
    startedAt = revision;
  busy = true;
  create.disabled = true;
  message.textContent = 'Website wird erstellt …';
  try {
    const templates = await loadBrowserTemplates(new URL('../', import.meta.url));
    if (revision !== startedAt)
      throw Error('Konfiguration geändert. Bitte erneut prüfen und erstellen.');
    const bytes = createZip(generateProject(snapshot, templates));
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/zip' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = snapshot.id + '.zip';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    message.textContent =
      'Website als ZIP erstellt. Enthält Projektdateien und Tests; noch nicht veröffentlicht.';
  } catch (error) {
    message.textContent = 'Website konnte nicht erstellt werden: ' + error.message;
  } finally {
    busy = false;
    create.disabled = !valid;
  }
});
refresh();
