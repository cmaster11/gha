/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import * as util from 'node:util';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function inspect(obj: any) {
  return util.inspect(obj, { depth: null });
}
