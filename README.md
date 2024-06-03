# GitHub shared actions and workflows

Workflows:

* [workflow-create-release](.github/workflows/test-workflow-create-release.yaml): Creates a release from an artifact
  into a standalone branch

## Pipeline

```mermaid
flowchart
  test["Job: test\nRuns CI lint/tests"]
  check-release-label["Job: check-release-label\nFind the release label\nassociated with the PR"]
  get-changes["Job: get-changes\nDetect changed actions"]
  build["Job: build\nBuilds all the changed actions"]
  
  test --> build
  get-changes --> build
  check-release-label -- Generates the build matrix --> build

  post-build-test["Job: post-build-test\nTriggers testing jobs via\nworkflow_dispatch"]
  build -- "Releases the changed\nactions on their branches\n(dev or versioned)" --> post-build-test

  cleanup["Job: cleanup\nDeletes all dev branches\ncreated during the PR's\nlifetime"]
  get-changes -- If the PR has been closed --> cleanup
```

## Development

### Pure NodeJs actions

Create an `index.mts` file in the action folder and use the following configuration for the `action.yml` file:

```yaml
runs:
  using: node20
  main: dist/index.mjs
```