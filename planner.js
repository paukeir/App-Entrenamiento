import { addDays, monday, weekDates, planFor, reportFor, validateData, firstWeek } from './model.js';

const pending = plan => /por definir|pendiente de plan/i.test(plan.title);
export function planningReadiness(data, sourceDate) {
  const dates = weekDates(sourceDate);
  const plans = dates.map(date => planFor(data, date));
  if (!data.profile?.automaticPlanning) return { ready: false, reason: 'La continuidad automática está desactivada.' };
  if (plans.some(p => p.source === 'draft')) return { ready: false, reason: 'Revisa y aprueba la primera semana antes de usarla como base automática.' };
  if (plans.some((p, i) => p.type !== 'rest' && (!data.plans[dates[i]] || pending(p)))) return { ready: false, reason: 'Falta el plan completo de esta semana. Completa los días pendientes para tener una base real.' };
  if (plans.some((p, i) => p.type !== 'rest' && !reportFor(data, dates[i]))) return { ready: false, reason: 'Registra cada sesión prevista como completada, parcial o no realizada. Después se preparará la siguiente semana.' };
  const reports = data.reports.filter(r => dates.includes(r.date));
  if (reports.some(r => r.feeling === 'Molestias')) return { ready: false, reason: 'Has registrado molestias. Revisa la recuperación y ajusta el plan antes de continuar automáticamente.' };
  if (plans.some(p => p.type === 'run' && !(p.distanceKm > 0))) return { ready: false, reason: 'Faltan distancias previstas de running. No se inventarán kilómetros para la próxima semana.' };
  if (plans.some(p => p.type === 'gym' && !p.exercises?.length)) return { ready: false, reason: 'Faltan los ejercicios previstos de una sesión de gimnasio.' };
  return { ready: true, reason: 'Base completa. Se puede preparar la siguiente semana.' };
}

function goodWeek(data, start) {
  const dates = weekDates(start);
  const sessions = dates.filter(d => planFor(data, d).type !== 'rest');
  return sessions.length >= 5 && sessions.every(date => {
    const r = reportFor(data, date);
    return data.plans[date] && r?.type === planFor(data,date).type && (r.type !== 'run' || r.distance >= planFor(data,date).distanceKm * 0.95) && r?.status === 'completed' && ['Bien', 'Muy bien', 'Normal'].includes(r.feeling) && r.rpe != null && r.rpe <= 6;
  });
}

export function prepareNextWeek(data, sourceDate) {
  const readiness = planningReadiness(data, sourceDate);
  if (!readiness.ready) return { data, ...readiness, generated: false };
  const source = weekDates(sourceDate), target = weekDates(addDays(source[0], 7));
  if (target.some(date => data.plans[date] || reportFor(data, date))) return { data, generated: false, reason: 'La siguiente semana ya tiene planes o reportes. Se conservan tus cambios.' };
  const reports = data.reports.filter(r => source.includes(r.date));
  const fatigue = reports.some(r => r.feeling === 'Cansado' || r.rpe >= 8 || r.status !== 'completed');
  const events = (data.profile.events || []).filter(e => e.confirmed && e.date >= target[0] && e.date <= target[6]);
  if (events.length > 1 || events.some(e => e.date !== target[6])) return { data, generated: false, reason: 'La distribución de carreras requiere una revisión: el automatismo actual contempla una carrera en domingo.' };
  const nearbyRace = (data.profile.events || []).some(e => e.confirmed && e.date >= target[0] && e.date <= addDays(target[6], 7));
  const progress = !fatigue && !nearbyRace && source.filter(d => planFor(data, d).type === 'run').every(d => planFor(data, d).intensity === 'suave') && goodWeek(data, source[0]) && goodWeek(data, addDays(source[0], -7));
  const factor = events.length ? 0.65 : fatigue ? 0.8 : progress ? 1.05 : 1;
  const reason = events.length ? 'Semana de carrera: se reduce un 35% el volumen de los rodajes previos y se evita intensidad adicional.' : fatigue ? 'Fatiga, esfuerzo alto o sesión incompleta: volumen de running reducido un 20%.' : progress ? 'Dos semanas completas con sensaciones favorables y esfuerzo ≤6/10: aumento máximo del 5% en distancia, manteniendo el esfuerzo.' : 'Se mantiene la carga: todavía no hay dos semanas completas de datos favorables para subirla.';
  const next = structuredClone(data);
  const easyReference = source.map(date => planFor(data, date)).filter(p => p.type === 'run' && p.intensity !== 'carrera' && p.distanceKm > 0);
  if (source.some(date => planFor(data, date).intensity === 'carrera') && !easyReference.length) return { data, generated: false, reason: 'Falta un rodaje de referencia para volver a entrenar después de la carrera.' };
  target.forEach((date, i) => {
    const previous = planFor(data, source[i]);
    const plan = { ...structuredClone(previous), source: 'rules', basedOnWeek: source[0], rationale: reason };
    delete plan.optionalRace;
    if (previous.sessionInstructions) plan.details = previous.sessionInstructions;
    if (previous.optionalRace || previous.intensity === 'carrera') {
      plan.title = 'Rodaje suave · recuperación'; plan.intensity = 'suave';
      if (previous.intensity === 'carrera') { plan.distanceKm = Math.min(...easyReference.map(p => p.distanceKm)); plan.maxDistanceKm = null; }
      plan.details = 'Rodaje cómodo. Se usa una distancia de rodaje previa como referencia; la carrera anterior no se repite automáticamente.';
    }
    if (plan.type === 'run') {
      plan.distanceKm = (progress?Math.floor(plan.distanceKm * factor * 10 + 1e-8):Math.round(plan.distanceKm * factor * 10)) / 10;
      if (plan.maxDistanceKm) plan.maxDistanceKm = (progress?Math.floor(plan.maxDistanceKm * factor * 10 + 1e-8):Math.round(plan.maxDistanceKm * factor * 10)) / 10;
      if (factor !== 1 && plan.intensity === 'suave') plan.title = 'Rodaje suave';
      if (fatigue || events.length) { plan.intensity = 'suave'; plan.title = 'Rodaje suave · recuperación'; plan.details = 'Ritmo cómodo, sin series ni trabajo rápido. Acorta o detén la sesión si aparecen molestias.'; }
      // Distances, not stale interval instructions, define an increased session.
      if (progress) plan.details += '\nAjuste automático: conserva la estructura e intensidad anterior; no aumentes también el ritmo o las repeticiones de series.';
    }
    if (plan.type === 'gym' && (fatigue || events.length)) {
      plan.exercises = plan.exercises.map(e => ({ ...e, sets: e.lowerBody || fatigue ? Math.max(1, e.sets - 1) : e.sets, note: e.note + ' Esta semana no aumentes carga y conserva al menos 3 repeticiones en reserva.' }));
      plan.details += '\nSemana de descarga: menos series, sin llegar al fallo y sin estrenar cargas.';
    }
    next.plans[date] = plan;
  });
  if (events.length) {
    const race = events[0];
    next.plans[race.date] = { type: 'run', title: race.name, distanceKm: race.distanceKm, intensity: 'carrera', details: 'Carrera confirmada en tu calendario. No se asigna un ritmo objetivo automático. Ajusta el esfuerzo a la recuperación y las sensaciones.', source: 'rules', basedOnWeek: source[0], rationale: reason };
  }
  next.planningLog = [...(next.planningLog || []), { week: target[0], basedOnWeek: source[0], reason }];
  return { data: validateData(next), generated: true, reason, week: target[0] };
}

