#!/bin/sh
# .git/hooks/pre-commit — installed by `make setup-hooks`
# Bumps the patch version in package.json before every commit.
node "$(git rev-parse --show-toplevel)/scripts/bump-version.mjs"
