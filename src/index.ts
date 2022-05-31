#!/usr/bin/env node
import fs from 'fs';
import https from 'https';
import { join } from 'path';
// eslint-disable-next-line no-redeclare
import { URL } from 'url';
// eslint-disable-next-line no-redeclare
import fetch from 'node-fetch';
import generateHtml from './generate-html';
import getCliArgs from './get-cli-args';
import readPipelineYml from './read-pipeline-yml';

const postToEngioscope = async (url: URL, html: string, noVerify = false) => {
  const httpsAgent = new https.Agent({
    rejectUnauthorized: !noVerify
  });

  const response = await fetch(`${url.origin}/api/azure-build-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/html' },
    body: html,
    ...((url.protocol === 'https:' && noVerify) ? { agent: httpsAgent } : {})
  });

  if (response.status !== 200) {
    throw new Error(`Failed to post build report to Engiscope: ${response.status} ${JSON.stringify(await response.text())}`);
  }

  // eslint-disable-next-line no-console
  console.log('Successfully posted build report to Engiscope');
};

(async () => {
  // eslint-disable-next-line no-console
  console.log(`engioscope-build-reporter@${process.env.npm_package_version}`);
  const { dryRun, noVerify, ...cliArgs } = getCliArgs();
  const { engioscopeHost } = cliArgs;

  let ymlContents: string | null = null;
  try {
    ymlContents = await readPipelineYml();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error reading yml contents', e);
  }

  const html = generateHtml({
    ...cliArgs as unknown as Record<string, string | undefined>,
    buildScript: ymlContents || undefined
  });

  fs.writeFileSync(join(process.cwd(), 'build-report.html'), html);
  if (!dryRun) await postToEngioscope(new URL(engioscopeHost), html, noVerify);
})();
