/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import Joi from 'joi';
import { parse } from 'yaml';

export interface ActionConfig {
  copy?: Record<string, string>;
  changesPaths?: string | string[];
}

const ActionConfigSchema = Joi.object({
  copy: Joi.object({}).unknown(true).meta({ unknownType: Joi.string() }),
  changesPaths: Joi.alternatives([
    Joi.string(),
    Joi.array().items(Joi.string())
  ])
});

export async function getActionConfig(
  actionConfigFile: string
): Promise<ActionConfig> {
  if (!(await fs.exists(actionConfigFile))) {
    return {};
  }

  return Joi.attempt(
    parse(await fs.readFile(actionConfigFile, 'utf-8')),
    ActionConfigSchema
  );
}
