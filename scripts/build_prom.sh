#!/bin/bash

declare -a registries=(promfacility dr.trentinosviluppo.it registry.promfacility.eu) 
tag=$1

./build.sh build cli $tag
./build.sh build front $tag
#./build.sh build light $tag
./build.sh build node $tag
./build.sh build controlplane $tag
./build.sh build doc $tag
./build.sh build download $tag

# Push Phase
for registry in "${registries[@]}"
do
	./build.sh push cli $tag $registry
	./build.sh push node $tag $registry
	./build.sh push controlplane $tag $registry
	./build.sh push doc $tag $registry
	./build.sh push download $tag $registry
done