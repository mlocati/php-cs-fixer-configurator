#!/bin/bash

set -o errexit

if test -z "${TRAVIS_BUILD_DIR:-}"; then
    echo 'This script is meant to be executed by TravisCI.' >&2
    exit 1
fi

cd "$TRAVIS_BUILD_DIR"

if test "${TRAVIS_PULL_REQUEST:-}" != 'false'; then
    COMMIT_RANGE="$TRAVIS_COMMIT_RANGE"
else
    COMMIT_RANGE='HEAD~..HEAD'
fi

IFS='
' CHANGED_FILES=$(git diff --name-only --diff-filter=ACMRTUXB "$COMMIT_RANGE")

if test -z "$CHANGED_FILES"; then
    echo 'No changed files detected.'
    exit 0
fi

WRONG_COMMITTED_FILES=0
for CHANGED_FILE in $CHANGED_FILES; do
    case "$CHANGED_FILE" in
        docs/css/* | docs/fonts/* | docs/js/* | docs/index.html | docs/mix-manifest.json)
            if test $WRONG_COMMITTED_FILES -eq 0; then
                echo 'Please DO not commit the following file(s):' >&2
                WRONG_COMMITTED_FILES=1
            fi
            printf -- '- %s\n' "$CHANGED_FILE" >&2
            ;;
    esac
done
if test $WRONG_COMMITTED_FILES -ne 0; then
    exit 1
fi

if test "${TRAVIS_PULL_REQUEST:-}" != 'false'; then
    echo 'The pull request does not contain invalid files.'
else
    echo 'The last commit does not contain invalid files.'
fi
