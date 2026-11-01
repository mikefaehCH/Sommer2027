import { makeSite, MODULES } from './site-schema.js';
const form = document.querySelector('#wizard');
form.elements.namedItem('description').value = 'Meine neue Website';
const message = document.querySelector('#message');
const preview = document.querySelector('#preview');
const download = document.querySelector('#download');
let valid = null;
function config() {
  const values = new FormData(form);
  const modules = Object.fromEntries(MODULES.map((name) => [name, values.has(name)]));
  return makeSite({
    category: values.get('category'),
    id: values.get('id'),
    title: values.get('title'),
    description: values.get('description'),
    color: values.get('color'),
    modules,
  });
}
function refresh() {
  valid = null;
  download.disabled = true;
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
    message.textContent = 'Konfiguration gültig. Du kannst site.json herunterladen.';
  } catch (error) {
    valid = null;
    download.disabled = true;
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
refresh();
