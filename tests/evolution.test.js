import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialData,upgradeData,validateData} from '../model.js';
import {applyPlanUpdates,planRevision} from '../plan-updates.js';
import {progressExercise,refreshFutureLoads} from '../progression.js';
import {runningRows,strengthSeries,predictions,seconds,weeklyDistance} from '../evolution.js';
const report=(extra={})=>({id:'test',date:'2026-11-09',type:'run',title:'Test',status:'completed',distance:10,duration:'54:14',...extra});
test('La revisión sustituye planes obsoletos una vez, guarda copia y conserva los realizados',()=>{
 const d=upgradeData(initialData());delete d.planUpdates;d.plans['2026-11-10']={type:'gym',title:'Antigua rutina',details:'Antes'};
 const revised=applyPlanUpdates(d);assert.equal(revised.plans['2026-11-10'].sport,'hybrid');assert.equal(revised.planArchive[planRevision]['2026-11-10'].title,'Antigua rutina');
 assert.equal(revised.plans['2026-11-12'].distanceKm,3);assert.equal(revised.plans['2026-11-12'].maxDistanceKm,4);assert.equal(revised.plans['2026-11-13'].type,'rest');assert.equal(revised.plans['2026-11-15'].title,'10K · Sagunto');
 revised.plans['2026-11-10'].title='Mi ajuste posterior';assert.equal(applyPlanUpdates(revised).plans['2026-11-10'].title,'Mi ajuste posterior');
 d.reports.push(report({date:'2026-11-10',type:'gym'}));assert.equal(applyPlanUpdates(d).plans['2026-11-10'].title,'Antigua rutina');
 assert.equal(d.plans['2026-11-10'].title,'Antigua rutina');validateData(revised);
});
test('La evolución de running usa tiempo/distancia, conserva ausencias y excluye híbridos y saltados',()=>{
 const d={reports:[report(),report({id:'h',sport:'hybrid'}),report({id:'s',status:'skipped'}),report({id:'n',date:'2026-11-10',duration:'',pace:''}),report({id:'u',date:''})]};
 const rows=runningRows(d);assert.equal(rows.length,2);assert.equal(rows[0].paceSeconds,325.4);assert.equal(rows[1].speed,null);assert.equal(weeklyDistance(rows)[0].value,20);assert.equal(seconds('1:02:03'),3723);assert.equal(seconds('2:99'),null);
});
test('Las series de fuerza mantienen separado el peso por mano y total y excluyen series vacías',()=>{
 const ex=(unit)=>({name:'Press',unit,actualSets:[{weight:20,reps:12},{weight:null,reps:null},{weight:25,reps:8}]});
 const d={reports:[report({type:'gym',exercises:[ex('por mano'),ex('total')]})]};
 const groups=strengthSeries(d);assert.equal(groups.length,2);assert.equal(groups[0].points[0].value,25);assert.equal(groups[0].points[0].reps,8);assert.equal(groups[0].points[0].sets,2);
});
test('Las estimaciones requieren una carrera reciente y esfuerzo alto; nunca usan HYATLON ni rodajes',()=>{
 const d={reports:[report()]};assert.equal(predictions(d,'2026-11-10'),null);
 d.reports[0].isRace=true;d.reports[0].rpe=9;const p=predictions(d,'2026-11-10');assert.equal(p.estimates[1].seconds,3254);
 d.reports[0].sport='hybrid';assert.equal(predictions(d,'2026-11-10'),null);
 d.reports[0].sport='run';assert.equal(predictions(d,'2027-03-10'),null);
});
test('Las zonas requieren cinco valores medidos y no pueden superar la duración',()=>{
 const d=initialData();d.reports.push(report({zoneMinutes:[5,10,null,10,0]}));assert.throws(()=>validateData(d));
 d.reports.at(-1).zoneMinutes=[5,20,10,10,0];validateData(d);
 d.reports.at(-1).zoneMinutes=[20,20,20,20,20];assert.throws(()=>validateData(d));
});
const exercise={name:'Press',unit:'total',sets:3,reps:12,weight:30,warmup:'',note:'',incrementKg:2.5};
const gymReport={date:'2026-11-08',type:'gym',status:'completed',feeling:'Bien',rpe:6,exercises:[{...exercise,actualRir:3,actualSets:Array.from({length:3},()=>({weight:32.5,reps:12}))}]};
test('Las cargas parten de lo realizado y solo suben con margen e incremento configurado',()=>{
 assert.equal(progressExercise(exercise,[gymReport],'2026-11-10').weight,35);
 assert.equal(progressExercise({...exercise,incrementKg:null},[gymReport],'2026-11-10').weight,32.5);
 assert.equal(progressExercise(exercise,[gymReport],'2026-11-10',{nearRace:true}).weight,32.5);
 const bad=structuredClone(gymReport);bad.exercises[0].actualSets[2].reps=8;assert.equal(progressExercise(exercise,[bad],'2026-11-10').weight,32.5);
 bad.exercises[0].actualRir=null;assert.equal(progressExercise(exercise,[bad],'2026-11-10').weight,32.5);
});
test('Recalcular una propuesta no compone subidas ni cambia sesiones manuales',()=>{
 const d={profile:{events:[]},reports:[gymReport],plans:{'2026-11-11':{source:'rules',type:'gym',exercises:[exercise]},'2026-11-12':{source:'manual',type:'gym',exercises:[exercise]}}};
 const next=refreshFutureLoads(d,'2026-11-10');assert.equal(next.plans['2026-11-11'].exercises[0].weight,35);assert.equal(next.plans['2026-11-12'].exercises[0].weight,30);
 assert.equal(refreshFutureLoads(next,'2026-11-10').plans['2026-11-11'].exercises[0].weight,35);
});
