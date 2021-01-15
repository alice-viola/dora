---

# Concepts

Following the outstanding Kubernetes way, we use YAML (and in the near future also TOML) files in order to apply the desired state to the system. Every resource can be created submitting the data present in the YAML via API.

Every resource has at least three fields:

- apiVersion
- kind 
- metadata.name

```yaml
---
apiVersion: API_VERSION
kind: KIND
metadata:
  name: RESOURCE_NAME
```

Almost every resource needs also the *metadata.group* field, but the system will try to inherit it from your user profile if not specified. You specify a group when you need to override the default behavior.


## Resource kinds

There are few types of resources kind, which you create/use/see/delete based on your role. See the following table:


| Kind           | Description                                     | Users should care? | Admins should care? |
|----------------|-------------------------------------------------|--------------------|---------------------|
| Group          | Base aggregation unit                           | Depends            | Yes                 |
| User           | User account, limits and permissions            | No                 | Yes                 |
| Zone           | Abstract resource division                      | No                 | Yes                 |
| Node           | Compute node, both GPU and CPU                  | No                 | Yes                 |
| Workload       | Base compute container workload                 | Yes                | Yes                 |
| Storage        | NFS based storage                               | No                 | Yes                 |
| Volume         | Base NFS attached Docker volume                 | Yes                | Yes                 |
| ResourceCredit | Credit definition for each resource type        | Yes                | Yes                 |
| Bind           | Tree of father-son relations between resources  | No                 | No                  |



## Zones

Every cluster has at least one zone. You have multiple zones means when yoo have a multi cluster enviroment with public internet between clusters. 

```yaml
---
apiVersion: v1
kind: Zone
metadata:
  name: dc-test-01
  group: pwm.resource
spec:
  endpoints: 
    - https://apiendpoint01.pwm.com
```

## Users and groups

Without Groups, you cannot create anything. Groups are a way to separate users or teams of users or resources/enviroments.

For instance, there is a group for nodes and storages and every user has (or should have) is own group.


```yaml
---
apiVersion: v1
kind: Group
metadata:
  name: users
```

You can now associate some permissions on user on this group:

```yaml
---
apiVersion: v1
kind: User
metadata:
  name: an.user.name
  group: users
spec:
  groups:
  - name: users
    policy:
      Workload:
      - get
      - getOne
      - apply
      - delete
      - describe
      - shell
      - cancel
      - top
      - commit
      - pause
      - unpause
      - inspect
      - logs
      - token
      ...
      ...
      ...
```

Every user can have more than one group, each with different permissions.


## Nodes

Once the *pwm-node* server is installed on a node, the node can be inserted in the system using a file like this:

```yaml
---
apiVersion: v1
kind: Node
metadata:
  name: myNode
  group: resource.group
spec:
  zone: dc-test-01		# Required in order to know which scheduler should care about this node
  labels:				# Labels are useful but not mandatory, the keys are free
    rack: rack09
  address:
    - 10.10.17.5:3001 	# LAN/VLAN IP
  allow:
    - CPUWorkload		# Array of node capabilities, CPUWorkload and/or GPUWorkload
```

## Workloads

This is the most simple file in order to define a stateless workload:

```yaml
---
apiVersion: v1
kind: Workload
metadata:
  name: testwk					# The container name will be: pwm.yourInheritGroup.testwk
spec:
  driver: pwm.docker 			# More drivers could be available. If in doubt, use this one.
  selectors:
    gpu:						# I want a GPU, of any (pwm.all) type
      product_name: pwm.all
  image: 
    image: ubuntu				# Start from ubuntu base image
  config: 
    cmd: /bin/bash				# Once the container start, run this command
```

A little bit more involved example:

```yaml
---
apiVersion: v1
kind: Workload
metadata:
  name: testwk
spec:
  driver: pwm.docker
  selectors:
    node:						
      name: nvidia-dgx1-01					# You want this node
    gpu:
      product_name: Tesla V100-SXM2-16GB	# And also 4 Tesla
      count: 4
  image: 
    image: tensorflow/tensorflow:latest-gpu	# And Tensorflow
  config: 
    cmd: /bin/python3 main.py 				# Custom run script
    shmSize: 128000							# Shared memory in bytes
  volumes:
    - name: home							# Your personal persistent volume
      storage: pwmzfs01
      target: /home
    - name: dataset1						# A dataset volume
      storage: pwmzfs01
      target: /data
```

