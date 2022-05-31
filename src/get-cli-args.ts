import yargs from 'yargs/yargs';
// eslint-disable-next-line no-redeclare
import { URL } from 'url';

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
    .option('dr', {
      alias: 'dry-run',
      type: 'boolean',
      description: 'Do not post to Engiscope',
      group: 'Engiscope'
    })
    .option('nv', {
      alias: 'no-verify',
      type: 'boolean',
      description: 'Do not verify the SSL certificate (not-recommended)',
      group: 'Engiscope'
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
    ),
    dryRun: parsed.dr,
    noVerify: Boolean(parsed.nv)
  } as const;
};

export default () => parseCliArgs(process.argv);
