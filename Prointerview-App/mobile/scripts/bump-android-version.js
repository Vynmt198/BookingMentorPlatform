/**
 * Tăng version trước mỗi lần build APK/AAB mới.
 * Usage: node scripts/bump-android-version.js [patch|minor|major]
 */
const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, '..', 'app.json');
const pkgJsonPath = path.join(__dirname, '..', 'package.json');
const bump = (process.argv[2] || 'patch').toLowerCase();

const app = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

const parts = String(app.expo.version || '1.0.0')
  .split('.')
  .map((n) => parseInt(n, 10) || 0);
while (parts.length < 3) parts.push(0);

if (bump === 'major') {
  parts[0] += 1;
  parts[1] = 0;
  parts[2] = 0;
} else if (bump === 'minor') {
  parts[1] += 1;
  parts[2] = 0;
} else {
  parts[2] += 1;
}

const nextVersion = parts.join('.');
app.expo.version = nextVersion;
pkg.version = nextVersion;

if (!app.expo.android) app.expo.android = {};
const prevCode = Number(app.expo.android.versionCode || 0);
app.expo.android.versionCode = prevCode + 1;

if (!app.expo.ios) app.expo.ios = {};
const prevIos = String(app.expo.ios.buildNumber || '0');
app.expo.ios.buildNumber = String(parseInt(prevIos, 10) + 1);

fs.writeFileSync(appJsonPath, `${JSON.stringify(app, null, 2)}\n`);
fs.writeFileSync(pkgJsonPath, `${JSON.stringify(pkg, null, 2)}\n`);

console.log(`[bump] version ${nextVersion}, android.versionCode ${app.expo.android.versionCode}, ios.buildNumber ${app.expo.ios.buildNumber}`);
