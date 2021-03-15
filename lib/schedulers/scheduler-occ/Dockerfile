FROM node:13

WORKDIR /usr/src/app

RUN mkdir ./scheduler-occ && mkdir ./libcommon
COPY ./scheduler-occ/package*.json ./scheduler-occ/

COPY ./scheduler-occ/ ./scheduler-occ/
COPY ./libcommon/ ./libcommon/

WORKDIR /usr/src/app/libcommon
RUN npm install --only=production

WORKDIR /usr/src/app/scheduler-occ
RUN npm install --only=production

CMD ["npm", "start" ]
