'use strict';

const request = require('request')
,dayjs = require('dayjs')
,event = require('events');
const GAMEACCOUNT = 'trustbetgame';
const MINEACCOUNT = 'trustbetmine';


class MonitoringService extends event.EventEmitter {
    constructor(conf, log, cacheSvc) {
        super();        
        this.log = log;
        this.conf = conf;
        this.svc = cacheSvc;
        this.lastAseq = 0;
    }

    start() {
        this.log.info('monitor service start...');
        this.actionsHandler();
    }

    actionsHandler(pos = -1, offset = -200) {
        try {
            request.post({url: this.conf.getActionsUrl, method:'POST', json:true, body: {account_name: GAMEACCOUNT, pos: pos, offset: offset}}, (err,res,body) => {
                if(!err && res.statusCode == 200){
                    if(body.actions && body.actions.length && body.actions.length > 0)
                    { 
                        let latestAseq = body.actions[body.actions.length-1].account_action_seq;

                        if ( latestAseq > this.lastAseq ) {
                            for (let i = 0; i < body.actions.length; i++) {
                                const trace = body.actions[i];

                                if ( trace.account_action_seq <= this.lastAseq ) { continue; }

                                if(trace
                                    && trace.action_trace
                                    && trace.action_trace.act
                                    && (trace.action_trace.act.account === GAMEACCOUNT || trace.action_trace.act.account === MINEACCOUNT)
                                    && trace.action_trace.act.name === 'result'
                                    && trace.action_trace.act.data
                                    && trace.action_trace.act.data.res
                                    && trace.action_trace.receipt
                                    && trace.action_trace.receipt.receiver === GAMEACCOUNT) {                                    

                                        let data = trace.action_trace.act.data.res;

                                        if ( trace.action_trace.act.account === MINEACCOUNT ) {
                                            this.svc.addMine(data);
                                        } else {
                                            this.svc.getMine(data.uid, (payMine) => {
                                                if ( payMine ) {
                                                    data.mine = payMine;
                                                } else {
                                                    data.mine = '0.0000 TBT';
                                                }

                                                this.svc.addBet(data);

                                                this.emit('NewBet', data);
                                            });
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

module.exports = MonitoringService;