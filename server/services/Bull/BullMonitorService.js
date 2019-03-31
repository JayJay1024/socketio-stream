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
        this.fetchTbLPeriods();
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

    // 检查合约 lperiods 表
    fetchTbLPeriods() {
        try {
            // dragonex
            // let periodsDT = rp({
            //     url: this.getTableUrl,
            //     method: 'POST',
            //     json: true,
            //     body: { code: this.gameContract, scope: 'DT', table: 'lperiods', limit: 2, lower_bound: '', json: true, reverse: true },  // reverse: true => 以倒序返回表记录
            //     timeout: 5000,  // 如果不设置超时，request可能出现一直不返回
            // })
            // .then(res => { return res; })
            // .catch(err => { return null; });
            // let periodsUSDT = rp({
            //     url: this.getTableUrl,
            //     method: 'POST',
            //     json: true,
            //     body: { code: this.gameContract, scope: 'USDT', table: 'lperiods', limit: 2, lower_bound: '', json: true, reverse: true },  // reverse: true => 以倒序返回表记录
            //     timeout: 5000,  // 如果不设置超时，request可能出现一直不返回
            // })
            // .then(res => { return res; })
            // .catch(err => { return null; });
            // let periodsEOS = rp({
            //     url: this.getTableUrl,
            //     method: 'POST',
            //     json: true,
            //     body: { code: this.gameContract, scope: 'EOS', table: 'lperiods', limit: 2, lower_bound: '', json: true, reverse: true },  // reverse: true => 以倒序返回表记录
            //     timeout: 5000,  // 如果不设置超时，request可能出现一直不返回
            // })
            // .then(res => { return res; })
            // .catch(err => { return null; });
            // let periodsSAFE = rp({
            //     url: this.getTableUrl,
            //     method: 'POST',
            //     json: true,
            //     body: { code: this.gameContract, scope: 'SAFE', table: 'lperiods', limit: 2, lower_bound: '', json: true, reverse: true },  // reverse: true => 以倒序返回表记录
            //     timeout: 5000,  // 如果不设置超时，request可能出现一直不返回
            // })
            // .then(res => { return res; })
            // .catch(err => { return null; });
            // let periodsSNET = rp({
            //     url: this.getTableUrl,
            //     method: 'POST',
            //     json: true,
            //     body: { code: this.gameContract, scope: 'SNET', table: 'lperiods', limit: 2, lower_bound: '', json: true, reverse: true },  // reverse: true => 以倒序返回表记录
            //     timeout: 5000,  // 如果不设置超时，request可能出现一直不返回
            // })
            // .then(res => { return res; })
            // .catch(err => { return null; });
            // let periodsTNB = rp({
            //     url: this.getTableUrl,
            //     method: 'POST',
            //     json: true,
            //     body: { code: this.gameContract, scope: 'TNB', table: 'lperiods', limit: 2, lower_bound: '', json: true, reverse: true },  // reverse: true => 以倒序返回表记录
            //     timeout: 5000,  // 如果不设置超时，request可能出现一直不返回
            // })
            // .then(res => { return res; })
            // .catch(err => { return null; });

            // hoo wallet
            let periodsSAT = rp({
                url: this.getTableUrl,
                method: 'POST',
                json: true,
                body: { code: this.gameContract, scope: 'SAT', table: 'lperiods', limit: 2, lower_bound: '', json: true, reverse: true },  // reverse: true => 以倒序返回表记录
                timeout: 5000,  // 如果不设置超时，request可能出现一直不返回
            })
            .then(res => { return res; })
            .catch(err => { return null; });

            Promise
                .all([/*periodsDT, periodsUSDT, periodsEOS, periodsSAFE, periodsSNET, periodsTNB, */periodsSAT])
                .then(([/*tbDT, tbUSDT, tbEOS, tbSAFE, tbSNET, tbTNB, */tbSAT]) => {
                    let rowsDT = null, rowsUSDT = null, rowsEOS = null, rowsSAFE = null, rowsSNET = null, rowsTNB = null, rowsSAT = null;

                    // if (tbDT && tbDT.rows.length) {
                    //     rowsDT = tbDT.rows[0];
                    // }
                    // if (tbUSDT && tbUSDT.rows.length) {
                    //     rowsUSDT = tbUSDT.rows[0];
                    // }
                    // if (tbEOS && tbEOS.rows.length) {
                    //     rowsEOS = tbEOS.rows[0];
                    // }
                    // if (tbSAFE && tbSAFE.rows.length) {
                    //     rowsSAFE = tbSAFE.rows[0];
                    // }
                    // if (tbSNET && tbSNET.rows.length) {
                    //     rowsSNET = tbSNET.rows[0];
                    // }
                    // if (tbTNB && tbTNB.rows.length) {
                    //     rowsTNB = tbTNB.rows[0];
                    // }
                    if (tbSAT && tbSAT.rows.length) {
                        rowsSAT = tbSAT.rows[0];
                    }

                    this.cacheSvc.updateTbLPeriods(rowsDT, rowsUSDT, rowsEOS, rowsSAFE, rowsSNET, rowsTNB, rowsSAT);

                    setTimeout(() => {
                        this.fetchTbLPeriods();
                    }, 200);
                });
        } catch (err) {
            this.log.error('catch error when fetch table lperiods:', err);
            setTimeout(() => {
                this.fetchTbLPeriods();
            }, 200);
        }
    }

    // 检查合约其他表
    fetchTbOthers() {
        try {
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

            // 龙网 ldealers 表
            // let tbDealersDGDT = rp({
            //     url: this.getTableUrl,
            //     method: 'POST',
            //     json: true,
            //     body: { code: this.gameContract, scope: 'DT', table: 'ldealers', limit: 2, lower_bound: '', json: true, reverse: true },  // reverse: true => 以倒序返回表记录
            //     timeout: 5000,  // 如果不设置超时，request可能出现一直不返回
            // })
            // .then(res => { return res; })
            // .catch(err => { return null; });
            // let tbDealersDGUSDT = rp({
            //     url: this.getTableUrl,
            //     method: 'POST',
            //     json: true,
            //     body: { code: this.gameContract, scope: 'USDT', table: 'ldealers', limit: 2, lower_bound: '', json: true, reverse: true },  // reverse: true => 以倒序返回表记录
            //     timeout: 5000,  // 如果不设置超时，request可能出现一直不返回
            // })
            // .then(res => { return res; })
            // .catch(err => { return null; });
            // let tbDealersDGEOS = rp({
            //     url: this.getTableUrl,
            //     method: 'POST',
            //     json: true,
            //     body: { code: this.gameContract, scope: 'EOS', table: 'ldealers', limit: 2, lower_bound: '', json: true, reverse: true },  // reverse: true => 以倒序返回表记录
            //     timeout: 5000,  // 如果不设置超时，request可能出现一直不返回
            // })
            // .then(res => { return res; })
            // .catch(err => { return null; });
            // let tbDealersDGSAFE = rp({
            //     url: this.getTableUrl,
            //     method: 'POST',
            //     json: true,
            //     body: { code: this.gameContract, scope: 'SAFE', table: 'ldealers', limit: 2, lower_bound: '', json: true, reverse: true },  // reverse: true => 以倒序返回表记录
            //     timeout: 5000,  // 如果不设置超时，request可能出现一直不返回
            // })
            // .then(res => { return res; })
            // .catch(err => { return null; });
            // let tbDealersDGSNET = rp({
            //     url: this.getTableUrl,
            //     method: 'POST',
            //     json: true,
            //     body: { code: this.gameContract, scope: 'SNET', table: 'ldealers', limit: 2, lower_bound: '', json: true, reverse: true },  // reverse: true => 以倒序返回表记录
            //     timeout: 5000,  // 如果不设置超时，request可能出现一直不返回
            // })
            // .then(res => { return res; })
            // .catch(err => { return null; });
            // let tbDealersDGTNB = rp({
            //     url: this.getTableUrl,
            //     method: 'POST',
            //     json: true,
            //     body: { code: this.gameContract, scope: 'TNB', table: 'ldealers', limit: 2, lower_bound: '', json: true, reverse: true },  // reverse: true => 以倒序返回表记录
            //     timeout: 5000,  // 如果不设置超时，request可能出现一直不返回
            // })
            // .then(res => { return res; })
            // .catch(err => { return null; });

            // hoo wallet
            let tbDealersHooSAT = rp({
                url: this.getTableUrl,
                method: 'POST',
                json: true,
                body: { code: this.gameContract, scope: 'SAT', table: 'ldealers', limit: 2, lower_bound: '', json: true, reverse: true },  // reverse: true => 以倒序返回表记录
                timeout: 5000,  // 如果不设置超时，request可能出现一直不返回
            })
            .then(res => { return res; })
            .catch(err => { return null; });

            Promise
                .all([tbDealers, /*tbDealersDGDT, tbDealersDGUSDT, tbDealersDGEOS, tbDealersDGSAFE, tbDealersDGSNET, tbDealersDGTNB, */tbDealersHooSAT])
                .then(([dataDealers, /*dataDealersDGDT, dataDealersDGUSDT, dataDealersDGEOS, dataDealersDGSAFE, dataDealersDGSNET, dataDealersDGTNB, */dataDealersHooSAT]) => {
                    let rowDealers = null, rowDealersDGDT = null, rowDealersDGUSDT = null, rowDealersDGEOS = null, rowDealersDGSAFE= null, rowDealersDGSNET = null, rowDealersDGTNB = null, rowDealersHooSAT = null;

                    if (dataDealers && dataDealers.rows.length) {
                        rowDealers = dataDealers.rows[0];
                    }
                    // if (dataDealersDGDT && dataDealersDGDT.rows.length) {
                    //     rowDealersDGDT = dataDealersDGDT.rows[0];
                    // }
                    // if (dataDealersDGUSDT && dataDealersDGUSDT.rows.length) {
                    //     rowDealersDGUSDT = dataDealersDGUSDT.rows[0];
                    // }
                    // if (dataDealersDGEOS && dataDealersDGEOS.rows.length) {
                    //     rowDealersDGEOS = dataDealersDGEOS.rows[0];
                    // }
                    // if (dataDealersDGSAFE && dataDealersDGSAFE.rows.length) {
                    //     rowDealersDGSAFE = dataDealersDGSAFE.rows[0];
                    // }
                    // if (dataDealersDGSNET && dataDealersDGSNET.rows.length) {
                    //     rowDealersDGSNET = dataDealersDGSNET.rows[0];
                    // }
                    // if (dataDealersDGTNB && dataDealersDGTNB.rows.length) {
                    //     rowDealersDGTNB = dataDealersDGTNB.rows[0];
                    // }
                    if (dataDealersHooSAT && dataDealersHooSAT.rows.length) {
                        rowDealersHooSAT = dataDealersHooSAT.rows[0];
                    }
                    this.cacheSvc.updateTbOthers(rowDealers, rowDealersDGDT, rowDealersDGUSDT, rowDealersDGEOS, rowDealersDGSAFE, rowDealersDGSNET, rowDealersDGTNB, rowDealersHooSAT);

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
                                    (trace.action_trace.act.name === 'result' || trace.action_trace.act.name === 'betinfo' ||
                                     trace.action_trace.act.name === 'lresult' || trace.action_trace.act.name === 'lbetinfo') &&
                                    trace.action_trace.act.account === this.gameContract &&
                                    trace.action_trace.act.data &&
                                    trace.action_trace.receipt &&
                                    trace.action_trace.receipt.receiver === this.gameContract) {

                                    let data = trace.action_trace.act.data;

                                    if (trace.action_trace.act.name === 'betinfo') {       // 实时投注信息
                                        data.block_time = trace.block_time;
                                        await this.cacheSvc.addBet(data);
                                    } else if (trace.action_trace.act.name === 'result') {  // 亮牌结果
                                        data.res.block_time = trace.block_time;
                                        await this.cacheSvc.addResult(data.res);
                                    } else if (trace.action_trace.act.name === 'lbetinfo') {
                                        data.block_time = trace.block_time;
                                        await this.cacheSvc.addProBet(data);
                                    } else if (trace.action_trace.act.name === 'lresult') {
                                        data.res.block_time = trace.block_time;
                                        await this.cacheSvc.addProResult(data.res);
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
