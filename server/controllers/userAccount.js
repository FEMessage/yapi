/**
 * project: yapi
 * author:  GammaGo
 * date:    2018/12/18
 * desc:    yapi用户与第三方用户处理接口
 */
'use strict';

const yapi = require('../yapi.js');
const baseController = require('./base.js');
const userAccountModel = require('../models/userAccount');
const userModel = require('../models/user');
const groupModel = require('../models/group');
const config = require('../../config.json');
const helper = require('../extend/helper');
const jwt = require('jsonwebtoken');

class userAccountController extends baseController {
  constructor(ctx) {
    super(ctx);
    this.Model = yapi.getInst(userAccountModel);
  }

  /**
   * 登陆接口
   * @interface /userAccount/login
   * @method POST
   * @param ctx
   * @returns {Object}
   */
  async login(ctx) {
    const token = ctx.query.token;
    console.log(`登陆接口, 传入token:${token}`);
    if (!token) {
      return (ctx.body = yapi.commons.resReturn(null, 401, '用户未登录'));
    }
    // 根据token到租户中心获取租户信息
    let url = config.deepexiConfig.tenantCenter.getUserByTokenUrl;
    const options = {
      headers: {
        'Authorization': `Bearer ${token}`,
        timeout: 30000,
        json: true
      }
    };
    let response = await helper.requestGet(url, null, options);
    response = JSON.parse(response);

    if (!response.payload) {
      return (ctx.body = yapi.commons.resReturn(null, 401, '用户无效'));
    }

    const tenantInfo = response.payload;
    const userInst = yapi.getInst(userModel);
    const groupInst = yapi.getInst(groupModel);
    // 查找当前租户用户是否已关联用户
    const userAccountRelation = await this.Model.findByAccountId(tenantInfo.id);
    if (!userAccountRelation) { // 如果未找到关联, 代表未注册, 执行注册+登陆操作
      console.log(`未找到租户${tenantInfo.id}, 开始创建用户`)
      const passsalt = yapi.commons.randStr();
      let data = {
        username: tenantInfo.username,
        password: yapi.commons.generatePassword(tenantInfo.username, passsalt), // 密码默认邮箱
        email: tenantInfo.email,
        passsalt,
        add_time: yapi.commons.time(),
        up_time: yapi.commons.time(),
        type: 'third' // site代表网站注册, third代表第三方
      };
      
      if (tenantInfo.type === '1') { // 1代表超级管理员
        data.role = 'admin'
      } else {
        data.role = 'member'
      }

      try {
        // 保存用户
        const user = await userInst.save(data);

        // 保存用户与DEEPEXI账户关联
        await this.Model.save({
          accountId: tenantInfo.id,
          uid: user._id,
          createdAt: new Date()
        });

        // 将用户与所有分组关联
        let groupList = await groupInst.listPublicGroup();
        if (groupList && groupList.length > 0) {
          for (const index in groupList) {
            const newMemberList = [];
            const memberData = {
              uid: user._id,
              role: 'owner',
              username: user.username,
              email: user.email
            };
            newMemberList.push(memberData);
            await groupInst.addMember(groupList[index]._id, newMemberList);
            console.log(`将用户${memberData.uid}-${memberData.username}加入分组${groupList[index]._id}-${groupList[index].group_name}`);
          }
        }

        // 登录
        this.setLoginCookie(user._id, user.passsalt);
        await this.handlePrivateGroup(user._id, user.username, user.email);
        ctx.body = yapi.commons.resReturn({
          uid: user._id,
          email: user.email,
          username: user.username,
          add_time: user.add_time,
          up_time: user.up_time,
          role: user.role,
          type: user.type,
          study: false
        });
      } catch (e) {
        ctx.body = yapi.commons.resReturn(null, 500, e.message);
      }
    } else { // 如果找到关联, 则直接登录
      console.log(`已找到租户${tenantInfo.id}, 开始登录`);
      const user = await userInst.findById(userAccountRelation.uid);
      if (!user) {
        return (ctx.body = yapi.commons.resReturn(null, 404, '该用户不存在'));
      }
      // 登录
      this.setLoginCookie(user._id, user.passsalt);
      return (ctx.body = yapi.commons.resReturn(
        {
          username: user.username,
          role: user.role,
          uid: user._id,
          email: user.email,
          add_time: user.add_time,
          up_time: user.up_time,
          type: user.type,
          study: user.study
        },
        0,
        'logout success...'
      ));
    }
  }

  async handlePrivateGroup(uid) {
    var groupInst = yapi.getInst(groupModel);
    await groupInst.save({
      uid: uid,
      group_name: 'User-' + uid,
      add_time: yapi.commons.time(),
      up_time: yapi.commons.time(),
      type: 'private'
    });
  }

  setLoginCookie(uid, passsalt) {
    let token = jwt.sign({ uid: uid }, passsalt, { expiresIn: '7 days' });

    this.ctx.cookies.set('_yapi_token', token, {
      expires: yapi.commons.expireDate(7),
      httpOnly: true
    });
    this.ctx.cookies.set('_yapi_uid', uid, {
      expires: yapi.commons.expireDate(7),
      httpOnly: true
    });
  }
}

module.exports = userAccountController;