/*
 * Copyright (c) 2024. Alberto Marchetti - https://www.linkedin.com/in/albertomarchetti/
 */

export default {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.m?ts$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
};
