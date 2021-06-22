#!/bin/bash

IMAGE_PREFIX='dora'
IMAGE_SEP='.'

IMAGE_TAG=$1
IMAGE_REGISTRY=$2

function build_webapp {
  	cd ../webapp
	npm run build
	cp -R dist/* ../api/public/
	cd ../
}

if [ $3 == "all" ]; then
	echo 'Building all services';
	build_webapp
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
elif [ $3 == "webapp" ]; then
	echo 'Building webapp';
	build_webapp
else
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

