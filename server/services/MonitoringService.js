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
        this.time = 0;
        this.lastUuid = '';
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
                        let bTime = dayjs(body.actions[body.actions.length-1].action_trace.block_time).valueOf();
                        if(bTime >= this.time) { //不同actions,同一区块时间相等
                            for (let i = 0; i < body.actions.length; i++) {
                                const trace = body.actions[i];
                                if(trace
                                    && trace.action_trace
                                    && trace.action_trace.act
                                    && (trace.action_trace.act.account === GAMEACCOUNT || trace.action_trace.act.account === MINEACCOUNT)
                                    && trace.action_trace.act.name === 'result'
                                    && trace.action_trace.act.data
                                    && trace.action_trace.act.data.res
                                    && trace.action_trace.receipt
                                    && trace.action_trace.receipt.receiver === GAMEACCOUNT) {                                    
                                        let aTime = dayjs(trace.action_trace.block_time).valueOf();
                                        if(aTime < this.time || this.lastUuid == trace.action_trace.act.data.res.uid) {   
                                            continue;
                                        }
                                        this.time = aTime ;
                                        this.lastUuid = trace.action_trace.act.data.res.uid;
                                        let data = trace.action_trace.act.data.res;

                                        if ( trace.action_trace.act.account === MINEACCOUNT ) {
                                            this.emit('NewMine', data);
                                        } else {
                                            this.svc.add(data);
                                            this.emit('NewBet', data);
                                        }
                                }                        
                            }
                        }
                    }
                } 
            });  
        } catch(err) {
            this.log.error('actionsHandler', err);
        }
        finally {
            setTimeout(()=>this.actionsHandler(), 100);
        }
    }
}

module.exports = MonitoringService;