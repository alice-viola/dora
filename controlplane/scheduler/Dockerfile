FROM node:13

WORKDIR /usr/src/app

RUN mkdir ./scheduler && mkdir ./libcommon
COPY ./scheduler/package*.json ./scheduler/

COPY ./scheduler/ ./scheduler/
COPY ./libcommon/ ./libcommon/

WORKDIR /usr/src/app/libcommon
RUN npm install --only=production

WORKDIR /usr/src/app/scheduler
RUN npm install --only=production

CMD ["npm", "start" ]
