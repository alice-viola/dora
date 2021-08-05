---
title: Requirements
---

Dora setup is highly customizable, so you can have one "cluster" with only one node, both
for controlplane and compute, or have hundreds of nodes that talk togheter.

**By the way, we will teach you how to setup a typical cluster, with 10-20 compute nodes,
one or two storage, and some nodes dedicated for the control plane.**

::: tip Scale up

If you manage to setup a cluster of this size, should be straightforward to scale up
to more nodes or to join another cluster.
:::

::: warning Run on Kubernetes
We will show first how to setup with Docker commands in order to explain better the steps
involved in the Dora startup.
Running the control plane on a k8s cluster will be explained at the end of this guide.
:::

::: tip Architecture
Before to startup a cluster, you should read the [Architecture section](/5-architecture), in order to understand every component you need to have to run a cluster.

:::

So the requirements are the following:

- `Some nodes with Docker engine installed`
- `Some nodes with NFS enabled` [not strict mandatory]
- `Free network between these nodes` If a firewall is present, we will tell you which ports needs to be open
- `An SSL certificate for exposing the API to the internet` [not strict mandatory]

All the Dora services can runs on these OS:

- Linux
- MacOS 
- Windows 

In this guide we will show the commands for a Linux cluster.

The steps we follow to setup a cluster are:

1. Setup a ScyllaDB database cluster on three nodes
2. Setup the API server on two nodes
3. Load balance between the two API server with an external L7 reverse proxy (Nginx)
4. Install the CLI on your PC, with the admin profile
5. Setup the scheduler
6. Setup the storage nodes
7. Setup the compute nodes
8. Create the first user and his first workload

Let's go!


## Database

ScyllaDB can be a only one container or a cluster containers. For production enviroments, the latter
is better, so we will setup a three node ScyllaBD cluster.

- DB Node 1: 10.10.10.1
- DB Node 2: 10.10.10.2
- DB Node 3: 10.10.10.3

On the first node (with IP 10.10.10.1):

```sh
mkdir -p /var/dora/db
docker run -d -it -v /var/dora/db:/var/lib/scylla -p 7000:7000 -p 7001:7001 -p 7199:7199 -p 9042:9042 --name doradb1 doraai/dora.db --smp=2
```

On the other to nodes:


```sh
mkdir -p /var/dora/db
docker run -d -it -v /var/dora/db:/var/lib/scylla -p 7000:7000 -p 7001:7001 -p 7199:7199 -p 9042:9042 --name doradb2 doraai/dora.db  --seeds=10.10.10.1
```

```sh
mkdir -p /var/dora/db
docker run -d -it -v /var/dora/db:/var/lib/scylla -p 7000:7000 -p 7001:7001 -p 7199:7199 -p 9042:9042 --name doradb3 doraai/dora.db  --seeds=10.10.10.1
```

Of course you can mount every path you want for the persistent storage, also (and you should)
an NFS storage.

Scylla requires some special CPU instruction set, so if it fail the startup, check that the machine 
you used meets the requirements of ScyllaDB.


## API server

We install the API server on two nodes, with these assumptions:

- API Node 1: 10.10.10.22
- API Node 2: 10.10.10.23
- Zone name: dora-cluster-1
- DB name: dora-db-1
- Designated node port: 3000  
- Secret: aVeryLongSecretEncrypted
- Access to node's /var/run/docker.sock [we need this because the API server will startup some internal containers]  
- Privileged


On the first node (with IP 10.10.10.22):

```sh
docker run -d -p 3000:3000 --privileged -v /var/run/docker.sock:/var/run/docker.sock -e ZONE=dora-cluster-1 -e secret=aVeryLongSecretEncrypted -e CONTACT_POINTS=10.10.10.1:9042,10.10.10.2:9042,10.10.10.3:9042 -e INIT_DB='true' -e DB_NAME=dora-db-1 -e HOST_IP=10.10.10.22 --name dora.api.1 doraai/dora.ai:0.8.0 
```

The API server will setup the DB tables at startup.
After 1-2 minutes, on the second node (with IP 10.10.10.23)

```sh
docker run -d -p 3000:3000 --privileged -v /var/run/docker.sock:/var/run/docker.sock -e ZONE=dora-cluster-1 -e secret=aVeryLongSecretEncrypted -e CONTACT_POINTS=10.10.10.1:9042,10.10.10.2:9042,10.10.10.3:9042 -e DB_NAME=dora-db-1 -e HOST_IP=10.10.10.23 --name dora.api.2 doraai/dora.ai:0.8.0
```

