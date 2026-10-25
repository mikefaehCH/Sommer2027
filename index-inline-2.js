const PHOTO_DETAILS = [
  [
    'Strände der Île de Ré',
    'Lange Sandstrände, Dünen und kleine Badebuchten machen die Insel ideal für entspannte Familientage.',
    'Für Familien: Gros Jonc bei Le Bois-Plage oder die Strände von La Couarde. Wind, Strömungen und Gezeiten vor dem Baden prüfen.',
    're',
  ],
  [
    'Château d’Amboise',
    'Das königliche Schloss thront über der Loire und erzählt von der französischen Renaissance.',
    'Besonders schön: der Blick auf den Fluss, die Schlossgärten und ein Spaziergang durch die Altstadt von Amboise.',
    'amboise',
  ],
  [
    'Île de Ré entdecken',
    'Zwischen Atlantik, Salzgärten und weiss getünchten Dörfern lässt sich die Insel wunderbar mit dem Velo erkunden.',
    'Ideen: Saint-Martin-de-Ré, der Leuchtturm Phare des Baleines und eine gemütliche Velotour durch die Salzgärten.',
    're',
  ],
  [
    'Clos Lucé',
    'Im ehemaligen Wohnhaus von Leonardo da Vinci entdeckt ihr seine Ideen, Erfindungen und Lebensgeschichte.',
    'Für Kinder besonders spannend: die nachgebauten Maschinen und der Park mit interaktiven Stationen.',
    'amboise',
  ],
  [
    'La Rochelle',
    'Die historische Hafenstadt vor der Île de Ré bietet alte Türme, lebhafte Gassen und Restaurants am Wasser.',
    'Als Ausflug: durch den Vieux-Port schlendern, ein Glacé essen und die Altstadt entdecken.',
    're',
  ],
  [
    'Château Royal d’Amboise',
    'Das Schloss hoch über der Loire war eine wichtige königliche Residenz und bietet weite Ausblicke.',
    'Kombiniert den Besuch mit Clos Lucé und einer Pause in den Cafés von Amboise.',
    'amboise',
  ],
];
const photoDialog = document.getElementById('photoDialog');
document.querySelectorAll('[data-photo-detail]').forEach((button) =>
  button.addEventListener('click', () => {
    const d = PHOTO_DETAILS[Number(button.dataset.photoDetail)];
    if (!d) return;
    document.getElementById('photoDialogTitle').textContent = d[0];
    document.getElementById('photoDialogText').textContent = d[1];
    document.getElementById('photoDialogTip').textContent = d[2];
    document.getElementById('photoDialogLink').href = '#entdecken';
    photoDialog.showModal();
  }),
);
photoDialog.querySelector('.photo-close').addEventListener('click', () => photoDialog.close());
photoDialog.addEventListener('click', (e) => {
  if (e.target === photoDialog) photoDialog.close();
});
document.getElementById('photoDialogLink').addEventListener('click', () => photoDialog.close());
