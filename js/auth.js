import { getClient } from './supabase-client.js';

export async function getSession() {
  const { data } = await getClient().auth.getSession();
  return data.session;
}

export async function signIn(email, password) {
  const { data, error } = await getClient().auth.signInWithPassword({ email, password });
  if (error) throw error;
  await pullProgress();
  return data;
}

export async function signUp(email, password) {
  const { data, error } = await getClient().auth.signUp({ email, password });
  if (error) throw error;
  if (data.session) await pullProgress();
  return data;
}

export async function signOut() {
  await pushProgress();
  const { error } = await getClient().auth.signOut();
  if (error) throw error;
}

function collectProgress() {
  const result = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('jp_n5_')) {
      const raw = localStorage.getItem(key);
      try { result[key] = JSON.parse(raw); }
      catch { result[key] = raw; }
    }
  }
  return result;
}

function applyProgress(remoteData) {
  for (const [key, value] of Object.entries(remoteData)) {
    if (key.startsWith('jp_n5_')) {
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    }
  }
}

export async function pushProgress() {
  const session = await getSession();
  if (!session) return false;
  const { error } = await getClient().from('progress').upsert({
    id: session.user.id,
    data: collectProgress(),
    updated_at: new Date().toISOString(),
  });
  if (!error) localStorage.setItem('jp_n5_last_sync', new Date().toISOString());
  return !error;
}

export async function pullProgress() {
  const session = await getSession();
  if (!session) return false;
  const { data, error } = await getClient()
    .from('progress')
    .select('data')
    .eq('id', session.user.id)
    .single();
  if (error || !data?.data) return false;
  applyProgress(data.data);
  localStorage.setItem('jp_n5_last_sync', new Date().toISOString());
  return true;
}

export function openAuthModal() {
  document.querySelector('.auth-modal-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'auth-modal-overlay';
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  _renderModalAsync(overlay, close);
}

async function _renderModalAsync(overlay, close) {
  const session = await getSession();
  if (session) {
    _renderUserPanel(overlay, close, session);
  } else {
    _renderLoginForm(overlay, close, 'signin');
  }
}

function _buildModal(content) {
  return `<div class="auth-modal">${content}</div>`;
}

function _renderLoginForm(overlay, close, mode) {
  const isSignin = mode === 'signin';
  overlay.innerHTML = _buildModal(`
    <div class="auth-modal-header">
      <div class="auth-modal-title">Cuenta</div>
      <button class="btn-icon auth-close" aria-label="Cerrar">✕</button>
    </div>
    <div class="auth-tabs">
      <button class="auth-tab ${isSignin ? 'active' : ''}" data-tab="signin">Iniciar sesión</button>
      <button class="auth-tab ${!isSignin ? 'active' : ''}" data-tab="signup">Registrarse</button>
    </div>
    <div class="auth-field">
      <label for="auth-email">Email</label>
      <input class="auth-input" id="auth-email" type="email" placeholder="tu@email.com"
             autocomplete="email">
    </div>
    <div class="auth-field">
      <label for="auth-password">Contraseña</label>
      <input class="auth-input" id="auth-password" type="password" placeholder="••••••••"
             autocomplete="${isSignin ? 'current-password' : 'new-password'}">
    </div>
    <div class="auth-error" id="auth-error"></div>
    <button class="auth-btn-primary" id="auth-submit">
      ${isSignin ? 'Iniciar sesión' : 'Registrarse'}
    </button>
  `);

  overlay.querySelector('.auth-close').addEventListener('click', close);

  overlay.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => _renderLoginForm(overlay, close, tab.dataset.tab));
  });

  const emailInput = overlay.querySelector('#auth-email');
  const passwordInput = overlay.querySelector('#auth-password');
  const submitBtn = overlay.querySelector('#auth-submit');
  const errorEl = overlay.querySelector('#auth-error');

  setTimeout(() => emailInput.focus(), 50);

  const showError = msg => {
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
  };

  const handleSubmit = async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) { showError('Completa todos los campos.'); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Cargando…';
    errorEl.style.display = 'none';

    try {
      if (isSignin) {
        await signIn(email, password);
        close();
        _updateAuthButton();
      } else {
        const result = await signUp(email, password);
        if (result.session) {
          close();
          _updateAuthButton();
        } else {
          overlay.innerHTML = _buildModal(`
            <div class="auth-modal-header">
              <div class="auth-modal-title">Revisa tu email</div>
              <button class="btn-icon auth-close" aria-label="Cerrar">✕</button>
            </div>
            <p class="auth-confirm-msg">
              Hemos enviado un enlace de confirmación a <strong>${email}</strong>.
              Haz clic en él para activar tu cuenta y luego inicia sesión.
            </p>
          `);
          overlay.querySelector('.auth-close').addEventListener('click', close);
        }
      }
    } catch (err) {
      showError(err.message || 'Error desconocido.');
      submitBtn.disabled = false;
      submitBtn.textContent = isSignin ? 'Iniciar sesión' : 'Registrarse';
    }
  };

  submitBtn.addEventListener('click', handleSubmit);
  passwordInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleSubmit(); });
}

