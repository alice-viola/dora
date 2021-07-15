FROM node:13

WORKDIR /usr/src/app

RUN mkdir -p ./sync && mkdir -p ./sync/smnt
COPY ./sync/package*.json ./sync/

COPY ./sync ./sync/

WORKDIR /usr/src/app/sync

RUN npm install --only=production
RUN npm install pm2 -g

WORKDIR /usr/src/app/sync/src/tus-node-server
RUN npm install --only=production

WORKDIR /usr/src/app/sync

CMD ["pm2-runtime", "npm", "--", "start"]
