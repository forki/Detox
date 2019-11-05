const _ = require('lodash');
const path = require('path');
const DetoxConfigError = require('./errors/DetoxConfigError');
const uuid = require('./utils/uuid');
const argparse = require('./utils/argparse');
const getPort = require('get-port');
const buildDefaultArtifactsRootDirpath = require('./artifacts/utils/buildDefaultArtifactsRootDirpath');

async function defaultSession() {
  return {
    server: `ws://localhost:${await getPort()}`,
    sessionId: uuid.UUID()
  };
}

function validateSession(session) {
  if (!session) {
    throw new Error(`No session configuration was found, pass settings under the session property`);
  }

  if (!session.server) {
    throw new Error(`session.server property is missing, should hold the server address`);
  }

  if (!session.sessionId) {
    throw new Error(`session.sessionId property is missing, should hold the server session id`);
  }
}

function throwOnEmptyDevice() {
  throw new DetoxConfigError(`'device' property is empty, should hold the device query to run on (e.g. { "type": "iPhone 11 Pro" }, { "avdName": "Nexus_5X_API_29" })`);
}

function throwOnEmptyType() {
  throw new DetoxConfigError(`'type' property is missing, should hold the device type to test on (e.g. "ios.simulator" or "android.emulator")`);
}

function throwOnEmptyBinaryPath() {
  throw new DetoxConfigError(`'binaryPath' property is missing, should hold the app binary path`);
}

function composeDeviceConfig({ configurations }) {
  const configurationName = argparse.getArgValue('configuration');
  const deviceOverride = argparse.getArgValue('device-name');

  const deviceConfig = (!configurationName && _.size(configurations) === 1)
    ? _.values(configurations)[0]
    : configurations[configurationName];

  if (!deviceConfig) {
    throw new Error(`Cannot determine which configuration to use. use --configuration to choose one of the following:
                        ${Object.keys(configurations)}`);
  }

  if (!deviceConfig.type) {
    throwOnEmptyType();
  }

  deviceConfig.device = deviceOverride || deviceConfig.device || deviceConfig.name;
  delete deviceConfig.name;

  if (_.isEmpty(deviceConfig.device)) {
    throwOnEmptyDevice();
  }

  return deviceConfig;
}

function getArtifactsCliConfig() {
  return {
    artifactsLocation: argparse.getArgValue('artifacts-location'),
    recordLogs: argparse.getArgValue('record-logs'),
    takeScreenshots: argparse.getArgValue('take-screenshots'),
    recordVideos: argparse.getArgValue('record-videos'),
    recordPerformance: argparse.getArgValue('record-performance'),
  };
}

function resolveModuleFromPath(modulePath) {
  return path.isAbsolute(modulePath)
    ? require(modulePath)
    : require(path.join(process.cwd(), modulePath));
}

function composeArtifactsConfig({
  configurationName,
  deviceConfig,
  detoxConfig,
  cliConfig = getArtifactsCliConfig()
}) {
  const artifactsConfig = _.defaultsDeep(
      {
        artifactsLocation: cliConfig.artifactsLocation,
        plugins: {
          log: { lifecycle: cliConfig.recordLogs },
          screenshot: { lifecycle: cliConfig.takeScreenshots },
          video: { lifecycle: cliConfig.recordVideos },
          instruments: { lifecycle: cliConfig.recordPerformance },
        },
      },
      deviceConfig.artifacts,
      detoxConfig.artifacts,
      {
        artifactsLocation: 'artifacts',
        pathBuilder: null,
        plugins: {
          log: { lifecycle: 'none' },
          screenshot: { lifecycle: 'manual' },
          video: { lifecycle: 'none' },
          instruments: { lifecycle: 'none' },
        },
      }
  );

  artifactsConfig.artifactsLocation = buildDefaultArtifactsRootDirpath(
    configurationName,
    artifactsConfig.artifactsLocation
  );

  if (typeof artifactsConfig.pathBuilder === 'string') {
    artifactsConfig.pathBuilder = resolveModuleFromPath(artifactsConfig.pathBuilder);
  }

  return artifactsConfig;
}

module.exports = {
  defaultSession,
  validateSession,
  throwOnEmptyDevice,
  throwOnEmptyType,
  throwOnEmptyBinaryPath,
  composeDeviceConfig,
  composeArtifactsConfig,
};
