/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import Joi from 'joi';
import { parse } from 'yaml';

export type GlobCopyConfig =
  | string
  | {
      dest: string;
      strip?: string;
    };
export const GlobCopyConfigSchema = Joi.alternatives([
  Joi.string(),
  Joi.object({
    dest: Joi.string().required(),
    strip: Joi.string()
  })
]);
export type CopyConfigType = Record<string, GlobCopyConfig>;

export interface ActionConfig {
  copy?: CopyConfigType;
  changesPaths?: string | string[];
}

const ActionConfigSchema = Joi.object({
  copy: Joi.object({})
    .unknown(true)
    .meta({ unknownType: GlobCopyConfigSchema }),
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

export interface WorkflowConfig {
  copy?: CopyConfigType;
  changesPaths?: string | string[];
}

const WorkflowConfigSchema = Joi.object({
  copy: Joi.object({}).unknown(true).meta({ unknownType: Joi.string() }),
  changesPaths: Joi.alternatives([
    Joi.string(),
    Joi.array().items(Joi.string())
  ])
});

export async function getWorkflowConfig(
  workflowConfigFile: string
): Promise<WorkflowConfig> {
  if (!(await fs.exists(workflowConfigFile))) {
    return {};
  }

  return Joi.attempt(
    parse(await fs.readFile(workflowConfigFile, 'utf-8')),
    WorkflowConfigSchema
  );
}
