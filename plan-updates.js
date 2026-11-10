// Dated, explicit changes agreed with the owner, separate from training reports.
const e=(name,sets,reps,note,extra={})=>({name,sets,reps,weight:null,unit:'total',warmup:'',note,...extra});
export const planRevision='week-2026-11-09-r2';
export const revisedWeek={
 '2026-11-09':{type:'rest',title:'Descanso',details:'Recuperación.'},
 '2026-11-10':{type:'gym',sport:'hybrid',title:'HYATLON · familiarización y transición',details:'Sesión técnica, sin fallo ni fatiga importante antes del fin de semana. Calentamiento: 6–8 min de trote suave y movilidad, según el plan anterior. Remo: 500 m, 250 m suaves + 250 m a ritmo controlado. Descansa 60–90 s entre tandas de farmer carry. Las cargas quedan a elección según técnica y sensaciones; no se fuerza el peso de competición.',exercises:[
  e('Remo · ergómetro',1,null,'Familiarización: 250 m suaves + 250 m a ritmo controlado.',{distanceMeters:500,kind:'ergometer'}),
  e('Farmer carry',3,null,'Primera tanda ligera; segunda y tercera acercándote progresivamente a la carga de competición solo si la manejas bien. Descansa 60–90 s.',{distanceMeters:30,unit:'por mano'}),
  e('Goblet lunges',2,8,'8 pasos por tanda. Primera ligera y segunda moderada; no fuerces 20 kg si no estás habituado.',{lowerBody:true}),
  e('Transición a carrera',1,null,'800 m suaves inmediatamente después de la última tanda de zancadas.',{distanceMeters:800,kind:'run'}),
  e('Wall balls',2,8,'Técnica, profundidad de sentadilla y coordinación del lanzamiento.'),
  e('Vuelta a la calma',1,null,'Caminar y movilidad suave durante 5 minutos.',{unit:'segundos',durationSeconds:300}),
 ]},
 '2026-11-11':{type:'rest',title:'Descanso',details:'Descanso habitual, sueño y recuperación.'},
 '2026-11-12':{type:'run',title:'Activación precompetición · running suave',distanceKm:3,maxDistanceKm:4,intensity:'suave',details:'Objetivo: activar. RPE 2–3/10.\n5 min caminando y movilidad dinámica de tobillos, caderas y rodillas.\n3–4 km de carrera totalmente conversacional, sin perseguir ritmo ni pulsaciones.\n3 progresivos de 15 s solo si las piernas están frescas, de forma gradual y sin esprintar. Recupera caminando 60–90 s.\nTermina con 3–5 min caminando y movilidad suave.'},
 '2026-11-13':{type:'rest',title:'Descanso previo a la competición',details:'Descanso, hidratación, alimentación y sueño. Sin añadir fuerza pesada.'},
 '2026-11-14':{type:'run',sport:'hybrid',distanceKm:6,intensity:'carrera',title:'HYATLON',details:'Competición confirmada: HYATLON por parejas mixtas. Según el plan previo, seis tramos de 1 km de carrera intercalados con remo, farmer carry, goblet lunges, burpee broad jumps, slam ball step box over y wall balls. Mantén el reparto acordado con tu pareja. Registra las distancias y tiempos reales; no se asigna un ritmo objetivo de running a una prueba híbrida. Conserva margen para recuperar de cara al domingo.'},
 '2026-11-15':{type:'run',intensity:'carrera',distanceKm:10,title:'10K · Sagunto',details:'10 km el día después del HYATLON. Decide el esfuerzo según recuperación, fatiga y sensaciones del sábado; no se fija un intento de marca automático.'},
};
export function applyPlanUpdates(data){
 const next=structuredClone(data);next.planUpdates??={};
 if(next.planUpdates[planRevision])return next;
 next.planArchive??={};next.planArchive[planRevision]??={};
 for(const [date,plan] of Object.entries(revisedWeek)){
  // A completed or partial workout is history, not a plan waiting to change.
  if(next.reports.some(r=>r.date===date))continue;
  if(next.plans[date])next.planArchive[planRevision][date]=structuredClone(next.plans[date]);
  next.plans[date]={...structuredClone(plan),source:'agreed',revision:planRevision};
 }
 if(next.drafts?.['2026-11-09']){
  next.planArchive[planRevision].draft=structuredClone(next.drafts['2026-11-09']);
  delete next.drafts['2026-11-09'];
 }
 const events=next.profile?.events;
 if(events){
  const race=events.find(e=>e.date==='2026-11-15');
  if(race)Object.assign(race,{name:'10K · Sagunto',distanceKm:10,confirmed:true});
  else events.push({date:'2026-11-15',name:'10K · Sagunto',distanceKm:10,confirmed:true});
  if(!events.some(e=>e.date==='2026-11-14'))events.push({date:'2026-11-14',name:'HYATLON',sport:'hybrid',distanceKm:6,confirmed:true});
 }
 next.planUpdates[planRevision]=true;
 return next;
}
