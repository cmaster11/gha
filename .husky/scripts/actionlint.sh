#!/usr/bin/env bash
#
# Copyright (c) 2024. Alberto Marchetti [ https://www.linkedin.com/in/albertomarchetti/ ]
#

set -euo pipefail

echo "Running actionlint"
actionlint -ignore 'file ".+" does not exist'