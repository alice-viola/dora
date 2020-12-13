
# CLI: Command Line Interface

## Getting the CLI

Use the *latest* version.

```sh
$ wget https://pwm.promfacility.eu/downloads/pwm.sh
$ chmod 755 pwm.sh

# If you use Linux
$ sudo ./pwm.sh latest linux-x64 cli

# If you use MacOS
$ sudo ./pwm.sh latest macos-x64 cli
```

Now you have the *pwmcli* in your binaries.

## Set the CLI credentials

Now you have to insert your credentials (without the *@*)

```sh
$ pwmcli profile init prom --api-server https://pwmapi.promfacility.eu --token @Supersecret_Token_That_You_Need_To_Ask@ 
```

If you want to add a second profile:

```sh
$ pwmcli profile init anotherprofile --api-server https://anotherapiserver.com --token @Another_Supersecret_Token_That_You_Need_To_Ask@ 
```

## Test the CLI

```sh
$ pwmcli get gpu

kind  name			          product_name          minor_number  fb_memory              node            lastSeen
-------------------------------------------------------------------------------------------------------------------------
GPU   GPU-9a4f8-f4a98f3e  Tesla V100-SXM2-16GB  2             0 MiB / 16130 MiB      nvidia-dgx1-01  now     
GPU   GPU-a613a-5103ffa7  Tesla V100-SXM2-16GB  4             14286 MiB / 16130 MiB  nvidia-dgx1-01  now     
GPU   GPU-3a410-6c1e1e7b  Tesla V100-SXM2-16GB  3             0 MiB / 16130 MiB      nvidia-dgx1-01  now     
GPU   GPU-7a866-67edb253  Tesla V100-SXM2-16GB  7             14356 MiB / 16130 MiB  nvidia-dgx1-01  now     
GPU   GPU-bb159-92f2e0df  Tesla V100-SXM2-16GB  6             14356 MiB / 16130 MiB  nvidia-dgx1-01  now   
...
...
...
```

## CLI resources and alias

Pwm works with the concept of *Resource*.
Almost every CLI command accept a resource type.
In order to avoid to type long sequences of characters,
there are some alias that you can use.

```
| Resource Kind | Aliases                  |
|---------------|--------------------------|
| Workload      | wk,workload,Workload     |
| GPU           | gpu,gpus,GPU             |
| CPU           | cpu,cpus,CPU             |
| Node          | node,nodes,Node          |
| Group         | group,groups,Group       |
| User          | user,users,User          |
| Volume        | vol,vols,Volume          |
| Storage       | storage,storages,Storage |
```

## CLI commands

### Profiles and versions

```sh
# Init profile
$ pwmcli profile init <profileName> --token <token> --api-server <apiServer>

# Add another profile 
$ pwmcli profile add <profileName> --token <token> --api-server <apiServer>

# Delete profile 
$ pwmcli profile del <profileName>

# Switch to another profile 
$ pwmcli profile use <profileName>

# Get the current profile 
$ pwmcli profile using

# Get version and api version
$ pwmcli -v
$ pwmcli api-version
```

### Workloads

```sh
# Get resources [node, group, gpu, gpuw, cpu, cpuw] and watch
$ pwmcli get <resource> [-w]

# Get details about named resource
$ pwmcli describe <resource> <name> -g <group>

# Apply a config
$ pwmcli apply -f <yamlfile>

# Delete a config
$ pwmcli delete [resource] [name] [-f <yamlfile>] [-g <group>]

# Cancel a running resource like workloads before delete
$ pwmcli stop [resource] [name] [-f <yamlfile>] [-g <group>]

# Exec a shell inside a remote container
$ pwmcli shell <resource> <name> -g <group>

# Commit and push a new image starting from a workload, 
# repo is somenthing like:  repository/imagename:tag 
$ pwmcli commit wk <name> <repo> -g <group>

# Pause a workload, releasing the CPU/GPU
$ pwmcli pause wk <name> 

# Resume a paused workload
$ pwmcli resume wk <name>

# Get logs
$ pwmcli logs <resource> <name> -g <group>

# Get inspect
$ pwmcli inspect <resource> <name> -g <group>

# Get top 
$ pwmcli top <resource> <name> -g <group>
```

### Volumes

```sh
# Copy files from your pc to a volume. Volume must be already present
$ pwmcli cp <absolutePathFilesToUpload> <volumename>

# Download remote volume to local folder
$ pwmcli download <volumename> <absolutePathWhereToSaveDownloadedData>

# Download sub folder volume to local folder
$ pwmcli download <volumename:/container/sub/path> <absolutePathWhereToSaveDownloadedData>
```

# Workloads

## Run a Workload

This an example of Workload definition (example.yaml):