On the first machine:

```sh
docker logs dora.api.1
```

Search and find the generated admin token, that you must use to setup the other components.

**Admin token is generated only once, at the first database init**

If you plan to use NFS storage, you must enable NFS on every API server (assuming Debian based machine):

```sh
sudo apt update
sudo apt install nfs-common
```

Also, pre pull on every API node the **dora.sync** image:

```sh
docker pull doraai/dora.sync:0.8.0
```

## Load balance between API server

In order to provide HA, you can choose to use a virtual IP between the API servers, with *keepalived*
or similar tools, or to balance between the two API server through a reverse proxy like Nginx.
Futhermore, you should use a reverse proxy to do SSL termination: the API server can load
SSL certificates but it doesn't have good performance.

In the second case, the reverse proxy must support WebSockets, because some API calls
are based on it.

::: warning SSL 
Exposing the API server without SSL is highly discouraged and it doesn't work properly. Use whatever service you want but
**use** SSL
:::

An example for Nginx is the following:


```sh
upstream doraapi {
    hash $remote_addr;
    server 10.10.10.22:3000;
    server 10.10.10.23:3000;
}

server {
    listen 443 ssl;
    server_name yourdoraapi.com;

    include sites-available/certs/doraapisslcerts.conf;

    location / {
        proxy_pass http://doraapi;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-NginX-Proxy true;
        proxy_set_header Host $host;   
        proxy_buffers 8 32k;
        proxy_buffer_size 64k;
        proxy_hide_header X-Powered-By;
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
        proxy_max_temp_file_size 0; 
    }
}
```

## Install the admin CLI

By now the Webapp should be up and running, and you can use it instead to setup
the cluster, but is a good practice to have a CLI configured with the admin profile.

[Follow these step to install the CLI, using the admin token you get before](/1-cli)

## Scheduler

On one node, start the scheduler:

```sh
docker run -d -e ZONE=dora-cluster-1 -e CONTACT_POINTS=10.10.10.1:9042,10.10.10.2:9042,10.10.10.3:9042 -e DB_NAME=dora-db-1 --name dora.scheduler.1 doraai/dora.scheduler:0.8.0
```

The control plane setup is now complete, up and running. 

## Storage

If you have a NAS with NFS enabled, go to the NAS and setup an entry point
for the storage.

Assuming your NAS address is 10.10.10.31 and the mount path is /dorastorage,
save this file (zoneAndStorage.yaml) somewhere on your PC (the one with the admin CLI)

``` yaml{5,11}
---
apiVersion: v1
kind: Zone
metadata:
  name: dora-cluster-1

---
apiVersion: v1
kind: Storage
metadata:
  zone: dora-cluster-1
  name: dora.storage.01
spec:
  endpoint: 10.10.10.31
  mountpath: /dorastorage
  kind: NFS
```

then:

```sh
dora apply -f zoneAndStorage.yaml
```

## Nodes

Nodes communicate with the API server like they are normal clients,
so they need a token.

First, create the **role** *node-rep* and user *node*, with a file named nodeRole.yaml:

```yaml
---
apiVersion: v1
kind: Role
metadata:
  name: node-rep
spec: 
  permission:
    Node: 
      - report

---
apiVersion: v1
kind: User
metadata:
  name: node
spec:
  resources:
    - kind: Node
      zone: All
      workspace: All
      role: node-rep
```

```sh
dora apply -f nodeRole.yaml
```

Then create the access token for nodes:

```sh
dora token create node node 1
```

::: tip Keep the token 
The last command will print off a token, keep it.
:::

Now, for every node you want to use, apply this file *nodes.yaml* (you can group all the nodes in a file)

```yaml
---
apiVersion: v1
kind: Node
metadata:
  zone: dora-cluster-1
  name: node1
spec:
  endpoint: https://10.10.10.41:3001
  allow: 
    - CPUWorkload

---
apiVersion: v1
kind: Node
metadata:
  zone: dora-cluster-1
  name: node2
spec:
  endpoint: https://10.10.10.42:3001
  allow: 
    - GPUWorkload    

# And so long
```

```sh
dora apply -f nodes.yaml
```

Ok, the API now knows which node can trust.
Go on every node and start the **dora.node** service.

For CPUS enabled nodes:

```sh
docker run -d  -p 3001:3001 --pid=host -v /var/run/docker.sock:/var/run/docker.sock -e API_ENDPOINT=https://yourdoraapi.com -e NODE_NAME=node1 -e API_TOKEN=TheTokenObtainedWithTheCLI --name dora.node doraai/dora.node:0.8.0
```

