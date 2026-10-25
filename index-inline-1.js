!(function () {
  const el = document.getElementById('countdown');
  if (!el) return;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(2027, 6, 7);
  const days = Math.ceil((target - today) / 86400000);
  el.textContent =
    days > 0
      ? 'Noch ' + days + ' Tage bis zur Abreise'
      : days === 0
        ? 'Heute geht’s nach Frankreich!'
        : '';
})();
