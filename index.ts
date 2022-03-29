#!/usr/bin/env node
import yargs from 'yargs/yargs';
import fs from 'fs';
import { join } from 'path';
// eslint-disable-next-line no-redeclare
import { URL } from 'url';
// eslint-disable-next-line no-redeclare
import fetch from 'node-fetch';
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

const ensureValidUrl = (url: string, key: string) => {
  try {
    // eslint-disable-next-line no-new
    new URL(url);
  } catch (e) {
    throw new Error(`Invalid URL for "${key}": "${url}"`);
  }
};

const parseCliArgs = (cliArgs: string[]) => {
  const parsed = yargs(cliArgs)
    .option('eh', {
      alias: 'engioscope-host',
      type: 'string',
      demandOption: true,
      description: 'Engiscope host',
      group: 'Engioscope'
    })
    .option('sh', {
      alias: 'sonar-host',
      type: 'string',
      implies: ['sp'],
      description: 'The SonarQube host that has this project',
      group: 'SonarQube'
    })
    .option('sp', {
      alias: 'sonar-project-key',
      type: 'string',
      implies: ['sh'],
      description: 'The SonarQube project key',
      group: 'SonarQube'
    })
    .example([
      ['npx engioscope-build-reporter --sonar-host=<SONAR_HOST_HTTP_URL>'
       + ' --sonar-project-key=<SONAR_PROJECT_KEY> --engioscope-host=<ENGIOSCOPE_HOST_HTTP_URL>']
    ])
    .check(parsedArgs => {
      ensureValidUrl(parsedArgs.eh, 'engioscope-host');
      if (parsedArgs.sh) ensureValidUrl(parsedArgs.sh, 'sonar-host');
      return true;
    })
    .argv;

  return {
    engioscopeHost: parsed.eh,
    ...(
      parsed.sh && parsed.sp
        ? { sonarHost: parsed.sh, sonarProjectKey: parsed.sp }
        : {}
    )
  } as const;
};

const generateHtml = async (args: Record<string, string | undefined>) => (
  ejs.render(
    // Using sync api since we need to support node 8, and node 8 doesn't
    // ship with promise-based fs API.
    fs.readFileSync(join(__dirname, 'build-report.ejs'), 'utf8'),
    args
  )
);

const postToEngioscope = async (url: URL, html: string) => {
  const response = await fetch(`${url.origin}/api/azure-build-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/html' },
    body: html
  });

  if (response.status !== 200) {
    throw new Error(`Failed to post build report to Engiscope: ${response.status} ${JSON.stringify(await response.text())}`);
  }

  // eslint-disable-next-line no-console
  console.log('Successfully posted build report to Engiscope');
};

(async () => {
  const cliArgs = parseCliArgs(process.argv);
  const { engioscopeHost } = cliArgs;

  const html = await generateHtml({
    ...cliArgs,
    ...azureEnvVariables.reduce<Record<string, string | undefined>>((acc, k) => {
      acc[k] = process.env[k];
      return acc;
    }, {}),
    BUILD_TIMESTAMP: new Date().toISOString()
  });

  fs.writeFileSync(join(process.cwd(), 'build-report.html'), html);

  await postToEngioscope(new URL(engioscopeHost), html);
})();
