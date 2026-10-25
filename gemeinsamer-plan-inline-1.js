(async () => {
  const $ = (s) => document.querySelector(s),
    cfg = window.SOMMER2027_SUPABASE,
    KEY = 'sommer27-v3',
    SLOTS = ['Morgen', 'Mittag', 'Nachmittag', 'Abend'],
    DATES = Array.from({ length: 8 }, (_, i) => '2027-07-' + String(i + 10).padStart(2, '0'));
  let client, user, remote, stamp, member;
  const esc = (s) =>
    String(s ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const valid = (x) =>
    x &&
    x.version === 3 &&
    Array.isArray(x.favorites) &&
    Array.isArray(x.custom) &&
    x.days &&
    DATES.every(
      (d) =>
        x.days[d] &&
        SLOTS.every(
          (s) => Array.isArray(x.days[d][s]) && x.days[d][s].every((id) => typeof id === 'string'),
        ),
    );
  function local() {
    try {
      const x = JSON.parse(localStorage.getItem(KEY));
      return valid(x) ? x : null;
    } catch {
      return null;
    }
  }
  function count(x) {
    return x
      ? DATES.reduce((n, d) => n + SLOTS.reduce((m, s) => m + x.days[d][s].length, 0), 0)
      : 0;
  }
  function info() {
    const x = local();
    $('#localInfo').textContent = x
      ? 'Lokaler Plan gefunden: ' +
        count(x) +
        ' Kalendereinträge, ' +
        x.favorites.length +
        ' Favoriten, ' +
        x.custom.length +
        ' eigene Ideen.'
      : 'Kein gültiger lokaler Plan auf diesem Gerät gefunden.';
    $('#backup').disabled = !x;
    $('#upload').disabled =
      !member ||
      !x ||
      !remote ||
      count(remote) > 0 ||
      remote.favorites?.length > 0 ||
      remote.custom?.length > 0;
  }
  function draw() {
    const data = valid(remote) ? remote : null;
    $('#remoteInfo').textContent = data
      ? 'Gemeinsamer Plan: ' +
        count(data) +
        ' Kalendereinträge · zuletzt geändert ' +
        new Date(stamp).toLocaleString('de-CH')
      : 'Noch kein gemeinsamer Plan übernommen.';
    const activities = [...(window.ACTIVITIES || []), ...(data?.custom || [])];
    const names = Object.fromEntries(activities.map((a) => [a.id, a.name]));
    $('#days').innerHTML = data
      ? DATES.map(
          (d) =>
            '<section class="day"><strong>' +
            new Date(d + 'T12:00:00').toLocaleDateString('de-CH', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            }) +
            '</strong><ul>' +
            SLOTS.flatMap((s) =>
              data.days[d][s].map((id) => '<li>' + esc(s) + ': ' + esc(names[id] || id) + '</li>'),
            ).join('') +
            '</ul></section>',
        ).join('')
      : '';
    info();
  }
  async function fetchPlan() {
    const { data, error } = await client
      .from('family_plans')
      .select('data,updated_at')
      .eq('id', 'summer2027')
      .single();
    if (error) throw error;
    remote = data.data;
    stamp = data.updated_at;
    draw();
  }
  if (!cfg || !window.supabase) {
    $('#status').textContent = 'Supabase nicht verfügbar.';
    return;
  }
  client = window.supabase.createClient(cfg.url, cfg.publishableKey);
  const { data: auth, error: authErr } = await client.auth.getUser();
  if (authErr || !auth?.user) {
    $('#status').textContent = 'Bitte zuerst über den Familien-Login anmelden.';
    info();
    return;
  }
  user = auth.user;
  const { data: m, error: memErr } = await client
    .from('family_members')
    .select('display_name,role')
    .eq('user_id', user.id)
    .maybeSingle();
  if (memErr || !m) {
    $('#status').textContent = 'Angemeldet, aber noch nicht als Familienmitglied freigeschaltet.';
    info();
    return;
  }
  member = m;
  $('#status').textContent =
    'Angemeldet als ' + m.display_name + '. Schreibzugriff ist freigeschaltet.';
  $('#refresh').disabled = false;
  try {
    await fetchPlan();
  } catch (e) {
    $('#status').textContent = 'Laden fehlgeschlagen: ' + e.message;
  }
  $('#refresh').onclick = async () => {
    try {
      await fetchPlan();
    } catch (e) {
      alert('Fehler: ' + e.message);
    }
  };
  $('#backup').onclick = () => {
    const x = local();
    if (!x) return;
    const blob = new Blob([JSON.stringify(x, null, 2)], { type: 'application/json' }),
      url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download = 'sommer2027-lokal-backup.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  $('#upload').onclick = async () => {
    const x = local();
    if (!x || !member) return;
    try {
      await fetchPlan();
      if (count(remote) > 0 || remote.favorites?.length || remote.custom?.length) {
        alert('Der gemeinsame Plan ist nicht mehr leer. Es wurde nichts überschrieben.');
        return;
      }
      if (
        !confirm(
          'Hast du die lokale Sicherung heruntergeladen? Jetzt ' +
            count(x) +
            ' Einträge in den noch leeren gemeinsamen Plan übernehmen?',
        )
      )
        return;
      const { data, error } = await client
        .from('family_plans')
        .update({ data: x })
        .eq('id', 'summer2027')
        .eq('updated_at', stamp)
        .select('data,updated_at');
      if (error) throw error;
      if (!data?.length) {
        alert('Ein anderes Gerät hat den Plan inzwischen verändert. Bitte neu laden.');
        await fetchPlan();
        return;
      }
      remote = data[0].data;
      stamp = data[0].updated_at;
      draw();
      alert('Übernahme erfolgreich. Die lokale Sicherung bleibt bestehen.');
    } catch (e) {
      alert('Übernahme fehlgeschlagen: ' + e.message);
    }
  };
  info();
})();
