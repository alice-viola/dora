#!/bin/bash

./build_pwm_v.sh $1 linux-x64
./build_pwm_v.sh $1 macos-x64
#./build_pwm_v.sh $1 win-x64

echo "module.exports='"$1"'" > ../controlplane/api/version.js
cd ../controlplane/api
./build.sh

cd ../controlplane/messenger
./build.sh


