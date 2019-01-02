'use strict';

const request = require('request');

class CashMonitorService {
    constructor(config, log, cacheSvc) {
        this.log          = log;
        this.cacheSvc     = cacheSvc;

        this.lastAseq     = 0;
        this.getActionUri = config.getActionsUrl;
        this.gameContract = config.cashContract;
        this.mineContract = config.mineContract;
    }

    start() {
        this.log.info('cash monitor service start...');
        this.actionsHandler();
    }

    // 默认参数获取最新的200条actions
    actionsHandler(pos = -1, offset = -200) {
        try {
            request({
                url: this.getActionUri,
                method: 'POST',
                json:true,
                body: { account_name: this.gameContract, pos: pos, offset: offset },
                timeout: 5000  // 如果不设置超时，可能这个request一直不返回
            }, (err, res, body) => {

                if(!err && res.statusCode == 200) {
                    if (body.actions && body.actions.length) {
                        let latestAseq = body.actions[body.actions.length-1].account_action_seq;

                        if (latestAseq > this.lastAseq) {
                            for (let trace of body.actions) {
                                if ( trace &&
                                     trace.action_trace &&
                                     trace.action_trace.act &&
                                     trace.action_trace.act.name === 'result' &&
                                    (trace.action_trace.act.account === this.gameContract || trace.action_trace.act.account === this.mineContract) &&
                                     trace.action_trace.act.data &&
                                     trace.action_trace.act.data.res &&
                                     trace.action_trace.receipt &&
                                     trace.action_trace.receipt.receiver === this.gameContract ) {

                                    let data        = trace.action_trace.act.data.res;
                                    data.block_time = trace.action_trace.block_time;

                                    if (trace.action_trace.act.account === this.gameContract) {
                                        this.cacheSvc.addBet(data);
                                    } else {  // trace.action_trace.act.account === this.mineContract
                                        this.cacheSvc.addMine(data);
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
        } catch(err) {
            this.log.error('actionsHandler in Cash', err);
            this.actionsHandler(pos, offset);
        }
    }
}

module.exports = CashMonitorService;
