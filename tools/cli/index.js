#!/usr/bin/env node

require('dotenv').config();
const { program } = require('commander');
const { listInstances, startInstance, sendRpcCommand, instanceStatus, instanceStop, listDevices, installApk, launchApp } = require('./commands/instanceCommands');

program
    .name('cp-cli')
    .description('CLI to manage the Android Virtual OS Control Plane');

program
    .command('instances-list')
    .description('List all registered emulator instances')
    .action(listInstances);

program
    .command('instance-start')
    .description('Start a new emulator instance')
    .argument('<avdName>', 'The name of the AVD to start (e.g., Pixel8_API34)')
    .option('--headless', 'Start without window/audio and snapshot (CI-friendly)')
    .option('--gpu <mode>', 'GPU mode (e.g., host, swiftshader_indirect)', 'host')
    .option('--no-snapshot', 'Disable loading/saving snapshots')
    .option('--read-only', 'Start AVD in read-only mode')
    .option('--extra-arg <arg...>', 'Additional emulator args to forward')
    .action((avdName, options) => startInstance(avdName, options));

program
    .command('instance-status')
    .description('Get status and boot readiness for an instance')
    .argument('<instanceId>', 'The ID of the target instance')
    .action(instanceStatus);

program
    .command('instance-stop')
    .description('Stop a running emulator instance')
    .argument('<instanceId>', 'The ID of the target instance')
    .action(instanceStop);

program
    .command('devices')
    .description('List connected ADB devices via Host Adapter')
    .action(listDevices);

program
    .command('apk-install')
    .description('Install an APK on an instance')
    .argument('<instanceId>', 'The ID of the target instance')
    .argument('<apkPath>', 'Path to the APK file')
    .action(installApk);

program
    .command('app-launch')
    .description('Launch an app activity on an instance')
    .argument('<instanceId>', 'The ID of the target instance')
    .argument('<packageName>', 'Android package name')
    .argument('<activityName>', 'Activity name, e.g. .MainActivity')
    .action(launchApp);

program
    .command('rpc')
    .description('Send a generic RPC command to an instance')
    .argument('<instanceId>', 'The ID of the target instance')
    .argument('<command>', 'The command to send (e.g., "ui/find", "ui/click")')
    .option('-p, --payload <payload>', 'JSON payload for the command (optional)')
    .action((instanceId, command, options) => {
        sendRpcCommand(instanceId, command, options.payload);
    });

program.parse(process.argv);
