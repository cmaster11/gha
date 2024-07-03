# cmaster11/gha/.github/workflows/wf-build.yml

The `wf-build.yml` is an opinionated all-in-one GitHub Actions shared workflow that allows you to build a monorepo
containing versioned GitHub shared actions and reusable workflows.

> The [`cmaster11/gha`](https://github.com/cmaster11/gha) repository is entirely built on top of this workflow.

<!-- toc BEGIN -->
<!-- toc END -->

## What comes as a result of using this workflow?

You will be able to generate both composite and JS versioned shared
actions:

```yaml
jobs:
  test:
    name: Run the test action
    runs-on: ubuntu-latest
    steps:
      - uses: cmaster11/gha@action-test/v1
```

You will be able to generate versioned reusable workflows:

```yaml
jobs:
  my-job:
    uses: cmaster11/gha/.github/workflows/wf-test.yml@wf-test/v1
```

## What is the UX like?

The standard flow for publishing the version for a new action or workflow can be summarized in these few steps:

1. Open a PR with changes to one or more actions or workflows, and assign a version
   label to the PR (`patch`, `minor`, `major`, `no-release`).
2. If the PR includes test files, the `wf-build.yml` workflow will take care of executing the tests in the right order (
   first running action tests and then running workflow tests, because the latter usually depend on the former).
3. When the PR is then merged to the main branch, the `wf-build.yml` workflow will take care of
   building/packaging/tagging your actions and workflows in their corresponding version
   branches (the version branches will look like `action-test/v1`/`wf-test/v1` and you will also have access to tags
   like `action-test/v1.4.1`).

## How do you set it up?

The prerequisites for being able to use this workflow are as follows:

1. Having an `actions` folder, which will contain all your shared actions.
2. (optional but highly recommended) Having a TypeScript project set up in the root of the repository.

To get started, create the two following workflows in your repository:

### `.github/workflows/gha-build.yml`

This is the main workflow, which will take care of building and versioning your shared actions and reusable workflows.

<!-- import:ci-pr.yml BEGIN -->

```yaml
name: Build Github Actions and reusable workflows

on:
  pull_request:
    branches:
      - main
    types:
      - synchronize
      - reopened
      - closed
      # Triggers the workflow when labels are added to the PR
      - labeled

jobs:
  # Triggers the build flow
  build:
    uses: cmaster11/gha/.github/workflows/wf-build.yml@wf-build/v1
    permissions:
      # Required to create new version branches
      contents: write
      # Required to publish comments on the PR
      pull-requests: write
      # Required to trigger test workflows via workflow_dispatch
      actions: write
      # Required to create commit statuses to mark the
      # execution of test workflows
      statuses: write

    secrets:
      # You need to provide a PAT to enable auto-generation of the
      # catch-all test workflow. This can be a PAT of a GitHub app,
      # generated dynamically for every run in a previous job, or a user PAT.
      #
      # This token needs to have the `contents: write` and `workflows: write` permissions.
      #
      # If using a user PAT, I recommend creating a fine-grained token scoped only
      # to your GHA repository with only the contents/workflows `write` permissions.
      token-push-workflows: ${{ secrets.CI_BUILD_TOKEN_WORKFLOWS }}

    with:
      # You can customize various commands
      test-command: npm run test:ci

      # If you want to disable linting
      # lint-command: echo NOOP

      # Or you can completely disable testing, in case you want to run your
      # own test suites before running the actions/workflows build pipeline.
      # skip-test: true
```

<!-- import:ci-pr.yml END -->

You can see the full configuration reference below:

<!-- import-wf-inputs:wf-build.yml BEGIN -->

#### skip-test

If true, do not run the test job. Useful when you require custom testing jobs
to run before whole actions/workflow build pipeline.

- Type: `boolean`
- Default: `false`

#### lint-command

The command used to run lint tests.

- Type: `string`
- Default: `npm run lint`

#### test-command

The command used to run tests.

- Type: `string`
- Default: `npm run test`

#### changes-paths-js

A list of globs used to check whether we need to rebuild all the actions containing JS code.

The supported features are:

- Wildcards (`**`, `*.js`)
- Negation (`'!a/*.js'`, `'*!(b).js'`)
- extglobs (`+(x|y)`, `!(a|b)`)
- POSIX character classes (`[[:alpha:][:digit:]]`)
- Brace expansion (`foo/{1..5}.md`, `bar/{a,b,c}.js`)
- Regex character classes (`foo-[1-5].js`)
- Regex logical "or" (`foo/(abc|xyz).js`)

Lines beginning with `#` will be treated as comments and ignored

You can see more examples at: https://github.com/micromatch/micromatch#matching-features

- Type: `string`
- Default:
  ```
  package.json
  package-lock.json
  tsconfig.json
  {src,lib}/**/*.m?[tj]s
  jest.config.(js|ts|mjs|cjs|json)
  ```

#### skip-gen-test-catch-all-workflow

If true, skip the `gen-test-catch-all-workflow` job. This can be useful for example
when you don't want to expose a token with `workflows` permission to dependabot and
other collaborators.

- Type: `boolean`
- Default: `${{ github.actor == 'dependabot[bot]' }}`
<!-- import-wf-inputs:wf-build.yml END -->

### `.github/workflows/gha-pr-check-labels.yml`

<!-- import:ci-pr-check-labels.yml BEGIN -->

```yaml
name: Check release labels

on:
  pull_request:
    branches:
      - main

    # Trigger this workflow on events which could cause the
    # PR to have no labels
    types:
      - opened
      - unlabeled

jobs:
  # Verifies the presence of release labels when the PR
  # is opened or labels have changes
  check-labels:
    uses: cmaster11/gha/.github/workflows/wf-build-check-labels-only.yml@wf-build-check-labels-only.yml/v1
    permissions:
      pull-requests: read
      contents: read
```

<!-- import:ci-pr-check-labels.yml END -->

## Testing

You can create test workflows for every shared action and reusable workflow.

The testing flow is the same for both shared action and reusable workflows, as both are executed after
the build phase.

### Test workflows (shared actions)

The name of the test workflow needs to be `.github/workflows/test-ACTION-NAME.yml`.

Here you can see an example of a test workflow built to test a shared action:

<!-- import:test-action-test.yml BEGIN -->

```yaml
name: Test action-test
on:
  workflow_call: { inputs: { test-ctx: { type: string } } }

jobs:
  test:
    runs-on: ubuntu-22.04
    steps:
      - name: Checkout the dev branch
        uses: actions/checkout@v4
        with:
          ref: "${{ fromJSON(inputs.test-ctx).ref }}"

      - name: Run the action
        id: action
        uses: ./
        with:
          greeting: Hello world!

      - name: Dump the result of the action
        run: |
          echo "$JSON" | jq '.'
        env:
          JSON: ${{ toJSON(steps.action) }}
```

<!-- import:test-action-test.yml END -->

### Test workflows (reusable workflows)

The name of the test workflow needs to be `.github/workflows/test-WORKFLOW-NAME.yml`.

Here you can see an example of a test workflow built to test a reusable workflow:

<!-- import:test-wf-test.yml BEGIN -->

```yaml
name: Test wf-test

on:
  workflow_call: { inputs: { test-ctx: { type: string } } }

jobs:
  test:
    # Invoke the reusable workflow
    uses: ./.github/workflows/wf-test.yml

  dump:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Dump the result of the workflow
        run: |
          echo "$JSON" | jq '.'
        env:
          JSON: ${{ toJSON(needs.test) }}
```

<!-- import:test-wf-test.yml END -->

**Do note** this way of testing will have GitHub use the workflow defined in the **last commit** of the current PR, and
not in the commit for which the whole flow was triggered. This is just a nit and not a big deal because
the `wf-build.yml` workflow defines a strict `concurrency` policy, which means any new commit will cause all previous
test flows to be cancelled.

### `test-ctx`

The `test-ctx` structure is defined as follows:

<!-- import:../../lib/ci/ci-shared-test-payload.ts BEGIN -->

```ts
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
```

<!-- import:../../lib/ci/ci-shared-test-payload.ts END -->

## Architecture

<!-- NOTE: the diagram is stored in `../../ARCHITECTURE.mermaid` -->

<!-- import:../../ARCHITECTURE.mermaid BEGIN -->

```mermaid
%%
%% NOTE: the diagram is stored in `./ARCHITECTURE.mermaid`
%%

flowchart
    commit["Commit on a PR-branch"]

    subgraph wf-build.yml
        get-release-label["Job: get-release-label\nFind the release label\nassociated with the PR"]
        get-changed-dirs["Job: get-changed-dirs\nDetect changed actions\nand workflows"]
        test["Job: test\nRuns CI tests\n(Tests will fail if\nsome files still need\nto be generated)"]
        gen-test-catch-all-workflow["Job: gen-test-catch-all-workflow\nAutomatically generates\na workflow to run\nall test workflows"]
        subgraph build-phase
            build-actions["Job: build-actions\nBuilds all the changed actions"]
            build-workflows["Job: build-workflows\nBuilds all the changed workflows"]
        end
        cleanup["Job: cleanup\nIf the PR has been closed,\ndeletes all dev branches\ncreated during the PR's\nlifetime"]
        gen-test-catch-all-workflow --> build-phase
        test --> build-phase
        get-changed-dirs -- Generates the build matrix --> build-phase
        get-release-label --> build-phase
        post-build-test-actions["Job: post-build-test-actions\nTriggers testing jobs"]
        post-build-test-workflows["Job: post-build-test-workflows\nTriggers testing jobs"]
        build-actions -- " Releases the changed\nactions on their branches\n(dev or versioned) " --> post-build-test-actions
        build-workflows -- " Releases the changed\nworkflows on their branches\n(dev or versioned) " --> post-build-test-workflows
    end

    subgraph cmaster11-gha-ci-test-catch-all.yml
        ci-post-test["Job: ci-post-test\nNotifies GitHub about the result of the test"]

        subgraph test-action-example.yml
            test-action-example["Job: test\nTests the action"]
        end

        subgraph test-action-another.yml
            test-action-another["Job: test\nTests the action"]
        end

        subgraph test-wf-test.yml
            test-wf-test["Job: test\nTests the workflow"]
        end

        test-action-example --> ci-post-test
        test-action-another --> ci-post-test
        test-wf-test --> ci-post-test
    end

    post-build-test-actions --> test-action-example.yml
    post-build-test-actions --> test-action-another.yml
    post-build-test-workflows --> test-wf-test.yml

    gen-test-catch-all-workflow -- " Creates a new commit\ncontaining the generated\ntest catch-all workflow\nand re-triggers the\nwhole pipeline if\nfiles have changed " --> cmaster11-gha-ci-test-catch-all.yml
    commit --> wf-build.yml

```

<!-- import:../../ARCHITECTURE.mermaid END -->
