(async function () {
  const status = document.getElementById('status'),
    signin = document.getElementById('signin'),
    signout = document.getElementById('signout');
  const config = window.SOMMER2027_SUPABASE;
  if (!config || !window.supabase) {
    status.textContent =
      'Verbindung nicht verfügbar. Bitte mit Internetverbindung erneut versuchen.';
    return;
  }
  const client = window.supabase.createClient(config.url, config.publishableKey);
  function showError(e) {
    status.textContent = 'Fehler: ' + (e.message || String(e));
    status.classList.add('login-error');
  }
  async function refresh() {
    const { data, error } = await client.auth.getUser();
    if (error && error.name !== 'AuthSessionMissingError') {
      showError(error);
      return;
    }
    const user = data?.user;
    if (!user) {
      status.textContent = 'Noch nicht angemeldet.';
      signin.hidden = false;
      signin.style.display = '';
      signin.disabled = false;
      signout.hidden = true;
      signout.style.display = 'none';
      return;
    }
    signin.hidden = true;
    signin.style.display = 'none';
    signout.hidden = false;
    signout.style.display = '';
    const { data: member, error: membershipError } = await client
      .from('family_members')
      .select('display_name,role')
      .eq('user_id', user.id)
      .maybeSingle();
    if (membershipError) {
      showError(membershipError);
      return;
    }
    if (member) {
      status.textContent =
        'Angemeldet als ' +
        member.display_name +
        ' (' +
        (member.role === 'admin' ? 'Administrator' : 'Familienmitglied') +
        '). Dein Konto ist freigeschaltet.';
    } else {
      status.textContent =
        'Google-Anmeldung erfolgreich: ' +
        (user.email || 'Konto') +
        '. Dein Konto wartet auf die Freigabe als Familienmitglied. Ein Administrator kann deine User-ID in Supabase → Authentication → Users finden.';
    }
  }
  signin.addEventListener('click', async () => {
    signin.disabled = true;
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: new URL('familien-login.html', location.href).href },
    });
    if (error) {
      showError(error);
      signin.disabled = false;
    }
  });
  signout.addEventListener('click', async () => {
    const { error } = await client.auth.signOut();
    if (error) showError(error);
    else await refresh();
  });
  client.auth.onAuthStateChange(() => setTimeout(refresh, 0));
  await refresh();
})();
