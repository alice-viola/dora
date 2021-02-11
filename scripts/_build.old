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
		docker build -t pwm-api -f controlplane/api/Dockerfile controlplane/
		docker build -t pwm-scheduler -f controlplane/scheduler/Dockerfile controlplane/
		docker build -t pwm-scheduler-occ -f controlplane/scheduler-occ/Dockerfile controlplane/
		docker build -t pwm-scheduler-executor -f controlplane/scheduler-executor/Dockerfile controlplane/
		docker build -t pwm-messenger -f controlplane/messenger/Dockerfile controlplane/
	fi
fi

if [ $1 == "push" ]; then
	for registry in "${registries[@]}"
	do

		if [ $2 == "cli" ]; then
			cd cli
			docker tag pwmcli $registry/pwmcli
			docker push $registry/pwmcli
		fi

		if [ $2 == "light" ]; then
			docker tag pwm-light $registry/pwm-light
			docker push $registry/pwm-light
		fi
	
		if [ $2 == "node" ]; then
			docker tag pwmnode $registry/pwmnode
			docker tag pwmnode-update $registry/pwmnode-update
			docker tag pwmsync $registry/pwmsync
			
			docker push $registry/pwmnode
			docker push $registry/pwmnode-update
			docker push $registry/pwmsync
		fi
	
		if [ $2 == "controlplane" ]; then
			docker tag pwm-api $registry/pwm-api
			docker tag pwm-scheduler $registry/pwm-scheduler
			docker tag pwm-scheduler-executor $registry/pwm-scheduler-executor
			docker tag pwm-scheduler-occ $registry/pwm-scheduler-occ
			docker tag pwm-messenger $registry/pwm-messenger
	
			docker push $registry/pwm-api
			docker push $registry/pwm-scheduler
			docker push $registry/pwm-scheduler-occ
			docker push $registry/pwm-scheduler-executor
		fi
	done
fi
