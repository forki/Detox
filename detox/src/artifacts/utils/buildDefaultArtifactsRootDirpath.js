const path = require('path');
const getTimeStampString = require('./getTimeStampString');

function buildDefaultRootForArtifactsRootDirpath(configuration, artifactsLocation) {
  if (artifactsLocation.endsWith('/') || artifactsLocation.endsWith('\\')) {
    return artifactsLocation;
  }

  const seed = Number(process.env.DETOX_START_TIMESTAMP || String(Date.now()));
  const subdir = `${configuration}.${getTimeStampString(new Date(seed))}`;
  return path.join(artifactsLocation, subdir);
}

module.exports = buildDefaultRootForArtifactsRootDirpath;