export function continuePlanning(data, today) {
  // Only the current or just-finished week can trigger a new week; no cascade.
  for (const source of [monday(today), addDays(monday(today), -7)]) {
    const result = prepareNextWeek(data, source);
    if (result.generated) return result;
  }
  return { data, generated: false };
}

// Compatibility with the proposal/approval UI already published in Pages.
// Unlike the earlier calendar-only generator, missing training data never
// produces arbitrary distances or a race pace without a validated baseline.
export function suggestWeek(data,iso){
 const dates=weekDates(iso),start=dates[0];
 if(start==='2026-11-02')return {week:start,plans:structuredClone(firstWeek),reason:'Primera semana acordada. La 5K es opcional; falta concretar los ejercicios del viernes.',context:data.profile?.objective||''};
 if(start==='2026-11-09')return {week:start,plans:{
 '2026-11-09':{type:'rest',title:'Descanso',details:'Recuperación después del rodaje y la escalada del domingo.'},
 '2026-11-10':{type:'gym',title:'HYATLON · familiarización + transición',details:'35–45 min, RPE 3–4/10. Calentar 8–10 min trote suave y movilidad. Farmer carry 2×20–30 m con cargas progresivas; probar brevemente la carga oficial solo si se controla. Goblet lunges 1–2×5–6 zancadas ligeras; pocas repeticiones con 20 kg si la técnica es sólida. Después de una tanda corta, correr 400–600 m muy suave para notar la transición. Opcional 5–8 wall balls. Descansar cuanto haga falta, sin fatiga ni agujetas.',sessionInstructions:'Familiarización, NO simulacro completo. Comprobar cargas y sensaciones al correr después de zancadas. No hacer series largas de burpees ni estaciones enteras.'},
 '2026-11-11':{type:'rest',title:'Descanso',details:'Descanso habitual; priorizar sueño y recuperación.'},
 '2026-11-12':{type:'gym',title:'Activación ligera · HYATLON',details:'20–25 min de movilidad y repaso técnico de zancadas, burpees, wall balls y manejo de cargas muy ligeras. Sin llegar al fallo ni provocar agujetas. Si hay fatiga, solo movilidad.',sessionInstructions:'Activación técnica sin fatiga: movilidad, unas pocas repeticiones fáciles de zancadas, burpees y wall balls. No es un entrenamiento de fuerza convencional.'},
 '2026-11-13':{type:'rest',title:'Descanso previo a la competición',details:'Descanso completo, hidratación, alimentación y sueño.'},
 '2026-11-14':{type:'run',title:'HYATLON · parejas mixtas',distanceKm:6,intensity:'carrera',details:'Taronja Pop Up HYATLON. Seis segmentos de 1 km de carrera intercalados con remo 1 km, farmer carry 300 m, goblet lunges 100 m, burpee broad jumps 80 m, 25 slam ball step box over y 100 wall balls. Reparto con tu pareja ya acordado. Ajustar esfuerzo para recuperar de cara al domingo.'},
 '2026-11-15':{type:'run',title:'Carrera 10K · según recuperación',distanceKm:10,intensity:'carrera',details:'10K al día siguiente del HYATLON. No forzar récord personal de 54:14 si hay fatiga, agujetas o molestias. Valorar el estado de las piernas antes de salir.'}
 },reason:'Semana especial: HYATLON por parejas mixtas el sábado 14 y carrera 10K el domingo 15. Se prioriza llegar fresco y evitar fuerza pesada.',context:data.profile?.objective||''};
 const result=prepareNextWeek(data,addDays(start,-7));
 return {week:start,plans:result.generated?Object.fromEntries(dates.map(d=>[d,result.data.plans[d]])):Object.fromEntries(dates.filter(d=>data.plans[d]).map(d=>[d,data.plans[d]])),reason:result.reason,context:data.profile?.objective||''};
}
