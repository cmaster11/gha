/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import 'zx/globals';

await $`bash .husky/pre-commit`;

const exitCode =
  (await $`git diff --exit-code && git diff --exit-code --cached`.nothrow())
    .exitCode ?? 4000;
if (exitCode > 0) {
  throw new Error(
    `Detected changes after code generation (exit code ${exitCode}).`
  );
}

await $`jest`;
