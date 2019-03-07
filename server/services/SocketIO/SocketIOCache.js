'use strict';

class SocketIOCache {
    constructor(config, log, redis) {
        this.log           = log;
        this.redis         = {
            // sub: redis.redisSub,
            // pub: redis.redisPub,
            client: redis.redisClient,
        };
        this.redisRecsMax  = 999999999999999;

        this.mineContract  = config.mineContract;
        this.chatContract  = config.chatContract;
        this.sicboContract = config.sicboContract;
    }

    async getEosDailyRank() {
        let _result = [];
        try {
            let _key = `r:${Math.floor(Date.now()/(1000 * 86400))}`;
            let _data = await this.redis.client.zrevrange(_key, 0, 9, 'WITHSCORES');

            for ( let i = 0; i < _data.length; i++ ) {
                if ( i % 2 ) {
                    _result[_result.length - 1].balance = _data[i];
                } else {
                    _result.push( {name: _data[i]} );
                }
            }
        } catch(err) {
            this.log.error('get eos daily rank', err);
        }
        _result = JSON.stringify(_result);
        return _result;
    }

    async getSicRecords(account) {
        let _result = [];
        try {
            let _key = `a:${account}`;
            _result = await this.redis.client.zrevrange(_key, 0, 19);
        } catch(err) {
            this.log.error('get sicbo records', err);
        }
        _result = JSON.stringify(_result);
        return _result;
    }

    // 水果机下注记录
    async getCashBetList(account) {
        let _result = [];
        try {
            let _key = `cash:${account}`;
            _result = await this.redis.client.zrevrange(_key, 0, 19);
        } catch(err) {
            this.log.error('catch error when get cash bet list:', err);
        }
        _result = JSON.stringify(_result);
        return _result;
    }

    async getChats(key, params=null) {
        let _result = {
            data: [],
            after: 0,
            before: 0,
        };

        try {
            if ( params && params.startt && params.records ) {
                let _min = 0, _max = params.startt * 1;
                if ( _max < 0 ) { _max = this.redisRecsMax; }
                let _offset = 0, _count = params.records * 1;
                if ( _count > 100 ) { _count = 100; }
                else if ( _count < 1 ) { _count = 1; }
                let _data  = await this.redis.client.zrevrangebyscore(key, _max, _min, 'LIMIT', _offset, _count);

                if ( _data.length ) {
                    // let _max_r = _data[0]; _max_r = JSON.parse(_max_r);
                    // let _min_r = _data[_data.length-1]; _min_r = JSON.parse(_min_r);

                    let _after  = await this.redis.client.zcount(key, _max+1, this.redisRecsMax);
                    let _before = await this.redis.client.zcount(key, _min, _max-1);

                    _result.data   = _data;
                    _result.after  = _after;
                    _result.before = _before;
                }
            }
        } catch(err) {
            this.log.error('get chats fail: ', err);
        }
        _result = JSON.stringify(_result);
        return _result;
    }

    async getChatResults(key, params=null) {
        let _result = {
            data: [],
            after: -1,
            before: -1,
        };

        try {
            if ( params && (typeof(params.startt) != undefined) && params.records ) {
                let _min = 0, _max = params.startt * 1;
                if ( _max < 0 ) { _max = this.redisRecsMax; }
                let _offset = 0, _count = params.records * 1;
                if ( _count > 100 ) { _count = 100; }
                else if ( _count < 1 ) { _count = 1; }
                let _data   = await this.redis.client.zrevrangebyscore(key, _max, _min, 'LIMIT', _offset, _count);

                if ( _data.length ) {
                    _result.data   = _data;

                    let _max_r = _data[0]; _max_r = JSON.parse(_max_r);
                    let _min_r = _data[_data.length-1]; _min_r = JSON.parse(_min_r);

                    let _after  = await this.redis.client.zrangebyscore(key, _max_r.number+1, this.redisRecsMax, 'LIMIT', _offset, 1);
                    let _before = await this.redis.client.zrevrangebyscore(key, _min_r.number-1, _min, 'LIMIT', _offset, 1);

                    if (_after.length) {
                        _result.after = JSON.parse(_after[0]).number;
                    }
                    if (_before.length) {
                        _result.before = JSON.parse(_before[0]).number;
                    }
                }
            }
        } catch(err) {
            this.log.error('get results fail: ', err);
        }
        _result = JSON.stringify(_result);
        return _result;
    }

    async getTopnRes(key, params=null) {
        let _result = {
            data: [],
            after: -1,
            before: -1,
        };

        try {
            if ( params && (typeof(params.startt) != undefined) && params.records ) {
                let _min = 0, _max = params.startt * 1;
                if ( _max < 0 ) { _max = this.redisRecsMax; }
                let _offset = 0, _count = params.records * 1;
                if ( _count > 100 ) { _count = 100; }
                else if ( _count < 1 ) { _count = 1; }
                let _data = await this.redis.client.zrevrangebyscore(key, _max, _min, 'LIMIT', _offset, _count);

                if ( _data.length ) {
                    _result.data   = _data;

                    let _max_r = _data[0];              _max_r = JSON.parse(_max_r);
                    let _min_r = _data[_data.length-1]; _min_r = JSON.parse(_min_r);

                    let _after  = await this.redis.client.zrangebyscore(key, _max_r.period+1, this.redisRecsMax, 'LIMIT', _offset, 1);
                    let _before = await this.redis.client.zrevrangebyscore(key, _min_r.period-1, _min, 'LIMIT', _offset, 1);

                    if (_after.length) {
                        _result.after = JSON.parse(_after[0]).period;
                    }
                    if (_before.length) {
                        _result.before = JSON.parse(_before[0]).period;
                    }
                }
            }
        } catch(err) {
            this.log.error('catch error when get topn result:', err);
        }

        _result = JSON.stringify(_result);
        return _result;
    }

