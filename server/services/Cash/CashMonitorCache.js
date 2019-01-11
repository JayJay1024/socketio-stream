'use strict';

class CashMonitorCache {
    constructor(config, log, redis) {
        this.log          = log;
        this.redis        = {
            // sub: redis.redisSub,
            pub: redis.redisPub,
            client: redis.redisClient,
        };
        this.gameContract = config.cashContract;
    }

    async addBet(data) {
        try {
            let payMine = await this.getMine(data.uid);
            if (payMine) {
                data.mine = payMine;
            } else {
                data.mine = '0.0000 TBT';
            }

            let _today    = Math.floor(Date.now()/(1000 * 86400));
            let _txtime   = data.txtime;
            let _player   = data.player;
            let _quantity = data.payin.split(' ');

            // redis keys
            let _keyPlayer    = `cash:${_player}`;            // 个人玩家记录
            let _keyGame      = `cash:${this.gameContract}`;  // 所有玩家的记录
            let _keyDailyRank = `r:${_today}`;              // 日排行榜

            let _data  = JSON.stringify(data);
            let _retry = Math.floor(Date.now() / 1000) + 5;

            while (Date.now() / 1000 < _retry) {
                this.redis.client.watch(_keyGame, _keyPlayer);
                let _existGame   = await this.redis.client.zrank(_keyGame,   _data) > 0;
                let _existPlayer = await this.redis.client.zrank(_keyPlayer, _data) > 0;
                if (_existGame || _existPlayer) {
                    this.redis.client.unwatch();
                    return false;
                }

                this.redis.pub.publish('NewCashBet', _data);
                this.redis.client.multi({ pipeline: false });

                this.redis.client.zadd(_keyGame,   _txtime, _data);
                this.redis.client.zadd(_keyPlayer, _txtime, _data);
                if (_quantity[1] === 'EOS') {
                    this.redis.client.zincrby(_keyDailyRank, parseFloat(_quantity[0]), _player);
                }

                this.redis.client.expire(_keyDailyRank, 60*60*72);                   // 日排行榜保留72小时
                this.redis.client.zremrangebyscore(_keyGame,   0, _txtime-7*86400);  // 个人记录删除7天外的
                this.redis.client.zremrangebyscore(_keyPlayer, 0, _txtime-7*86400);  // 平台记录删除7天外的

                let _ret = await this.redis.client.exec();
                if (_ret) {
                    this.log.info('add cash bet success:', _data);
                    return true;
                }
            }

            this.log.info('cash bet data not save:', data);
            return false;
        } catch(err) {
            this.log.error('error when add cash bet:', err);
            return false;
        }
    }

    async addMine(data) {
        try {
            let uid    = data.uid;
            let payout = data.payout;
            await this.redis.client.set(uid, payout, 'EX', 60);  // expire: 60s
        } catch(err) {
            this.log.error('error when add cash mine:', err);
            return false;
        }
    }

    async getMine(uid) {
        try {
            return await this.redis.client.get(uid);
        } catch(err) {
            this.log.error('error when get cash  mine:', err);
            return false;
        }
    }
}

module.exports = CashMonitorCache;
