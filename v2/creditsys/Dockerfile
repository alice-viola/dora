FROM node:16

WORKDIR /usr/src/app

RUN mkdir -p ./creditsys && mkdir -p ./core
COPY ./creditsys/package*.json ./creditsys/

COPY ./creditsys ./creditsys/
COPY ./core ./core/

WORKDIR /usr/src/app/core
RUN npm install --only=production

WORKDIR /usr/src/app/creditsys
RUN npm install --only=production

CMD ["npm", "start" ]

