import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
try {
const docs=new Map(),errors=[],requests=[];
async function setup(viewport){
 const context=await browser.newContext({viewport});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/app-config.js',r=>r.fulfill({contentType:'text/javascript',body:"export const cloudConfig={url:'https://test.supabase.co',publishableKey:'sb_publishable_test'};"}));
 await page.route('https://test.supabase.co/**',async route=>{
  const req=route.request(),url=new URL(req.url()),headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,PATCH,OPTIONS'};
  const send=(value,status=200)=>route.fulfill({status,contentType:'application/json',headers,body:JSON.stringify(value)});
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
  const body=req.postDataJSON();requests.push([req.method(),url.pathname]);
  if(url.pathname==='/auth/v1/token'){
   const uid=body.email==='second@example.test'?'second':'owner';
   return send({access_token:uid,refresh_token:uid+'-refresh',expires_in:3600,user:{id:uid,email:body.email}});
  }
  if(url.pathname==='/auth/v1/logout')return route.fulfill({status:204,headers});
  const user=req.headers().authorization?.replace('Bearer ','');
  if(!user)return send({},401);
  if(url.pathname==='/rest/v1/training_documents'){
   const current=docs.get(user);
   if(req.method()==='GET')return send(current?[current]:[]);
   if(body.user_id!==user)return send({},403);
   if(req.method()==='POST'){if(current)return send({},409);docs.set(user,body);return send([body]);}
   if(req.method()==='PATCH'){if(!current||Number(url.searchParams.get('revision').slice(3))!==current.revision)return send([]);docs.set(user,body);return send([body]);}
  }
  return send({},404);
 });
 await page.goto(process.env.RITMO_TEST_URL||'http://127.0.0.1:5173/');return page;
}
async function signin(page,email='owner@example.test'){
 await page.locator('#account-open').click();await page.locator('#account-form [name=email]').fill(email);await page.locator('#account-form [name=password]').fill('test-password-123');await page.getByRole('button',{name:'Entrar',exact:true}).click();try{await page.locator('#account-dialog').waitFor({state:'hidden',timeout:5000});}catch(e){console.log('AUTH',await page.locator('#account-dialog').innerText(),JSON.stringify(requests));throw e;}
}
async function sync(page){await page.locator('#account-open').click();await page.getByRole('button',{name:'Actualizar ahora'}).click();await page.waitForFunction(()=>document.querySelector('#account-status').textContent.includes('Actualizado en tus dispositivos'));}
async function edit(page,date,title){await page.locator(`.day-card [data-action=plan][data-date="${date}"]`).click();await page.locator('#session-form [name=title]').fill(title);await page.getByRole('button',{name:'Guardar plan',exact:true}).click();}
const mac=await setup({width:1440,height:1000}),iphone=await setup({width:390,height:844});
await signin(mac);await sync(mac);assert.equal(docs.size,1);
await signin(iphone);await sync(iphone);
await edit(mac,'2026-11-04','Cambio desde Mac');
await sync(mac);await sync(iphone);
assert.match(await iphone.locator('.day-card').nth(2).innerText(),/Cambio desde Mac/);
await edit(iphone,'2026-11-02','Cambio desde iPhone');await sync(iphone);await sync(mac);
assert.match(await mac.locator('.day-card').first().innerText(),/Cambio desde iPhone/);
await iphone.reload();await sync(iphone);assert.match(await iphone.locator('.day-card').nth(2).innerText(),/Cambio desde Mac/);
// Offline edit remains stored and appears on the other device after reconnecting.
await iphone.route('https://test.supabase.co/rest/**',r=>r.abort());
await edit(iphone,'2026-11-04','Editado sin conexión');
await iphone.waitForFunction(()=>document.querySelector('#account-status').textContent.includes('fetch')||document.querySelector('#account-status').textContent.includes('conectar')||document.querySelector('#account-status').textContent.includes('Sin conexión'));
assert.match(await iphone.locator('.day-card').nth(2).innerText(),/Editado sin conexión/);
await iphone.unroute('https://test.supabase.co/rest/**');await sync(iphone);await sync(mac);
assert.match(await mac.locator('.day-card').nth(2).innerText(),/Editado sin conexión/);
// Sign out then sign in with another account: the first user's local data is not uploaded.
await mac.locator('#account-open').click();await mac.getByRole('button',{name:'Cerrar sesión',exact:true}).click();
await signin(mac,'second@example.test');await sync(mac);
assert.equal(docs.size,2);assert.notEqual(docs.get('second').payload.plans['2026-11-04'].title,'Editado sin conexión');
await mac.locator('#account-open').click();await mac.getByRole('button',{name:'Cerrar sesión',exact:true}).click();
await signin(mac);await sync(mac);assert.match(await mac.locator('.day-card').nth(2).innerText(),/Editado sin conexión/);
assert.deepEqual(errors,[]);console.log('PASS: dos navegadores aislados, cambios bidireccionales, recarga, cola offline y separación de cuentas con API simulada. No prueba un proyecto Supabase real.');
} finally { await browser.close(); }
