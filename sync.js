import { initialData, upgradeData, validateData } from './model.js';

const clone = value => structuredClone(value);
const canonical = value => value == null || typeof value !== 'object'
  ? JSON.stringify(value)
  : Array.isArray(value) ? '[' + value.map(canonical).join(',') + ']'
    : '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
export const same = (a, b) => canonical(a) === canonical(b);

export class SyncConflict extends Error {
  constructor(paths) { super('Hay cambios distintos en la misma sesión. Elige qué versión conservar.'); this.paths = paths; }
}

// Three-way merge includes deletions. A stale device cannot silently overwrite
// newer changes. Independent days and reports merge without prompting.
export function mergeTraining(base, local, remote, preference) {
  const conflicts = [];
  function pick(before, ours, theirs, path) {
    if (same(ours, theirs) || same(before, theirs)) return ours;
    if (same(before, ours)) return theirs;
    conflicts.push(path);
    return preference === 'remote' ? theirs : ours;
  }
  function mapMerge(before, ours, theirs, label) {
    const out = {};
    for (const key of new Set([...Object.keys(before), ...Object.keys(ours), ...Object.keys(theirs)])) {
      const value = pick(before[key], ours[key], theirs[key], `${label}: ${key}`);
      if (value !== undefined) Object.defineProperty(out, key, { value: clone(value), enumerable: true, configurable: true, writable: true });
    }
    return out;
  }
  const byId = reports => Object.fromEntries(reports.map(report => [report.id, report]));
  const result = {
    ...mapMerge(base, local, remote, 'Preferencias'),
    version: 1,
    plans: mapMerge(base.plans, local.plans, remote.plans, 'Plan'),
    reports: Object.values(mapMerge(byId(base.reports), byId(local.reports), byId(remote.reports), 'Reporte')),
    corrections: [...new Set([...(local.corrections || []), ...(remote.corrections || [])])],
  };
  // The document-level properties above are merged separately below; plans and
  // reports must not count as conflicts when different entries were edited.
  const actualConflicts = conflicts.filter(path => path !== 'Preferencias: plans' && path !== 'Preferencias: reports' && path !== 'Preferencias: corrections');
  if (actualConflicts.length && !preference) throw new SyncConflict(actualConflicts);
  // Reports created independently for the same date require explicit review.
  const dates = new Map();
  for (const report of result.reports) {
    if (!report.date) continue;
    const existing = dates.get(report.date);
    if (existing && existing.id !== report.id) {
      if (!preference) throw new SyncConflict([`Dos reportes para el ${report.date}. Elige qué versión conservar.`]);
      const preferred = (preference === 'remote' ? remote : local).reports.find(r => r.date === report.date);
      result.reports = result.reports.filter(r => r.date !== report.date || r.id === preferred?.id);
    }
    dates.set(report.date, report);
  }
  return validateData(result);
}

export function validConfig(config) {
  try {
    const url = new URL(config.url);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') return false;
    const key = config.publishableKey;
    if (typeof key !== 'string' || !key || key.startsWith('sb_secret_')) return false;
    if (key.startsWith('sb_publishable_')) return true;
    const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.role === 'anon';
  } catch { return false; }
}

