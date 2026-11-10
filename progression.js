const normalized=name=>name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
export function sameExercise(a,b){return normalized(a.name)===normalized(b.name)&&a.unit===b.unit;}
export function progressExercise(exercise,reports,date,{deload=false,nearRace=false}={}){
 const result=structuredClone(exercise);
 if(result.unit==='segundos'||result.distanceMeters!=null)return result;
 const report=[...reports].filter(r=>r.type==='gym'&&r.sport!=='hybrid'&&r.status!=='skipped'&&r.date<date&&r.exercises?.some(e=>sameExercise(e,result))).sort((a,b)=>b.date.localeCompare(a.date))[0];
 const performed=report?.exercises.find(e=>sameExercise(e,result));
 const sets=performed?.actualSets.filter(s=>s.weight!=null&&s.reps>0)||[];
 if(!sets.length)return result;
 const baseline=Math.min(...sets.map(s=>s.weight));
 result.weight=baseline;result.maxWeight=null;
 result.progressionReason='Referencia actualizada con la carga real de la sesión del '+report.date+'.';
 const target=result.maxReps??result.reps;
 const canIncrease=!deload&&!nearRace&&report.status==='completed'&&['Bien','Muy bien','Normal'].includes(report.feeling)&&report.rpe!=null&&report.rpe<=7&&performed.actualRir>=3&&performed.actualRir!=null&&target>0&&sets.length>=result.sets&&sets.every(s=>s.reps>=target)&&result.incrementKg>0&&result.incrementKg<=baseline*0.1;
 if(canIncrease){result.weight=Math.round((baseline+result.incrementKg)*100)/100;result.progressionReason+=' Todas las series alcanzaron el objetivo, con ≥3 repeticiones en reserva: subida de '+result.incrementKg+' kg según el incremento configurado.';}
 else result.progressionReason+=' Se mantiene la carga; una subida necesita repeticiones completas, margen registrado e incremento disponible configurado.';
 return result;
}
export function refreshFutureLoads(data,today){
 const next=structuredClone(data);
 for(const [date,p] of Object.entries(next.plans)){
  if(date<today||p.source!=='rules'||p.type!=='gym'||p.sport==='hybrid'||!p.exercises||next.reports.some(r=>r.date===date))continue;
  const nearRace=next.profile?.events.some(e=>e.confirmed&&e.date>=date&&e.date<=new Date(new Date(date+'T12:00:00Z').getTime()+7*86400000).toISOString().slice(0,10));
  p.exercises=p.exercises.map(e=>progressExercise(e,next.reports,date,{nearRace}));
 }
 return next;
}
