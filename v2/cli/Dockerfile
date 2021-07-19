FROM node:16

WORKDIR /usr/src/app

RUN mkdir -p ./cli && mkdir -p ./core
COPY ./cli/package*.json ./cli/

COPY ./cli ./cli/
COPY ./core ./core/

WORKDIR /usr/src/app/core
RUN npm install --only=production

WORKDIR /usr/src/app/cli
RUN npm install --only=production

CMD ["/bin/bash"]

