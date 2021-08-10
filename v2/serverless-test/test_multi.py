import os

if os.environ.get('RUN_ON_DORA'):
	import dorasl as DoraServerless
	dora = DoraServerless.Dora()	

	number_of_replicas = 3
	number_of_gpu = 1
	number_of_cpu = '200m'

	dora.upload('./', 'home', 'pytest45')
	dora.sync('./', 'home', 'pytest45', True)
	
	# Setup the workload
	wk = DoraServerless.Workload('my.py') 
	wk.set_replica(number_of_replicas)
	wk.set_image('tensorflow/tensorflow')
	wk.set_gpu('', number_of_gpu)
	#wk.set_cpu('All', number_of_cpu)
	wk.add_volume({'name': 'home', 'target': '/home'})

	wk.drain_on_exit()
	wk.apply()

	for x in range(number_of_replicas):
		wk.wait_readiness(str(x + 1))

	#for x in range(number_of_replicas):
	#	wk.exec(str(x + 1), ['python3', '/home/pytest1/test.py'], False)		
	
	wk.exec('1', '/bin/bash')
	
	dora.close()

# This is what will be executed inside Dora
import time

for x in range(50):
  print(x)
  time.sleep(1)

