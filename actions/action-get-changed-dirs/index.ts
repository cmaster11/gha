/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import { inspect } from 'node:util';
import 'zx/globals';
import { getChangedDirectories } from '../../lib/get-changed-directories.js';
import { getInput, setOutput } from '@actions/core';
import Joi from 'joi';

$.verbose = true;

const baseSHA = getInput('base-sha', { required: true });
const regex = new RegExp(getInput('regex') || '.*');
const maxDepth: number = Joi.attempt(
  getInput('max-depth') || '0',
  Joi.number().required()
);
const ignoreIfAllDeletions: boolean = Joi.attempt(
  getInput('ignore-if-all-deletions') || 'false',
  Joi.boolean().required()
);

const changes = await getChangedDirectories({
  baseSHA,
  regex,
  maxDepth,
  ignoreIfAllDeletions
});

console.log(`Changes: ${inspect(changes)}`);

setOutput(
  'matrix',
  JSON.stringify({
    directory: changes
  })
);
setOutput('matrix-empty', changes.length === 0);
