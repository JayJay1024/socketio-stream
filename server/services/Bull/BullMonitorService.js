'use strict';

const request = require('request');
const rp = require('request-promise');

class BullMonitorService {
    constructor(config, log, cacheSvc) {
        this.log          = log;
        this.cacheSvc     = cacheSvc;

        this.lastAseq     = 0;
        this.getActionUri = config.getActionsUrl;
        this.gameContract = config.bullContract;
        this.getTableUrl  = config.getTableUrl;
    }

    start() {
        this.log.info('monitor service start...');
        this.fetchTbPeriods();  // 轮询合约表
        this.fetchTbOthers();   // 轮询合约表
        this.actionsHandler();  // 轮询合约 action
    }

    // 检查合约 periods 表
    // periods 表需要比较及时的响应(开始下注、停止下注)，所以单独拿出来轮询
    fetchTbPeriods() {
        try {
            rp({
                url: this.getTableUrl,
                method: 'POST',
                json: true,
                body: { code: this.gameContract, scope: this.gameContract, table: 'periods', limit: 2, lower_bound: '', json: true, reverse: true },  // reverse: true => 以倒序返回表记录
                timeout: 5000,  // 如果不设置超时，request可能出现一直不返回
            })
            .then(res => {
                if (res.rows.length) {
                    this.cacheSvc.updateTbPeriods(res.rows[0]);
                }
                setTimeout(() => {
                    this.fetchTbPeriods();
                }, 600);
            })
            .catch(err => {
                // this.log.error('catch error when request table periods:', err);
                setTimeout(() => {
                    this.fetchTbPeriods();
                }, 200);
            });
        } catch (err) {
            this.log.error('catch error when fetch table periods:', err);
            setTimeout(() => {
                this.fetchTbPeriods();
            }, 200);
        }
    }

    // 检查合约其他表
    // 这里是 pubkey, dealers 表
    fetchTbOthers() {
        try {
            // pubkey 表
            // let tbPubkey = rp({
            //     url: this.getTableUrl,
            //     method: 'POST',
            //     json: true,
            //     body: { code: this.gameContract, scope: this.gameContract, table: 'pubkey', limit: 2, lower_bound: '', json: true, reverse: true },  // reverse: true => 以倒序返回表记录
            //     timeout: 5000,  // 如果不设置超时，request可能出现一直不返回
            // })
            // .then(res => { return res; })
            // .catch(err => {
            //     this.log.error('catch error when request table pubkey:', err);
            //     return null;
            // });
            // dealers 表
            let tbDealers = rp({
                url: this.getTableUrl,
                method: 'POST',
                json: true,
                body: { code: this.gameContract, scope: this.gameContract, table: 'dealers', limit: 2, lower_bound: '', json: true, reverse: true },  // reverse: true => 以倒序返回表记录
                timeout: 5000,  // 如果不设置超时，request可能出现一直不返回
            })
            .then(res => { return res; })
            .catch(err => {
                // this.log.error('catch error when request table dealers:', err);
                return null;
            });

            Promise
                .all([tbDealers])
                .then(([dataDealers]) => {
                    let rowPubkey = null, rowDealers = null;

                    // if (dataPubkey && dataPubkey.rows.length) {
                    //     rowPubkey = dataPubkey.rows[0];
                    // }
                    if (dataDealers && dataDealers.rows.length) {
                        rowDealers = dataDealers.rows[0];
                    }
                    this.cacheSvc.updateTbOthers(rowPubkey, rowDealers);

                    setTimeout(() => {
                        this.fetchTbOthers();
                    }, 600);
                });
        } catch (err) {
            this.log.error('catch error when fetct others table:', err);
            setTimeout(() => {
                this.fetchTbOthers();
            }, 200);
        }
    }

    // 检查合约 action
    actionsHandler(pos = -1, offset = -200) {
        try {
            request({
                url: this.getActionUri,
                method: 'POST',
                json:true,
                body: { account_name: this.gameContract, pos: pos, offset: offset },
                timeout: 5000  // 如果不设置超时，可能这个request一直不返回
            }, async (err, res, body) => {

                if (!err && res.statusCode == 200) {
                    if (body.actions && body.actions.length) {
                        let latestAseq = body.actions[body.actions.length-1].account_action_seq;

                        if (latestAseq > this.lastAseq) {
                            for (let trace of body.actions) {
                                if (trace &&
                                    trace.action_trace &&
                                    trace.action_trace.act &&
                                    (trace.action_trace.act.name === 'result' || trace.action_trace.act.name === 'betinfo') &&
                                    trace.action_trace.act.account === this.gameContract &&
                                    trace.action_trace.act.data &&
                                    trace.action_trace.receipt &&
                                    trace.action_trace.receipt.receiver === this.gameContract) {

                                    let data = trace.action_trace.act.data

                                    if (trace.action_trace.act.name === 'betinfo') {       // 实时投注信息
                                        data.block_time = trace.action_trace.block_time;
                                        await this.cacheSvc.addBet(data);
                                    } else if (trace.action_trace.act.name === 'result') {  // 亮牌结果
                                        data.res.block_time = trace.action_trace.block_time;
                                        await this.cacheSvc.addResult(data.res);
                                    }
                                }
                            }
                            this.lastAseq = latestAseq;
                        }
                    }

                    setTimeout(() => {
                        this.actionsHandler(this.lastAseq + 1, 200);
                    }, 200);
                } else {  // err or res.statusCode != 200
                    setTimeout(() => {
                        this.actionsHandler(pos, offset);
                    }, 200);
                }
            });
        } catch (err) {
            this.log.error('actionsHandler catch error:', err);
            this.actionsHandler(pos, offset);
        }
    }
}

module.exports = BullMonitorService;
