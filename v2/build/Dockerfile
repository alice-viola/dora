FROM node:16

WORKDIR /usr/src/app

RUN apt update && apt install -y git docker.io -y

COPY ./run_dock_dev.sh ./run_dock_dev.sh
COPY ./run_dock_prod.sh ./run_dock_prod.sh
COPY ./doraaipwd.txt ./doraaipwd.txt 

RUN chmod 755 run_dock_dev.sh
RUN chmod 755 run_dock_prod.sh

CMD ["/bin/bash"]