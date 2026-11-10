import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.clock.install({time:new Date('2026-11-10T11:00:00Z')});
 const base=process.env.RITMO_TEST_URL||'http://127.0.0.1:5173/';
 await page.goto(base+'#evolucion');await page.getByRole('heading',{name:'Evolución',exact:true}).waitFor();
 assert.match(await page.locator('#app').innerText(),/Falta una carrera reciente/);
 assert.ok(await page.locator('svg.trend-chart').count()>0);
 await page.locator('[data-view=semana]').click();
 assert.match(await page.locator('.day-card').nth(1).innerText(),/HYATLON/);
 assert.match(await page.locator('.day-card').nth(3).innerText(),/3–4 km/);
 assert.match(await page.locator('.day-card').last().innerText(),/Sagunto/);
 // A previously cached week is refreshed while its old version remains accessible.
 await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('ritmo.v1')||'null');if(d){delete d.planUpdates;d.plans['2026-11-10']={type:'gym',title:'Rutina obsoleta',details:'Versión anterior'};localStorage.setItem('ritmo.v1',JSON.stringify(d));}});
 // Persist one change through the UI first, because a fresh browser has no stored document.
 await page.locator('.day-card [data-action=workout][data-date="2026-11-10"]').click();
 assert.equal(await page.locator('.workout-exercise').count(),6);
 assert.match(await page.locator('#editor').innerText(),/250 m suaves/);
 await page.getByRole('button',{name:'Registrar sesión',exact:true}).click();
 await page.locator('[name=status]').selectOption('partial');
 await page.locator('[name=weight-1-0]').fill('15');
 await page.locator('[name=meters-1-0]').fill('30');
 await page.getByRole('button',{name:'Guardar reporte',exact:true}).click();
 await page.reload();await page.locator('.day-card [data-action=report][data-date="2026-11-10"]').click();
 assert.equal(await page.locator('[name=meters-1-0]').inputValue(),'30');
 await page.getByRole('button',{name:'Cerrar',exact:true}).click();
 await page.evaluate(()=>{
  const d=JSON.parse(localStorage.getItem('ritmo.v1'));delete d.planUpdates;
  d.plans['2026-11-12']={type:'gym',title:'Activación antigua',details:'Versión anterior'};
  localStorage.setItem('ritmo.v1',JSON.stringify(d));
 });
 await page.reload();assert.match(await page.locator('.day-card').nth(3).innerText(),/3–4 km/);
 await page.getByRole('button',{name:'Ver versiones anteriores del plan'}).click();
 assert.match(await page.locator('#editor').innerText(),/Activación antigua/);
 await page.getByRole('button',{name:'Cerrar',exact:true}).first().click();
 await page.getByRole('button',{name:'Añadir reporte'}).click();
 await page.locator('[name=date]').fill('2026-11-09');
 await page.locator('[name=type]').selectOption('run');
 await page.locator('[name=title]').fill('10K de prueba');
 await page.locator('[name=distance]').fill('10');await page.locator('[name=duration]').fill('54:14');
 await page.locator('[name=isRace]').check();await page.locator('[name=rpe]').fill('9');
 for(const [i,n] of [5,25,10,10,4].entries())await page.locator(`[name=zone-${i}]`).fill(String(n));
 await page.getByRole('button',{name:'Guardar reporte',exact:true}).click();
 await page.locator('[data-view=evolucion]').click();await page.getByRole('heading',{name:'Evolución',exact:true}).waitFor();
 assert.match(await page.locator('#app').innerText(),/Extrapolación de Riegel/);
 assert.match(await page.locator('#app').innerText(),/54:14/);
 assert.match(await page.locator('#app').innerText(),/sesiones con distribución/);
 await page.locator('#evolution-exercise').selectOption({index:1});
 await page.locator('#evolution-range').selectOption('30');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.setViewportSize({width:1440,height:1000});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.deepEqual(errors,[]);console.log('PASS: revisión del plan, archivo anterior, metros de HYATLON, Evolución, zonas y estimación de marca en móvil/escritorio.');
}finally{await browser.close();}
