---
title: Core Concepts
---


::: tip A note for Kubernetes users
If you ever used Kubernetes before, you will find a lot of similar
things when using Dora, like the CLI, the YAML files etc.

But apart from the *interface* similarities, Dora is a different
system, much more easier to develop and to maintain and oriented
to GPU clusters and AI workloads.

We have tried to provide a similar interface because we use
and **love** k8s, but we wanted also to build a system that can
be used with little effort by everyone. For instance, you will not find Pods, 
Deployments, Stateful set etc, but only Workloads. 

Also, the Dora network layer is of the most basic kind. 
When you will need *advanced* stuff like service discovery, 
vxlan, DNS and load balancing, you will use Dora to command
k8s pods. 
:::

## Resource division

Dora support the aggregation of multiple cluster (cluster
in diffents *intranet*) to form one system, where you
can choose in which **zone** operate from the same interface.
This is a *physical* division. Nodes and storage
of a cluster usually are not reachable in another cluster.

There is also the **workspace** division, a logical
division that allow the separation of resources.  

So inside Dora there are three kind of resources:

- `resources` these objects lives in every zone, every workspace
- `zoned_resources` these objects are relative to one zone
- `zoned_workspaced_resources` these objects are relative to one workpace inside a zone


The following picture should help to understand this division:

<img src="../assets/models.png" width="70%" >


### Resource kind

Starting from the previus division, we can now
list all the resource kind available in Dora.


| Kind      | Zoned | Workspaced |
|-----------|-------|------------|
| User      | no    | no         |
| Role      | no    | no         |
| Storage   | yes   | no         |
| Node      | yes   | no         |
| Credit    | yes   | no         |
| Workload  | yes   | yes        |
| Container | yes   | yes        |
| Volume    | yes   | yes        |


Every resource kind has is own YAML description, so in the following
part we will use these format to explain resources.


## Workloads	

Workloads are the main unit of Dora, the one the users need and use,
the one that is why we have built this system.

A workload definition can be really simple or a little bit less simple:
we start from the simple one.
**All the fields in this example are mandatory.**


```yaml
apiVersion: v1     # A cluster can have multiple API version 
kind: Workload     # This is the resource kind
metadata:
  name: blue.red   # Unique name in the zone/workspace
spec:
  driver: Docker   # Specify to use Docker driver [more drivers are available]
  selectors:	   # Select what hardware the workload need s	
    cpu:			
      product_name: All # Everything that is uppercase means is a Dora constant
      count: 1
  image: 
    image: ubuntu	# Docker image to use
  config: 
    cmd: /bin/bash  # Command to run 
```

In this example you don't specify the zone and the workspace,
so the system will apply the default zone and your default workspace.
Also you don't have volumes and networks, and only one replica.


A more complete example is the following:


```yaml
---
apiVersion: v1
kind: Workload
metadata:
  zone: dc-rov-01 		# Zone
  group: amedeo.setti   # Workspace [Both group and workspace are valid keys]
  name: blue.red
spec:
  replica:
    count: 2			# We want two of this
  driver: Docker
  notify:
    byEmail: false		
  selectors:
    gpu:
      product_name:     # We want this kind of gpus
      	- Quadro RTX 6000  
      	- Tesla V100-SXM2-16GB
      count: 2
  image: 
    image: ubuntu
    pullPolicy: Always  # We want to pull always the image before running [default to IfNotPresent]
  config: 
	cmd: /bin/bash
	affinity: Distribute
	restartPolicy: Always # [default Never]
	shmSize: 1000000000   # Shared memory size in bytes 
  volumes:				  # We want these volumes
    - name: home
      target: /home
    - name: imagenetpytorch
      workspace: datasets
      group: datasets
      target: /imagenet      
  network:				  # We want the port 25000->8008 open for ingress
  	mode: bridge
  	ports: 
  		- name: first
  		  kind: NodePort
  		  protocol: tcp
  		  nodePort: 25000
  		  port: 8008


```





