/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Call with isScriptInvokedDirectly(import.meta)
export function isScriptInvokedDirectly(meta: ImportMeta): boolean {
  if (meta == null || process.argv[1] == null) {
    return false;
  }

  const scriptPath = createRequire(meta.url).resolve(process.argv[1]);
  const modulePath = fileURLToPath(meta.url);
  return path.extname(scriptPath)
    ? modulePath == scriptPath
    : // Compare without extensions, because Node.js supports invoking scripts without extension
      modulePath.replace(/\.[^.]+$/, '') == scriptPath;
}
