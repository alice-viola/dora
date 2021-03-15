FROM node:13

WORKDIR /usr/src/app

RUN mkdir ./lib
COPY ./lib ./lib/

WORKDIR /usr/src/app/lib
RUN npm install --only=production


WORKDIR /usr/src/app/lib/schedulers/scheduler-executor
RUN npm install --only=production


CMD ["npm", "start" ]