    // ******************************* 牛牛 Start ****************************
    async getBullInfo() {
        let ret = null;
        try {
            let tbPeriods = await this.redis.client.get('bull:tb:periods');
            let tbDealers = await this.redis.client.get('bull:tb:dealers');

            if (tbPeriods && tbDealers) {
                ret = JSON.parse(tbPeriods);
                let tbDealersJson = JSON.parse(tbDealers);
                ret.curdealers = tbDealersJson.dealers;
                ret.ondealerswait = tbDealersJson.ondealerswait;
                ret.offdealerswait = tbDealersJson.offdealerswait;
            }
        } catch (err) {
            this.log.error('catch error when get bull table periods:', err);
        }
        return ret;
    }
    // 获取最近5局的牌型
    async getBullLastFiveCards() {
        let ret = [];
        try {
            let key = 'bull:results', max = this.redisRecsMax, min = 0, offset = 0, count = 5;
            let results = await this.redis.client.zrevrangebyscore(key, max, min, 'LIMIT', offset, count);
            for (let result of results) {
                let resultJson = JSON.parse(result);
                ret.push(resultJson.vcard);
            }
        } catch (err) {
            this.log.error('catch error when get last five cards:', err);
        }
        return ret;
    }
    // 投注记录（所有投注记录/某个玩家投注记录）
    async getBullBetRecords(account) {
        let ret = [];
        try {
            if (account) {
                let key = `bull:bet:records:${account}`;
                ret = await this.redis.client.zrevrange(key, 0, 19);  // 返回最新 20 条记录
            }
        } catch (err) {
            this.log.error('catch error when get bull bets:', err);
        }
        return ret;
    }
    // 当前庄家/预约上庄
    async getBullCurAndWaitingDealers(cmdJson) {
        let ret = {
            type: cmdJson.type,
            data: [],
        };

        try {
            let dataStr = await this.redis.client.get('bull:tb:dealers');
            if (dataStr) {
                let dataJson = JSON.parse(dataStr);

                switch (cmdJson.type) {
                    case 'CurrentDealers': {  // 当前庄家
                        ret.data = dataJson.dealers;
                        break;
                    }
                    case 'DealersWaiting': {  // 预约上庄
                        ret.data = dataJson.ondealerswait;
                        break;
                    }
                }
            }
        } catch (err) {
            this.log.error('catch error when get bull dealer list:', err);
        }
        return ret;
    }
    // 我的庄家/庄家收益
    async getBullMyAndAllDealerIncome(cmdJson) {
        let ret = {
            data: [],
            after: -1,
            before: -1,
            currency: -1,
            type: cmdJson.type,
        };

        try {
            let key = '';
            if (cmdJson.type === 'MyDealer') {
                key = `bull:dealer:${cmdJson.dealer}`;
            } else if (cmdJson.type === 'DealersIncome') {
                key = 'bull:dealer:all2';
            }

            let newest = await this.redis.client.zrevrangebyscore(key, this.redisRecsMax, 0, 'LIMIT', 0, 1);
            if (newest.length) {
                let newestJson = JSON.parse(newest[0]);

                if (cmdJson.start > 0) {
                    let req = await this.redis.client.zrevrangebyscore(key, cmdJson.start, cmdJson.start, 'LIMIT', 0, 1500);
                    if (req.length) {
                        ret.data = req;
                        ret.currency = cmdJson.start;

                        let after  = await this.redis.client.zrangebyscore(key, cmdJson.start + 1, this.redisRecsMax, 'LIMIT', 0, 1);
                        let before = await this.redis.client.zrevrangebyscore(key, cmdJson.start - 1, 0,                 'LIMIT', 0, 1);

                        if (after.length) {
                            ret.after = JSON.parse(after[0]).score;
                        }
                        if (before.length) {
                            ret.before = JSON.parse(before[0]).score;
                        }
                    }
                } else {
                    if (newestJson.score > 0) {
                        let before = await this.redis.client.zrevrangebyscore(key, newestJson.score - 1, 0, 'LIMIT', 0, 1);
                        if (before.length) {
                            ret.before = JSON.parse(before[0]).score;
                        }
                    }
                    let req = await this.redis.client.zrevrangebyscore(key, newestJson.score, newestJson.score, 'LIMIT', 0, 1500);
                    ret.data = req;
                    ret.currency = newestJson.score;
                }
            }
        } catch (err) {
            this.log.error('catch error when get bull my and all dealer income:', err);
        }
        return ret;
    }

    // 在线玩家
    async getBullOnlinePlayers() {
        let ret = [];
        try {
            let datastr = await this.redis.client.get('bull:tb:periods');
            if (datastr) {
                let dataJson = JSON.parse(datastr);
                ret = dataJson.bets;
            }
        } catch (err) {
            this.log.error('catch error when get online players:', err);
        }
        return ret;
    }
    // ******************************* 牛牛 End   ****************************
}

module.exports = SocketIOCache;
