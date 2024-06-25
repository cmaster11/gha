/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

export interface TestPayload {
  // The SHA of the HEAD commit
  sha: string;
  // The git ref of the branch we are on
  ref: string;
  // The number of the current PR
  pullNumber: number;

  // The context of the commit status associated with the test
  commitStatusContext: string;
}
