import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialData, upgradeData, validateData } from '../model.js';
import { mergeTraining, SyncConflict, same, validConfig, CloudClient, TrainingSync } from '../sync.js';

const seed = () => upgradeData(initialData());
const storage = () => { const map = new Map(); return { getItem: key => map.get(key) || null, setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key) }; };
const plan = title => ({ type: 'run', title, details: '' });

test('Dos dispositivos combinan cambios en días distintos y conservan reportes', () => {
  const base = seed(), local = structuredClone(base), remote = structuredClone(base);
  local.plans['2026-11-10'] = plan('Desde iPhone'); remote.plans['2026-11-12'] = plan('Desde Mac');
  local.reports[0].notes = 'Editado desde iPhone'; remote.reports[1].notes = 'Editado desde Mac';
  const merged = mergeTraining(base, local, remote);
  assert.equal(merged.plans['2026-11-10'].title, 'Desde iPhone'); assert.equal(merged.plans['2026-11-12'].title, 'Desde Mac');
  assert.equal(merged.reports[0].notes, 'Editado desde iPhone'); assert.equal(merged.reports[1].notes, 'Editado desde Mac');
});
test('Los conflictos no sobrescriben sin elección y no borran cambios independientes', () => {
  const base = seed(), local = structuredClone(base), remote = structuredClone(base);
  local.reports[0].distance = 6; remote.reports[0].distance = 7;
  remote.plans['2026-11-12'] = plan('Solo remoto');
  assert.throws(() => mergeTraining(base, local, remote), SyncConflict);
  assert.equal(mergeTraining(base, local, remote, 'local').reports[0].distance, 6);
  assert.equal(mergeTraining(base, local, remote, 'remote').reports[0].distance, 7);
  assert.equal(mergeTraining(base, local, remote, 'local').plans['2026-11-12'].title, 'Solo remoto');
});
test('Una eliminación no se resucita; editar y eliminar la misma sesión requiere elección', () => {
  const base = seed(), local = structuredClone(base), remote = structuredClone(base);
  local.reports.shift();
  assert.equal(mergeTraining(base, local, remote).reports.length, 1);
  remote.reports[0].notes = 'Cambio concurrente';
  assert.throws(() => mergeTraining(base, local, remote), SyncConflict);
  assert.equal(mergeTraining(base, local, remote, 'local').reports.length, 1);
});
test('Dos reportes con ids distintos el mismo día se pueden resolver explícitamente', () => {
  const base = seed(), local = structuredClone(base), remote = structuredClone(base);
  local.reports.push({ ...base.reports[0], id: 'phone', date: '2026-11-05' });
  remote.reports.push({ ...base.reports[0], id: 'mac', date: '2026-11-05' });
  assert.throws(() => mergeTraining(base, local, remote), SyncConflict);
  const result = mergeTraining(base, local, remote, 'remote');
  assert.equal(result.reports.find(r => r.date === '2026-11-05').id, 'mac');
});
test('La configuración rechaza claves secretas y solo admite claves públicas', () => {
  const url = 'https://example.supabase.co';
  assert.equal(validConfig({ url, publishableKey: 'sb_publishable_example' }), true);
  assert.equal(validConfig({ url, publishableKey: 'sb_secret_example' }), false);
  const jwt = role => 'x.' + Buffer.from(JSON.stringify({ role })).toString('base64url') + '.x';
  assert.equal(validConfig({ url, publishableKey: jwt('service_role') }), false);
  assert.equal(validConfig({ url, publishableKey: jwt('anon') }), true);
  assert.equal(validConfig({ url: 'http://example.supabase.co', publishableKey: 'sb_publishable_x' }), false);
});
test('El transporte utiliza la identidad autenticada y compare-and-swap por revisión', async () => {
  const requests = [], store = storage();
  const client = new CloudClient({ url: 'https://example.supabase.co', publishableKey: 'sb_publishable_example' }, store, async (url, options) => {
    requests.push({ url, options }); return new Response(JSON.stringify([{ payload: seed(), revision: 5 }]), { status: 200 });
  });
  client.keepSession({ access_token: 'test-access', refresh_token: 'test-refresh', user: { id: 'user-a' }, expires_at: 9999999999 });
  await client.write(seed(), 4);
  assert.match(requests[0].url, /user_id=eq.user-a&revision=eq.4/);
  assert.equal(requests[0].options.headers.Authorization, 'Bearer test-access');
  assert.equal(JSON.parse(requests[0].options.body).revision, 5);
});
test('Refrescar la sesión no imprime ni pierde el refresh token', async () => {
  const store = storage(), calls = [];
  const client = new CloudClient({ url: 'https://example.supabase.co', publishableKey: 'sb_publishable_example' }, store, async (url, options) => {
    calls.push(url);
    return new Response(JSON.stringify({ access_token: 'new', refresh_token: 'rotated', user: { id: 'u' }, expires_in: 3600 }), { status: 200 });
  });
  client.keepSession({ access_token: 'old', refresh_token: 'old-refresh', user: { id: 'u' }, expires_at: 1 });
  await Promise.all([client.refresh(), client.refresh()]);
  assert.equal(calls.length, 1); assert.equal(client.session.refresh_token, 'rotated');
});
test('La sincronización lee antes de escribir, y recibe cambios del otro dispositivo', async () => {
  const store = storage(); let local = seed(), remote = { payload: seed(), revision: 1 }, writes = 0;
  const client = { url: 'test', session: { user: { id: 'a' } }, read: async () => structuredClone(remote), write: async (payload, revision) => { assert.equal(revision, remote.revision); writes++; remote = { payload: structuredClone(payload), revision: revision + 1 }; return remote; } };
  const sync = new TrainingSync({ client, storage: store, getData: () => local, applyData: value => { local = value; } });
  await sync.tick(); assert.equal(writes, 0);
  remote.payload.plans['2026-11-12'] = plan('Cambio remoto'); remote.revision++;
  local.plans['2026-11-10'] = plan('Cambio local');
  await sync.tick(); assert.equal(writes, 1); assert.equal(local.plans['2026-11-12'].title, 'Cambio remoto');
  assert.equal(remote.payload.plans['2026-11-10'].title, 'Cambio local');
});
test('Si el usuario edita mientras se envía, la edición posterior no se pierde', async () => {
  const store = storage(); let local = seed(); local.plans['2026-11-10'] = plan('Primero');
  const client = { url: 'test', session: { user: { id: 'a' } }, read: async () => null, write: async payload => { local.plans['2026-11-12'] = plan('Durante el envío'); return { payload: structuredClone(payload), revision: 1 }; } };
  const sync = new TrainingSync({ client, storage: store, getData: () => local, applyData: value => { local = value; } });
  await sync.tick(); assert.equal(local.plans['2026-11-12'].title, 'Durante el envío');
});
test('Sin red o con revisión obsoleta se conservan los cambios locales', async () => {
  const local = seed(), store = storage(); let status;
  const client = { url: 'test', session: { user: { id: 'a' } }, read: async () => { throw Error('Sin conexión'); } };
  const sync = new TrainingSync({ client, storage: store, getData: () => local, applyData: () => assert.fail('No debe sobrescribir'), onStatus: s => { status = s; } });
  await sync.tick(); assert.equal(status, 'offline'); assert.ok(same(local, seed()));
  client.read = async () => null; client.write = async () => { const e = Error('Revisión obsoleta'); e.status = 409; throw e; };
  await sync.tick(); assert.equal(status, 'offline'); assert.equal(store.getItem(sync.cacheKey()), null);
});
test('No se aplican actualizaciones mientras hay un formulario sin terminar', async () => {
  const store = storage(), local = seed(); let reads = 0;
  const client = { url: 'test', session: { user: { id: 'a' } }, read: async () => { reads++; return null; } };
  const sync = new TrainingSync({ client, storage: store, getData: () => local, applyData: () => assert.fail(), canApply: () => false });
  await sync.tick(); assert.equal(reads, 0); validateData(local);
});
test('El fetch nativo conserva el contexto del navegador', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = function () {
      assert.equal(this, globalThis);
      return Promise.resolve(new Response(JSON.stringify({ access_token: 'a', refresh_token: 'r', user: { id: 'u' }, expires_in: 3600 }), { status: 200 }));
    };
    const client = new CloudClient({ url: 'https://example.supabase.co', publishableKey: 'sb_publishable_example' }, storage());
    await client.signIn('test@example.test', 'test-only');
    assert.equal(client.session.user.id, 'u');
  } finally { globalThis.fetch = original; }
});
