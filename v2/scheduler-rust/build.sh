#!/bin/bash

TAG=$1

docker build . -t dora.scheduler:$TAG
docker tag dora.scheduler:$TAG doraai/dora.scheduler:$TAG
docker push doraai/dora.scheduler:$TAG