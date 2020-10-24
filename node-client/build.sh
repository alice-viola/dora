docker build . -t pwmnode
docker tag pwmnode registry.promfacility.eu/pwmnode
docker push registry.promfacility.eu/pwmnode