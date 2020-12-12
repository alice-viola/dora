FROM node:13

WORKDIR /usr/src/app

RUN mkdir ./scheduler-node-executor && mkdir ./libcommon
COPY ./scheduler-node-executor/package*.json ./scheduler-node-executor/

COPY ./scheduler-node-executor/ ./scheduler-node-executor/
COPY ./libcommon/ ./libcommon/

WORKDIR /usr/src/app/libcommon
RUN npm install --only=production

WORKDIR /usr/src/app/scheduler-node-executor
RUN npm install --only=production

CMD ["npm", "start" ]
