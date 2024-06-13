/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import 'zx/globals';
import { minimist } from 'zx';
import { genTestCatchAllWorkflow } from '../gen-test-catch-all-workflow.js';

$.verbose = true;

const { remapped } = minimist(process.argv.slice(2), {
  boolean: ['remapped']
});

await genTestCatchAllWorkflow(remapped);