## Custom Env

In order to customize your cluster, you can set the following env variables:

| COMPONENT         | NAME                             | DEFAULT                                 |
|-------------------|----------------------------------|-----------------------------------------|
| pwm-node          | USE_SSL_CERTS                    | false                                   |
| pwm-node          | PORT                             | 3001                                    |
| pwm-node          | DOCKER_SOCKET                    | /var/run/docker.sock                    |
| pwm-node          | PWM_UPDATE_IMAGE                 | registry.promfacility.eu/pwmnode-update |
| pwm-node          | REQUIRE_TOKEN_AUTH               | false                                   |
| pwm-node          | secret                           | undefined                               |
| pwm-node          | SSL_KEY                          | /etc/ssl/certs/pwmkey.pem               |
| pwm-node          | SSL_CERT                         | /etc/ssl/certs/pwmcrt.pem               |
| pwmnode-update    | DOCKER_SOCKET                    | /var/run/docker.sock                    |
| pwmnode-update    | PWM_IMAGE                        | registry.promfacility.eu/pwmnode        |
| pwmnode-update    | PWM_C_NAME                       | pwmnode                                 |
| pwm-scheduler     | USE_CUSTOM_CA_SSL_CERT           | false                                   |
| pwm-scheduler     | SSL_CA_CRT                       | /etc/ssl/certs/pwmca.pem                |
| pwm-scheduler     | DENY_SELF_SIGNED_CERTS           | false                                   |
| pwm-scheduler     | node_selector                    | undefined                               |
| pwm-scheduler     | zone                             | undefined                               |
| pwm-scheduler     | STATS_WRITE_MS                   | 15000                                   |
| pwm-scheduler     | PIPELINE_FETCH_NODES_MS          | 5000                                    |
| pwm-scheduler     | PIPELINE_FETCH_DB_MS             | 5000                                    |
| pwm-scheduler-exc | USE_CUSTOM_CA_SSL_CERT           | false                                   |
| pwm-scheduler-exc | SSL_CA_CRT                       | /etc/ssl/certs/pwmca.pem                |
| pwm-scheduler-exc | DENY_SELF_SIGNED_CERTS           | false                                   |
| pwm-scheduler-exc | node_selector                    | undefined                               |
| pwm-scheduler-exc | zone                             | undefined                               |
| pwm-scheduler-exc | PIPELINE_FETCH_DB_MS             | 5000                                    |
| pwm-api           | USE_CUSTOM_CA_SSL_CERT           | false                                   |
| pwm-api           | SSL_CA_CRT                       | /etc/ssl/certs/pwmca.pem                |
| pwm-api           | DENY_SELF_SIGNED_CERTS           | false                                   |
| pwm-api           | zone                             | undefined                               |
| pwm-api           | secret                           | undefined                               |
| pwm-api           | createCA                         | undefined                               |
| pwm-api           | generateToken                    | undefined                               |
| pwm-api           | initCluster                      | undefined                               |
| pwm-api           | port                             | 3000                                    |
| pwm-api           | MAX_ATTEMPTS                     | 3 (ip-filter)                           |
| pwm-api           | RELEASE_TIME_MS                  | 120000 (ip-filter)                      |
| pwm-api           | rateLimiterPrefix                | ratelimiter (rate-limiter)              |
| pwm-api           | rateLimiterPoints                | 30 (rate-limiter)                       |
| pwm-api           | rateLimiterDuration              | 1 (rate-limiter)                        |
| pwm-occ           | RESET_CREDIT_DAY                 | 0                                       |
| pwm-occ           | PIPELINE_OUT_OF_CREDIT_KILLER_MS | 10000                                   |
| common            | dbhost                           | localhost                               |
| common            | dbport                           | 27017                                   |
| common            | dbname                           | pwm-01                                  |
| common            | logLocation                      | pwmapi.log                              |

