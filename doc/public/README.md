# Prom Workload Manager (PWM)

> Schedule and run GPU and CPU based workload on remote servers and computers.

## Getting the CLI

Current alpha version is 0.1.4

```sh
$ wget https://pwm.promfacility.eu/downloads/pwm.sh

# If you use Linux
$ sudo ./pwm.sh 0.1.4 linux-x64 cli

# If you use MacOS
$ sudo ./pwm.sh 0.1.4 macos-x64 cli
```

Now you have the *pwmcli* in your binaries.

### Set the CLI credentials

Now you have to insert your credentials

```sh
$ cd 
$ mkdir .pwm
$ touch .pwm/config
```

Insert this in the .pwm/config file: [without the *@*]

```sh
profile: default
api:
  default:
    server:
      - 'https://pwmapi.promfacility.eu'
    auth:
      token: @Supersecret_Token_That_You_Need_To_Ask@
```

### Test the CLI

```sh
$ pwmcli get gpu

kind  name			 product_name          minor_number  fb_memory              node          
-------------------------------------------------------------------------------------------------------------------------
GPU   GPU-5-2--4-87  Quadro RTX 6000       0             0 MiB / 24220 MiB      lambda-01     
GPU   GPU-2-a--1-3e  Tesla V100-SXM2-16GB  2             0 MiB / 16130 MiB      nvidia-dgx1-01
GPU   GPU-2-7--c-7b  Tesla V100-SXM2-16GB  3             0 MiB / 16130 MiB      nvidia-dgx1-01
GPU   GPU-7-f--8-36  Quadro RTX 6000       7             22668 MiB / 24220 MiB  lambda-02     
GPU   GPU-e-2--c-6e  Tesla V100-SXM2-16GB  0             0 MiB / 16130 MiB      nvidia-dgx1-02
GPU   GPU-8-6--3-ba  Tesla V100-SXM2-16GB  1             0 MiB / 16130 MiB      nvidia-dgx1-02
...
...
...
```

## Run a Workload

This an example of Workload definition (example.yaml):

```yaml
---
apiVersion: v1
kind: Workload
metadata:
  name: first-test
  group: your-group
spec:
  driver: pwm/nvidia-docker
  selectors:
    gpu:
      product_name: Quadro RTX 6000
      count: 1
  image: 
    registry: registry.promfacility.eu
    image: test_wb_log
```

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

Then delete with: 

```sh
$ pwmcli delete -f example.yaml
```

### Run a CPU workload

This an example of Workload definition:

```yaml
---
apiVersion: v1
kind: Workload
metadata:
  name: test-ubuntu-01
  group: prom-lab
spec:
  driver: pwm/docker
  selectors:
    node:
      name: dummy-01
    cpu:
      product_name: Intel(R) Core(TM) i7-8569U CPU @ 2.80GHz
      count: 1
  image: 
    image: ubuntu
  config: 
    memory: 2g
    cmd: /bin/bash
    startMode: -itd
```

## CLI API

```sh
# Switch to another profile 
$ pwmcli use <profile>

# Get resources [node, group, gpu, gpuw, cpu, cpuw]
$ pwmcli get <resource>

# Get resources [node, group, gpu, gpuw, cpu, cpuw] and watch
$ pwmcli get <resource> -w

# Apply a config
$ pwmcli apply -f <yamlfile>

# Delete a config
$ pwmcli delete -f <yamlfile>

# Cancel a running resource like gpuw  (same as pwmcli cancel <resource> <name> -g <group>)
$ pwmcli stop <resource> <name> -g <group>

# Remove a config by name 
$ pwmcli remove <resource> <name> -g <group>

# Exec a shell inside a remote container
$ pwmcli shell <resource> <name> -g <group>

# Copy files from your pc to a volume (volume is automatically created if not exist)
$ pwmcli cp <absolutePath> <node>:<volumename>

# Download files from remote volume to local folder
$ pwmcli download <node>:<volumename> <absolutePathWhereToSaveDownloadedData>
```

## Interactive CLI API

Currently the only available procedure is *workload-prom* 

```sh
# Start the interactive procedure
$ pwmcli it <procedure>
```

## Versions

- 0.1.4 Added support for downloads, fixed unsecure ws, fixed shell setRaw
- 0.1.3 Local volumes and copy tested, unified GPUWorkload and CPUWorkload to Workload, added interative mode
- 0.1.2 Added support for local volumes and copy
- 0.1.1 Added support for CPUWorkload
- 0.1 Added support for GPUWorkload

