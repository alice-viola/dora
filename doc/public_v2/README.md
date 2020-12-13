---

# ProM Workload Manager (PWM)

PWM is an open source GPU/CPU container workloads manager focused on the user needs.
It's not intended to be a replacement for others orchestrators.

It's composed by these elements: 

- Control plane (single or multiple)
- Computing nodes 
- CLI
- Web app

This documentation is both for users and admins. 

?> **Admins should read the entire docs before boostrapping the cluster(s),
users should reads at least Concepts and CLI sections.**


!> **Important** We are using PWM in test/production in our AI cluster @ promfacility.eu, powering 26 GPU and a few hundreds CPUs, but remember, **PWM is currently in the alpha stage, use at your risk** 



## Source code

[GitHub](https://github.com/adda25/pwm)

[GitLab](https://git.promfacility.eu/prom/pwm)

[Docker images](https://hub.docker.com/u/promfacility)

## Roadmap

- 1.0.0 First production release [February 2021]
- 0.9.x Pre release stage [January 2021]
- From 0.5.x to 0.8.9 Beta stage [January 2021]
- 0.4.x Full multi master controlplane [December 2020]
- 0.3.6-9 Transition to multi control plane [December 2020]

## Versions

- 0.3.6 Splitted control plane
- 0.3.5 Credits review and pause/resume
- 0.3.4 Credits and commit
- 0.3.3 Limits
- 0.3.2 Https base, Binds, every resource with a lifecycle.
- 0.3.1 Total rewrites of permission, added UI
- 0.3.0 Rewrite download, inspect, logs, top commands
- 0.2.99 Rewrite copy command
- 0.2.95 Fixed bug in cli compatibilityRequest
- 0.2.8 Rewritten pwmnode
- 0.2.7 Cmd docker to array, improved cpu and memory assignament to workloads
- 0.2.6 Changed the cmd append in driver.docker
- 0.2.5 Fixed bug if pull error
- 0.2.4 Fixed cp and download with new volume arch
- 0.2.3 Sub path on volumes
- 0.2.2 Permissions on volumes
- 0.2.1 Volumes
- 0.2.0 New profile managment
- 0.1.9 Fixed some bugs, improved locks. Top (stats) functions for nodes
- 0.1.8 Fixed some bugs. Added plugins (Telegram) and pwmadm
- 0.1.7 Added batch mode for apply,delete,stop. Batch scheduler for some operations. Improved permissions
- 0.1.6 Working on permissions
- 0.1.5 Fixed bugs
- 0.1.4 Added support for downloads, fixed unsecure ws, fixed shell setRaw
- 0.1.3 Local volumes and copy tested, unified GPUWorkload and CPUWorkload to Workload, added interative mode
- 0.1.2 Added support for local volumes and copy
- 0.1.1 Added support for CPUWorkload
- 0.1.0 Added support for GPUWorkload 
- First commit [End September 2020]

## Why PWM

We are developing PWM @ [ProM Facility](https://promfacility.eu), in order to simplify the usage of our cluster by non expert users.


## License

Copyright (c) 2020 ProM Facility, Trentino Sviluppo Spa, Amedeo Setti

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.