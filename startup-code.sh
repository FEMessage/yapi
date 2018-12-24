#!/bin/bash

cd `dirname $0`
#更新代码
git pull

#下载依赖
#docker run --rm -v "$PWD":/root -w /root node npm install -g python && npm install

#构建镜像
docker build --rm -t deepexi/yapi .

#删除容器
docker rm -f yapi &> /dev/null

docker run -d --restart=on-failure:5 \
    -w /root \
    -e TZ=Asia/Shanghai \
    -p 3000:3000 \
    -v $PWD/logs/:/root/logs/  \
    -v $PWD/run/:/root/run/  \
    -v $PWD/node_modules/:/root/node_modules/  \
    --name yapi deepexi/yapi