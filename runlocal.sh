#!/bin/bash

docker run --rm -p 3000:3000 -d -e zone=dc-test-01 -e secret=PWMAPIDUMMY01 -e dbhost=192.168.180.150 pwm-api
docker run --rm -d -e zone=dc-test-01 -e dbhost=192.168.180.150 pwm-scheduler
docker run --rm -d -e dbhost=192.168.180.150 pwm-scheduler-occ
docker run --rm -d -e zone=dc-test-01 -e dbhost=192.168.180.150 pwm-scheduler-executor