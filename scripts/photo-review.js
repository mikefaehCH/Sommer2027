fetch('../ACTIVITY_PHOTOS.json')
  .then((r) => r.json())
  .then((entries) => {
    for (const e of entries) {
      const article = document.createElement('article');
      const heading = document.createElement('h2');
      heading.textContent = e.name;
      article.append(heading);
      const status = document.createElement('p');
      status.textContent = e.id + ' · ' + e.status;
      article.append(status);
      if (e.photo) {
        const image = document.createElement('img');
        image.src = e.photo.url;
        image.alt = e.photo.title;
        image.loading = 'lazy';
        article.append(image);
        const text = document.createElement('p');
        text.textContent = e.photo.title + ' · ' + e.photo.author + ' · ' + e.photo.license;
        article.append(text);
        const link = document.createElement('a');
        link.href = e.photo.source;
        link.textContent = 'Original und Lizenz prüfen';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        article.append(link);
      }
      document.querySelector('#photos').append(article);
    }
  });
