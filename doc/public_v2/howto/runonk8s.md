---

# Run on Kubernetes

The following YAML files are only examples, you should customize they.

## Setup the Control Plane

First create the PWM namespace:

```yaml
---
apiVersion: v1
kind: Namespace
metadata:
  name: pwm
```

?> You also need a Persistent Volume and a Persistent Volume Claim for the database, but you can follow the k8s guide in order to known how to deploy PVs.

You can use some deployments to run PWM controlplane inside k8s:

### Database

```yaml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    run: pwm-db
  name: pwm-db
  namespace: pwm
spec:
  replicas: 1
  selector:
    matchLabels:
      run: pwm-db
  template:
    metadata:
      labels:
        run: pwm-db
      namespace: pwm
    spec:
      containers:
      - name: pwm-db
        image: mongo
        command:
        - "mongod"
        - "--bind_ip"
        - "0.0.0.0"
        ports:
        - containerPort: 27017
        resources:
          limits:
            memory: 512Mi
          requests:
            memory: 256Mi
        volumeMounts:
        - name: pwmapi-pvc
          mountPath: /data/db
      volumes:
      - name: pwmapi-pvc
        persistentVolumeClaim:
          claimName: pwmapi-pvc
```

### API Server

```yaml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    run: pwm-api
  name: pwm-api
  namespace: pwm
spec:
  replicas: 1
  selector:
    matchLabels:
      run: pwm-api
  template:
    metadata:
      labels:
        run: pwm-api
      namespace: pwm
    spec:
      containers:
      - name: pwm-api
        imagePullPolicy: Always
        image: promfacility/pwm-api
        env:
        - name: secret
          value: <SUPER_SECRET_HERE>
        - name: dbhost
          value: "pwm-db.pwm"
        - name: dbname
          value: "<DB_NAME_HERE>"
        - name: zone
          value: "<ZONE_HERE>"
        ports:
        - containerPort: 3000
        resources:
          limits:
            memory: 1024Mi
          requests:
            memory: 512Mi
```

### Scheduler

```yaml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    run: pwm-scheduler
  name: pwm-scheduler
  namespace: pwm
spec:
  replicas: 1
  selector:
    matchLabels:
      run: pwm-scheduler
  template:
    metadata:
      labels:
        run: pwm-scheduler
      namespace: pwm
    spec:
      containers:
      - name: pwm-scheduler
        imagePullPolicy: Always
        image: promfacility/pwm-scheduler
        env:
        - name: dbhost
          value: "pwm-db.pwm"
        - name: dbname
          value: "<DB_NAME_HERE>"
        - name: zone
          value: "<ZONE_HERE>"
        resources:
          limits:
            memory: 1024Mi
          requests:
            memory: 512Mi
```

### Scheduler Executor

```yaml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    run: pwm-scheduler-executor
  name: pwm-scheduler-executor
  namespace: pwm
spec:
  replicas: 1
  selector:
    matchLabels:
      run: pwm-scheduler-executor
  template:
    metadata:
      labels:
        run: pwm-scheduler-executor
      namespace: pwm
    spec:
      containers:
      - name: pwm-scheduler-executor
        imagePullPolicy: Always
        image: promfacility/pwm-scheduler-executor
        env:
        - name: dbhost
          value: "pwm-db.pwm"
        - name: dbname
          value: "<DB_NAME_HERE>"
        - name: zone
          value: "<ZONE_HERE>"
        resources:
          limits:
            memory: 1024Mi
          requests:
            memory: 512Mi
```

## Worker nodes

For worker nodes, a DaemonSet will be appropriate:

?> Note that you need to mount the host Docker socket to the pwm-node. Think about security implications. 

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: pwm-node
  namespace: pwm
spec:
  selector:
    matchLabels:
      name: <LABEL_TO_MATCH_NODES>
  template:
    metadata:
      labels:
        name: <LABEL_TO_MATCH_NODES>
    spec:
      containers:
      - name: pwm-node
        image: promfacility/pwm-node
        resources:
          limits:
            memory: 1024Mi
          requests:
            cpu: 10000m
            memory: 512Mi
        volumeMounts:
        - name: dockersock
          mountPath: /var/run/docker.sock
      terminationGracePeriodSeconds: 5
      volumes:
      - name: dockersock
        hostPath:
          path: /var/run/docker.sock
```