const cards = [...document.querySelectorAll('.food-card')];
function filter() {
  const p = document.querySelector('#place').value,
    v = document.querySelector('#veg').value;
  let n = 0;
  cards.forEach((c) => {
    const show = (p === 'all' || c.dataset.place === p) && (v === 'all' || c.dataset.veg === v);
    c.hidden = !show;
    if (show) n++;
  });
  document.querySelector('#count').textContent = n + ' von ' + cards.length + ' Restaurants';
  document.querySelector('#empty').hidden = n > 0;
}
document.querySelector('#place').addEventListener('change', filter);
document.querySelector('#veg').addEventListener('change', filter);
filter();
