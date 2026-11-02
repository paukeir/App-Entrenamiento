export const KEY = 'ritmo.v1';
export const gym = [
  ['Jalón al pecho','1 × 12 · 20 kg',45,3,12,'total',''],
  ['Remo en máquina','1 × 12 · 10 kg',30,3,12,'total','Puedes subir según tu último reporte; pendiente de decidir.'],
  ['Press de pecho convergente','1 × 12 · 15 kg',30,3,12,'total','Puedes subir según tu último reporte; pendiente de decidir.'],
  ['Tríceps en polea con barra','1 × 12 · 10 kg',20,3,12,'total',''],
  ['Press militar en máquina','',10,3,12,'por lado',''],
  ['Elevaciones laterales','1 × 15 · 2,5 kg por lado',5,3,15,'por lado',''],
  ['Curl de bíceps en polea','1 × 12 · 10 kg',20,3,12,'total',''],
  ['Plancha en el suelo','',null,3,null,'segundos','Referencia confirmada: 3 × 60 segundos.']
].map(([name,warmup,weight,sets,reps,unit,note])=>({name,warmup,weight,sets,reps,unit,note}));
export function localDate(date=new Date()) { return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(date); }
export function addDays(iso,days){const d=new Date(iso+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
export function monday(iso){const day=new Date(iso+'T12:00:00Z').getUTCDay();return addDays(iso,-((day+6)%7));}
export function weekDates(iso){const start=monday(iso);return Array.from({length:7},(_,i)=>addDays(start,i));}
export function initialData(){return {version:1,plans:{},reports:[
  {id:'run-oct29',date:'2026-10-29',type:'run',title:'Vuelta tras la media maratón',status:'completed',distance:5.11,duration:'36:55',pace:'7:13',heartRate:144,calories:383,relativeEffort:37,notes:'Primer entrenamiento reportado tras la media maratón. Datos transcritos de la captura de Strava. Año asumido: 2026.',feeling:'',rpe:null,cadence:null,splits:'',reason:''},
  {id:'gym-last',date:'2026-10-27',type:'gym',title:'Última sesión de gimnasio',status:'completed',notes:'Sesión del 27/10. Sensaciones no indicadas. Remo y press de pecho: «puedo subirle». Plancha confirmada: 3×60 segundos.',feeling:'',rpe:null,reason:'',exercises:gym.map(e=>({...e,actualWarmup:e.warmup,actualSets:Array.from({length:e.sets},()=>({weight:e.weight,reps:e.reps,seconds:e.unit==='segundos'?60:null}))}))}
]};}
// Apply the confirmed correction once, only to the original seeded report.
// Existing dates, entered seconds, notes and other reports remain intact.
export function correctInitialGym(data){
  if(data.corrections?.includes('gym-2026-10-27'))return data;
  const next=structuredClone(data),report=next.reports.find(r=>r.id==='gym-last'&&r.type==='gym');
  if(report){
    if(!report.date&&!next.reports.some(r=>r.id!==report.id&&r.date==='2026-10-27'))report.date='2026-10-27';
    const plank=report.exercises?.find(e=>e.name==='Plancha en el suelo'&&e.unit==='segundos');
    if(plank){
      for(const set of plank.actualSets)if(set.seconds==null)set.seconds=60;
      if(plank.note==='Duración pendiente: el reporte original dice «3×60 mins». Confirmar antes de usar.')plank.note='Referencia confirmada: 3 × 60 segundos.';
    }
    if(report.notes==='Fecha y sensaciones no indicadas. Remo y press de pecho: «puedo subirle». Plancha: duración pendiente de confirmar.')report.notes='Sesión del 27/10. Sensaciones no indicadas. Remo y press de pecho: «puedo subirle». Plancha confirmada: 3×60 segundos.';
  }
  next.corrections=[...(next.corrections||[]),'gym-2026-10-27'];
  return next;
}
export function defaultPlan(date){const day=new Date(date+'T12:00:00Z').getUTCDay();return ({1:{type:'rest',title:'Descanso',details:'Trabajo e italiano. Un día para recuperar.'},2:{type:'gym',title:'Fuerza · gimnasio',details:'Plantilla basada en tu última sesión. Revisa las cargas antes de entrenar.'},3:{type:'rest',title:'Descanso',details:'Trabajo e italiano. Un día para recuperar.'},4:{type:'run',title:'Running · por definir',details:'Define distancia, intensidad y objetivo de esta semana.'},5:{type:'gym',title:'Fuerza · gimnasio',details:'Distribución orientativa. Puedes mover esta sesión.'},6:{type:'run',title:'Running · por definir',details:'Define distancia, intensidad y objetivo de esta semana.'},0:{type:'run',title:'Tirada larga · por definir',details:'Domingo habitual. Ajusta la distancia según recuperación y planificación.'}})[day];}
export function planFor(data,date){return data.plans[date]||defaultPlan(date);}
export function reportFor(data,date){return data.reports.find(r=>r.date===date);}
export function validateData(data){
  if(!data||data.version!==1||!data.plans||typeof data.plans!=='object'||Array.isArray(data.plans)||!Array.isArray(data.reports))throw Error('La copia no tiene un formato compatible.');
  if(data.corrections!=null&&(!Array.isArray(data.corrections)||data.corrections.some(x=>typeof x!=='string')))throw Error('Correcciones no válidas.');
  const dateOk=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&!isNaN(Date.parse(d+'T12:00:00Z'))&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;
  const types=['run','gym','rest'];
  for(const [date,p] of Object.entries(data.plans))if(!dateOk(date)||!p||!types.includes(p.type)||typeof p.title!=='string'||typeof p.details!=='string')throw Error('Hay un día del plan no válido.');
  const ids=new Set(),dates=new Set();
  for(const r of data.reports){
    if(!r||typeof r.id!=='string'||ids.has(r.id)||!(r.date===''||dateOk(r.date))||!types.includes(r.type)||typeof r.title!=='string'||!['completed','partial','skipped'].includes(r.status))throw Error('Hay un reporte no válido.');
    ids.add(r.id);if(r.date){if(dates.has(r.date))throw Error('Hay reportes duplicados para un día.');dates.add(r.date);}
    for(const k of ['notes','feeling','reason','splits','duration','pace'])if(r[k]!=null&&typeof r[k]!=='string')throw Error('Texto de reporte no válido.');
    for(const k of ['distance','heartRate','calories','relativeEffort','rpe','cadence'])if(r[k]!=null&&(!Number.isFinite(r[k])||r[k]<0||(k==='rpe'&&r[k]>10)))throw Error('Métrica no válida.');
    if(r.exercises!=null){if(!Array.isArray(r.exercises))throw Error('Ejercicios no válidos.');for(const e of r.exercises){if(!e||typeof e.name!=='string'||typeof e.warmup!=='string'||typeof e.unit!=='string'||typeof e.note!=='string'||!Array.isArray(e.actualSets)||typeof e.actualWarmup!=='string')throw Error('Ejercicio no válido.');for(const s of e.actualSets)for(const k of ['weight','reps','seconds'])if(s[k]!=null&&(!Number.isFinite(s[k])||s[k]<0))throw Error('Serie no válida.');}}
  }
  for(const r of data.reports)for(const e of r.exercises||[]){
    for(const key of ['weight','sets','reps'])if(e[key]!=null&&(!Number.isFinite(e[key])||e[key]<0))throw Error('Referencia de ejercicio no válida.');
    if(!Number.isInteger(e.sets)||e.sets<1||e.sets>100||e.actualSets.length>100)throw Error('Número de series no válido.');
  }
  return data;
}

export const firstWeek={
'2026-11-02':{type:'rest',title:'Descanso',details:'Trabajo e italiano. Recuperación.'},
'2026-11-03':{type:'gym',title:'Fuerza completa · énfasis piernas',details:'8 min de calentamiento; prensa 1×12 + 3×10 moderada; peso muerto rumano 2×10 con 8–10 kg por mano si técnica correcta; gemelos 3×15; jalón al pecho 1×12 20 kg + 3×10–12 40–45 kg; press pecho 1×12 15 kg + 3×12 30–35 kg; remo 3×12 30–35 kg; plancha 2×45–60 s. Deja 3 repeticiones en reserva; sin fallo.'},
'2026-11-04':{type:'rest',title:'Descanso',details:'Trabajo e italiano.'},
'2026-11-05':{type:'run',title:'Rodaje suave · 6–7 km',details:'6–7 km cómodos y 4 progresivos de 15–20 segundos, con recuperación completa.'},
'2026-11-06':{type:'gym',title:'Tren superior y core',details:'Gimnasio moderado, sin trabajo pesado de piernas antes de la posible 5K.'},
'2026-11-07':{type:'rest',title:'Descanso previo a la carrera',details:'Recuperación; preparar la carrera si finalmente participas.'},
'2026-11-08':{type:'run',title:'5K opcional · controlada',details:'Solo si confirmas participación. Calienta 10–15 min; corre de forma controlada, sin buscar récord. Si no hay carrera, rodaje suave de 7–9 km.'}
};
const goalNotes='Objetivos: 10K 15/11/2026, mejorar 54:14 si recuperado; media maratón Sevilla 13/12/2026, mejorar 1:59:18. Lunes y miércoles descanso.';
export function suggestWeek(data,iso){
 const dates=weekDates(iso),start=dates[0];
 const reports=data.reports.filter(r=>r.date>=addDays(start,-7)&&r.date<start);
 const fatigue=reports.some(r=>r.status==='partial'||r.status==='skipped'||(r.rpe!=null&&r.rpe>=8)||['Cansado','Molestias'].includes(r.feeling));
 const isFirst=start==='2026-11-02';
 const isRace10=start==='2026-11-09';
 const isSevilla=start==='2026-12-07';
 const isPeak=start>='2026-11-16'&&start<='2026-11-23';
 const distance=fatigue?'8–11':isPeak?'14–17':'10–13';
 const gymText='Fuerza moderada: piernas, jalón al pecho, remo, press de pecho y core. Ajusta cargas con los últimos reportes; 2–3 repeticiones en reserva.';
 const base=[
 {type:'rest',title:'Descanso',details:'Trabajo e italiano.'},
 {type:'gym',title:'Fuerza · gimnasio',details:gymText},
 {type:'rest',title:'Descanso',details:'Trabajo e italiano.'},
 {type:'run',title:'Rodaje suave · 6–8 km',details:'Ritmo conversacional. Ajustar según sensaciones.'},
 {type:'gym',title:'Gimnasio · tren superior y core',details:'Cargas moderadas, evita el fallo y las agujetas.'},
 {type:'run',title:'Rodaje corto · 4–6 km',details:'Suave; opcional si notas fatiga.'},
 {type:'run',title:'Tirada larga · '+distance+' km',details:'Ritmo cómodo. No aumentar distancia si hay fatiga o molestias.'}
 ];
 if(isRace10){base[3]={type:'run',title:'Activación 10K · 5–6 km',details:'2 km suaves, 2 km a ritmo 10K previsto, 1–2 km suaves.'};base[4]={type:'rest',title:'Descanso',details:'Recuperación para la 10K.'};base[5]={type:'rest',title:'Descanso',details:'Recuperación para la carrera.'};base[6]={type:'run',title:'Carrera 10K · intentar marca',details:'Récord 54:14. Salir controlado (~5:28/km) y ajustar según sensaciones; no comprometer Sevilla.'};}
 if(isSevilla){base[1]={type:'run',title:'Rodaje suave · 5–6 km',details:'Semana de descarga; ritmo cómodo.'};base[3]={type:'run',title:'Activación · 4–5 km',details:'Muy suave, con 3 progresivos cortos.'};base[4]={type:'rest',title:'Descanso',details:'Sin gimnasio exigente.'};base[5]={type:'rest',title:'Descanso',details:'Preparar carrera.'};base[6]={type:'run',title:'Media Maratón de Sevilla',details:'Objetivo orientativo 1:58, salida controlada y alimentación planificada.'};}
 const plans=Object.fromEntries(dates.map((d,i)=>[d,isFirst?firstWeek[d]:base[i]]));
 return {week:start,plans,reason:isFirst?'Primera semana acordada. La 5K del domingo es opcional.':fatigue?'Carga conservadora por fatiga, sesión parcial o no realizada en los últimos siete días.':'Propuesta basada en calendario de carreras y reportes de la semana anterior. Revisar antes de aprobar.',context:goalNotes};
}