```yaml
---
apiVersion: v1
kind: Workload
metadata:
  name: first-test
spec:
  driver: pwm.docker
  selectors:
    gpu:
      product_name: Quadro RTX 6000
      count: 1
  image: 
    image: tensorflow/tensorflow
```

*spec.driver is mandatory*

Apply this file:

```sh
$ pwmcli apply -f example.yaml
```

And then monit the results: (wk stand for Workload)

```sh
$ pwmcli get wk -w

kind         name            group       gpu_type              gpu_id           gpu_usage  node        c_id  locked  status   reason  time
------------------------------------------------------------------------------------------------------------------------------------------
Workload  first-test      your-group  Quadro RTX 6000       GPU-9307e-82-8e  0 MiB      lambda-02   6f73  true    RUNNING  null    0:05
```

Then stop and delete with: 

```sh
$ pwmcli stop -f example.yaml
```

Wait until the workload is exitend (check with *pwmcli get wk -w*) and then delete:

```sh
$ pwmcli delete -f example.yaml
```

## Run a CPU workload

This an example of CPU Workload definition:

```yaml
---
apiVersion: v1
kind: Workload
metadata:
  name: test-ubuntu-01
spec:
  driver: pwm.docker
  selectors:
    cpu:
      product_name: pwm.all
  image: 
    image: ubuntu
  config: 
    cmd: /bin/bash
    startMode: -itd
```

## Workloads status

The workloads lifecycle's follow a series
of states:

```
| State             | Meaning                                                             |
|-------------------|---------------------------------------------------------------------|
| INSERTED          | The request has been inserted in scheduler loop                     |
| DENIED            | The request has been rejected                                       |
| QUEUED            | The request has been queued, assign will come soon                  |
| ASSIGNED          | The request has been assigned to a node                             |
| LAUNCHING         | Before request launch                                               |
| REQUESTED_LAUNCH  | Scheduler requested the workload launch                             |
| LAUNCHED          | Workload confirmed to be launched                                   |
| RUNNING           | Workload is running fine                                            |
| CRASHED           | Workload internally crashed after launch                            |
| REQUESTED_CANCEL  | The user has requested the stop of the workload                     |
| UNKNOWN           | Workload status unknown                                             |
| STUCK             | Max launch attempts retry reach, scheduler removed the workload     |
```

For the completed list of states and errors,
see git file /pwm/api/src/events/global.js

## Magic keywords

The main *magic keyword* is **pwm.all**.

With this keyword you instruct the system to 
use *every kind* of resource; for instance, if you don't
care about the GPU or CPU kind, you set **pwm.all** in the product_name field.  


# Storages and volumes
## Working with volumes

Pwm auto creates local volumes.
If the admin has created some NFS storages,
you can use they in order to share persistent data
between nodes.

```sh
$ pwmcli get storage

kind     name                  type   mount                     
----------------------------------------------------------------------      
Storage  pwmzfs01              nfs    192.168.186.65:/pwmzfs01/share_01
Storage  jakku-local           local  jakku                           
Storage  nvidia-dgx1-01-local  local  nvidia-dgx1-01                  
Storage  lambda-01-local       local  lambda-01                       
Storage  emcprom09-local       local  emcprom09                       
Storage  pwmzfs02              nfs    192.168.186.95:/pwmzfs02/share_02 
```

Shared volumes (group *pmw.resource*): 

```sh
$ pwmcli get vol -g pwm.resource

kind    group         name               storage   subPath            policy  
------------------------------------------------------------------------------
Volume  pwm.resource  datasets           pwmzfs01  datasets           readonly
Volume  pwm.resource  datasets-tmp       pwmzfs02  datasets           readonly
Volume  pwm.resource  datasets-hmdb-uci  pwmzfs01  datasets/hmdb_ucf  readonly
```

Admins can create readonly volumes for datasets.
The resulting path on the storage for the following volume is: 

*192.168.186.65:/pwmzfs01/share_01/pwm.resource/datasets/hmdb_ucf*

```yaml
---
apiVersion: v1
kind: Volume
metadata:
  name: datasets-hmdb-uci
  group: pwm.resource
spec:
  storage: pwmzfs01
  subPath: datasets/hmdb_ucf
  policy: readonly
```

In this example you can use the *pwmzfs01* NFS storage for your home,
and the same storage for an already present dataset.

```yaml
---
apiVersion: v1
kind: Workload
metadata:
  name: tensorflow-2
spec:
  driver: pwm.docker
  selectors:
    node:
      name: emcprom09
    cpu:
      product_name: pwm.all
  image: 
    image: ubuntu
  config: 
    cmd: /bin/bash
  volumes:
    - name: home # This is a user home
      storage: pwmzfs01 
      target: /home
    - group: pwm.resource # This is a dataset
      name: datasets-hmdb-uci
      target: /usr/datasets
```

Pwm auto create the subpath on the NFS storage for you.

