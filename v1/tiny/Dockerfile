FROM node:13

WORKDIR /usr/src/app

RUN mkdir ./api && mkdir ./libcommon && mkdir ./scheduler && mkdir ./scheduler-executor && mkdir ./worker && mkdir ./cli

COPY ./controlplane/api/ ./api/
COPY ./controlplane/libcommon/ ./libcommon/
COPY ./controlplane/scheduler/ ./scheduler/
COPY ./controlplane/scheduler-executor/ ./scheduler-executor/
COPY ./node-client/ ./worker/
COPY ./cli/ ./cli/

WORKDIR /usr/src/app/libcommon
RUN npm install --only=production

WORKDIR /usr/src/app/api
RUN npm install --only=production

WORKDIR /usr/src/app/scheduler
RUN npm install --only=production

WORKDIR /usr/src/app/scheduler-executor
RUN npm install --only=production

WORKDIR /usr/src/app/worker
RUN npm install --only=production

WORKDIR /usr/src/app/cli
RUN npm install --only=production

WORKDIR /usr/src/app
RUN npm install -g pm2

ENV secret=tinypwm
ENV zone=tinyzone

CMD cd api && /usr/local/bin/pm2 start index.js && cd ../scheduler && pm2 start index.js && cd ../scheduler-executor && pm2 start index.js && cd ../worker && pm2 start index.js && sleep infinity
