#!/usr/bin/env node
import fs from 'fs';
import { join } from 'path';
// eslint-disable-next-line no-redeclare
import { URL } from 'url';
// eslint-disable-next-line no-redeclare
import fetch from 'node-fetch';
import generateHtml from './generate-html';
import getCliArgs from './get-cli-args';

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
  const { dryRun, ...cliArgs } = getCliArgs();
  const { engioscopeHost } = cliArgs;

  const html = generateHtml(cliArgs as unknown as Record<string, string | undefined>);

  fs.writeFileSync(join(process.cwd(), 'build-report.html'), html);
  if (!dryRun) await postToEngioscope(new URL(engioscopeHost), html);
})();
