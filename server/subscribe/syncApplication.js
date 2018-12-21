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
const { Consumer } = require('wm-rocketmq');
const httpClient = require('urllib');
const config = require('../../config');

const consumer = new Consumer({
  namesrvAddr: config.mq.address,
  consumerGroup: config.mq.consumerGroupName + '-syncApplicationTopic',
  httpclient: httpClient,
  isBroadcast: false
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