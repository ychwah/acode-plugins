const path = require('path');
const fs = require('fs');
const jszip = require('jszip');

const iconFile = path.join(__dirname, '../icon.png');
const pluginJSON = path.join(__dirname, '../plugin.json');
const distFolder = path.join(__dirname, '../dist');
const srcFolder = path.join(__dirname, '../src'); // Define the source folder
let readmeDotMd = path.join(__dirname, '../readme.md');
let changelogDotMd = path.join(__dirname, '../changelogs.md');

if (!fs.existsSync(readmeDotMd)) {
  readmeDotMd = path.join(__dirname, '../README.md');
}

// create zip file of dist folder

const zip = new jszip();

zip.file('icon.png', fs.readFileSync(iconFile));
zip.file('plugin.json', fs.readFileSync(pluginJSON));
zip.file('readme.md', fs.readFileSync(readmeDotMd));
zip.file('changelogs.md', fs.readFileSync(changelogDotMd));

loadFile('', distFolder);
loadSrcFiles('src'); // Add all files from the src folder

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
      zip.folder(file);
      loadFile(path.join(root, file), path.join(folder, file));
      return;
    }

    if (!/LICENSE.txt/.test(file)) {
      zip.file(path.join(root, file), fs.readFileSync(path.join(folder, file)));
    }
  });
}

function loadSrcFiles(root) {
  const srcFiles = fs.readdirSync(srcFolder);
  srcFiles.forEach((file) => {
    const stat = fs.statSync(path.join(srcFolder, file));
    const filePathInZip = path.join(root, file);

    if (stat.isDirectory()) {
      zip.folder(filePathInZip);
      loadFile(filePathInZip, path.join(srcFolder, file)); // Reuse loadFile for subdirectories
      return;
    }

    zip.file(filePathInZip, fs.readFileSync(path.join(srcFolder, file)));
  });
}