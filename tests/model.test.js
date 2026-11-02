import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialData,validateData,weekDates,defaultPlan,localDate,planFor,reportFor,correctInitialGym} from '../model.js';
test('La plantilla respeta descansos y el objetivo de 3 carreras y 2 gimnasios',()=>{
 const dates=weekDates('2026-11-08');assert.equal(dates[0],'2026-11-02');
 const types=dates.map(d=>defaultPlan(d).type);
 assert.deepEqual(types,['rest','gym','rest','run','gym','run','run']);
 assert.equal(defaultPlan(dates[6]).title,'Tirada larga · por definir');
});
test('El calendario cruza mes y año y usa la fecha de Madrid',()=>{
 assert.deepEqual(weekDates('2027-01-01'),['2026-12-28','2026-12-29','2026-12-30','2026-12-31','2027-01-01','2027-01-02','2027-01-03']);
 assert.equal(localDate(new Date('2026-11-02T23:30:00Z')),'2026-11-03');
});
test('El historial conserva los datos aportados con la fecha y duración de plancha confirmadas',()=>{
 const data=validateData(initialData());const run=reportFor(data,'2026-10-29');
 assert.equal(run.distance,5.11);assert.equal(run.heartRate,144);assert.equal(run.duration,'36:55');
 const gym=data.reports.find(r=>r.type==='gym');assert.equal(gym.date,'2026-10-27');assert.equal(gym.exercises[4].unit,'por lado');assert.equal(gym.exercises[7].actualSets[0].seconds,60);
 assert.deepEqual(validateData(JSON.parse(JSON.stringify(data))),data);
});
test('Cambiar el plan no modifica el reporte realizado',()=>{
 const data=initialData();data.plans['2026-10-29']={type:'rest',title:'Descanso',details:''};
 assert.equal(planFor(data,'2026-10-29').type,'rest');assert.equal(reportFor(data,'2026-10-29').type,'run');
});
test('Restaurar rechaza copias incompatibles, datos negativos y fechas duplicadas',()=>{
 assert.throws(()=>validateData({version:2}));
 let data=initialData();data.reports[0].distance=-2;assert.throws(()=>validateData(data));
 data=initialData();data.reports.push({...data.reports[0],id:'duplicate'});assert.throws(()=>validateData(data));
 data=initialData();data.reports[0].date='2026-02-30';assert.throws(()=>validateData(data));
 data=initialData();data.reports[1].exercises[0].actualSets[0].reps=-1;assert.throws(()=>validateData(data));
});

test('Corrige el registro inicial antiguo una sola vez y respeta ediciones',()=>{
 const old=initialData(),r=old.reports[1];r.date='';r.exercises[7].actualSets.forEach(s=>s.seconds=null);
 const corrected=validateData(correctInitialGym(old));
 assert.equal(corrected.reports[1].date,'2026-10-27');
 assert.deepEqual(corrected.reports[1].exercises[7].actualSets.map(s=>s.seconds),[60,60,60]);
 assert.equal(old.reports[1].date,'');
 corrected.reports[1].exercises[7].actualSets[0].seconds=null;
 assert.equal(correctInitialGym(corrected).reports[1].exercises[7].actualSets[0].seconds,null);
 const edited=initialData();edited.reports[1].date='2026-10-28';edited.reports[1].exercises[7].actualSets[0].seconds=45;
 const kept=correctInitialGym(edited);assert.equal(kept.reports[1].date,'2026-10-28');assert.equal(kept.reports[1].exercises[7].actualSets[0].seconds,45);
});
test('No duplica fechas ni recrea un reporte eliminado al corregir copias antiguas',()=>{
 const old=initialData();old.reports[1].date='';old.reports.push({...old.reports[0],id:'another',date:'2026-10-27'});
 assert.equal(validateData(correctInitialGym(old)).reports[1].date,'');
 old.reports=old.reports.filter(r=>r.id!=='gym-last');assert.equal(correctInitialGym(old).reports.length,2);
});
