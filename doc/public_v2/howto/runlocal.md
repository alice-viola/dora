# Startup a cluster

In order to startup the entire cluster, with both controlplane and worker nodes, you will simply need some computers/servers with the Docker engine installed.

## Install

If you want to only preview the entire system, you can use the pwm-tiny container, the controlplane, the worker node and the CLI in the same container. 

### Database


So the first thing that you need is a database: PWM uses MongoDB to keep the cluster status persistent.

```sh
cd && mdkir pwmtest && cd pwmtest && mkdir dbdata

docker run --rm -d -p27017:27017 -v $(pwd)/dbdata:/data/db --name pwm-db mongo
```

### Api

Once you have a DB with a persistent volume, we install the pwm-api service.
This service is stateless, so you can replicate and scale it easily.

Note the you need to use these two enviroment variables:

- zone
- secret

```sh
docker run --rm -d -p3000:3000 -e zone=test -e secret=12345 --name pwm-api promfacility/pwm-api
```

### Scheduler

Now, let's start the main scheduler, using the same *zone* enviroment variable used for the API. 

```sh
docker run --rm -d -e zone=test --name pwm-scheduler promfacility/pwm-scheduler
```

### Scheduler Executor

Now, let's start the executor scheduler, using the same *zone* enviroment variable used for the API. 

```sh
docker run --rm -d -e zone=test --name pwm-scheduler promfacility/pwm-scheduler-executor
```

The basic single control plane is now ready, than we need at least one worker node.


### Worker node

We will run two worker nodes, in order to better undestand the process. 

```sh
docker run --rm -d -p3001:3001 --name pwm-node-01 promfacility/pwm-node
docker run --rm -d -p3002:3001 --name pwm-node-02 promfacility/pwm-node
```

## Configure the installed cluster

Before scheduling containers, you need to configure the system, simply by putting configuration data in the DB, through the API.

But, before doing this, you need an account.

### Getting the admin account

### Create the basic groups

Save this file somewhere, named *group.yaml*

```yaml
---
apiVersion: v1
kind: Group
metadata:
  name: pwm.resource
```

Than apply the file:

```sh
pwmcli apply -f group.yaml
```

### Set the worker nodes

As before, save the file named *nodes.yaml*.
Replace **YOUR_MACHINE_IP** with your PC lan IP. Localhost will not work because the scheduler will use this IP internally to the container, so you need a real IP, or use the Docker network. 

```yaml
---
apiVersion: v1
kind: Node
metadata:
  name: localhost-01
  group: pwm.resource
spec:
  zone: test
  address:
    - YOUR_MACHINE_IP:3001
  allow:
    - CPUWorkload

---
apiVersion: v1
kind: Node
metadata:
  name: localhost-02
  group: pwm.resource
spec:
  zone: test
  address:
    - YOUR_MACHINE_IP:3002
  allow:
    - CPUWorkload
```

And apply it:

```sh
pwmcli apply -f nodes.yaml
```

Now you are ready to deploy containers!

## Deploy

Save this as *firstwk.yaml*

```yaml
---
apiVersion: v1
kind: Workload
metadata:
  name: a-test-01
spec:
  driver: pwm.docker
  selectors:
    cpu:
      product_name: pwm.all
  image: 
    image: ubuntu
  config: 
    cmd: /bin/bash
```

Apply it: 

```sh
pwmcli apply -f firstwk.yaml
```

Then monit the workload status with:

```sh
pwmcli get wk -w
```

You should see somenthing like that:

```sh
kind      group         name              node          c_id  resource  time  wants  reason  status 
----------------------------------------------------------------------------------------------------
Workload  admin         a-test-01         localhost-01  a0b4  1x CPU    0:10m   RUN  null    RUNNING
```

Once you will see *RUNNING* under the status column, you will be able to connect to the workload:

```sh
pwmcli shell wk a-test-01
```

Hurra!

