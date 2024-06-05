/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */
import 'zx/globals';
import { getInput, setOutput } from '@actions/core';

$.verbose = true;

const greeting = getInput('greeting', { required: true });

console.log(`We received a greeting: ${greeting}`);

// Save the greeting to a file
await fs.writeFile('/tmp/store-greeting', greeting);

setOutput('greet-back', 'Hello to you too!');
