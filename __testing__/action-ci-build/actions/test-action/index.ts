/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import { setOutput } from '@actions/core';
import { context } from '@actions/github';

console.log('Context', JSON.stringify(context));
setOutput('hey', 'Yeah!');
