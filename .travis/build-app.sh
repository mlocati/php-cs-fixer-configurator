#!/bin/bash

set -o errexit

if test -z "${TRAVIS_BUILD_DIR:-}"; then
    echo 'This script is meant to be executed by TravisCI.' >&2
    exit 1
fi

cd "$TRAVIS_BUILD_DIR"

if test "${TRAVIS_PULL_REQUEST:-}" == 'false'; then
    printf 'Checking out branch %s\n' "$TRAVIS_BRANCH"
    git checkout -qf "$TRAVIS_BRANCH"
fi

npm run-script production

if test "${TRAVIS_PULL_REQUEST:-}" != 'false'; then
    echo 'Skipping auto-update of the app because this is a pull request'
    exit 0
fi

if test -z "$(git status --porcelain -- docs)"; then
    echo 'Skipping auto-update of the app because nothing changed'
    exit 0
fi

if test -z "${GITHUB_ACCESS_TOKEN:-}"; then
    printf 'Unable to auto-update the app because GITHUB_ACCESS_TOKEN is not available
To create it:
 - go to https://github.com/settings/tokens/new
 - create a new token
 - sudo apt update
 - sudo apt install -y build-essential ruby ruby-dev
 - sudo gem install travis
 - travis encrypt --repo %s GITHUB_ACCESS_TOKEN=<YOUR_ACCESS_TOKEN>
 - Add to the env setting of:
   secure: "encrypted string"
' "$TRAVIS_REPO_SLUG"
    exit 0
fi

echo 'Auto-updating the app because of changes'
git status
git add --all .
git config user.name 'Michele Locati'
git config user.email 'michele@locati.it'
git commit -m '[skip ci] Automatic assets rebuilding'
git remote add deploy "https://$GITHUB_ACCESS_TOKEN@github.com/$TRAVIS_REPO_SLUG.git"
git push deploy "$TRAVIS_BRANCH" -vvv
echo 'Done.'
