FROM node:16

WORKDIR /usr/src/app

RUN apt update && apt install -y git docker.io -y

COPY ./run_dock.sh ./run_dock.sh
COPY ./doraaipwd.txt ./doraaipwd.txt 

RUN chmod 755 run_dock.sh

CMD ["./run_dock.sh"]