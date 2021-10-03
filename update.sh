#!/bin/bash

get_latest_release() {
    NUMBER=0
    while true
    do
        VERSION=$(curl --silent "https://api.github.com/repos/$1/tags" | jq -r ".[$NUMBER].name" 2>/dev/null)
        if [ $? -ne 0 ]; then
            return
        fi
        if curl --output /dev/null --silent --head --fail "https://github.com/jvbsl/LitGit/releases/download/$VERSION/litgit.tar.gz"; then
            echo "$VERSION"
            return
        fi
        ((NUMBER=NUMBER+1))
    done
}

VERSION=$(get_latest_release "jvbsl/LitGit")

if [ -n "$VERSION" ]; then
    echo "Update to version: $VERSION"
    echo "export const litgit_version: '$VERSION';">src/litgit_version.d.ts
    npm run build
fi