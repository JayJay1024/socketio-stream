'use strict';

const request = require('request');

class ChatMonitorService {
    constructor( config, log, cacheSvc ) {
        this.log          = log;
        this.cacheSvc     = cacheSvc;

        this.lastAseq     = 0;
        this.getActionUri = config.getActionsUrl;
        this.gameContract = config.chatContract;
    }

    start() {
        this.log.info('monitor service start...');
        this.actionsHandler();  // 使用默认参数值
    }

    // 默认的参数值用于第一次启动
    actionsHandler( pos = -1, offset = -200 ) {
        try {
            request({
                url: this.getActionUri,
                method: 'POST',
                json: true,
                body: { account_name: this.gameContract, pos: pos, offset: offset },
                timeout: 5000,  // 如果不设置超时，request可能出现一直不返回
            }, ( err, res, body ) => {

                if ( !err && res.statusCode == 200 ) {

                    if ( body && body.actions && body.actions.length ) {
                        let latestAseq = body.actions[body.actions.length-1].account_action_seq;

                        if ( latestAseq > this.lastAseq ) {
                            for ( let trace of body.actions ) {
                                if( trace
                                    && trace.action_trace
                                    && trace.action_trace.act
                                    && trace.action_trace.act.data
                                    && trace.action_trace.act.data.res
                                    && trace.action_trace.act.account
                                    && trace.action_trace.act.account === this.gameContract
                                    && (trace.action_trace.act.name === 'resultp' || trace.action_trace.act.name === 'resultr')
                                    && trace.action_trace.receipt
                                    && trace.action_trace.receipt.receiver === this.gameContract ) {

                                    let data        = trace.action_trace.act.data.res;
                                    data.block_time = trace.action_trace.block_time;

                                    if ( trace.action_trace.act.name === 'resultp' ) {  // 弹幕
                                        this.cacheSvc.addChat( data );
                                    } else if ( trace.action_trace.act.name === 'resultr' ) {  // 中奖结果
                                        this.cacheSvc.addResult( data );
                                    }
                                }
                            }

                            this.lastAseq = latestAseq;
                        }
                    }

                    setTimeout(() => {
                        this.actionsHandler( this.lastAseq + 1, 200 );
                    }, 200);

                } else {  // (err is set) or (res.statusCode != 200)
                    setTimeout(() => {
                        this.actionsHandler( pos, offset );
                    }, 200);
                }
            });

        } catch( err ) {
            this.log.error( 'actionsHandler in Chat', err );
            this.actionsHandler( pos, offset );
        }
    }
}

module.exports = ChatMonitorService;
