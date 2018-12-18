/**
 * project: yapi
 * author:  GammaGo
 * date:    2018/12/18
 * desc:    helper
 *
 * 参考：https://github.com/screwdriver-cd/circuit-fuses
 *
 * https://github.com/kelektiv/node-uuid
 */

'use strict';

const Breaker = require('circuit-fuses').breaker;
const request = require('request');
const uuidv1 = require('uuid/v1');

module.exports = {

  /**
   * request +熔断器
   * @param {Object} options 选项
   * @param {String} verb 动词
   * @return {Promise<void>}
   *
   * 使用demo:
   * ##### GET请求 ########
   *1.基本使用
   * const options={ timeout: 1500, json: true }
   * const response = await this.ctx.helper.runCircuitVerb('GET', url, options);
   *
   * 2.带查询参数:
   * options.qs={},     eg: http://xxxx?name=123 ==> options.qs={name:'123'}
   * const options={ timeout: 1500, json: true, qs: { name: '123' } }
   *
   * ##### POST请求 ########
   *1. 基本使用
   *
   */
  async runCircuitVerb(verb = 'GET', url, options) {

    let command;
    switch ((verb + '').toUpperCase()) {
      case 'GET':
        command = request.get;
        break;
      case 'POST':
        command = request.post;
        break;
      case 'PUT':
        command = request.put;
        break;
      case 'DELETE':
        command = request.delete;
        break;
      case 'HEAD':
        command = request.head;
        break;
      case 'PATCH':
        command = request.patch;
        break;
      case 'OPTIONS':
        command = request.options;
        break;
      default:
        command = request.get;
    }

    const breaker = new Breaker(command);
    try {
      console.log(`外部请求url:${url},options:${JSON.stringify(options)}`);
      const res = await breaker.runCommand(url, options);
      if (res.statusCode >= 200 && res.statusCode <= 400) return res.body;
      this.ctx.throw(res.statusCode || 500, res.body);
    } catch (err) {
      // 有关降级的策略 err.message = "CircuitBreaker Open"
      /* If the circuit is open the command is not run,
       * and an error with message "CircuitBreaker Open" is returned.
       * In this case, you can switch on the error and have a fallback technique
       */
      console.error(`${verb}:${url} ${err.message}`);
      this.logger.error(`${verb}:${url} ${err.message}`);
      this.ctx.throw(err.status || 500, err.message);
    }
  },


  /**
   * 发送http get 请求
   * @param {String} url url
   * @param {Object} qs:查询参数对象
   * @param {Object} options 选项
   * @return {Promise<*>} response
   */
  async requestGet(url, qs, options = { timeout: 30000, json: true }) {
    if (qs) options.qs = qs;
    const response = await this.runCircuitVerb('GET', url, options);
    return response;
  },

  /**
   * 发送http post 请求
   * @param {String} url url
   * @param {Object} body:request请求体
   * @param {Object} options 选项
   * @return {Promise<*>} response
   */
  async requestPost(url, body, options = { timeout: 150000, json: true }) {
    if (body) options.body = body;
    const response = await this.runCircuitVerb('POST', url, options);
    return response;
  },

  /**
   * 发送http put 请求
   * @param {String} url url
   * @param {Object} body:request请求体
   * @param {Object} options 选项
   * @return {Promise<*>} response
   */
  async requestPut(url, body, options = { timeout: 30000, json: true }) {
    if (body) options.body = body;
    const response = await this.ctx.helper.runCircuitVerb('PUT', url, options);
    return response;
  },

  /**
     * 发送http DELETE 请求
     * @param {String} url url
     * @param {Object} options 选项
     * @return {Promise<*>} response
     */
  async requestDelete(url, options = { timeout: 30000, json: true }) {
    const response = await this.ctx.helper.runCircuitVerb('DELETE', url, options);
    return response;
  },

  /**
   * 基于时间戳生成uuid
   * @return {*} uuid
   */
  generateUuid() {
    return uuidv1();
  }

};
