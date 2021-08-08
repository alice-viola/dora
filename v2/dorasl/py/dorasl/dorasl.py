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
		self._debug = True
		self.executable = 'dora'

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
			'volumes': []
		}	
		if name is not None:
			self._workload['name'] = name

	def set_name (self, data):
		self._workload['name'] = data
		return self

	def set_image (self, data):
		self._workload['image'] = data
		return self

	def set_cpu (self, kind, count):
		self._workload['cpuKind'] = kind
		self._workload['cpuCount'] = count
		return self

	def set_gpu (self, kind, count):
		self._workload['gpuKind'] = kind
		self._workload['gpuCount'] = count
		return self		

	def add_volume(self, name, target): 
		self._workload['volumes'].append({'name': name, 'target': target})
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
		self._print('Waiting workload readiness')
		while torun:
			time.sleep(1)
			cmd = self._compose(self.executable, 'describe', 'c', self._workload['name'] + '.' + index, '--json')
			wk = self._exec_popen(cmd)
			wkJson = json.loads(wk)
			if type(wkJson) is dict:
				observed = wkJson['observed']
				if observed is not None:
					state = observed['state']
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
		formattedWorkload = {
			'apiVersion': 'v1',
			'kind': 'Workload',
			'metadata': {
				'name': self._workload['name'],
				'workspace': 'amedeo.setti',
				'zone': 'dc-rov-01'
			},
			'spec': {
				'replica': {
					'count': 1
				},
				'driver': 'Docker',
				'selectors': {

				},
				'image': {
					'image': self._workload['image']
				},
				'config': {
				 	'cmd': '/bin/bash'
				},
				'volumes': self._workload['volumes']
			}
		}
		if self._workload['gpuKind'] is not None:
			formattedWorkload['spec']['selectors']['gpu'] = {'product_name': self._workload['gpuKind'], 'count': self._workload['gpuCount']}
		elif self._workload['cpuKind'] is not None:
			formattedWorkload['spec']['selectors']['cpu'] = {'product_name': self._workload['cpuKind'], 'count': self._workload['cpuCount']}

		js_wk = json.dumps(formattedWorkload, separators=(',', ':')) 
		
		sample_string_bytes = js_wk.encode("ascii")
		base64_bytes = base64.b64encode(sample_string_bytes)
		base64_string = base64_bytes.decode("ascii")

		print('----->', self.executable)
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

			



