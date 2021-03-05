#!/bin/bash

# T O  C O N F I G U R E
registries=(promfacility dr.trentinosviluppo.it registry.promfacility.eu) 
tag=$3
registry=$4

#
# L E A V E  
#

if [ $1 == "build" ]; then
	if [ $2 == "cli" ]; then
		cd ../cli
		docker build . -t pwmcli:$tag
		cd ../download
		./build_all_targets.sh $tag
	fi

	if [ $2 == "front" ]; then
		cd ../app/
		npm run build 
		cp -R dist/* ../controlplane/api/public/
	fi

	if [ $2 == "light" ]; then
		docker build -t pwm-light:$tag -f tiny/Dockerfile .
	fi

	if [ $2 == "node" ]; then
		docker build -t pwmnode:$tag -f ../node-client/Dockerfile ../node-client/
		docker build -t pwmsync:$tag -f ../node-sync/Dockerfile ../node-sync/
	fi

	if [ $2 == "controlplane" ]; then
		docker build -t pwm-api:$tag -f ../controlplane/api/Dockerfile ../
		docker build -t pwm-scheduler:$tag -f ../controlplane/scheduler/Dockerfile ../
		docker build -t pwm-scheduler-occ:$tag -f ../controlplane/scheduler-occ/Dockerfile ../
		docker build -t pwm-scheduler-executor:$tag -f ../controlplane/scheduler-executor/Dockerfile ../
	fi

	if [ $2 == "doc" ]; then
		docker build -t pwm-doc:$tag -f ../doc/Dockerfile ../doc
	fi

	if [ $2 == "download" ]; then
		cd ../download
		mkdir -p public/vlatest
		rm -rf public/vlatest/*
		cp -R public/v$tag/* public/vlatest
		
		docker build . -t pwm-downloader:$tag
	fi
fi

if [ $1 == "push" ]; then
	if [ $2 == "light" ]; then
		docker tag pwm-light:$tag $registry/pwm-light:$tag
		docker push $registry/pwm-light:$tag
	fi

	if [ $2 == "node" ]; then
		docker tag pwmnode:$tag $registry/pwmnode:$tag
		docker tag pwmsync:$tag $registry/pwmsync:$tag

		docker push $registry/pwmnode:$tag
		docker push $registry/pwmsync:$tag
	fi

	if [ $2 == "controlplane" ]; then
		docker tag pwm-api:$tag $registry/pwm-api:$tag
		docker tag pwm-scheduler:$tag $registry/pwm-scheduler:$tag
		docker tag pwm-scheduler-occ:$tag $registry/pwm-scheduler-occ:$tag
		docker tag pwm-scheduler-executor:$tag $registry/pwm-scheduler-executor:$tag

		docker push $registry/pwm-api:$tag
		docker push $registry/pwm-scheduler:$tag
		docker push $registry/pwm-scheduler-occ:$tag
		docker push $registry/pwm-scheduler-executor:$tag
	fi

	if [ $2 == "doc" ]; then
		docker tag pwm-doc:$tag $registry/pwm-doc:$tag
		docker push $registry/pwm-doc:$tag
	fi

	if [ $2 == "download" ]; then
		docker tag pwm-downloader:$tag $registry/pwm-downloader:$tag
		docker push $registry/pwm-downloader:$tag
	fi
fi