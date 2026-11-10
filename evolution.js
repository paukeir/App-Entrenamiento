import {monday,addDays} from './model.js';
export function seconds(value){
 if(typeof value!=='string'||!/^\d+:[0-5]\d(?::[0-5]\d)?$/.test(value))return null;
 const parts=value.split(':').map(Number);return parts.length===3?parts[0]*3600+parts[1]*60+parts[2]:parts[0]*60+parts[1];
}
export function formatPace(value){if(!Number.isFinite(value)||value<=0)return '—';const n=Math.round(value);return Math.floor(n/60)+':'+String(n%60).padStart(2,'0');}
export function formatTime(value){const total=Math.round(value);if(!Number.isFinite(total)||total<=0)return '—';return total>=3600?Math.floor(total/3600)+':'+String(Math.floor(total%3600/60)).padStart(2,'0')+':'+String(total%60).padStart(2,'0'):formatPace(total);}
export function runningRows(data,cutoff=''){
 return data.reports.filter(r=>r.type==='run'&&(r.sport??r.planned?.sport)!=='hybrid'&&r.status!=='skipped'&&r.date&&r.date>=cutoff&&r.distance>0).sort((a,b)=>a.date.localeCompare(b.date)).map(r=>{
  const time=seconds(r.duration),pace=time?time/r.distance:seconds(r.pace);
  return {...r,paceSeconds:pace,durationSeconds:time,speed:pace>0?3600/pace:null};
 });
}
export function weeklyDistance(rows){const groups=new Map();for(const r of rows)groups.set(monday(r.date),(groups.get(monday(r.date))||0)+r.distance);return [...groups].sort(([a],[b])=>a.localeCompare(b)).map(([date,value])=>({date,value}));}
export function strengthSeries(data,cutoff=''){
 const groups=new Map();
 for(const r of [...data.reports].sort((a,b)=>a.date.localeCompare(b.date))){
  if(r.type!=='gym'||r.status==='skipped'||!r.date||r.date<cutoff)continue;
  for(const e of r.exercises||[]){
   if(e.unit==='segundos'||e.distanceMeters!=null)continue;
   const valid=e.actualSets.filter(s=>s.weight!=null&&s.reps>0);
   if(!valid.length)continue;
   const key=e.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase()+'|'+e.unit;
   if(!groups.has(key))groups.set(key,{key,name:e.name,unit:e.unit,points:[]});
   const max=Math.max(...valid.map(s=>s.weight));
   groups.get(key).points.push({date:r.date,value:max,reps:Math.max(...valid.filter(s=>s.weight===max).map(s=>s.reps)),sets:valid.length,volume:valid.reduce((n,s)=>n+s.weight*s.reps,0)});
  }
 }
 return [...groups.values()].sort((a,b)=>a.name.localeCompare(b.name,'es'));
}
export function predictions(data,today){
 const rows=runningRows(data,addDays(today,-90)).filter(r=>r.isRace===true&&r.status==='completed'&&r.date<=today&&r.durationSeconds>0&&r.distance>=1&&r.distance<=42.2&&r.rpe>=8);
 const reference=rows.at(-1);if(!reference)return null;
 return {reference,estimates:[5,10,21.0975].map(distance=>({distance,seconds:reference.durationSeconds*(distance/reference.distance)**1.06}))};
}
const decimal=n=>Number(n).toLocaleString('es-ES',{maximumFractionDigits:2});
function chart(points,label,esc,formatter=decimal){
 const data=points.filter(p=>Number.isFinite(p.value));if(!data.length)return '<p class="empty-state">Aún no hay datos registrados para esta gráfica.</p>';
 const values=data.map(p=>p.value),min=Math.min(...values),max=Math.max(...values),span=max-min||1;
 const positions=data.map((p,i)=>({x:data.length===1?300:55+i*500/(data.length-1),y:170-(p.value-min)/span*125,...p}));
 return `<svg class="trend-chart" viewBox="0 0 620 215" role="img" aria-label="${esc(label)}"><title>${esc(label)}</title><line x1="50" y1="175" x2="570" y2="175" stroke="#d8dfd0"/><text x="8" y="45">${esc(formatter(max))}</text><text x="8" y="171">${esc(formatter(min))}</text><polyline points="${positions.map(p=>p.x+','+p.y).join(' ')}" fill="none" stroke="#527943" stroke-width="3"/>${positions.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="5" fill="#527943"><title>${esc(p.date)}: ${esc(formatter(p.value))}</title></circle>`).join('')}<text x="50" y="205">${esc(data[0].date)}</text><text x="480" y="205">${esc(data.at(-1).date)}</text></svg>${data.length===1?'<p class="muted">Un registro disponible. La tendencia aparecerá al añadir más sesiones.</p>':''}`;
}
export function evolutionHTML(data,today,esc,{days='all',exercise=''}={}){
 const cutoff=days==='all'?'':addDays(today,-Number(days)),runs=runningRows(data,cutoff),strength=strengthSeries(data,cutoff);
 const chosen=strength.find(e=>e.key===exercise)||strength[0],total=runs.reduce((n,r)=>n+r.distance,0);
 const timed=runs.filter(r=>r.durationSeconds>0),time=timed.reduce((n,r)=>n+r.durationSeconds,0),km=timed.reduce((n,r)=>n+r.distance,0);
 const zones=runs.filter(r=>r.zoneMinutes?.length===5),zoneTotals=[0,1,2,3,4].map(i=>zones.reduce((n,r)=>n+r.zoneMinutes[i],0)),zoneTotal=zoneTotals.reduce((a,b)=>a+b,0);
 const forecast=predictions(data,today);
 return `<div class="page-title"><div><p class="eyebrow">TUS DATOS, CON PERSPECTIVA</p><h1>Evolución</h1><p>Lo realizado, separado del plan. Sin rellenar los datos que faltan.</p></div><label class="range-filter">Periodo<select id="evolution-range"><option value="all" ${days==='all'?'selected':''}>Todo el historial</option><option value="30" ${days==='30'?'selected':''}>Últimos 30 días</option><option value="90" ${days==='90'?'selected':''}>Últimos 90 días</option></select></label></div><div class="stats"><div><span>RUNNING REGISTRADO</span><strong>${decimal(total)}<small> km</small></strong></div><div><span>RITMO PONDERADO</span><strong>${formatPace(time/km)}<small> /km</small></strong></div><div><span>VELOCIDAD PONDERADA</span><strong>${time?decimal(km/time*3600):'—'}<small> km/h</small></strong></div><div><span>SESIONES RUNNING</span><strong>${runs.length}</strong></div></div><div class="evolution-grid"><section class="evolution-card"><h2>Kilómetros por semana</h2>${chart(weeklyDistance(runs),'Distancia semanal en km',esc)}</section><section class="evolution-card"><h2>Ritmo por sesión</h2><p class="muted">Más abajo significa menos tiempo por kilómetro. Compara sesiones de tipo similar.</p>${chart(runs.filter(r=>r.paceSeconds>0).map(r=>({date:r.date,value:r.paceSeconds})),'Ritmo medio en minutos por kilómetro',esc,formatPace)}</section><section class="evolution-card"><h2>Frecuencia cardiaca media</h2>${chart(runs.filter(r=>r.heartRate>0).map(r=>({date:r.date,value:r.heartRate})),'Frecuencia cardiaca media por sesión',esc)}<p class="muted">La FC media no permite conocer el tiempo en cada zona.</p></section><section class="evolution-card"><h2>Tiempo en zonas</h2>${zones.length&&zoneTotal>0?`<p class="muted">${zones.length} sesiones con distribución introducida desde el reloj. No se estima desde la FC media.</p><div class="zone-stack">${zoneTotals.map((n,i)=>n?`<span class="z${i+1}" style="flex:${n}" title="Zona ${i+1}: ${decimal(n)} min">Z${i+1}</span>`:'').join('')}</div><ul class="zone-legend">${zoneTotals.map((n,i)=>`<li>Z${i+1}: ${decimal(n)} min (${Math.round(n/zoneTotal*100)}%)</li>`).join('')}</ul><div class="table-scroll"><table><thead><tr><th>Sesión</th>${[1,2,3,4,5].map(z=>`<th>Z${z} (min)</th>`).join('')}</tr></thead><tbody>${zones.map(r=>`<tr><td>${esc(r.date)}</td>${r.zoneMinutes.map(n=>`<td>${decimal(n)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:'<p class="empty-state">Todavía no hay tiempos por zona. Puedes introducir los minutos Z1–Z5 de Garmin al registrar una carrera.</p>'}<p class="muted">Compara distribuciones solo si mantienes los mismos límites de zona en tu reloj.</p></section></div><section class="evolution-card"><div class="section-heading"><div><h2>Cargas de gimnasio</h2><p class="muted">Mejor serie de trabajo por sesión. Se conservan por separado los kg totales, por mano y por lado.</p></div>${strength.length?`<label>Ejercicio<select id="evolution-exercise">${strength.map(e=>`<option value="${esc(e.key)}" ${e.key===chosen.key?'selected':''}>${esc(e.name)} · ${esc(e.unit)}</option>`).join('')}</select></label>`:''}</div>${chosen?`${chart(chosen.points,chosen.name+' · kg '+chosen.unit,esc)}<div class="table-scroll"><table><thead><tr><th>Fecha</th><th>Mejor carga (${esc(chosen.unit)})</th><th>Repeticiones</th><th>Series registradas</th></tr></thead><tbody>${chosen.points.map(p=>`<tr><td>${esc(p.date)}</td><td>${decimal(p.value)} kg</td><td>${p.reps}</td><td>${p.sets}</td></tr>`).join('')}</tbody></table></div>`:'<p class="empty-state">Registra pesos y repeticiones para ver tu evolución.</p>'}</section><section class="evolution-card"><h2>Estimaciones de carreras</h2>${forecast?`<p>Referencia: ${esc(forecast.reference.date)} · ${decimal(forecast.reference.distance)} km en ${esc(forecast.reference.duration)}.</p><div class="forecast-grid">${forecast.estimates.map(p=>`<div><span>${decimal(p.distance)} km</span><strong>${formatTime(p.seconds)}</strong><small>Rango orientativo ${formatTime(p.seconds*.95)}–${formatTime(p.seconds*1.05)}</small></div>`).join('')}</div><p class="muted">Extrapolación de Riegel (exponente 1,06) de tu carrera reciente, no una predicción de Garmin ni una evaluación de VO₂ máx. El margen ±5% es ilustrativo, no un intervalo estadístico. Las distancias largas dependen de tu resistencia y preparación.</p>`:'<p class="empty-state">Falta una carrera reciente con distancia, tiempo, resultado completado y esfuerzo ≥8/10. Márcala como carrera al registrarla. No se usan rodajes suaves ni HYATLON para predecir marcas.</p>'}</section><section class="evolution-card"><h2>Sesiones de running</h2><div class="table-scroll"><table><thead><tr><th>Fecha</th><th>Distancia</th><th>Tiempo</th><th>Ritmo</th><th>Velocidad</th><th>FC media</th><th>Cadencia</th></tr></thead><tbody>${runs.map(r=>`<tr><td>${esc(r.date)}</td><td>${decimal(r.distance)} km</td><td>${esc(r.duration||'—')}</td><td>${formatPace(r.paceSeconds)}/km</td><td>${r.speed?decimal(r.speed):'—'} km/h</td><td>${r.heartRate??'—'}</td><td>${r.cadence??'—'}</td></tr>`).join('')||'<tr><td colspan="7">No hay sesiones registradas en este periodo.</td></tr>'}</tbody></table></div></section>`;
}
