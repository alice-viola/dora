FROM node:13

WORKDIR /usr/src/app

RUN mkdir -p ./controlplane/messenger && mkdir -p ./lib
COPY ./controlplane/messenger/package*.json ./controlplane/messenger

COPY ./controlplane/messenger ./controlplane/messenger
COPY ./lib ./lib

WORKDIR /usr/src/app/lib
RUN npm install --only=production

WORKDIR /usr/src/app//controlplane/messenger
RUN npm install --only=production

CMD ["npm", "start" ]
