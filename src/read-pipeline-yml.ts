// eslint-disable-next-line no-redeclare
import fetch from 'node-fetch';
import fs from 'fs';
import { join } from 'path';

type BuildDefinition = {
  process: {
    type: 1 | 2;
    yamlFilename: string;
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any, no-console
const log = (...args: any[]) => console.log('[read-pipeline-yml]', ...args);

const getYmlFileName = async (
  collectionUri: string,
  projectName: string,
  buildDefinitionId: string,
  accessToken: string
) => {
  const response = await fetch(`${collectionUri}/${encodeURIComponent(projectName)}/_apis/build/Definitions/${buildDefinitionId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    log(`Failed to get build definition from Azure: ${response.status} ${response.statusText}`);
    return null;
  }

  const { process } = await response.json() as BuildDefinition;
  return process.yamlFilename;
};

const readBuildYamlFile = (yamlFilename: string) => (
  fs.readFileSync(join(process.env.BUILD_SOURCESDIRECTORY || '', yamlFilename), 'utf8')
);

const getBuildDefinitionDetails = async () => {
  const accessToken = process.env.SYSTEM_ACCESSTOKEN;
  if (!accessToken) {
    log('No access token found');
    return null;
  }

  const buildDefinitionId = process.env.SYSTEM_DEFINITIONID;
  if (!buildDefinitionId) {
    log('No build definition ID found');
    return null;
  }

  const collectionUri = process.env.SYSTEM_COLLECTIONURI;
  if (!collectionUri) {
    log('No collection URI found');
    return null;
  }

  const projectName = process.env.SYSTEM_TEAMPROJECT;
  if (!projectName) {
    log('No project name found');
    return null;
  }

  const fileName = await getYmlFileName(collectionUri, projectName, buildDefinitionId, accessToken);
  if (!fileName) {
    log('Couldn\'t find Yml filename from Azure API');
    return null;
  }

  const yamlFile = await readBuildYamlFile(fileName);
  if (!yamlFile) {
    log('Couldn\'t read Yml file');
    return null;
  }

  return yamlFile;
};

export default () => getBuildDefinitionDetails();
