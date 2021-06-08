FROM node:16

WORKDIR /usr/src/app

RUN mkdir -p ./scheduler && mkdir -p ./core
COPY ./api/package*.json ./scheduler/

COPY ./scheduler ./scheduler/
COPY ./core ./core/

WORKDIR /usr/src/app/core
RUN npm install --only=production

WORKDIR /usr/src/app/scheduler
RUN npm install --only=production

CMD ["npm", "start" ]

