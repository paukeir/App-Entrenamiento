import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialData, upgradeData, weekDates, gym, planFor, firstWeek, suggestWeek } from '../model.js';
import { planningReadiness, prepareNextWeek } from '../planner.js';
function readyWeek(data, start) {
  for (const [i, date] of weekDates(start).entries()) {
    const type = ['rest', 'gym', 'rest', 'run', 'gym', 'run', 'run'][i];
    data.plans[date] = { type, title: type, details: 'Sesión aprobada.', source: 'agreed', ...(type === 'run' ? { distanceKm: i === 6 ? 10 : 6, intensity: 'suave' } : type === 'gym' ? { exercises: structuredClone(gym) } : {}) };
    if (type !== 'rest') data.reports.push({ id: date, date, type, title: type, status: 'completed', rpe: 5, feeling: 'Bien', ...(type==='run'?{distance:i===6?10:6}:{}) });
  }
  return data;
}
test('El martes tiene los siete ejercicios reales y los rangos acordados', () => {
  const data = upgradeData(initialData()), p = data.plans['2026-11-03'];
  assert.equal(p.exercises.length, 7); assert.equal(p.exercises[0].name, 'Prensa de piernas');
  assert.equal(p.exercises[0].weight, null); assert.equal(p.exercises[1].unit, 'por mano');
  assert.equal(p.exercises[1].weight, 8); assert.equal(p.exercises[1].maxWeight, 10);
  assert.equal(p.exercises[6].sets, 2); assert.equal(p.exercises[6].durationSeconds, 45);
});
test('La captura conserva el sábado de descanso y la alternativa a la 5K', () => {
  const data = upgradeData(initialData());
  assert.equal(planFor(data, '2026-11-07').type, 'rest');
  assert.equal(planFor(data, '2026-11-08').distanceKm, 7);
  assert.equal(planFor(data, '2026-11-08').maxDistanceKm, 9);
  data.profile.events.find(e => e.date === '2026-11-08').confirmed = true;
  assert.equal(planFor(data, '2026-11-08').distanceKm, 5);
  assert.equal(planFor(data, '2026-11-08').intensity, 'carrera');
  assert.equal(data.profile.events[2].date, '2026-12-13');
});
test('La migración no sustituye planes ya editados y solo se aplica una vez', () => {
  const data = initialData(); data.plans['2026-11-05'].title = 'Personalizado';
  const next = upgradeData(data); assert.equal(next.plans['2026-11-05'].title, 'Personalizado');
  delete next.plans['2026-11-05']; assert.equal(upgradeData(next).plans['2026-11-05'], undefined);
});
test('No inventa una semana mientras faltan aprobaciones, reportes o distancias', () => {
  const data = upgradeData(initialData()); assert.equal(planningReadiness(data, '2026-11-02').ready, false);
  const ready = readyWeek(data, '2026-11-16'); delete ready.reports.find(r => r.date === '2026-11-19').rpe;
  ready.plans['2026-11-19'].distanceKm = null;
  assert.equal(prepareNextWeek(ready, '2026-11-16').generated, false);
});
test('Mantiene carga sin dos semanas de datos; nunca sobreescribe la próxima semana', () => {
  const data = readyWeek(upgradeData(initialData()), '2026-11-16');
  const result = prepareNextWeek(data, '2026-11-16'); assert.equal(result.generated, true);
  assert.equal(result.data.plans['2026-11-26'].distanceKm, 6);
  assert.equal(result.data.plans['2026-11-23'].type, 'rest'); assert.equal(result.data.plans['2026-11-25'].type, 'rest');
  assert.equal(prepareNextWeek(result.data, '2026-11-16').generated, false);
});
test('Aumenta como máximo un 5% solo tras dos semanas suaves favorables', () => {
  const data = readyWeek(readyWeek(upgradeData(initialData()), '2026-11-16'), '2026-11-23'); data.profile.events=[];
  const result = prepareNextWeek(data, '2026-11-23'); assert.equal(result.generated, true);
  assert.equal(result.data.plans['2026-12-03'].distanceKm, 6.3);
  data.plans['2026-11-26'].intensity = 'series';
  assert.equal(prepareNextWeek(data, '2026-11-23').data.plans['2026-12-03'].distanceKm, 6);
});
test('Fatiga reduce volumen; las molestias paran la generación', () => {
  const data = readyWeek(upgradeData(initialData()), '2026-11-16');
  data.reports.find(r => r.date === '2026-11-19').feeling = 'Cansado';
  const result = prepareNextWeek(data, '2026-11-16');
  assert.equal(result.data.plans['2026-11-26'].distanceKm, 4.8);
  data.reports.find(r => r.date === '2026-11-19').feeling = 'Molestias';
  assert.equal(prepareNextWeek(data, '2026-11-16').generated, false);
});
test('Semana de la 10K confirmada descarga los rodajes y añade la carrera real', () => {
  const data = readyWeek(upgradeData(initialData()), '2026-11-02');
  const result = prepareNextWeek(data, '2026-11-02'); assert.equal(result.generated, true);
  assert.equal(result.data.plans['2026-11-12'].distanceKm, 3.9);
  assert.equal(result.data.plans['2026-11-15'].distanceKm, 10);
  assert.equal(result.data.plans['2026-11-15'].intensity, 'carrera');
});
test('La carrera anterior no se convierte en otra carrera la semana siguiente', () => {
  const data = readyWeek(upgradeData(initialData()), '2026-11-09');
  data.plans['2026-11-15'].intensity = 'carrera'; data.plans['2026-11-15'].title = '10K';
  const result = prepareNextWeek(data, '2026-11-09');
  assert.equal(result.data.plans['2026-11-22'].intensity, 'suave');
  assert.equal(result.data.plans['2026-11-22'].distanceKm, 6);
});
test('Conserva propuestas y aprobaciones de la versión publicada en otra sesión', () => {
  const data = initialData(); data.plans = {}; delete data.profile;
  const legacyTuesday = {type:'gym',title:'Fuerza completa · énfasis piernas',details:'8 min de calentamiento; prensa 1×12 + 3×10 moderada; plancha 2×45–60 s.'};
  data.drafts = {'2026-11-02':{week:'2026-11-02',plans:{...structuredClone(firstWeek),'2026-11-03':legacyTuesday},reason:'Mi propuesta guardada'}};
  const migrated=upgradeData(data);
  assert.equal(migrated.drafts['2026-11-02'].reason,'Mi propuesta guardada');
  assert.equal(migrated.plans['2026-11-03'].exercises.length,7);
  assert.equal(migrated.plans['2026-11-03'].source,'draft');
  data.plans['2026-11-03']=legacyTuesday;
  const published=upgradeData(data);
  assert.equal(published.plans['2026-11-03'].source,undefined);
  assert.equal(published.plans['2026-11-03'].details,legacyTuesday.details);
  assert.equal(published.plans['2026-11-03'].exercises.length,7);
  assert.equal(suggestWeek(migrated,'2026-11-02').plans['2026-11-03'].exercises.length,7);
});
