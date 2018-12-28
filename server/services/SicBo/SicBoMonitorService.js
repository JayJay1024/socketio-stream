'use strict';

const request = require('request');

class SicBoMonitorService {
    constructor(config, log, cacheSvc) {
        this.log          = log;
        this.cacheSvc     = cacheSvc;

        this.lastAseq     = 0;
        this.getActionUri = config.getActionsUrl;
        this.gameContract = config.sicboContract;
        this.mineContract = config.mineContract;
    }

    start() {
        this.log.info('monitor service start...');
        this.actionsHandler();
    }

    actionsHandler(pos = -1, offset = -200) {
        try {
            request({
                url: this.getActionUri,
                method: 'POST',
                json:true,
                body: {account_name: this.gameContract, pos: pos, offset: offset},
                timeout: 5000
            }, (err,res,body) => {

                if(!err && res.statusCode == 200){
                    if(body.actions && body.actions.length && body.actions.length > 0)
                    { 
                        let latestAseq = body.actions[body.actions.length-1].account_action_seq;

                        if ( latestAseq > this.lastAseq ) {
                            for (let i = 0; i < body.actions.length; i++) {
                                let trace = body.actions[i];

                                if ( trace.account_action_seq <= this.lastAseq ) { continue; }

                                if(trace
                                    && trace.action_trace
                                    && trace.action_trace.act
                                    && (trace.action_trace.act.account === this.gameContract || trace.action_trace.act.account === this.mineContract)
                                    && trace.action_trace.act.name === 'result'
                                    && trace.action_trace.act.data
                                    && trace.action_trace.act.data.res
                                    && trace.action_trace.receipt
                                    && trace.action_trace.receipt.receiver === this.gameContract) {                                    

                                        let data = trace.action_trace.act.data.res;

                                        if ( trace.action_trace.act.account === this.gameContract ) {
                                            this.cacheSvc.addBet(data);
                                        } else {
                                            this.cacheSvc.addMine(data);
                                        }
                                }                        
                            }

                            this.lastAseq = latestAseq;
                        }
                    }
                    setTimeout(() => {
                        this.actionsHandler(this.lastAseq + 1, 200);
                    }, 50);
                } else {
                    setTimeout(() => {
                        this.actionsHandler(pos, offset);
                    }, 50);
                }
            });  
        } catch(err) {
            this.log.error('actionsHandler', err);
            this.actionsHandler(pos, offset);
        }
    }
}

module.exports = SicBoMonitorService;
