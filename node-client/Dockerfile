FROM node:13

WORKDIR /usr/src/app

COPY . . 

RUN npm install --only=production
RUN npm install pm2 -g

CMD ["pm2-runtime", "npm", "--", "start"]
