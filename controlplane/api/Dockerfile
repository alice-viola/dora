FROM node:13

WORKDIR /usr/src/app

RUN mkdir -p ./controlplane/api && mkdir -p ./lib
COPY ./controlplane/api/package*.json ./controlplane/api

COPY ./controlplane/api ./controlplane/api
COPY ./lib ./lib

WORKDIR /usr/src/app/lib
RUN npm install --only=production

WORKDIR /usr/src/app//controlplane/api
RUN npm install --only=production

CMD ["npm", "start" ]
