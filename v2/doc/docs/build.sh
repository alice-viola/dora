#!/bin/bash

npm run build
docker build . -t dora.doc:$1 