docker build . -t pwmnode-update
docker tag pwmnode-update registry.promfacility.eu/pwmnode-update
docker push registry.promfacility.eu/pwmnode-update