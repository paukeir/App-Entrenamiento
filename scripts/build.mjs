import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
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
