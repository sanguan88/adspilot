#!/bin/bash
cd "$(dirname "$0")/.."
node --require tsx/cjs/api/register worker/automation-worker.ts
