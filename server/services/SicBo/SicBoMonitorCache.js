'use strict';

const MAXCOUNT = 25
,EXPIRETS = 3 * 24 * 60 * 60;

class SicBoMonitorCache {
    constructor( config, log, redis ) {
        this.log          = log;
        this.redis        = {
            // sub: redis.redisSub,
            pub: redis.redisPub,
            client: redis.redisClient,
        };
        this.gameContract = config.sicboContract;
    }

    async addBet(data) {
        try {
            const payMine = await this.getMine(data.uid);
            if ( payMine ) {
                data.mine = payMine;
            } else {
                data.mine = '0.0000 TBT';
            }
            this.redis.pub.publish('NewBet', JSON.stringify(data));

            const day = Math.floor(Date.now()/(1000 * 86400));
            const dailyRank = `r:${day}`;
            const bDay = Math.floor(data.txtime / 86400);
            const play = data.player;
            const pKey = 'a:' + play;
            const aKey = 'a:' + this.gameContract;
            const payins = data.payin.split(' ');
            let dataStr = data;
            if(typeof dataStr != 'string') {
                dataStr = JSON.stringify(dataStr);
            }

            const end = Math.floor(Date.now() / 1000) + 5;

            while(Date.now() / 1000 < end) {
                this.redis.client.watch(aKey, pKey); 
                let aKeyExist = await this.redis.client.zrank(aKey, dataStr) > 0;
                let pKeyExist = await this.redis.client.zrank(pKey, dataStr) > 0;
                if(aKeyExist || pKeyExist ) {
                    this.redis.client.unwatch();
                    return false;
                }

                this.redis.client.multi({ pipeline: false });  
                this.redis.client.zadd(aKey, data.txtime, dataStr);
                this.redis.client.zremrangebyrank(aKey, 0, - MAXCOUNT-1);
                this.redis.client.zadd(pKey, data.txtime, dataStr);
                this.redis.client.zremrangebyrank(pKey, 0, - MAXCOUNT-1);
                this.redis.client.expire(pKey, EXPIRETS);

                 if(payins[1] == 'EOS' && day == bDay) {
                    this.redis.client.zincrby(dailyRank, parseFloat(payins[0]), play);
                    this.redis.client.expire(dailyRank, EXPIRETS);
                 }

                var res = await this.redis.client.exec();

                if(res){
                    this.log.info('add:',dataStr); 
                    return true;
                }
            }

            this.log.debug('bet data not save: ', data);
            return false;
        } catch(err) {
            this.log.error('add bet', err);
        }
    }

    async addMine(data) {
        try {
            const uid    = data.uid;
            const payout = data.payout;
            await this.redis.client.set(uid, payout, 'EX', 60);  // expire: 60s
        } catch(err) {
            this.log.error('add mine', err);
        }
    }

    async getMine(uid) {
        try {
            return await this.redis.client.get(uid);
        } catch(err) {
            this.log.error('get mine', err);
            return false;
        }
    }
}

module.exports = SicBoMonitorCache;
