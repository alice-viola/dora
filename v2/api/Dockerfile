FROM node:16

WORKDIR /usr/src/app

RUN mkdir -p ./api && mkdir -p ./core
COPY ./api/package*.json ./api/

COPY ./api ./api/
COPY ./core ./core/

WORKDIR /usr/src/app/core
RUN npm install --only=production

WORKDIR /usr/src/app/api
RUN npm install --only=production

CMD ["npm", "start" ]

