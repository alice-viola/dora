FROM node:12

WORKDIR /usr/src/app

COPY . . 

RUN apt update && apt -y install vim nano
RUN npm install --only=production
RUN alias pwmcli="node index.js"
ENV pwmcli="node index.js"
RUN mkdir -p /root/.pwm/
CMD ["/bin/bash"]
