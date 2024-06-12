# wf-after-test.yml

This workflow notifies GitHub about the conclusion of a test and creates the relative commit status.

Related to the [`wf-build.yml`](./wf-build.yml) workflow, the `wf-after-test.yml` workflow needs to be called after
any test workflow execution.

You can use it by adding the following job to all the various test workflows:

```yml
wf-after-test:
  needs:
    # List here all the other jobs
    - test
  if: always() && github.event_name == 'workflow_dispatch'
  uses: ./.github/workflows/wf-after-test.yml
  permissions: { statuses: write }
  with: { ctx: '${{ inputs.ctx }}', needs-json: '${{ toJSON(needs) }}' }
```
