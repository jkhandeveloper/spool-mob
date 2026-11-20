const { spawnSync } = require('node:child_process');
const path = require('node:path');

// npm supplies its CLI path, allowing arguments to stay out of a Windows shell.
const npmCli = process.env.npm_execpath;
const args = process.argv.slice(2);
const usage = 'Usage: npm.cmd run ios:simulator:start -- --build-id <Expo build ID>';

if (args.includes('--help')) {
  console.log(usage);
  console.log('Runs Spool on a remote iOS Simulator with a browser preview. Requires Expo Simulators access.');
  process.exit(0);
}

if (args.length !== 2 || args[0] !== '--build-id' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(args[1])) {
  console.error(usage);
  console.error('Use the ID from ios:simulator:build. A device IPA cannot run in this simulator.');
  process.exit(1);
}
if (!npmCli) {
  console.error('Start this script using npm run so it can locate the npm CLI.');
  process.exit(1);
}

function eas(commandArgs, capture = false) {
  const result = spawnSync(process.execPath, [npmCli, 'exec', '--yes', '--package=eas-cli@latest', '--', 'eas', ...commandArgs], {
    cwd: path.resolve(__dirname, '..'),
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
  return result.stdout;
}

let availability;
try {
  availability = JSON.parse(eas(['simulator:availability', '--json'], true));
} catch {
  console.error('Could not read Expo Simulators availability. No session was started.');
  process.exit(1);
}
if (availability?.available !== true) {
  console.error('Expo Simulators is unavailable for this account. No session was started.');
  process.exit(1);
}

console.log('Starting a remote iOS Simulator for up to 30 minutes (10 minutes idle).');
console.log('This uses your Expo account allowance. Stop it with npm.cmd run ios:simulator:stop.');
eas([
  'simulator:start', '--platform', 'ios', '--type', 'web-preview-only',
  '--build-id', args[1], '--name', 'Spool iOS review',
  '--max-duration-minutes', '30', '--max-idle-time-minutes', '10', '--non-interactive',
]);
console.log('Open the browser preview URL above to test Spool from Windows.');
