# Use PWMLight 

With the pwm-light docker image, you can test pwm using only one container (and a DB).
The image has the zone=tinyzone and secret=tinypwm

## Run the DB

```sh
docker run -p27017:27017 -d mongo
```

## Run pwm-light image

**Replace dbhost value with your db ip (not localhost, your local IP!!)**

```sh
docker run --rm -e dbhost=192.168.180.209 -e dbname=pwmlight01 - -p3001:3001 -p3000:3000 -d -v /var/run/docker.sock:/var/run/docker.sock --name pwm-light promfacility/pwm-light
```

Go into the container and startup it

```sh
docker exec -it pwm-light /bin/bash

# Paste these command inside the container
cd api && initCluster=true node index.js  

```
This command will output something like this:

```sh
Resource Group/users created
Resource Group/resources created
Resource Group/admin created
Resource User/admin created
Done
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7InVzZXIiOiJhZG1pbiIsInVzZXJHcm91cCI6InVzZXJzIiwiZGVmYXVsdEdyb3VwIjoiYWRtaW4iLCJpZCI6MX0sImlhdCI6MTYwNzg2NDUwNH0.jlo6a7lcbun1XEMmbGOOFC5OxEYGLduK3pYFvXOPTlc
```

Then, open a browser and go to http://localhost:3000, you should see the Web app up and running.
Paste into the login box the provided token, and start creating container on your local pc!

## Create the first worker node

Before creating containers, you should insert at least one worker node in the DB. pwm-light runs a worker node internally, but the startup procedure doesn't include it.

In the Web app, select the *resources* profile, then click the *new* button and paste this YAML (**replace the IP present in the YAML with your machine IP**):

```yaml
---
apiVersion: v1
kind: Node
metadata:
  name: tiny-worker-node
  group: resources
spec:
  zone: tinyzone
  address:
    - 192.168.180.209:3001
  allow:
    - CPUWorkload
```


## Create a workload

Then, switch back to the admin profile, and create a new workload:

```yaml
apiVersion: v1
kind: Workload
metadata:
  name: clever_colden
spec:
  driver: pwm.docker
  selectors:
    node:
      name: pwm.all
    cpu:
      product_name: pwm.all
      count: 1
  image: 
    image: ubuntu
  config: 
    cmd: /bin/bash
```

When this workload will be running, type *docker ps* on a console, you should see an output like this:

```yaml
CONTAINER ID        IMAGE               COMMAND                  CREATED                  STATUS                  PORTS                                        NAMES
c313b9a4c335        ubuntu              "/bin/bash"              Less than a second ago   Up Less than a second                                                pwm.admin.clever_colden
659517f28ddf        pwm-light           "docker-entrypoint.s…"   About a minute ago       Up About a minute       0.0.0.0:3000-3001->3000-3001/tcp             pwm-light
7b559f9467b5        mongo               "docker-entrypoint.s…"   2 days ago               Up 2 days               0.0.0.0:27017->27017/tcp                     flamboyant_dijkstra
```

Now, follow the web app guide or the CLI guide in order to run more worklods.