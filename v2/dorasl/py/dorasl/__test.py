import os

# This is executed only on your local PC,
# when you run your script with RUN_ON_DORA=true
# env
#
# Then the module Dora will copy
# your files, build the workload,
# execute this file but without running
# this part on remote!
#
if os.environ.get('RUN_ON_DORA'):
	#import dorasl as DoraServerless
	from src import dora as DoraServerless

	dora = DoraServerless.Dora()
	
	# Copy all the files on volume [if you want]
	dora.upload('./', 'home', 'pytest1')
	
	# Sync all the files in detached mode,
	# so you can edit code on your PC and
	# get all the modification on the server real-time
	# [if you want]
	dora.sync('./', 'home', 'pytest1', True)
	
	# Setup the workload
	wk = DoraServerless.Workload('my.py') 
	wk.set_image('ubuntu')
	wk.set_gpu('All', 1)
	wk.add_volume({'name': 'home', 'workspace': 'amedeo.setti', 'target': '/home'})
	#wk.add_network_bridge_port({'name': 'first', 'protocol': 'tcp', 'kind': 'NodePort', 'nodePort': 25000, 'port': '8088'})

	wk.set_shm_size(1000000)
	wk.set_affinity('First')
	wk.set_restart_policy('Always')

	# When the process on your PC exit, kill also
	# on remote [if you want]
	wk.drain_on_exit()

	# Submit the workload to Dora cluster
	wk.apply()

	# Wait container '1' is ready
	wk.wait_readiness('1')
	
	# Exec on container '1' this script, detach it 
	# (so no stdin/out on your PC)
	wk.exec('1', 
		['python3', '/home/pytest1/test.py'], 
		True)
	
	# Open a shell on container 1, attach to 
	# local stdin and stdout	
	wk.exec('1', '/bin/bash')

	# Exit the process on your PC
	# so it doesn't execute the 'real' 
	# compute string				
	dora.close()

# This is what will be executed inside Dora
import time

for x in range(50):
  print(x)
  time.sleep(1)
