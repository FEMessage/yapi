/**
 * project: yapi
 * author:  GammaGo
 * date:    2018/12/21
 * desc:    订阅MQ（新增项目）
 */
'use strict';

const yapi = require('../yapi');
const groupModel = require('../models/group');
const projectModel = require('../models/project');
const tokenModel = require('../models/token');
const { Consumer, Message, Producer } = require('wm-rocketmq');
const httpClient = require('urllib');
const config = require('../../config');
const helper = require('../extend/helper');

const consumer = new Consumer({
  namesrvAddr: config.mq.address,
  consumerGroup: config.mq.consumerGroupName + '-syncApplicationTopic',
  httpclient: httpClient,
  isBroadcast: false
});

// MQ配置
const producer = new Producer({
  namesrvAddr: config.mq.address,
  producerGroup: config.mq.consumerGroupName + '-syncToken',
  httpclient: httpClient
});

class SyncApplication {

  process() {
    console.log(`MQ监听Topic:${config.mq.syncApplicationTopic}启动`);
    // 收到消息时触发的事件
    consumer.on('mq_message', async function (msg) {
      console.log(`接收到MQ: ${config.mq.syncApplicationTopic}`);
      // 获取MQ body
      const thirdApp = JSON.parse(msg.body);
      // 查询是否已存在项目
      const projectInst = yapi.getInst(projectModel);
      const isExist = await projectInst.getByThirdAppId(thirdApp.id);
      if (isExist) { // 已存在就跳过
        console.warn(`第三方应用${thirdApp.id}对应项目${isExist._id}已存在, 不进行保存操作`);
      } else { // 不存在就新建项目

        // 查找分组
        const groupInst = yapi.getInst(groupModel);
        const group = await groupInst.getGroupByThirdProjectId(thirdApp.projectId);
        console.log(`group->${JSON.stringify(group)}`);
        if (group) { // 如果存在分组
          let data = {
            name: thirdApp.name,
            desc: thirdApp.description,
            members: [],
            project_type: 'public',
            uid: group.uid,
            group_id: group._id,
            group_name: group.group_name,
            add_time: yapi.commons.time(),
            up_time: yapi.commons.time(),
            is_json5: false,
            env: [{name: 'local', domain: 'http://127.0.0.1'}],
            thirdAppId: thirdApp.id
          };
          const result = await projectInst.save(data);
          console.log(`新增项目: ${result._id}`);

          // 创建项目token
          let token = {
            project_id: result._id,
            token: helper.generateUuid()
          };
          const tokenInst = yapi.getInst(tokenModel);
          const tokenResult = await tokenInst.save(token);

          // 发送MQ同步token信息
          try {
            console.log(`开始发送MQ至DEEPEXI, 项目id:${result._id}, token:${tokenResult.token}`);
            let msgBody = {
              appId: result.thirdAppId,
              token: tokenResult.token
            };
            const topic = config.mq.syncTokenTopic;
            const tag = config.deepexiConfig.tenantId;
            const message = new Message(topic, tag, JSON.stringify(msgBody));
            await producer.send(message);
            console.log('发送MQ成功');
          } catch (e) {
            console.error(`发送MQ至DEEPEXI失败, ${e}`);
          }
        } else {
          console.error('无法找到分组');
        }
      }
      console.log('MQ消费完成');
    });
    consumer.subscribe(config.mq.syncApplicationTopic, config.deepexiConfig.tenantId);
  }
}

module.exports = SyncApplication;