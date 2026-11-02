import { createHash } from 'node:crypto';
import { cp, mkdir, rm, writeFile, readFile, readdir } from 'node:fs/promises';
import { cloudConfig } from '../app-config.js';
import { validConfig } from '../sync.js';

const config = {
  url: process.env.SUPABASE_URL || cloudConfig.url,
  publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || cloudConfig.publishableKey,
};
if ((config.url || config.publishableKey) && !validConfig(config)) throw Error('La configuración pública de Supabase no es válida. No utilices claves secretas o service_role.');
await rm('_site', { recursive: true, force: true });
await mkdir('_site', { recursive: true });
for (const file of ['index.html', 'style.css', 'app.js', 'model.js', 'training-seed.js', 'planner.js', 'sync.js', 'account.js', 'exercise-media.js', 'apple-touch-icon.png', 'assets']) {
  await cp(file, '_site/' + file, { recursive: true });
}
await writeFile('_site/app-config.js', 'export const cloudConfig = ' + JSON.stringify(config, null, 2) + ';\n');
console.log('Web preparada. Conexión privada: ' + (validConfig(config) ? 'configurada' : 'pendiente de configurar') + '.');

// Renew every JS module and stylesheet together, including imported modules on
// iPhone. Query versioning avoids clearing localStorage to refresh the app.
const files=(await readdir('_site')).filter(name=>/\.(js|css|html)$/.test(name)).sort();
const hash=createHash('sha256');
for(const file of files)hash.update(await readFile('_site/'+file));
const revision=hash.digest('hex').slice(0,12);
for(const file of files.filter(name=>name.endsWith('.js'))){
 const text=await readFile('_site/'+file,'utf8');
 await writeFile('_site/'+file,text.replace(/(from\s+['"])(\.\/[^'"]+\.js)(['"])/g, '$1$2?v='+revision+'$3'));
}
const html=await readFile('_site/index.html','utf8');
await writeFile('_site/index.html',html.replace(/(href="style\.css|src="app\.js)(?:\?[^"]*)?"/g,'$1?v='+revision+'"'));
