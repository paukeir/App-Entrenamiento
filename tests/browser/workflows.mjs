import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
try {
const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
await page.goto(process.env.RITMO_TEST_URL||'http://127.0.0.1:5173/');
await page.getByRole('heading',{name:'Tu próximo paso.'}).waitFor();
await page.locator('[data-action="workout"][data-date="2026-11-03"]').click();
assert.equal(await page.locator('.workout-exercise').count(),7);
assert.match(await page.locator('dialog#editor').innerText(),/Prensa de piernas/);
assert.match(await page.locator('dialog#editor').innerText(),/8–10 kg por mano/);
await page.locator('.exercise-media summary').first().click();
await page.waitForFunction(()=>Array.from(document.querySelector('.exercise-media').querySelectorAll('img')).every(i=>i.complete&&i.naturalWidth>0));

await page.getByRole('button',{name:'Registrar sesión',exact:true}).click();
assert.equal(await page.locator('.exercise').count(),7);
assert.equal(await page.locator('[name="date"]').inputValue(),'2026-11-03');
assert.equal(await page.locator('[name="weight-0-0"]').inputValue(),'');
assert.equal(await page.locator('[name="seconds-6-0"]').inputValue(),'');
await page.locator('[name="weight-0-0"]').fill('40');
await page.locator('[name="reps-0-0"]').fill('10');
await page.locator('[name="seconds-6-0"]').fill('45');
await page.getByRole('button',{name:'Guardar reporte',exact:true}).click();
await page.reload();
await page.locator('[data-action="report"][data-date="2026-11-03"]').click();
assert.equal(await page.locator('[name="weight-0-0"]').inputValue(),'40');
assert.equal(await page.locator('[name="seconds-6-0"]').inputValue(),'45');
await page.getByRole('button',{name:'Cerrar',exact:true}).click();
await page.locator('[data-action="plan"][data-date="2026-11-03"]').click();
assert.equal(await page.locator('[name="plan-sets-0"]').inputValue(),'3');
await page.locator('[name="plan-maxweight-1"]').fill('12');
await page.getByRole('button',{name:'Guardar plan',exact:true}).click();
await page.locator('[data-view="perfil"]').click();
assert.equal(await page.locator('#profile-events .exercise').count(),3);
await page.locator('[name="confirmed-0"]').check();
await page.getByRole('button',{name:'Guardar objetivo y preferencias'}).click();
await page.locator('[data-view="semana"]').click();
assert.match(await page.locator('.day-card').last().innerText(),/5 km/);
await page.getByRole('button',{name:'Aprobar esta semana'}).click();
assert.equal(await page.getByRole('button',{name:'Aprobar esta semana'}).count(),0);
await page.locator('#account-open').click();
assert.match(await page.locator('#account-dialog').innerText(),/pendiente de activar/);
await page.getByRole('button',{name:'Entendido'}).click();
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
await page.setViewportSize({width:1440,height:1000});

assert.deepEqual(errors,[]);console.log('PASS: rutina real, fotos JPEG cargadas, registro por serie, edición de plan, perfil, carrera opcional, aprobación y vistas móvil/escritorio.');
} finally { await browser.close(); }
