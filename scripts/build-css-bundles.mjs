import fs from 'node:fs';
import path from 'node:path';

function bundle(directory, output, banner) {
  const files = fs.readdirSync(directory).filter((name) => name.endsWith('.css')).sort();
  const content = files.map((name) => fs.readFileSync(path.join(directory, name), 'utf8').trim()).join('\n\n');
  fs.writeFileSync(output, `${banner}\n${content}\n`);
  console.log(`Built ${output} from ${files.length} modules.`);
}

bundle(
  'app/styles/globals',
  'app/globals.css',
  '/* GENERATED BUNDLE. Edit app/styles/globals/*.css, then run npm run css:build. */',
);
bundle(
  'app/styles/design-system',
  'app/jayluxe-design-system.css',
  '/* GENERATED BUNDLE. Edit app/styles/design-system/*.css, then run npm run css:build. */',
);
