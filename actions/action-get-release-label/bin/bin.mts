import 'zx/globals';
import Joi from 'joi';
import { getOctokit } from '../../../lib/github-common.js';
import { githubGetPrVersionLabel } from '../../../lib/github-get-pr-labels.js';
import { getInput, setOutput } from '@actions/core';

$.verbose = true;

interface Opts {
  token: string;
  repository: string;
  pullNumber: number;
}

async function main() {
  const opts = Joi.attempt(
    {
      token: getInput('token', { required: true }),
      repository: getInput('repository', { required: true }),
      pullNumber: getInput('pull-number', { required: true })
    },
    Joi.object({
      token: Joi.string().required(),
      repository: Joi.string().required(),
      pullNumber: Joi.number().required()
    }).required(),
    {
      allowUnknown: true
    }
  ) as Opts;

  const gh = getOctokit(opts.repository, opts.token);

  const label = await githubGetPrVersionLabel({
    gh,
    pullNumber: opts.pullNumber
  });
  if (label) {
    setOutput('release-label', label);
    setOutput('continue-release', true);
  } else {
    setOutput('release-label', null);
    setOutput('continue-release', false);
  }
}

void main();
