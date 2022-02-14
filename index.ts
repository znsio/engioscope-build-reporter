import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { promises as fs } from 'fs';
import { join } from 'path';
import http from 'http';

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

const mandatoryCliArgs = ['sonarHost', 'sonarProjectKey', 'engioscopeHost'] as const;

const parseCliArgs = (cliArgs: string[]) => {
  const parsed = yargs(hideBin(cliArgs))
    .options(mandatoryCliArgs.reduce((yArgsOptions, key) => ({
      ...yArgsOptions,
      [key]: { type: 'string', demandOption: true }
    }), {} as Record<typeof mandatoryCliArgs[number], {type: 'string'; demandOption: true }>))
    .example([
      ['npx engioscope-build-reporter --sonarHost=<SONAR_HOST_HTTP_URL>'
       + '--sonarProjectKey=<SONAR_PROJECT_KEY> --engioscopeHost=<ENGIOSCOPE_HOST_HTTP_URL>']
    ])
    .check(parsedArgs => {
      mandatoryCliArgs.forEach(key => {
        if (!parsedArgs[key]) {
          throw new Error(`Missing argument: ${[key]}`);
        }

        if (key === 'engioscopeHost' || key === 'sonarHost') {
          try {
            // eslint-disable-next-line no-new
            new URL(parsedArgs[key]);
          } catch (e) {
            console.error(`Malformed URL passed:- "${key}":${parsedArgs[key]}`);
            throw e;
          }
        }
      });

      return true;
    })
    .parseSync();

  return mandatoryCliArgs.map(k => [k, parsed[k]]);
};

const writeRow = (key: string, value: string) => `
  <dl>
    <dt>${key}</dt>
    <dd id="${key}">${value}</dd>
  </dl>
`;

const writeHtml = async (args: string[][]) => {
  const html = `
    <html>
      ${args.map(([k, v]) => writeRow(k, v))}
    </html>
  `;

  await fs.writeFile(join(__dirname, 'build-report.html'), html, 'utf8');
  return html;
};

const postToEngioscope = (url: URL) => (html: string) => {
  const { hostname, port } = url;

  const options = {
    hostname,
    port,
    path: '/api/azure-build-report',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const data = JSON.stringify({
    html
  });

  const req = http.request(options);
  req.on('error', error => {
    console.error('Failed to POST build report to Engioscope', error);
  });
  req.write(data);
  req.end();
};

(() => {
  const cliArgs = parseCliArgs(process.argv);
  const [, engioscopeHost] = cliArgs.find(([k]) => k === 'engioscopeHost') as string[];

  writeHtml([
    ...cliArgs,
    ...azureEnvVariables.map(k => [k, process.env[k] as string])
  ])
    .then(postToEngioscope(new URL(engioscopeHost)));
})();
