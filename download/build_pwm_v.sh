#!/bin/bash

VERSION=$1 
TARGET=$2

mkdir -p public/v$VERSION
mkdir -p public/v$VERSION/$TARGET

mkdir -p public/v$VERSION/$TARGET/cli
mkdir -p public/v$VERSION/$TARGET/adm

echo "module.exports='"$VERSION"'" > ../cli/version.js
pkg ../cli/index.js -t node12.16.1-$TARGET -o pwmcli 
mv pwmcli public/v$VERSION/$TARGET/cli

echo "module.exports='"$VERSION"'" > ../adm/version.js
pkg ../adm/index.js -t node12.16.1-$TARGET -o pwmadm 
mv pwmadm public/v$VERSION/$TARGET/adm


#echo "module.exports='"$VERSION"'" > ../node-client/version.js
#pkg ../node-client/index.js -t $TARGET -o pwmnode 
#mv pwmnode public/v$VERSION/$TARGET/node