#!/bin/bash

./build_pwm_v.sh $1 linux-x64
./build_pwm_v.sh $1 macos-x64
#./build_pwm_v.sh $1 win-x64

echo "module.exports='"$1"'" > ../api/version.js
cd ../api
./build.sh


