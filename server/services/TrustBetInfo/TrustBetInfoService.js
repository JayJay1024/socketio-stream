'use strict';

const request = require('request');

class TrustBetInfoService {
    constructor( config, log, cacheSvc ) {
        this.log          = log;
        this.cacheSvc     = cacheSvc;

        this.lastAseq     = 0;
        this.gameContract = config.infoContract;
        this.getActionUri = config.getActionsUrl;
        this.getTableUrl  = config.getTableUrl;

        // status: 0(还没开始请求)，1(请求中)，2(请求完成)
        this.TBconfig     = {status: 0, config: {}};
        this.TBeosplat    = {status: 0, eosplat: {}};
        this.TBeosplayers = {status: 0, eosplayers:[]};
    }

    start() {
        this.log.info('monitor service start...');
        this.actionsHandler();  // 使用默认参数值
        this.newestTopnResHandle();
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
                                if ( trace &&
                                     trace.action_trace &&
                                     trace.action_trace.act &&
                                     trace.action_trace.act.data &&
                                     trace.action_trace.act.data.res &&
                                     trace.action_trace.act.account && trace.action_trace.act.account === this.gameContract &&
                                     trace.action_trace.act.name && trace.action_trace.act.name === 'result' &&
                                     trace.action_trace.receipt &&
                                     trace.action_trace.receipt.receiver && trace.action_trace.receipt.receiver === this.gameContract ) {

                                    let data        = trace.action_trace.act.data.res;
                                    data.block_time = trace.action_trace.block_time;
                                    this.cacheSvc.addTopnRes( data );  // 排行榜奖励发放结果
                                }
                            }
                            this.lastAseq = latestAseq;
                        }
                    }

                    setTimeout(() => {
                        this.actionsHandler( this.lastAseq + 1, 200 );
                    }, 200);
                } else {  // err or res.statusCode != 200
                    setTimeout(() => {
                        this.actionsHandler( pos, offset );
                    }, 200);
                }

            });
        } catch(err) {
            this.log.error( 'actionsHandler catch error:', err );
            this.actionsHandler( pos, offset );
        }
    }

    getTBeosplayers(scope='', lower='') {
        try {
            request({
                url: this.getTableUrl,
                method: 'POST',
                json: true,
                body: { code: this.gameContract, scope: scope, table: 'eosplayers', limit: 120, lower_bound: lower, json: true },
                timeout: 5000,  // 如果不设置超时，request可能出现一直不返回
            }, ( err, res, body ) => {

                if ( !err && res.statusCode == 200 ) {
                    let _rows = body.rows, _more = body.more;

                    for ( let _row of _rows ) {
                        if ( _row.player === lower ) {
                            continue;
                        }

                        _row.payout = '0.0000 EOS';
                        this.TBeosplayers.eosplayers.push(_row);
                    }

                    if ( _more ) {
                        let _lower = _rows[_rows.length-1].player;
                        this.getTBeosplayers( scope, _lower );
                        return;
                    } else if ( this.TBeosplayers.eosplayers.length ) {
                        this.TBeosplayers.eosplayers.sort((a,b) => {
                            if ( b.payin.split(' ')[0] * 1 - a.payin.split(' ')[0] * 1 === 0 ) {
                                return b.id * 1 - a.id * 1;  // 合约id是倒序的，即越早下注的id号越大
                            } else {
                                return b.payin.split(' ')[0] * 1 - a.payin.split(' ')[0] * 1;
                            }
                        });
                    }
                    this.TBeosplayers.status = 2;
                } else {  // err or res.statusCode != 200
                    setTimeout(() => {
                        this.getTBeosplayers( scope, lower);
                    }, 200);
                }

            });
        } catch(err) {
            this.log.error( 'getTBeosplayers catch error:', err );
            this.getTBeosplayers( scope, lower);
        }
    }

    getTBeosplat(lower='') {
        try {
            request({
                url: this.getTableUrl,
                method: 'POST',
                json: true,
                body: { code: this.gameContract, scope: this.gameContract, table: 'eosplat', limit: 120, lower_bound: lower, json: true },
                timeout: 5000,  // 如果不设置超时，request可能出现一直不返回
            }, ( err, res, body ) => {

                if ( !err && res.statusCode == 200 ) {
                    let _rows = body.rows, _more = body.more;

                    if ( _more ) {
                        let _lower = _rows[_rows.length-1].period;
                        this.getTBeosplat( _lower );
                        return;
                    } else if ( _rows.length ) {
                        this.TBeosplat.eosplat = _rows[_rows.length-1];
                    }
                    this.TBeosplat.status  = 2;
                } else {
                    setTimeout(() => {
                        this.getTBeosplat( lower );
                    }, 200);
                }

            });
        } catch(err) {
            this.log.error( 'getTBeosplat catch error:', err );
            this.getTBeosplat( lower );
        }
    }

    getTBconfig() {
        try {
            request({
                url: this.getTableUrl,
                method: 'POST',
                json: true,
                body: { code: this.gameContract, scope: this.gameContract, table: 'config', json: true },
                timeout: 5000,  // 如果不设置超时，request可能出现一直不返回
            }, ( err, res, body ) => {

                if ( !err && res.statusCode == 200 ) {
                    let _rows = body.rows, _more = body.more;

                    if ( _more ) {
                        this.getTBconfig();
                        return;
                    } else if ( _rows.length ) {
                        this.TBconfig.config = _rows[_rows.length-1];
                    }
                    this.TBconfig.status = 2;
                } else {
                    setTimeout(() => {
                        this.getTBconfig();
                    }, 200);
                }

            });
        } catch(err) {
            this.log.error( 'getTBconfig catch error:', err );
            this.getTBconfig();
        }
    }

    newestTopnResHandle() {
        try {
            let eos_bounty = 0;
            let period = Math.floor(Date.now()/(1000*3600));

            if ( this.TBconfig.status === 0 ) {
                this.TBconfig.status = 1;
                this.getTBconfig();
            }
            if ( this.TBeosplat.status === 0 ) {
                this.TBeosplat.status = 1;
                this.getTBeosplat();
            }
            if ( this.TBeosplayers.status === 0 ) {
                this.TBeosplayers.status = 1;
                this.getTBeosplayers(period);
            }

            if ( this.TBconfig.status === 2 && this.TBeosplat.status === 2 && this.TBeosplayers.status === 2 ) {
                if ( this.TBconfig.config.lowconf && eos_bounty < this.TBconfig.config.lowconf.quantity.split(' ')[0] * 1 && this.TBconfig.config.lowconf.on ) {
                    eos_bounty = this.TBconfig.config.lowconf.quantity.split(' ')[0] * 1;
                }

                if ( this.TBeosplayers.eosplayers.length ) {
                    // 在不在活动时间
                    let should_pay = false;
                    let now_seconds = Math.floor(Date.now()/1000);
                    let dayth = Math.floor(now_seconds / 86400), timeth = Math.floor(now_seconds % 86400);
                    for ( let tconf of this.TBconfig.config.timeconf ) {
                        let check_start = Math.floor(tconf.start % 86400);
                        let check_end   = Math.floor(tconf.end   % 86400);

                        if ( (check_start <= timeth && timeth <= check_end) && (tconf.day == 0 || tconf.day == dayth) ) {
                            should_pay = true;
                            break;
                        }
                    }

                    // 总奖励
                    let eos_bounty_tmp = this.TBeosplat.eosplat.eos_sum.split(' ')[0] * 1 * this.TBconfig.config.rate / 10000;
                    if ( eos_bounty < eos_bounty_tmp ) {
                        eos_bounty = eos_bounty_tmp;
                    }

                    if ( should_pay ) {
                        let topn_payin = 0;
                        let topn = this.TBconfig.config.topn * 1;
                        if ( topn > this.TBeosplayers.eosplayers.length ) {
                            topn = this.TBeosplayers.eosplayers.length;
                        }

                        for ( let i = 0; i < topn; i++ ) {
                            topn_payin += (this.TBeosplayers.eosplayers[i].payin.split(' ')[0] * 1);
                        }

                        for ( let i = 0; i < topn; i++ ) {
                            let payout_amount = eos_bounty * (this.TBeosplayers.eosplayers[i].payin.split(' ')[0] * 1) / topn_payin;
                            payout_amount = Math.floor(payout_amount * 10000) / 10000;
                            this.TBeosplayers.eosplayers[i].payout = payout_amount + ' EOS';
                        }
                    }
                }

                let newestTopnRes = {
                    period: period,
                    eos_bounty: (Math.floor(eos_bounty * 10000) / 10000).toFixed(4) + ' EOS',
                    winners: this.TBeosplayers.eosplayers.slice(0, 100),
                }

                this.TBconfig.status = 0;
                this.TBeosplat.status = 0;
                this.TBeosplayers.status = 0;
                this.TBconfig.config = {};
                this.TBeosplat.eosplat = {};
                this.TBeosplayers.eosplayers = [];
                this.cacheSvc.pubNewestTopnRes(newestTopnRes);
            }

            setTimeout(() => {
                this.newestTopnResHandle();
            }, 3000);  // 3secs
        } catch(err) {
            this.log.error( 'newestTopnResHandle catch error:', err );
            this.newestTopnResHandle();
        }
    }
}

module.exports = TrustBetInfoService;
