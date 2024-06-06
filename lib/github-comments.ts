/*
 * Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
 */

import type { GithubCommonProps } from './github-common.js';

function getCommentTagMarker(tag: string): string {
  return `<!-- Comment tag: cmaster11/gha/${tag} -->`;
}

export async function gitHubFindCommentByTag(
  gh: GithubCommonProps,
  pullNumber: number,
  tag: string
): Promise<number | undefined> {
  const marker = getCommentTagMarker(tag);
  const pg = gh.octokit.paginate.iterator(gh.octokit.rest.issues.listComments, {
    ...gh.repoProps,
    issue_number: pullNumber
  });

  for await (const resp of pg) {
    for (const comment of resp.data) {
      if (comment.body?.includes(marker)) return comment.id;
    }
  }

  return;
}

export async function gitHubCreateOrUpdateComment(
  gh: GithubCommonProps,
  pullNumber: number,
  tag: string,
  body: string
) {
  const marker = getCommentTagMarker(tag);
  const commentId = await gitHubFindCommentByTag(gh, pullNumber, tag);

  if (commentId) {
    await gh.octokit.rest.issues.updateComment({
      ...gh.repoProps,
      comment_id: commentId,
      issue_number: pullNumber,
      body: body + '\n\n' + marker
    });
    return;
  }

  await gh.octokit.rest.issues.createComment({
    ...gh.repoProps,
    issue_number: pullNumber,
    body: body + '\n\n' + marker
  });
}
