FROM node:16

WORKDIR /usr/src/app

RUN mkdir -p ./node && mkdir -p ./core
COPY ./api/package*.json ./node/

COPY ./node ./node/
COPY ./core ./core/

WORKDIR /usr/src/app/core
RUN npm install --only=production

WORKDIR /usr/src/app/node
RUN npm install --only=production

CMD ["npm", "start" ]

