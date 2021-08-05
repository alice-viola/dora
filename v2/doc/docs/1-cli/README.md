---
title: Install 
---

<Block>

## Install

Installing the CLI is very easy.
On Unix-like systems there is a bash script that will do all the things
for you, like downloading the desired version and put it on the right
folder (*/usr/local/bin*). 

On Windows system you can download it directly from our servers,
and put it where you need in your filesystem. 

::: warning UPDATE IT!
Keep in mind to use the latest available version: although the CLI 
is well tested and used, we often do little improvements on it.

**To update it use the same procedure used for installing it**
:::

<Example>

Linux

```sh
wget https://dora.promfacility.eu/dora.sh
chmod 755 dora.sh
sudo ./dora.sh 0.8.0 linux-x64 cli
```

MacOS

```sh
wget https://dora.promfacility.eu/dora.sh
chmod 755 dora.sh
./dora.sh 0.8.0 macos-x64 cli
```

Windows

```
Go and download the CLI exe:
https://dora.promfacility.eu/releases/0.8.0/cli/win-x64/dora.exe
```

</Example>

</Block>

<Block>

### Initialize

After the installation of the CLI, you need to init it with your token and API server.

You need three things:

- **name**: it's about you, you can set everything you want
- **api-server**: the https API url, provided by your cluster admin
- **token**: your personal access token, the same used in the Web App


```sh
dora profile init {{name}} --api-server {{api-server}} --token {{token}} 
```

<Example>

Assuming the following variable values:

- name: mydora
- api-server: https://api.yourdora.com
- token: SuperSecretBase64Token

To init the CLI:

```sh
dora profile init mydora --api-server https://api.yourdora.com --token SuperSecretBase64Token
```


</Example>

</Block>

<Block>

### Test the CLI

Once the CLI is installed and initialized, try it

Almost all the commands follows the same syntax:

**dora {operation} {resource} [name] [options]**


::: warning WINDOWS ONLY
On windows you must use `./dora.exe`  
:::


Some examples:

**Get**

- `dora get wk` returns your workloads in your default workspace
- `dora get c` returns your containers in your default workspace
- `dora get vol` returns your volume in your default workspace

**Describe**

- `dora describe wk myworkload.red` returns you workload object as JSON


Type `dora -h` to see the complete list of commands


<Example>

```sh
dora get gpu
```

```sh
kind  zone       node        product_name          minor_number  temperature  power              memory               booked  allowed
-------------------------------------------------------------------------------------------------------------------------------------
gpu   dc-rov-01  endor       GeForce GTX 1080 Ti   0             32 C/96 C    8.36 W/250.00 W    102 MiB/11175 MiB    false   true   
gpu   dc-rov-01  endor       GeForce GTX 1080 Ti   1             33 C/96 C    9.33 W/250.00 W    6 MiB/11178 MiB      false   true   
gpu   dc-rov-01  jakku       GeForce GTX 1080 Ti   0             60 C/96 C    74.16 W/250.00 W   4471 MiB/11169 MiB   true    true   
gpu   dc-rov-01  jakku       GeForce GTX 1080 Ti   1             43 C/96 C    10.12 W/250.00 W   2 MiB/11178 MiB      false   true   
```




</Example>

</Block>

<Block>

## Apply a Workload

Save a file named, for example, **workload.yaml**, with this content:

```yaml
---
apiVersion: v1
kind: Workload
metadata:
  zone: dc-rov-01
  name: blue.red
spec:
  replica:
    count: 1
  driver: Docker
  notify:
    byEmail: false
  selectors:
    gpu:
      product_name: All
      count: 1
  image: 
    image: ubuntu
    pullPolicy: IfNotPresent
  config: 
    cmd: /bin/bash
  volumes:
    - name: home
      target: /home
```


<Example>

Apply it:

```sh
dora apply -f workload.yaml
```

> The system will create your resource


Monitor it

```sh
dora get wk
```

```sh
kind      zone       workspace     name            desired  image   gpu  replica  eta
------------------------------------------------------------------------------------
workload  dc-rov-01  amedeo.setti  blue.red        run      ubuntu  1    1/1      1m 
```


Get the related container

```sh
dora get c
```

```sh
kind       zone       workspace     name        desired  image   node   status   eta  reason
--------------------------------------------------------------------------------------------
container  dc-rov-01  amedeo.setti  blue.red.1  run      ubuntu  endor  running  10s  null  
```

</Example>

</Block>

<Block>

## Connect to a container

```sh
dora shell c {{containerName}}
```

<Example>
```sh
dora shell c blue.red.1
```
</Example>

</Block>


<Block>

## Delete resources

If you have the original YAML file used to create the resource,
you can delete the objects created with that file simply with the  `delete`
command.

You can also delete it directly specifying the resource kind
and the name:

`dora delete {kind} {name}`

<Example>
```sh
dora delete -f myfile.yaml
```

```sh
dora delete wk blue.red
```

</Example>

</Block>


<Block>

## Transfer files

Sooner or later you will have to transfer file to and from the cluster.

::: warning Keep in mind
Dora support these operation only to files presents in named volumes,
not directly inside a random location of a container.
:::

You have four command to manage files:

- `ls` to explore a volume content
- `sync` to upload and watch changes on local file system 
- `upload` to upload files from your filesystem to a Dora volume
- `download` to download files from a Dora volume and your filesystem

::: tip TUS
Sync and upload functions implements TUS, the resumable protocol
to upload big quantity of data without worrying about network
issues. 
:::

<Example>

In all these examples, your volume is named `home`,
and inside these volume there is a folder named `test`

```sh
dora ls home
dora ls home /test
```

```sh
dora sync /your/localpath home /test
```

```sh
dora upload /your/localpath home /newtest
```

```sh
dora download home /newtest /your/localpath/down
```

</Example>

</Block>


<Block>

## Select the workspace


Almost every command accepts the **-g** option, that will select which workspace 
to use.

<Example>

```sh
dora get wk -g my.workspace.2
```
</Example>

</Block>