For GPUS enabled nodes:

::: warning Windows GPU nodes
As usual, doing things in Windows systems is a different story than on Unix-like systems.
To use GPU inside Docker on Windows you should enable your node with specific components
that will enable GPU passthrough to Docker.

Good luck
:::

```sh
docker run -d  -p 3001:3001 --pid=host --gpus all -v /var/run/docker.sock:/var/run/docker.sock -e API_ENDPOINT=https://yourdoraapi.com -e NODE_NAME=node2 -e API_TOKEN=TheTokenObtainedWithTheCLI --name dora.node doraai/dora.node:0.8.0
```

If you plan to use NFS storage, you must enable NFS on every node server (assuming Debian based machine):

```sh
sudo apt update
sudo apt install nfs-common
```

With the CLI, verify the nodes status is READY:

```sh
dora get nodes
kind  zone       name              endpoint                     cpu                                           gpu                     lastSeen  desired  status                          version             
-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
node  dora-cluster-1  node1        https://10.10.10.41:3001       56xIntel(R) Xeon(R) Gold 6132 CPU @ 2.60GHz   -                       now       run      READY                           0.8.0
```

## Create users

First, create the user **role**, you can customize this, but the one reported here is good example.

```yaml
---
apiVersion: v1
kind: Role
metadata:
  name: user
spec: 
  permission:
    Workload:
      - Apply
      - Delete
      - Get
      - Describe
      - Pause
      - Resume
      - Event
      - Version
    Container:
      - Apply
      - Delete
      - Get
      - Describe
      - Pause
      - Resume
      - Shell
      - Token
      - Log
      - Event
    Volume:
      - Get
      - Describe
      - Use
      - Upload
      - Download
      - Ls
      - Sync
    Project: 
      - Apply
      - Delete
      - Get
      - Describe
    Storage:
      - Get
      - Describe
    CPU: 
      - Get
    GPU: 
      - Get
    Resourcecredit: 
      - Get
      - Describe
    Usercredit: 
      - GetOne
      - Describe
    Workspace:
      - Clone     
    User: 
      - Credits 
```

Then create how many users and workspaces you want:

```yaml
---
apiVersion: v1
kind: Workspace
metadata:
  name: amedeo.setti

--- 
apiVersion: v1
kind: User
metadata:
  name: amedeo.setti
spec:
  default:
    workspace: amedeo.setti
    zone: dora-cluster-1
  resources:
    - kind: All
      zone: dora-cluster-1
      workspace: amedeo.setti
      role: user
  credits:
    - zone: dora-cluster-1
      weekly: 500
```

Is a good idea to provide to every user a **volume**:


```yaml
---
apiVersion: v1
kind: Volume
metadata:
  zone: dora-cluster-1
  group: amedeo.setti
  name: home
spec:
  storage: dora.storage.01
```


Generate the token for this user:

```sh
dora token create amedeo.setti amedeo.setti 1
```

**Now your cluster is ready, provide the token to the user and it can start to deploy workloads**

## Credit checker

If you want to enforce credit checks in your cluster, run this container in one node (one per zone like the scheduler);

```sh
docker run -d -e ZONE=dora-cluster-1 -e CONTACT_POINTS=10.10.10.1:9042,10.10.10.2:9042,10.10.10.3:9042 -e DB_NAME=dora-db-1 --name dora.creditsys.1 doraai/dora.creditsys:0.8.0
```

Than apply your resource credit definition:

```yaml
--- 
apiVersion: v1
kind: Resourcecredit
metadata:
  name: Tesla V100-SXM2-16GB
spec:
  product_name: Tesla V100-SXM2-16GB
  credit: 
    per:
      hour: 2.5
  annotations:
    priceUnit: €
```


## Run on Kubernetes

If you want to run the controlplane on k8s, create the namespace *dora* and apply these YAML files (assuming Nginx ingress):

::: warning
Double check these files, you should adapt it to your cluster. Also this is a very simple setup.
You should use StatefulSet both for DB and the API services.
::: 


