import { cloudConfig } from './app-config.js';
import { CloudClient, TrainingSync, validConfig } from './sync.js';
import { initialData, validateData, upgradeData } from './model.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function setupAccount({ getData, applyData, canApply, notify, storage = localStorage }) {
  const container = document.querySelector('#account-status');
  const dialog = document.querySelector('#account-dialog');
  let state = 'local', message = 'Solo en este dispositivo', client, sync;
  let active = false;
  const accountKey = uid => 'ritmo.account-data.' + uid;
  function showStatus(next = state, text = message) {
    state = next; message = text;
    container.innerHTML = `<strong>${client?.session ? 'Tu cuenta de Ritmo' : 'Entre tus dispositivos'}</strong><p role="status">${escape(message)}</p><button type="button" class="text-btn" id="account-open">${client?.session ? 'Gestionar cuenta ↗' : 'Conectar iPhone y Mac ↗'}</button>`;
    container.querySelector('button').onclick = open;
  }
  function activate() {
    if (!client?.session) return;
    const uid = client.session.user.id;
    const owner = storage.getItem('ritmo.device-owner');
    if (!active) {
      const cached = storage.getItem(accountKey(uid));
      if (owner && owner !== uid) storage.setItem(accountKey(owner), JSON.stringify(getData()));
      if (cached) applyData(validateData(upgradeData(JSON.parse(cached))));
      else if (owner && owner !== uid) applyData(upgradeData(initialData()));
      storage.setItem('ritmo.device-owner', uid);
      active = true;
    }
    sync.tick();
  }
  function open() {
    if (!validConfig(cloudConfig)) {
      dialog.innerHTML = `<div class="account-content"><h2>Tu entrenamiento, en ambos dispositivos</h2><p>La conexión privada todavía está pendiente de activar. Tus entrenamientos siguen guardados en este navegador.</p><p>Cuando esté activa, entrarás con la misma cuenta en el iPhone y el Mac. No necesitas copiar tus reportes a mano.</p><button type="button" class="primary" data-close-account>Entendido</button></div>`;
    } else if (client?.session) {
      dialog.innerHTML = `<div class="account-content"><h2>Tu cuenta</h2><p>${escape(client.session.user.email)}</p><p>${escape(message)}</p><p>Los cambios se comprueban cada 10 segundos y cuando vuelves a abrir la app. Sin conexión se conservan en este dispositivo.</p>${state === 'conflict' ? `<div class="notice">Hay versiones distintas de una sesión. Se guardará una copia de ambas antes de resolverlas.</div><button type="button" class="secondary" data-resolve="local">Conservar mi versión de la sesión</button><button type="button" class="secondary" data-resolve="remote">Usar la versión de mi otro dispositivo</button>` : ''}<div class="modal-footer"><button class="text-btn" type="button" id="account-signout">Cerrar sesión</button><button class="secondary" type="button" id="account-sync">Actualizar ahora</button><button class="primary" type="button" data-close-account>Cerrar</button></div></div>`;
      dialog.querySelector('#account-sync').onclick = () => { dialog.close(); sync.tick(); };
      dialog.querySelectorAll('[data-resolve]').forEach(button => { button.onclick = () => { dialog.close(); sync.tick(button.dataset.resolve); }; });
      dialog.querySelector('#account-signout').onclick = async () => {
        if (sync.busy) { notify('Espera a que termine la sincronización antes de cerrar sesión.'); return; }
        const uid = client.session.user.id;
        storage.setItem(accountKey(uid), JSON.stringify(getData()));
        try { await client.signOut(); } catch { /* Local logout still completes. */ }
        active = false;
        storage.removeItem('ritmo.device-owner');
        applyData(upgradeData(initialData()));
        showStatus('local', 'Sesión cerrada. Tus datos de la cuenta se conservan.');
        dialog.close();
      };
    } else {
      dialog.innerHTML = `<form id="account-form" class="account-content"><h2>Tu cuenta, tu entrenamiento</h2><p>Usa el mismo correo en el iPhone y el Mac. Al conectar se combinarán los registros de este dispositivo con tu cuenta; se te consultará si hay diferencias en la misma sesión.</p><label>Correo electrónico<input name="email" type="email" autocomplete="email" required></label><label>Contraseña<input name="password" type="password" autocomplete="current-password" minlength="10" required></label><p id="account-error" role="status"></p><div class="modal-footer"><button class="secondary" type="button" data-close-account>Cancelar</button><button class="secondary" type="submit" name="signup">Crear cuenta</button><button class="primary" type="submit">Entrar</button></div></form>`;
      dialog.querySelector('form').onsubmit = async event => {
        event.preventDefault();
        const form = event.target, values = new FormData(form), signup = event.submitter?.name === 'signup';
        form.querySelectorAll('button').forEach(button => { button.disabled = true; });
        try {
          let ready = true;
          if (signup) ready = await client.signUp(values.get('email'), values.get('password'));
          else await client.signIn(values.get('email'), values.get('password'));
          form.querySelector('[name=password]').value = '';
          if (!ready) { form.querySelector('#account-error').textContent = 'Revisa tu correo y confirma la cuenta. Después vuelve aquí para entrar con tu contraseña.'; return; }
          activate(); dialog.close(); sync.tick();
        } catch (error) { form.querySelector('#account-error').textContent = error.message; }
        finally { form.querySelectorAll('button').forEach(button => { button.disabled = false; }); }
      };
    }
    dialog.querySelectorAll('[data-close-account]').forEach(button => { button.onclick = () => dialog.close(); });
    dialog.showModal();
  }
  if (validConfig(cloudConfig)) {
    client = new CloudClient(cloudConfig, storage);
    sync = new TrainingSync({ client, storage, getData, applyData, canApply: () => canApply() && !dialog.open,
      onStatus(next, text) { showStatus(next, text); } });
    try { activate(); } catch { showStatus('offline', 'No se ha podido leer la copia de tu cuenta. Descarga tus datos antes de continuar.'); }
    setInterval(() => { if (document.visibilityState === 'visible') sync.tick(); }, 10000);
    window.addEventListener('online', () => sync.tick());
    window.addEventListener('focus', () => sync.tick());
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sync.tick(); });
  }
  showStatus();
  return {
    changed() {
      if (client?.session) {
        try { storage.setItem(accountKey(client.session.user.id), JSON.stringify(getData())); }
        catch { notify('No se pudo actualizar la copia local de tu cuenta. Descarga una copia.'); }
        setTimeout(() => sync.tick(), 0);
      }
    },
  };
}
