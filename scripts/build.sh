#!/bin/bash

# T O  C O N F I G U R E
registries=(promfacility dr.trentinosviluppo.it registry.promfacility.eu) 


#
# L E A V E  
#

if [ $1 == "build" ]; then
	if [ $2 == "cli" ]; then
		cd cli
		docker build . -t pwmcli
		cd ../download
		./build_all_targets.sh 
	fi

	if [ $2 == "front" ]; then
		cd app/
		npm run build 
		cp -R dist/* ../controlplane/api/public/
	fi

	if [ $2 == "light" ]; then
		docker build -t pwm-light -f tiny/Dockerfile .
		docker tag pwm-light promfacility/pwm-light
		docker push promfacility/pwm-light
	fi

	if [ $2 == "node" ]; then
		docker build -t pwmnode -f node-client/Dockerfile node-client/
		docker build -t pwmnode-update -f node-client-updater/Dockerfile node-client-updater/
		docker build -t pwmsync -f node-sync/Dockerfile node-sync/
	fi

	if [ $2 == "controlplane" ]; then
		docker build -t pwm-api -f ../controlplane/api/Dockerfile ../
		docker build -t pwm-scheduler -f ../controlplane/scheduler/Dockerfile ../
		docker build -t pwm-scheduler-occ -f ../controlplane/scheduler-occ/Dockerfile ../
		docker build -t pwm-scheduler-executor -f ../controlplane/scheduler-executor/Dockerfile ../
	fi
fi