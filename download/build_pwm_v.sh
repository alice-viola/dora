#!/bin/bash

VERSION=$1 
TARGET=$2

mkdir -p public/v$VERSION
mkdir -p public/v$VERSION/$TARGET
#mkdir -p public/v$VERSION/$TARGET/api
mkdir -p public/v$VERSION/$TARGET/cli
mkdir -p public/v$VERSION/$TARGET/node

echo "module.exports='"$VERSION"'" > ../cli/version.js
pkg ../cli/index.js -t $TARGET -o pwmcli 
mv pwmcli public/v$VERSION/$TARGET/cli

#pkg ../api/index.js -t $TARGET -o pwmapi 
#mv pwmapi public/v$VERSION/$TARGET/api

echo "module.exports='"$VERSION"'" > ../node-client/version.js
pkg ../node-client/index.js -t $TARGET -o pwmnode 
mv pwmnode public/v$VERSION/$TARGET/node