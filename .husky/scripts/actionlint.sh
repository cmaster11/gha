#!/usr/bin/env bash
set -euo pipefail

echo "Running actionlint"
actionlint -ignore 'file ".+" does not exist'