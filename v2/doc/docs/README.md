---
home: true
title: Dora
description: Welcome to the Dora homepage and documentation v0.8.0
actionText: Getting Started 
actionLink: /0-getting-started
footer: Open Source on [GitHub](https://github.com/adda25/dora), Made by [Amedeo Setti](https://github.com/adda25) @ [promfacility.eu](https://promfacility.eu), Power by Node.JS, Vue.JS, ScyllaDB, Docker. Vue press theme by [blog.sqrtthree.com](https://blog.sqrtthree.com/vuepress-theme-api)
---


<Section>

## Build for AI workloads

A easy-to-use system to allow every data scientist to have access to power hardware.
With out-of-the-box feature, all you need to do is install it on your cluster/s and start
melting your GPUs :tada:

<br>

<Button type="orange" to="https://hub.docker.com/u/doraai">Docker images</Button>

<Button type="light" to="/0-getting-started/">Getting Started</Button>

<Button type="orange" to="https://dora.promfacility.eu/releases/">Download zone</Button>

</Section>


# What is Dora

Dora is an **open source** and **free** distributed system for managing AI workloads easy. It's composed by a control plane (with an API, a scheduler and other services), by compute nodes, and by clients. Available clients are: CLI, Web App,
Electron App. Linux, MacOS and Windows are supported.

::: tip BETA 
Dora is in beta stage, release 0.8.0 :tada: :100:
:::


## Why Dora

With Dora you can setup and run complex AI experiments (but not only) with one command:

```yaml
# my.experiment.yaml
---
apiVersion: v1     
kind: Workload     
metadata:
  name: my.experiment  
spec:
  replica:
    count: 4
  driver: Docker   
  selectors:	   
    gpu:			
      product_name: 
      	- Tesla V100-SXM2-16GB 
      count: 8
  image: 
    image: tensorflow/tensorflow:lates-gpu	
  config: 
    cmd: python3 experiment.py
```

```sh
dora apply -f my.experiment.yaml 
```

Then you will have your workload running on **4** nodes each with **8** GPUs, in less then 5 seconds.

### UI Centric

If you don't want to mess up with shell commands, Dora has a beatiful, customizable web based UI

<div>
	<img src="./assets/ui1.png" width="100%" >
</div>

<div>
	<img src="./assets/ui2.png" width="100%" >
</div>



## Contribute on GitHub

With a pull request, an issue... or fork it and start develop your own version!

Star it! [GitHub](https://github.com/adda25/dora)