export class CloudClient {
  constructor(config, storage, request = globalThis.fetch.bind(globalThis)) {
    if (!validConfig(config)) throw Error('La conexión entre dispositivos todavía no está configurada.');
    this.url = config.url.replace(/\/$/, '');
    this.key = config.publishableKey;
    this.storage = storage;
    this.request = request;
    this.sessionKey = 'ritmo.auth.' + new URL(config.url).hostname;
    try { this.session = JSON.parse(storage.getItem(this.sessionKey) || 'null'); } catch { this.session = null; }
  }
  keepSession(session) {
    if (!session?.access_token || !session?.refresh_token || !session?.user?.id) throw Error('La sesión recibida no es válida.');
    this.session = { ...session, expires_at: session.expires_at || Math.floor(Date.now() / 1000) + session.expires_in };
    this.storage.setItem(this.sessionKey, JSON.stringify(this.session));
  }
  async call(path, { method = 'GET', body, auth = true, headers = {} } = {}) {
    if (auth) await this.refresh();
    const response = await this.request(this.url + path, {
      method,
      headers: { apikey: this.key, ...(auth ? { Authorization: 'Bearer ' + this.session.access_token } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      const error = new Error(response.status === 401 ? 'La sesión ha caducado. Vuelve a entrar en tu cuenta.' : response.status === 409 ? 'Los datos han cambiado en otro dispositivo. Se volverán a comprobar.' : 'No se ha podido conectar con tu cuenta. Tus cambios siguen guardados en este dispositivo.');
      error.status = response.status; throw error;
    }
    return response.status === 204 ? null : response.json();
  }
  async signIn(email, password) {
    const result = await this.call('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password }, auth: false });
    this.keepSession(result);
  }
  async signUp(email, password) {
    const result = await this.call('/auth/v1/signup', { method: 'POST', body: { email, password }, auth: false });
    if (result.access_token) this.keepSession(result);
    return Boolean(result.access_token);
  }
  async refresh() {
    if (!this.session?.refresh_token) throw Error('Entra en tu cuenta para sincronizar.');
    if (this.session.expires_at > Math.floor(Date.now() / 1000) + 60) return;
    if (!this.refreshing) this.refreshing = this.call('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: this.session.refresh_token }, auth: false })
      .then(session => this.keepSession(session)).finally(() => { this.refreshing = null; });
    await this.refreshing;
  }
  async signOut() {
    try { await this.call('/auth/v1/logout', { method: 'POST' }); }
    finally { this.session = null; this.storage.removeItem(this.sessionKey); }
  }
  async read() {
    const rows = await this.call('/rest/v1/training_documents?select=payload,revision&user_id=eq.' + encodeURIComponent(this.session.user.id));
    if (!Array.isArray(rows) || rows.length > 1) throw Error('Respuesta de sincronización no válida.');
    if (!rows.length) return null;
    if (!Number.isSafeInteger(rows[0].revision) || rows[0].revision < 1) throw Error('Versión de datos no válida.');
    return { payload: validateData(upgradeData(rows[0].payload)), revision: rows[0].revision };
  }
  async write(payload, revision) {
    validateData(payload);
    const user = this.session.user.id;
    const rows = await this.call('/rest/v1/training_documents' + (revision ? '?user_id=eq.' + encodeURIComponent(user) + '&revision=eq.' + revision : ''), {
      method: revision ? 'PATCH' : 'POST',
      body: { user_id: user, revision: revision + 1, payload }, headers: { Prefer: 'return=representation' },
    });
    if (!Array.isArray(rows) || rows.length !== 1) { const error = new Error('Otro dispositivo ha guardado cambios. Se comprobarán antes de continuar.'); error.status = 409; throw error; }
    return { payload: validateData(rows[0].payload), revision: rows[0].revision };
  }
}

export class TrainingSync {
  constructor({ client, storage, getData, applyData, canApply = () => true, onStatus = () => {} }) {
    Object.assign(this, { client, storage, getData, applyData, canApply, onStatus });
    this.busy = false;
  }
  cacheKey() { return 'ritmo.sync.' + this.client.url + '.' + this.client.session.user.id; }
  async tick(preference) {
    if (this.busy || !this.client.session || !this.canApply()) return;
    this.busy = true;
    this.onStatus('saving', 'Sincronizando…');
    try {
      // Always fetch first, including before the first upload from a new device.
      const user = this.client.session.user.id;
      const remote = await this.client.read();
      if (!this.client.session || this.client.session.user.id !== user || !this.canApply()) return;
      const local = clone(this.getData());
      let cache;
      try { cache = JSON.parse(this.storage.getItem(this.cacheKey()) || 'null'); } catch { /* Corrupt cache is not a baseline. */ }
      const base = cache?.payload ? validateData(cache.payload) : upgradeData(initialData());
      let merged = remote ? mergeTraining(base, local, remote.payload, preference) : local;
      if (preference) this.storage.setItem('ritmo.conflict-backup.' + Date.now(), JSON.stringify({ local, remote: remote?.payload }));
      // Compare-and-swap on revision prevents lost writes during a concurrent save.
      const saved = !remote || !same(merged, remote.payload) ? await this.client.write(merged, remote?.revision || 0) : remote;
      if (!this.client.session || this.client.session.user.id !== user) return;
      if (!this.canApply()) { this.onStatus('pending', 'Termina de editar para recibir los últimos cambios.'); return; }
      // A report may have been edited while the network request was in flight.
      const current = clone(this.getData());
      if (!same(local, current)) merged = mergeTraining(local, current, saved.payload);
      else merged = saved.payload;
      this.storage.setItem(this.cacheKey(), JSON.stringify(saved));
      if (!same(current, merged)) {
        this.storage.setItem('ritmo.before-sync.' + user, JSON.stringify(current));
        this.applyData(merged);
      }
      this.onStatus(same(merged, saved.payload) ? 'synced' : 'pending', same(merged, saved.payload) ? 'Actualizado en tus dispositivos' : 'Cambios pendientes de enviar');
    } catch (error) {
      this.onStatus(error instanceof SyncConflict ? 'conflict' : 'offline', error instanceof TypeError ? 'Sin conexión. Tus cambios siguen guardados en este dispositivo.' : error.message);
    } finally { this.busy = false; }
  }
}