```yaml
---
apiVersion: v1
kind: Namespace
metadata:
  name: dora

---
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: apidora
  namespace: dora
  annotations:
    nginx.ingress.kubernetes.io/affinity: "cookie"
    nginx.ingress.kubernetes.io/session-cookie-name: "routedora"
    nginx.ingress.kubernetes.io/session-cookie-expires: "172800"
    nginx.ingress.kubernetes.io/session-cookie-max-age: "172800"
spec:
  rules:
  - host: apidora.com
    http:
      paths:
      - backend:
          serviceName: apidora
          servicePort: 3000
        path: /

---
apiVersion: v1
kind: Service
metadata:
  labels:
    run: apidora
  name: apidora
  namespace: dora
spec:
  selector:
    run: apidora
  ports:
  - name: port-1
    port: 3000
    protocol: TCP
    targetPort: 3000
  sessionAffinity: ClientIP

---
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    run: apidora
  name: apidora
  namespace: dora
spec:
  replicas: 1
  selector:
    matchLabels:
      run: apidora
  template:
    metadata:
      labels:
        run: apidora
      namespace: dora
    spec:
      nodeSelector:
        kubernetes.io/hostname: node0      
      containers:
      - name: apidora
        imagePullPolicy: Always
        image: doraai/dora.api:0.8.0
        securityContext:
          privileged: true
          runAsUser: 0        
        env:
        - name: secret
          value: SUPER_SECRET
        - name: ZONE
          value: dora-storage-01
        - name: CONTACT_POINTS
          value: doradb1.dora.svc.cluster.local:9042
        - name: INIT_DB
          value: 'true'
        - name: DB_NAME
          value: doraprod01 
        - name: HOST_IP
          value: 10.10.10.63  
        ports:
          - containerPort: 3000
            name: apiport
        resources:
          limits:
            memory: 1024Mi
          requests:
            memory: 512Mi
        volumeMounts:            
          - mountPath: /var/run/docker.sock
            name: docker-sock
            readOnly: false          
      volumes:
        - name: docker-sock
          hostPath:
            path: "/var/run/docker.sock"
            type: File  

---
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    run: schedulerdora
  name: schedulerdora
  namespace: dora
spec:
  replicas: 1
  selector:
    matchLabels:
      run: schedulerdora
  template:
    metadata:
      labels:
        run: schedulerdora
      namespace: schedulerdora
    spec:
      containers:
      - name: schedulerdora
        imagePullPolicy: Always
        image: doraai/dora.scheduler:0.8.0
        env:
        - name: ZONE
          value: dora-storage-01
        - name: CONTACT_POINTS
          value: doradb1.dora.svc.cluster.local:9042
        - name: DB_NAME
          value: doraprod01    
        resources:
          limits:
            memory: 4096Mi
          requests:
            memory: 512Mi

---
apiVersion: v1
kind: PersistentVolume
metadata:
  name: dora.prod.db.01
  labels:
    type: dora.prod.db.01
spec:
  capacity:
    storage: 50Gi 
  accessModes:
    - ReadWriteMany 
  persistentVolumeReclaimPolicy: Retain 
  nfs:
    server: 10.10.10-81
    path: /dora-storage-01/db-01

---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: doradb01-pvc
  namespace: dora
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 50Gi 
  selector:
    matchLabels:
      type: "dora.prod.db.01"

---
apiVersion: v1
kind: Service
metadata:
  labels:
    run: doradb1
  name: doradb1
  namespace: dora
spec:
  selector:
    run: doradb1
  ports:
  - name: port-1
    port: 9042
    protocol: TCP
    targetPort: 9042
  - name: port-2
    port: 7000
    protocol: TCP
    targetPort: 7000 
  - name: port-3
    port: 7001
    protocol: TCP
    targetPort: 7001    
  - name: port-4
    port: 9160
    protocol: TCP
    targetPort: 9160  
  - name: port-5
    port: 10000
    protocol: TCP
    targetPort: 10000               
  sessionAffinity: ClientIP

---
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    run: doradb1
  name: doradb1
  namespace: dora
spec:
  replicas: 1
  selector:
    matchLabels:
      run: doradb1
  template:
    metadata:
      labels:
        run: doradb1
      namespace: dora
    spec:
      containers:
      - name: scylla
        imagePullPolicy: IfNotPresent
        image: doraai/dora.db
        ports:
          - containerPort: 7000
            name: intra-node
          - containerPort: 7001
            name: tls-intra-node
          - containerPort: 7199
            name: jmx
          - containerPort: 9042
            name: cql
        command:
          - ./docker-entrypoint.py
        args:
          - '--smp=2'
        resources:
          limits:
            memory: 4096Mi
          requests:
            memory: 1024Mi
        volumeMounts:
        - name: doradb01-pvc
          mountPath: /var/lib/scylla
      volumes:
      - name: doradb01-pvc
        persistentVolumeClaim:
          claimName: doradb01-pvc            
```
