'use strict';
const STORE = 'sommer2027-photo-review-decisions-v1';
const decisions = (() => {
  try {
    return JSON.parse(localStorage.getItem(STORE)) || {};
  } catch {
    return {};
  }
})();
let entries = [];
const el = (tag, text, className) => {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  if (className) node.className = className;
  return node;
};
const persist = () => {
  try {
    localStorage.setItem(STORE, JSON.stringify(decisions));
  } catch {
    alert('Lokales Speichern nicht möglich. Bitte JSON exportieren.');
  }
  updateProgress();
};
function updateProgress() {
  document.querySelector('#progress').textContent =
    entries.filter((e) => e.status !== 'approved' && decisions[e.id]).length +
    ' von ' +
    entries.filter((e) => e.status !== 'approved').length +
    ' offenen Bildern vorgemerkt';
}
function field(label, value, type = 'text') {
  const wrap = el('label', label);
  const input = document.createElement('input');
  input.type = type;
  input.value = value || '';
  wrap.append(input);
  return [wrap, input];
}
function render() {
  const container = document.querySelector('#photos');
  container.replaceChildren();
  for (const e of entries.filter((entry) => entry.status !== 'approved')) {
    const article = el('article');
    article.append(el('h2', e.name), el('p', e.id + ' · Katalogstatus: ' + e.status, 'muted'));
    if (e.photo) {
      const image = el('img');
      image.src = e.photo.url;
      image.alt = e.photo.title || e.name;
      image.loading = 'lazy';
      article.append(image);
      article.append(
        el('p', [e.photo.title, e.photo.author, e.photo.license].filter(Boolean).join(' · ')),
      );
      article.append(el('p', 'Motiv: ' + (e.photo.motif || 'nicht angegeben')));
      const link = el('a', 'Original und Lizenz prüfen');
      link.href = e.photo.source || '#';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      article.append(link);
    } else article.append(el('p', 'Noch kein Bild vorhanden.'));
    if (e.reviewNotes) article.append(el('p', 'Prüfnotizen: ' + e.reviewNotes));
    const form = el('div', null, 'review');
    const selection = document.createElement('select');
    for (const [value, label] of [
      ['', 'Entscheidung wählen'],
      ['approved', 'Approve – Bild freigeben'],
      ['change', 'Change picture – anderes Bild'],
      ['rejected', 'Reject – Bild ablehnen'],
      ['skip', 'Später prüfen'],
    ]) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      selection.append(option);
    }
    selection.value = decisions[e.id]?.action || '';
    const [notesWrap, notes] = field('Kommentar / Grund', decisions[e.id]?.notes || '');
    const replacement = el('div', null, 'replacement');
    const [urlWrap, url] = field('Neue Bild-URL (https)', decisions[e.id]?.url || '', 'url');
    const [sourceWrap, source] = field('Quellseite (https)', decisions[e.id]?.source || '', 'url');
    const [authorWrap, author] = field('Fotograf / Autor', decisions[e.id]?.author || '');
    const [licenseWrap, license] = field('Lizenz', decisions[e.id]?.license || '');
    const [titleWrap, title] = field('Bildtitel', decisions[e.id]?.title || '');
    replacement.append(urlWrap, sourceWrap, titleWrap, authorWrap, licenseWrap);
    const checkedLabel = el('label', null, 'confirmation');
    const checked = document.createElement('input');
    checked.type = 'checkbox';
    checked.checked = false;
    checkedLabel.append(
      checked,
      document.createTextNode(' Ich habe Motiv, Ortsbezug, Quelle und Bildrechte selbst geprüft.'),
    );
    const confirm = el('button', 'Confirm decision');
    confirm.type = 'button';
    const feedback = el(
      'p',
      decisions[e.id] ? 'Lokal vorgemerkt: ' + decisions[e.id].action : 'Noch keine Entscheidung',
      'feedback',
    );
    const refresh = () => {
      replacement.hidden = selection.value !== 'change';
      checkedLabel.hidden = !['approved', 'change'].includes(selection.value);
    };
    selection.addEventListener('change', () => {
      checked.checked = false;
      refresh();
    });
    confirm.addEventListener('click', () => {
      const action = selection.value;
      if (!action) {
        feedback.textContent = 'Bitte zuerst eine Entscheidung wählen.';
        return;
      }
      if (['approved', 'change'].includes(action) && !checked.checked) {
        feedback.textContent = 'Bitte die Prüfung per Checkbox bestätigen.';
        return;
      }
      if (
        action === 'approved' &&
        (!e.photo?.url || !e.photo?.source || !e.photo?.author || !e.photo?.license)
      ) {
        feedback.textContent = 'Bild oder Pflichtangaben fehlen; Freigabe nicht möglich.';
        return;
      }
      if (
        action === 'change' &&
        (![url.value, source.value].every((x) => /^https:\/\//i.test(x)) ||
          !title.value.trim() ||
          !author.value.trim() ||
          !license.value.trim())
      ) {
        feedback.textContent =
          'Für einen Bildwechsel sind HTTPS-Bild-URL, Quellseite, Titel, Autor und Lizenz erforderlich.';
        return;
      }
      decisions[e.id] = {
        action,
        notes: notes.value.trim(),
        url: url.value.trim(),
        source: source.value.trim(),
        title: title.value.trim(),
        author: author.value.trim(),
        license: license.value.trim(),
        date: new Date().toISOString().slice(0, 10),
      };
      persist();
      feedback.textContent =
        '✓ Lokal bestätigt. Für die Website anschliessend JSON exportieren und übernehmen.';
      feedback.className = 'feedback saved';
    });
    form.append(selection, replacement, notesWrap, checkedLabel, confirm, feedback);
    article.append(form);
    container.append(article);
    refresh();
  }
  updateProgress();
}
document.querySelector('#export').addEventListener('click', () => {
  const output = entries.map((e) => {
    const d = decisions[e.id];
    if (!d || d.action === 'skip') return e;
    const result = structuredClone(e);
    if (d.action === 'approved') {
      result.status = 'approved';
      result.checkedAt = d.date;
      result.reviewer = 'Mike';
    }
    if (d.action === 'rejected') {
      result.status = 'rejected';
      result.checkedAt = d.date;
      result.reviewer = 'Mike';
    }
    if (d.action === 'change') {
      result.photo = {
        provider: 'Manuell',
        url: d.url,
        source: d.source,
        title: d.title,
        author: d.author,
        license: d.license,
        motif: 'Ort',
      };
      result.status = 'unreviewed';
      result.checkedAt = null;
      result.reviewer = null;
    }
    result.reviewNotes = [
      result.reviewNotes,
      d.notes,
      d.action === 'change'
        ? 'Bildwechsel vorgeschlagen; neue Lizenzangaben vor Freigabe im Katalog ergänzen.'
        : 'Entscheidung Mike: ' + d.action,
    ]
      .filter(Boolean)
      .join(' | ');
    return result;
  });
  const blob = new Blob([JSON.stringify(output, null, 2) + '\n'], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ACTIVITY_PHOTOS.reviewed.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
document.querySelector('#clear').addEventListener('click', () => {
  if (!confirm('Alle lokal vorgemerkten Entscheidungen löschen?')) return;
  Object.keys(decisions).forEach((k) => delete decisions[k]);
  persist();
  render();
});
fetch('../ACTIVITY_PHOTOS.json')
  .then((r) => {
    if (!r.ok) throw Error('HTTP ' + r.status);
    return r.json();
  })
  .then((data) => {
    entries = data;
    render();
  })
  .catch((err) => {
    document.querySelector('#photos').textContent =
      'Bildkatalog konnte nicht geladen werden: ' + err.message;
  });
