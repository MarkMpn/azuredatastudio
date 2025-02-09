/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

const cp = require('child_process');
const path = require('path');

const moduleNames = [
	'xterm',
	'xterm-addon-search',
	'xterm-addon-unicode11',
	'xterm-addon-webgl'
];

const backendOnlyModuleNames = [
	'xterm-headless',
	'xterm-addon-serialize'
];

const vscodeDir = process.argv.length >= 3 ? process.argv[2] : process.cwd();
if (path.basename(vscodeDir) !== 'vscode') {
	console.error('The cwd is not named "vscode"');
	return;
}

function getLatestModuleVersion(moduleName) {
	return new Promise((resolve, reject) => {
		cp.exec(`npm view ${moduleName} versions --json`, { cwd: vscodeDir }, (err, stdout, stderr) => {
			if (err) {
				reject(err);
			}
			const versions = JSON.parse(stdout);
			resolve(versions[versions.length - 1]);
		});
	});
}

async function update() {
	console.log('Fetching latest versions');
	const allModules = moduleNames.concat(backendOnlyModuleNames);
	const versionPromises = [];
	for (const m of allModules) {
		versionPromises.push(getLatestModuleVersion(m));
	}
	const latestVersionsArray = await Promise.all(versionPromises);
	const latestVersions = {};
	for (const [i, v] of latestVersionsArray.entries()) {
		latestVersions[allModules[i]] = v;
	}

	console.log('Detected versions:');
	for (const m of moduleNames.concat(backendOnlyModuleNames)) {
		console.log(`  ${m}@${latestVersions[m]}`);
	}

	const pkg = require(path.join(vscodeDir, 'package.json'));

	for (const m of moduleNames) {
		const moduleWithVersion = `${m}@${latestVersions[m]}`;
		if (pkg.dependencies[m] === latestVersions[m]) {
			console.log(`Skipping ${moduleWithVersion}, already up to date`);
			continue;
		}
		for (const cwd of [vscodeDir, path.join(vscodeDir, 'remote'), path.join(vscodeDir, 'remote/web')]) {
			console.log(`${path.join(cwd, 'package.json')}: Updating ${moduleWithVersion}`);
			cp.execSync(`yarn add ${moduleWithVersion}`, { cwd });
		}
	}

	for (const m of backendOnlyModuleNames) {
		const moduleWithVersion = `${m}@${latestVersions[m]}`;
		if (pkg.dependencies[m] === latestVersions[m]) {
			console.log(`Skipping ${moduleWithVersion}, already up to date`);
			continue;
		}
		for (const cwd of [vscodeDir, path.join(vscodeDir, 'remote')]) {
			console.log(`${path.join(cwd, 'package.json')}: Updating ${moduleWithVersion}`);
			cp.execSync(`yarn add ${moduleWithVersion}`, { cwd });
		}
	}
}

update();
