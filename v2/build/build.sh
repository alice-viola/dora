#!/bin/bash

IMAGE_PREFIX='dora'
IMAGE_SEP='.'

IMAGE_TAG=$1
IMAGE_REGISTRY=$2


if [ $3 == "all" ]; then
	echo 'Building all services';
	services=(api scheduler node sync)	
	cd ../
	for service in "${services[@]}"
	do
		s=$IMAGE_REGISTRY/$IMAGE_PREFIX$IMAGE_SEP$service:$IMAGE_TAG
	    echo "Build Service $s";
	    
	    docker build -t $IMAGE_PREFIX$IMAGE_SEP$service:$IMAGE_TAG -f ./$service/Dockerfile ./ 
	    echo "Pushing Service $s";
	    docker tag $IMAGE_PREFIX$IMAGE_SEP$service:$IMAGE_TAG $s
	    docker push $s
	done
fi

if [ $3 != "all" ]; then
	shift 2;
	cd ../
	for service in "$@" 
	do
		s=$IMAGE_REGISTRY/$IMAGE_PREFIX$IMAGE_SEP$service:$IMAGE_TAG
	    echo "Build Service $s";
	    
	    docker build -t $IMAGE_PREFIX$IMAGE_SEP$service:$IMAGE_TAG -f ./$service/Dockerfile ./ 
	    echo "Pushing Service $s";
	    docker tag $IMAGE_PREFIX$IMAGE_SEP$service:$IMAGE_TAG $s
	    docker push $s
	done
	
fi

