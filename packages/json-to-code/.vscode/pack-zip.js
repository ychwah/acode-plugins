const path = require('path');
const fs = require('fs');
const jszip = require('jszip');

const iconFile = path.join(__dirname, '../icon.png');
const pluginJSON = path.join(__dirname, '../plugin.json');
const distFolder = path.join(__dirname, '../dist');
const assetsFolder = path.join(__dirname, '../src/assets'); // Define the assets folder
let readmeDotMd = path.join(__dirname, '../readme.md');
let changelogDotMd = path.join(__dirname, '../changelogs.md');

if (!fs.existsSync(readmeDotMd)) {
  readmeDotMd = path.join(__dirname, '../README.md');
}

// create zip file of dist folder and assets

const zip = new jszip();

zip.file('icon.png', fs.readFileSync(iconFile));
zip.file('plugin.json', fs.readFileSync(pluginJSON));
zip.file('readme.md', fs.readFileSync(readmeDotMd));
zip.file('changelogs.md', fs.readFileSync(changelogDotMd));

loadFile('', distFolder);
loadAssets('assets', assetsFolder); // Call the new function for assets

zip
  .generateNodeStream({ type: 'nodebuffer', streamFiles: true })
  .pipe(fs.createWriteStream(path.join(__dirname, '../dist.zip')))
  .on('finish', () => {
    console.log('Plugin dist.zip written.');
  });

function loadFile(root, folder) {
  const distFiles = fs.readdirSync(folder);
  distFiles.forEach((file) => {
    const stat = fs.statSync(path.join(folder, file));

    if (stat.isDirectory()) {
      zip.folder(path.join(root, file)); // Maintain folder structure in zip
      loadFile(path.join(root, file), path.join(folder, file));
      return;
    }

    if (!/LICENSE.txt/.test(file)) {
      zip.file(path.join(root, file), fs.readFileSync(path.join(folder, file)));
    }
  });
}

function loadAssets(zipRoot, folder) {
  if (!fs.existsSync(folder)) {
    console.log(`Assets folder "${folder}" not found. Skipping.`);
    return;
  }

  const assetFiles = fs.readdirSync(folder);
  assetFiles.forEach((file) => {
    const stat = fs.statSync(path.join(folder, file));
    const zipFilePath = path.join(zipRoot, file);

    if (stat.isDirectory()) {
      zip.folder(zipFilePath);
      loadAssets(zipFilePath, path.join(folder, file));
      return;
    }

    zip.file(zipFilePath, fs.readFileSync(path.join(folder, file)));
  });
}