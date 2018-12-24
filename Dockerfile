FROM node:8.7.0

COPY . /root

# WORKDIR /root

CMD npm i && npm start
