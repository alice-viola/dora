FROM node:13

WORKDIR /usr/src/app

COPY . . 

RUN npm install --only=production
RUN npm install pm2 -g

WORKDIR /usr/src/app/src/tus-node-server
RUN npm install --only=production

WORKDIR /usr/src/app

CMD ["pm2-runtime", "npm", "--", "start"]
