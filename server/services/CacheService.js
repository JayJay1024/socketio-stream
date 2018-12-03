'use strict';

const redis = require('ioredis')
,dayjs = require('dayjs');
const GAMEACCOUNT = 'trustbetgame'
,MAXCOUNT = 25
,EXPIRETS = 3 * 24 * 60 * 60;

class CacheService {
    constructor(conf,log) {
        this.log = log;
        this.client = new redis(conf.redisPort,conf.redisHost);
        this.client.on("error", function (err) {
            log.error('redis error:',err);
        });
    }

    async addBet(data) {
        try {
            const day = Math.floor(Date.now()/(1000 * 86400));
            const dailyRank = `r:${day}`;
            const bDay = Math.floor(data.txtime / 86400);
            const play = data.player;
            const pKey = 'a:' + play;
            const aKey = 'a:' + GAMEACCOUNT;
            const payins = data.payin.split(' ');
            let dataStr = data;
            if(typeof dataStr != 'string') {
                dataStr = JSON.stringify(dataStr);
            }

            const end = Math.floor(Date.now() / 1000) + 5;

            while(Date.now() / 1000 < end) {
                this.client.watch(aKey, pKey); 
                let aKeyExist = await this.client.zrank(aKey, dataStr) > 0;
                let pKeyExist = await this.client.zrank(pKey, dataStr) > 0;
                if(aKeyExist || pKeyExist ) {
                    this.client.unwatch();
                    return false;
                }

                this.client.multi({ pipeline: false });  
                this.client.zadd(aKey, data.txtime, dataStr);
                this.client.zremrangebyrank(aKey, 0, - MAXCOUNT-1);
                this.client.zadd(pKey, data.txtime, dataStr);
                this.client.zremrangebyrank(pKey, 0, - MAXCOUNT-1);
                this.client.expire(pKey, EXPIRETS);

                 if(payins[1] == 'EOS' && day == bDay) {
                    this.client.zincrby(dailyRank, parseFloat(payins[0]), play);
                 }
                 this.client.expire(pKey, dailyRank);

                var res = await this.client.exec();

                if(res){
                    this.log.info('add:',dataStr); 
                    return true;
                }
            }

            return false;
        } catch(err) {
            this.log.error('add bet', err);
        }
    }

    async addMine(data) {
        try {
            const uid    = data.uid;
            const payout = data.payout;
            await this.client.set(uid, payout, 'EX', 60);  // expire: 60s
        } catch(err) {
            this.log.error('add mine', err);
        }
    }

    async getMine(uid) {
        try {
            const result = await this.client.get(uid);
            return result;
        } catch(err) {
            this.log.error('get mine', err);
        }
    }

    async getEosDailyRank() {
        try {
            const dailyRank = `r:${Math.floor(Date.now()/(1000 * 86400))}`;
            const result = await this.client.zrevrange(dailyRank, 0, 99, 'WITHSCORES');
            const len = result.length;

            if ( len % 2 === 0 ) {
                let rank = [];

                for ( let i = 0; i < len; i++ ) {
                    if ( i % 2 ) {
                        rank[rank.length - 1].balance = result[i];
                    } else {
                        rank.push( {name: result[i]} );
                    }
                }

                return rank;
            } else {
                return [];
            }
        } catch(err) {
            this.log.error('geteosDailyRank', err);
        }     
    }

    async getAcitons(accout) {
        try {
            const aKey = `a:${accout}`;
            const result = await this.client.zrevrange(aKey, 0, 19);
            return result;
        } catch(err) {
            this.log.error('geteosDailyRank', err);
        }     
    }    
}

module.exports = CacheService;