function _renderUserPanel(overlay, close, session) {
  const lastSync = localStorage.getItem('jp_n5_last_sync');
  const syncText = lastSync
    ? `Última sync: ${new Date(lastSync).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}`
    : 'Sin sincronizar';

  overlay.innerHTML = _buildModal(`
    <div class="auth-modal-header">
      <div class="auth-modal-title">Cuenta</div>
      <button class="btn-icon auth-close" aria-label="Cerrar">✕</button>
    </div>
    <div class="auth-user-info">
      <div class="auth-user-email">${session.user.email}</div>
      <div class="auth-sync-row">
        <button class="auth-btn-secondary" id="auth-push">↑ Subir</button>
        <button class="auth-btn-secondary" id="auth-pull">↓ Descargar</button>
      </div>
      <div class="auth-sync-status" id="auth-sync-status">${syncText}</div>
      <button class="auth-btn-danger" id="auth-logout">Cerrar sesión</button>
    </div>
  `);

  overlay.querySelector('.auth-close').addEventListener('click', close);

  const statusEl = overlay.querySelector('#auth-sync-status');
  const fmt = () => new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });

  overlay.querySelector('#auth-push').addEventListener('click', async () => {
    statusEl.textContent = 'Subiendo…';
    const ok = await pushProgress();
    statusEl.textContent = ok ? `Subido: ${fmt()}` : 'Error al subir.';
  });

  overlay.querySelector('#auth-pull').addEventListener('click', async () => {
    statusEl.textContent = 'Descargando…';
    const ok = await pullProgress();
    if (ok) {
      statusEl.textContent = `Descargado: ${fmt()}`;
      setTimeout(() => { close(); window.navigate('/'); }, 800);
    } else {
      statusEl.textContent = 'Error al descargar.';
    }
  });

  overlay.querySelector('#auth-logout').addEventListener('click', async () => {
    statusEl.textContent = 'Cerrando sesión…';
    try {
      await signOut();
    } catch (_) { /* ignorar */ }
    close();
    _updateAuthButton();
  });
}

export async function initAuthButton() {
  const btn = document.getElementById('home-auth');
  if (!btn) return;
  btn.addEventListener('click', openAuthModal);
  _updateAuthButton();
}

function _updateAuthButton() {
  const btn = document.getElementById('home-auth');
  if (!btn) return;
  getSession().then(session => {
    btn.classList.toggle('auth-logged-in', !!session);
    btn.title = session ? `Cuenta: ${session.user.email}` : 'Cuenta';
    const cta = btn.querySelector('.auth-cta-text');
    if (cta) cta.style.display = session ? 'none' : '';
  });
}
