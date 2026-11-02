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
