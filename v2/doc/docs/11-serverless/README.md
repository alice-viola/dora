---
title: Driver
---

# Driver

We provide a Python package, available on PiP, that allow you
to deploy code on Dora cluster from your source code.

::: warning ALPHA
The current driver version (0.1.5) does not enforce input checking,
so don't play with it too much.  
:::

The driver talk with the CLI binary under the hood, so you must have
installed the CLI before using it [Install CLI](../1-cli).

::: warning Windows
The driver does not check your OS, so on Windows you have to set
the Dora CLI executable location. Example below.
:::

**To install Dora Serverless Module:**

```sh
pip install dorasl==0.1.5
```

[Module source code](https://github.com/adda25/dora/blob/develop/v2/dorasl/dorasl/dorasl.py)

[Module on PyPi](https://pypi.org/project/dorasl/)

## From your local code to Dora clusters

Image that your very resource demanding experiment is the following :D (*main.py*)

```py
# main.py

import time

for x in range(100):
  print(x)
  time.sleep(1)
```

What you usually do to run on your pc is:   

```sh
python3 main.py
```

And then the experiment will run on your laptop. 

**But what if you want to run it on Dora cluster, maybe powered 4 Tesla V100?**

With this Python module it's really easy to run the same code on remote!

Modify your code like this, insert at the very top of your entry point file:

```py
import os

if os.environ.get('RUN_ON_DORA'):
	import dorasl as DoraServerless
	dora = DoraServerless.Dora()

	# Copy all the files on volume [if you want]
	dora.upload('./', 'home', 'myexperimentcode')

	# Setup the workload
	wk = DoraServerless.Workload('my.experiment') 
	wk.set_gpu('All', 1)	
	wk.add_volume({'name': 'home', 'target': '/home'})

	# Submit the workload to Dora cluster
	wk.apply()

	# Wait container '1' is ready
	wk.wait_readiness('1')	

	# The container is ready!
	# Start this process on remote and watch it on your terminal!
	wk.exec('1', ['python3', '/home/myexperimentcode/main.py'])	
				
	dora.close()	

## Original code: **this will be executed on Dora**
# main.py

import time

for x in range(100):
  print(x)
  time.sleep(1)
```

Then, on your PC:

```sh
RUN_ON_DORA=True python3 main.py
```


You can of course use other strategies (instead of *os.envrion*) to split the part running on Dora 
and the Dora commands, like args variables, other files etc. 

::: warning drain_on_exit
Use *drain_on_exit* function when you want to delete on remote when you close the process on your PC.
**Useful when you are testing before launch the entire process!**

```py
wk.drain_on_exit()
```
:::

## Methods

In this example there are all the function that you can use:

```py

import dorasl as DoraServerless

dora = DoraServerless.Dora()	

# Set the executable path on your SO,
# useful for Windows users.
dora.set_executable('C:\\MyPath\\dora.exe')


## Dora generic methods

# Copy all the files on volume [if you want]
dora.upload('./', 'home', 'pytest1')

# Sync all the files in detached mode,
# so you can edit code on your PC and
# get all the modification on the server real-time
# [if you want]
dora.sync('./', 'home', 'pytest1', True)

# List the content of your volume
dora.ls('home', '/')

# Get your workloads
dora.get('wk')

# Describe your container
dora.describe('c', 'my.container.1')


## Workload specific methods

# Setup the workload, set the Workload name here e.g: my.py
wk = DoraServerless.Workload('my.py')

# Default to the API server zone
wk.set_zone('dc-rov-01')

# Default to your workpace
wk.set_workspace('amedeo.setti') 

# Set replica count, default to 1
wk.set_replica(1)

# Set Docker base image
wk.set_image('tensorflow/tensorflow')

# [Never, Always] 
wk.set_pull_policy('Never')

# Set shared memory size (in bytes)
wk.set_shm_size(100000)

# Add a volume from your workspace
wk.add_volume({'name': 'home', 'target': '/home'})

# Add a volume from another workspace
wk.add_volume({'name': 'dataset-maximo', 'workspace': 'dataset', 'target': '/dataset'})

# Or GPU or CPU 
wk.set_gpu('Quadro RTX 6000', 2)

# Or GPU or CPU
wk.set_cpu('All', 1)

# [Never, Always]
wk.set_restart_policy('Never')

# [First, Random, Fill, Distribute]
wk.set_affinity('Distribute')

# [none, bridge, host]
wk.set_network_mode('bridge')

# Valid only for bridge mode
wk.add_network_bridge_port({
	'protocol': 'tcp',
	'kind': 'NodePort',
	'nodePort': 25123,
	'port': 8008,
	'name': 'myservice'
})


# When the process on your PC exit, kill also
# on remote [if you want]
wk.drain_on_exit()

# Submit the workload to Dora cluster
wk.apply()

# Delete NOW
wk.drain()

# Wait container '1' is ready
wk.wait_readiness('1')

# Exec on container '1' this script, detach it 
# (so no stdin/out on your PC)
wk.exec('1', 
	['python3', '/home/pytest1/test.py'], 
	True)

# Exec on container '1' this script, DO NOT detach it 
# (so stdin/out on your PC)
wk.exec('1', 
	['python3', '/home/pytest1/test.py'], 
	False)

# Open a shell on container 1, attach to 
# local stdin and stdout	
wk.exec('1', '/bin/bash')

# Exit the process on your PC
# so it doesn't execute the 'real' 
# compute string				
dora.close()

```

::: warning drain_on_exit
Use *drain_on_exit* function when you want to delete on remote when you close the process on your PC.
**Useful when you are testing before launch the entire process!**

```py
wk.drain_on_exit()
```
:::
