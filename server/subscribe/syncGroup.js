/**
 * project: yapi
 * author:  GammaGo
 * date:    2018/12/21
 * desc:    订阅MQ（新增分组）
 */
'use strict';

const yapi = require('../yapi');
const groupModel = require('../models/group');
const userAccountModel = require('../models/userAccount');
const userModel = require('../models/user');
const { Consumer } = require('wm-rocketmq');
const httpClient = require('urllib');
const config = require('../../config');

const consumer = new Consumer({
  namesrvAddr: config.mq.address,
  consumerGroup: config.mq.consumerGroupName + '-syncGroupTopic',
  httpclient: httpClient,
  isBroadcast: false
});

class SyncGroup {

  process() {
    console.log(`MQ监听Topic:${config.mq.syncGroupTopic}启动`);
    // 收到消息时触发的事件
    consumer.on('mq_message', async function (msg) {
      console.log(`接收到MQ: ${config.mq.syncGroupTopic}`);
      // 获取MQ body
      const thirdProject = JSON.parse(msg.body);
      // 查询是否已存在分组
      const groupInst = yapi.getInst(groupModel);
      const isExist = await groupInst.getGroupByThirdProjectId(thirdProject.id);
      if (isExist) { // 已存在就跳过
        console.warn(`第三方项目${thirdProject.id}对应分组${isExist._id}已存在, 不进行保存操作`);
      } else { // 不存在就新建分组
        // 新建分组
        let data = {
          group_name: thirdProject.name,
          group_desc: thirdProject.description,
          add_time: yapi.commons.time(),
          up_time: yapi.commons.time(),
          thirdProjectId: thirdProject.id
        };
        const userAccountInst = yapi.getInst(userAccountModel);
        const userAccount = await userAccountInst.findByAccountId(thirdProject.tenantAdmin);
        if (userAccount) {
          data.uid = userAccount.uid;
        }

        // 将所有用户授权到该分组
        const userInst = yapi.getInst(userModel);
        const userList = await userInst.list();
        const memberList = [];
        for (const index in userList) {
          const member = {
            uid: userList[index]._id,
            role: 'owner',
            username: userList[index].username,
            email: userList[index].email
          };
          memberList.push(member);
        }
        data.members = memberList;
        const result = await groupInst.save(data);
        console.log(`新增分组: ${result._id}`);
      }
      console.log(`MQ消费完成`);
    });
    consumer.subscribe(config.mq.syncGroupTopic, config.deepexiConfig.tenantId);
  }
}

module.exports = SyncGroup;

