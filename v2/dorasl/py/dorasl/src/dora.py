import os
import json
import base64
import time
import signal
import sys
import atexit
import subprocess

class DoraCore:
	def __init__ (self):
		self.executable = 'dora'
		self._debug = True

	def set_executable(self, str):
		self.executable = str		

	def wait (self, seconds):
		time.sleep(seconds)

	def _compose (self, *args):
		return ' '.join(args)

	def _exec (self, str):
		os.system(str)

	def _exec_popen (self, str):
		return os.popen(str).read()

	def _exec_detach (self, str):
		subprocess.Popen(str, 
			stdout=subprocess.DEVNULL,
    		stderr=subprocess.DEVNULL,
    		stdin=subprocess.DEVNULL)

	def _print (self, text):	
		if self._debug == True:
			print(text)


class Workload(DoraCore):
	def __init__ (self, name =None):
		DoraCore.__init__(self)
		self._workload = {
			'replica': 1,
			'volumes': [],
			'image': 'ubuntu'
		}

		if name is not None:
			self._workload['name'] = name

		self.formattedWorkload = {
			'apiVersion': 'v1',
			'kind': 'Workload',
			'metadata': {
				'name': self._workload['name'],
			},
			'spec': {
				'replica': {
					'count': 1
				},
				'driver': 'Docker',
				'selectors': {

				},
				'image': {
					'image': 'ubuntu'
				},
				'config': {
				 	'cmd': '/bin/bash'
				},
				'volumes': [],
				'network': {
					'mode': 'none',
					'ports': [] 
				}
			}
		}



	def set_workspace (self, data):
		self.formattedWorkload['meta']['workspace'] = data
		return self

	def set_zone (self, data):
		self.formattedWorkload['meta']['zone'] = data
		return self	

	def set_name (self, data):
		self.formattedWorkload['meta']['name'] = data
		self._workload['name'] = data
		return self

	def set_image (self, data):
		self.formattedWorkload['spec']['image']['image'] = data
		return self

	def set_pull_policy (self, data):
		self.formattedWorkload['spec']['image']['pullPolicy'] = data
		return self		

	def set_replica (self, data):
		self.formattedWorkload['spec']['replica']['count'] = data
		return self	

	def set_cmd (self, data):
		self.formattedWorkload['spec']['config']['cmd'] = data
		return self		

	def set_affinity (self, data):
		self.formattedWorkload['spec']['config']['affinity'] = data
		return self		

	def set_restart_policy (self, data):
		self.formattedWorkload['spec']['config']['restartPolicy'] = data
		return self						

	def set_shm_size (self, data):
		self.formattedWorkload['spec']['config']['shmSize'] = data
		return self						

	def set_cpu (self, kind, count):
		self._workload['cpuKind'] = kind
		self._workload['cpuCount'] = count
		return self

	def set_gpu (self, kind, count):
		self._workload['gpuKind'] = kind
		self._workload['gpuCount'] = count
		return self		

	def set_network_mode (self, mode):
		self.formattedWorkload['spec']['network']['mode'] = mode
		return self

	def add_network_bridge_port (self, data):
		self.formattedWorkload['spec']['network']['ports'].append(data)
		return self		

	def del_volumes(self): 
		self.formattedWorkload['spec']['volumes'] = []
		return self

	def add_volume(self, data): 
		self.formattedWorkload['spec']['volumes'].append(data)
		return self

	def drain (self, kind, name):
		cmd = self._compose(self.executable, 'delete', kind, name)
		self._exec(cmd)		

	def drain_on_exit (self):
		def signal_handler(self, sig, frame):
		    self._print('Drain workload before exit')
		    self.drain('wk', self._workload['name'])
		    sys.exit(0)	
		def exit_handler(self):
		    self._print('Drain workload before exit')
		    self.drain('wk', self._workload['name'])
		    sys.exit(0)			    

		atexit.register(exit_handler, self)
		signal.signal(signal.SIGINT, signal_handler)

	def wait_readiness (self, index):
		torun = True
		last_status = '' 
		self._print('Waiting workload readiness...')

		while torun:
			time.sleep(1)
			cmd = self._compose(self.executable, 'describe', 'c', self._workload['name'] + '.' + index, '--json')
			wk = self._exec_popen(cmd)
			wkJson = json.loads(wk)
			if type(wkJson) is dict:
				observed = wkJson['observed']
				if observed is not None:
					state = observed['state']
					if last_status != state:
						print('Workload status updated: ', state.upper())
						last_status = state
					if state == 'failed':
						print('Workload status failed because: ', observed['reason'])
						torun = False	
					if state == 'running':
						torun = False	

	def exec (self, index, cmd, detach = False):
		def parse_cmd(cmd):
			if type(cmd) is list:
				return ','.join(cmd)
			else:
				return cmd

		if detach == True:
			cmdArray = self.executable.split() + ['shell', 'c', self._workload['name'] + '.' + index, parse_cmd(cmd)]
			self._exec_detach(cmdArray)
		else:
			cmd = self._compose(self.executable, 'shell', 'c', self._workload['name'] + '.' + index, parse_cmd(cmd))
			self._exec(cmd)


	def apply(self):
		if self._workload['gpuKind'] is not None:
			self.formattedWorkload['spec']['selectors']['gpu'] = {'product_name': self._workload['gpuKind'], 'count': self._workload['gpuCount']}
		elif self._workload['cpuKind'] is not None:
			self.formattedWorkload['spec']['selectors']['cpu'] = {'product_name': self._workload['cpuKind'], 'count': self._workload['cpuCount']}

		js_wk = json.dumps(self.formattedWorkload, separators=(',', ':')) 
		
		sample_string_bytes = js_wk.encode("ascii")
		base64_bytes = base64.b64encode(sample_string_bytes)
		base64_string = base64_bytes.decode("ascii")

		cmd = self._compose(self.executable, 'apply', '--base64-json-string', base64_string)
		self._exec(cmd)							


class Dora(DoraCore):
	def __init__ (self):
		DoraCore.__init__(self)
		self._workload = {}

	def close (self):
		sys.exit()

	## Generic dora cli calls
	#
	def get (self, kind):
		cmd = self._compose(self.executable, 'get', kind, '--json')
		self._exec(cmd)

	def describe (self, kind, name):
		cmd = self._compose(self.executable, 'describe', kind, name)
		self._exec(cmd)		

	def drain (self, kind, name):
		cmd = self._compose(self.executable, 'delete', kind, name)
		self._exec(cmd)		

	def sync (self, src, volume, subpath, detach): 
		if detach == True:
			self._print('Start sync in detached mode')
			cmdArray = self.executable.split() + ['sync', src, volume, subpath]
			self._exec_detach(cmdArray)
		else:
			cmd = self._compose(self.executable, 'sync', src, volume, subpath)
			self._exec(cmd)		

	def upload (self, src, volume, subpath): 
		cmd = self._compose(self.executable, 'upload', src, volume, subpath)
		self._exec(cmd)	
	

	def ls (self, volume, subpath): 
		cmd = self._compose(self.executable, 'ls', volume, subpath)
		self._exec(cmd)		

	## Workload
	#
	def Workload (name):
		return Workload(name)

			



