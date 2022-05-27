import fs from 'fs';
import { join } from 'path';
import ejs from 'ejs';

const azureEnvVariables = [
  'SYSTEM_COLLECTIONURI',
  'SYSTEM_COLLECTIONID',
  'SYSTEM_TEAMPROJECT',
  'BUILD_REPOSITORY_NAME',
  'BUILD_REPOSITORY_ID',
  'BUILD_SOURCEBRANCH',
  'BUILD_SOURCEBRANCHNAME',
  'AGENT_NAME',
  'BUILD_BUILDID',
  'SYSTEM_DEFINITIONID',
  'BUILD_REASON'
] as const;

const generateHtml = (args: Record<string, string | undefined>) => (
  ejs.render(
    // Using sync api since we need to support node 8, and node 8 doesn't
    // ship with promise-based fs API.
    fs.readFileSync(join(__dirname, 'build-report.ejs'), 'utf8'),
    args
  )
);

export default (cliArgs: Record<string, string | undefined>) => (
  generateHtml({
    ...cliArgs,
    ...azureEnvVariables.reduce<Record<string, string | undefined>>((acc, k) => {
      acc[k] = process.env[k];
      return acc;
    }, {}),
    BUILD_TIMESTAMP: new Date().toISOString()
  })
);
