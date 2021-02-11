#!/bin/bash

if [ $1 == "run" ]; then
	docker run --name pwm-api --rm -p 3000:3000 -d -e zone=dc-test-01 -e secret=PWMAPIDUMMY01 -e dbhost=$2 pwm-api
	docker run --name pwm-scheduler --rm -d -e zone=dc-test-01 -e dbhost=$2 pwm-scheduler
	docker run --name pwm-scheduler-occ --rm -d -e dbhost=$2 pwm-scheduler-occ
	docker run --name pwm-scheduler-executor --rm -d -e zone=dc-test-01 -e dbhost=$2 pwm-scheduler-executor
	docker run --name pwmnode -p3001:3001 -v/var/run/docker.sock:/var/run/docker.sock --rm -d  pwmnode
fi

if [ $1 == "stop" ]; then
	docker stop pwm-api pwm-scheduler pwm-scheduler-occ pwm-scheduler-executor pwmnode
fi