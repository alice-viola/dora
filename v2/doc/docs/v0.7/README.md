# Dora

> Schedule and run GPU and CPU container based workloads on remote servers and workstations

Dora is an Open Source distributed system developed in order to enable an easy setup and orchestration 
of AI/ML workloads.

Dora consumable hardware resources are divided in **zones**, where every user has is own **workspace**.

Users apply their workloads through Dora API REST, using the provided Command Line Interface (available for Unix-like OS),
the Web App (Compatible with every modern browsers) and an Electron App (Unix-like and Windows).

Dora has been tested with clusters of hundreds of GPU servers and thousands of containers. 


Dora stand for **Desired, Observed, Resources, Actions**, that are the main DB *column* which describe the desired state, the observed state, the resource wanted, and the actions to do in order to statisfy what user want.


Dora is developed in *Node.js*, *Vue.js* and uses *ScyllaDB* as Database.

The previus version of Dora was PWM (Prom facility Workload Manager).

?> **Admins should read the entire docs before boostrapping the cluster(s),
users should reads at least Concepts and CLI sections.**


!> **Important** We are using Dora in production in our AI cluster @ promfacility.eu, but remember, **Dora is currently in the beta stage, use at your risk** 