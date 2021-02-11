FROM node:13

WORKDIR /usr/src/app

RUN mkdir ./scheduler-executor && mkdir ./libcommon
COPY ./scheduler-executor/package*.json ./scheduler-executor/

COPY ./scheduler-executor/ ./scheduler-executor/
COPY ./libcommon/ ./libcommon/

WORKDIR /usr/src/app/libcommon
RUN npm install --only=production

WORKDIR /usr/src/app/scheduler-executor
RUN npm install --only=production

CMD ["npm", "start" ]
