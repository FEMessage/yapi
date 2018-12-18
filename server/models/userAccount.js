/**
 * project: yapi
 * author:  GammaGo
 * date:    2018/12/18
 * desc:    yapi用户与第三方用户关联表
 */
'use strict';

const baseModel = require('./base');

class userAccountModel extends baseModel {
  getName() {
    return 'user_account';
  }

  getSchema() {
    return {
      uid: { type: Number, required: true, field: 'uid' },
      accountId: { type: String, required: true, field: 'account_id' },
      createdAt: { type: Date, required: true, field: 'created_at' }
    };
  }

  save(data) {
    let userAccount = new this.model(data);
    return userAccount.save();
  }

  checkRepeat(accountId) {
    return this.model.countDocuments({
      accountId
    });
  }

  findByAccountId(accountId) {
    return this.model.findOne({
      accountId
    });
  }

  delByUid(uid) {
    return this.model.remove({
      uid
    });
  }
}

module.exports = userAccountModel;