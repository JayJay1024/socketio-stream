'use strict';

class BullMonitorCache {
    constructor(config, log, redis) {
        this.log           = log;
        this.redis         = {
            // sub: redis.redisSub,
            pub: redis.redisPub,
            client: redis.redisClient,
        };
        this.isGameStarted       = false;
        this.isDGDTGameStarted   = false;
        this.isDGUSDTGameStarted = false;
        this.isDGEOSGameStarted  = false;
        this.isDGSAFEGameStarted = false;
        this.isDGSNETGameStarted = false;
        this.isDGTNBGameStarted  = false;

        this.lastRound   = -1;  // 上一期
        this.lastDGRound = {
            dt:   -1,
            usdt: -1,
            eos:  -1,
            safe: -1,
            snet: -1,
            tnb:  -1,
        };

        this.thisRoundDealersPayin   = 0;   // 这一期所有庄家的总投入
        this.thisDGRoundDealersPayin = {
            dt:   0,
            usdt: 0,
            eos:  0,
            safe: 0,
            snet: 0,
            tnb:  0,
        }

        this.thisRoundDealersPayout   = 0;   // 这一期所有庄家的总支出
        this.thisDGRoundDealersPayout = {
            dt:   0,
            usdt: 0,
            eos:  0,
            safe: 0,
            snet: 0,
            tnb:  0,
        }
    }

    // 实时投注信息
    async addBet(data) {
        try {
            let dataStr = JSON.stringify(data), retry = 25;
            let score = data.id, key = `bull:bet:realtime`;

            while (retry--) {
                // 重复的记录不添加
                this.redis.client.watch(key);
                if (await this.redis.client.zrank(key, dataStr) !== null) {
                    this.redis.client.unwatch();
                    return false;
                }
                this.redis.pub.publish('NewBullBet', JSON.stringify(data.vb));

                // 保留最新的 1024 条记录
                let count = await this.redis.client.zcount(key, 0, 66666666);
                if (count > 1024) {
                    this.redis.client.zremrangebyrank(key, 0, count - 1024);
                }

                if (await this.redis.client.zadd(key, score, dataStr)) {
                    // this.log.info('add realtime bet success:', dataStr);
                    return true;
                }
            }

            this.log.info('realtime bet data not save, data:', data);
            return false;
        } catch (err) {
            this.log.error('catch error when add realtime bet:', err);
            return false;
        }
    }

    // 龙网实时投注信息
    async addDGBet(data) {
        try {
            let dataStr = JSON.stringify(data), retry = 25;
            let score = data.id, key = `dg:bull:bet:realtime`;

            while (retry--) {
                // 重复的记录不添加
                this.redis.client.watch(key);
                if (await this.redis.client.zrank(key, dataStr) !== null) {
                    this.redis.client.unwatch();
                    return false;
                }
                this.redis.pub.publish('DGNewBullBet', JSON.stringify(data.vb));

                // 保留最新的 1024 条记录
                let count = await this.redis.client.zcount(key, 0, '+inf');
                if (count > 1024) {
                    this.redis.client.zremrangebyrank(key, 0, count - 1024);
                }

                if (await this.redis.client.zadd(key, score, dataStr)) {
                    // this.log.info('add realtime bet success:', dataStr);
                    return true;
                }
            }

            this.log.info('dragonex realtime bet data not save, data:', data);
            return false;
        } catch (err) {
            this.log.error('catch error when add dragonex realtime bet:', err);
            return false;
        }
    }

    // 亮牌结果
    async addResult(data) {
        if (data.round < 15) { return; }
        await this.addResultByBet(data);
        await this.addResultByDealer(data);

        try {
            let alreadyTrace = true;
            let dataStr = JSON.stringify(data);
            let key = 'bull:results', score = data.id, retry = 25;

            while (retry--) {
                this.redis.client.watch(key);
                if (await this.redis.client.zrank(key, dataStr) !== null) {
                    this.redis.client.unwatch();
                    break;;
                }
                alreadyTrace = false;
                this.redis.pub.publish('BullResult', dataStr);

                // 保留最新 1024 条记录
                let count = await this.redis.client.zcount(key, 0, 66666666);
                if (count > 1024) {
                    this.redis.client.zremrangebyrank(key, 0, count - 1024);
                }

                if (await this.redis.client.zadd(key, score, dataStr)) {
                    // this.log.info('add result success:', dataStr);
                    break;;
                }
            }
            if (retry <= 0) {
                this.log.info('add result data not save, data:', data);
            }
            if (!alreadyTrace) {
                await this.traceResult(data);
            }
            return false;
        } catch (err) {
            this.log.error('catch error when add result:', err);
            return false;
        }
    }

    // 统计结果
    async traceResult(data) {
        // 数据结构
        let trace = {
            xian1: {
                win: 0, lose: 0,  // 总输赢统计
                d5: 0, d4: 0, d3: 0, d2: 0, d1: 0,  // 输的倍数统计
                u1: 0, u2: 0, u3: 0, u4: 0, u5: 0,  // 应得倍数统计
            },
            xian2: {
                win: 0, lose: 0,
                d5: 0, d4: 0, d3: 0, d2: 0, d1: 0,
                u1: 0, u2: 0, u3: 0, u4: 0, u5: 0,
            },
            xian3: {
                win: 0, lose: 0,
                d5: 0, d4: 0, d3: 0, d2: 0, d1: 0,
                u1: 0, u2: 0, u3: 0, u4: 0, u5: 0,
            },
            xian4: {
                win: 0, lose: 0,
                d5: 0, d4: 0, d3: 0, d2: 0, d1: 0,
                u1: 0, u2: 0, u3: 0, u4: 0, u5: 0,
            }
        };
        let key = 'bull:result:trace';

        try {
            // 取出来原来的
            let tmp = await this.redis.client.get(key);
            if (tmp) {
                trace = JSON.parse(tmp);
            }

            // i = 0 是庄家的牌
            for (let i = 1; i < data.vcard.length; i++) {
                let card = data.vcard[i], xian = null;

                // 谁家的牌
                switch (i) {
                    case 1: {
                        xian = trace.xian1;
                        break;
                    }
                    case 2: {
                        xian = trace.xian2;
                        break;
                    }
                    case 3: {
                        xian = trace.xian3;
                        break;
                    }
                    case 4: {
                        xian = trace.xian4;
                        break;
                    }
                    default: {
                        this.log.error(`xian number error, number is ${i}`);
                    }
                }

                // 输赢赔率
                switch (card.win) {
                    case -5: {
                        xian.d5++;
                        break;
                    }
                    case -4: {
                        xian.d4++;
                        break;
                    }
                    case -3: {
                        xian.d3++;
                        break;
                    }
                    case -2: {
                        xian.d2++;
                        break;
                    }
                    case -1: {
                        xian.d1++;
                        break;
                    }
                    case 1: {
                        xian.u1++;
                        break;
                    }
                    case 2: {
                        xian.u2++;
                        break;
                    }
                    case 3: {
                        xian.u3++;
                        break;
                    }
                    case 4: {
                        xian.u4++;
                        break;
                    }
                    case 5: {
                        xian.u5++;
                        break;
                    }
                    default: {
                        this.log.error(`card[${i}]'s odds err, odds is ${card.win}`);
                    }
                }

                if (card.win > 0) {  // 庄家赢闲家输
                    xian.lose++;
                } else if (card.win < 0) {  // 闲家赢庄家输
                    xian.win++;
                }
            }  // end of for

            // update
            if (await this.redis.client.set(key, JSON.stringify(trace))) {
                // this.log.info('trace result success:', JSON.stringify(trace), JSON.stringify(data));
            } else {
                this.log.error('trace result fail:', JSON.stringify(trace), JSON.stringify(data));
            }
        } catch (err) {
            this.log.error('catch error when trace result:', err);
            return false;
        }
    }

    // 亮牌结果
    // 按不同玩家分开保存，以及按所有保存
    async addResultByBet(data) {
        try {
            let tmpData = Object.assign({}, data);
            delete tmpData.bets;
            for (let bet of data.bets) {
                tmpData.bet = bet;
                let score = bet.id, dataStr = JSON.stringify(tmpData), retry = 25;
                let keyAll = 'bull:bet:records:all', keyPlayer = `bull:bet:records:${bet.player}`;

                while (retry--) {
                    this.redis.client.watch(keyAll, keyPlayer);
                    let existAll    = await this.redis.client.zrank(keyAll,    dataStr) !== null;
                    let existPlayer = await this.redis.client.zrank(keyPlayer, dataStr) !== null;
                    if (existAll || existPlayer) {
                        this.redis.client.unwatch();
                        break;
                    }

                    // 保留最新的1024条记录
                    let countAll    = await this.redis.client.zcount(keyAll,    0, 66666666);
                    let countPlayer = await this.redis.client.zcount(keyPlayer, 0, 66666666);
                    if (countAll > 1024) {
                        this.redis.client.zremrangebyrank(keyAll, 0, countAll - 1024);
                    }
                    if (countPlayer > 1024) {
                        this.redis.client.zremrangebyrank(keyPlayer, 0, countPlayer - 1024);
                    }

                    this.redis.client.multi({ pipeline: false });
                    this.redis.client.zadd(keyAll,    score, dataStr);
                    this.redis.client.zadd(keyPlayer, score, dataStr);
                    if (await this.redis.client.exec()) {
                        // this.log.info('add result by bet success:', dataStr);
                        break;
                    }
                }
                if (retry <= 0) {
                    this.log.info('add result data by bet not save:', dataStr);
                }
            }
        } catch (err) {
            this.log.error('catch error when add result by bet:', err);
            return false;
        }
    }

    // 亮牌结果
    // 按不同庄家分开保存，以及按所有保存
    async addResultByDealer(data) {
        try {
            if (this.lastRound < 0) { this.lastRound = data.round; }

            if (data.round !== this.lastRound && this.thisRoundDealersPayin && this.thisRoundDealersPayout) {  // 新的一期
                let lastRd = this.lastRound;
                let dealersPayin  = Math.floor(this.thisRoundDealersPayin);
                let dealersPayout = Math.floor(this.thisRoundDealersPayout);

                this.lastRound = data.round;
                this.thisRoundDealersPayin = 0;
                this.thisRoundDealersPayout = 0;

                // 所有庄家上一期
                let key = 'bull:dealer:all2', score = Math.floor(((new Date(data.block_time)).getTime() / 1000 + 8 * 3600) / 86400);  // score 为这一天
                let dataStr = JSON.stringify({
                    score: score,
                    time: score,
                    round: lastRd,
                    balance_begin: dealersPayin,
                    balance_end: dealersPayout,
                    round_income: dealersPayout - dealersPayin,
                });

                let retry = 25;
                while (retry--) {
                    this.redis.client.watch(key);
                    if (await this.redis.client.zrank(key, dataStr) !== null) {
                        this.redis.client.unwatch();
                        break;
                    }

                    // 保留最新的1024条记录
                    let count = await this.redis.client.zcount(key, 0, 66666666);
                    if (count > 1024) {
                        this.redis.client.zremrangebyrank(key, 0, count - 1024);
                    }

                    // 在这一天里，保留所有庄家的上一期数据
                    if (await this.redis.client.zadd(key, score, dataStr)) {
                        // this.log.info('add result by dealer success:', dataStr);
                        break;
                    }
                }
                if (retry <= 0) {
                    this.log.info('add result data by all dealer not save:', data);
                }
            }

            for (let dealer of data.dealers) {
                if (data.period === 0 && this.thisRoundDealersPayout === 0) {   // 本期第一局
                    this.thisRoundDealersPayin  = this.thisRoundDealersPayin  + Math.floor(dealer.balance_begin.split(' ')[0] * 10000);
                }
                let maxPeriod = Math.floor(data.id / data.round);
                if (data.period === maxPeriod - 1 && this.thisRoundDealersPayin !== 0) {  // 本期最后一局
                    this.thisRoundDealersPayout = this.thisRoundDealersPayout + Math.floor(dealer.balance_end.split(' ')[0]   * 10000);
                }

                // 某个庄家这一局
                let key = `bull:dealer:${dealer.dealer}`, score = data.round;  // score 为这一期
                let dataStr = JSON.stringify({
                    score: score,
                    time: data.block_time,
                    round: data.round,
                    period: data.period,
                    dealer: dealer.dealer,
                    balance_begin: dealer.balance_begin,
                    balance_end: dealer.balance_end,
                });

                let retry = 25;
                while (retry--) {
                    this.redis.client.watch(key);
                    if (await this.redis.client.zrank(key, dataStr) !== null) {
                        this.redis.client.unwatch();
                        break;
                    }

                    // 保留最新的1024条记录
                    let count = await this.redis.client.zcount(key, 0, 66666666);
                    if (count > 1024) {
                        this.redis.client.zremrangebyrank(key, 0, count - 1024);
                    }

                    // 在这一期里面，添加这个庄家的这一局数据
                    if (await this.redis.client.zadd(key, score, dataStr)) {
                        // this.log.info('add result by dealer success:', dataStr);
                        break;
                    }
                }
                if (retry <= 0) {
                    this.log.info('add result data by one dealer not save:', data);
                }
            }
        } catch (err) {
            this.log.error('catch error when add result by dealer:', err);
            return false;
        }
    }

    // 龙网亮牌结果
    async addDGResult(data) {
        if (data.round < 15) { return; }
        await this.addDGResultByBet(data);
        await this.addDGResultByDealer(data);

        try {
            let dataStr = JSON.stringify(data);
            let key = 'dg:bull:results', score = data.id, retry = 25;

            while (retry--) {
                this.redis.client.watch(key);
                if (await this.redis.client.zrank(key, dataStr) !== null) {
                    this.redis.client.unwatch();
                    return true;
                }
                this.redis.pub.publish('DGBullResult', dataStr);

                // 保留最新 1024 条记录
                let count = await this.redis.client.zcount(key, 0, '+inf');
                if (count > 1024) {
                    this.redis.client.zremrangebyrank(key, 0, count - 1024);
                }

                if (await this.redis.client.zadd(key, score, dataStr)) {
                    // this.log.info('add result success:', dataStr);
                    return true;
                }
            }
            if (retry <= 0) {
                this.log.info('add dragonex result data not save, data:', data);
            }
            return false;
        } catch (err) {
            this.log.error('catch error when add dragonex result:', err);
            return false;
        }
    }

    // 龙网亮牌结果
    // 按不同玩家分开保存，以及按所有保存
    async addDGResultByBet(data) {
        try {
            let tmpData = Object.assign({}, data);
            delete tmpData.bets;
            for (let bet of data.bets) {
                tmpData.bet = bet;
                let score = bet.id, dataStr = JSON.stringify(tmpData), retry = 25;
                let keyAll = 'dg:bull:bet:records:all', keyPlayer = `dg:bull:bet:records:${bet.player}`;

                while (retry--) {
                    this.redis.client.watch(keyAll, keyPlayer);
                    let existAll    = await this.redis.client.zrank(keyAll,    dataStr) !== null;
                    let existPlayer = await this.redis.client.zrank(keyPlayer, dataStr) !== null;
                    if (existAll || existPlayer) {
                        this.redis.client.unwatch();
                        break;
                    }

                    // 保留最新的1024条记录
                    let countAll    = await this.redis.client.zcount(keyAll,    0, '+inf');
                    let countPlayer = await this.redis.client.zcount(keyPlayer, 0, '+inf');
                    if (countAll > 1024) {
                        this.redis.client.zremrangebyrank(keyAll, 0, countAll - 1024);
                    }
                    if (countPlayer > 1024) {
                        this.redis.client.zremrangebyrank(keyPlayer, 0, countPlayer - 1024);
                    }

                    this.redis.client.multi({ pipeline: false });
                    this.redis.client.zadd(keyAll,    score, dataStr);
                    this.redis.client.zadd(keyPlayer, score, dataStr);
                    if (await this.redis.client.exec()) {
                        // this.log.info('add result by bet success:', dataStr);
                        break;
                    }
                }
                if (retry <= 0) {
                    this.log.info('add dragonex result data by bet not save:', dataStr);
                }
            }
        } catch (err) {
            this.log.error('catch error when add dragonex result by bet:', err);
            return false;
        }
    }

    // 龙网亮牌结果
    // 按不同庄家分开保存，以及按所有保存
    async addDGResultByDealer(data) {
        try {
            let symbol = data.sym.split(',')[1].toLowerCase();
            switch (symbol) {
                case 'dt':
                case 'usdt':
                case 'eos':
                case 'safe':
                case 'snet':
                case 'tnb': {
                    break;
                }
                default: {
                    this.log.error('invalid symbol:', symbol);
                    return false;
                }
            }

            if (this.lastDGRound[symbol] < 0) { this.lastDGRound[symbol] = data.round; }

            if (data.round !== this.lastDGRound[symbol] && this.thisDGRoundDealersPayin[symbol] && this.thisDGRoundDealersPayout[symbol]) {  // 新的一期
                let lastRd = this.lastDGRound[symbol];
                let dealersPayin  = Math.floor(this.thisDGRoundDealersPayin[symbol]);
                let dealersPayout = Math.floor(this.thisDGRoundDealersPayout[symbol]);

                this.lastDGRound[symbol] = data.round;
                this.thisDGRoundDealersPayin[symbol] = 0;
                this.thisDGRoundDealersPayout[symbol] = 0;

                // 所有庄家上一期
                let keySym = `dg:bull:dealer:${symbol}:all2`;
                let key = 'dg:bull:dealer:all2', score = Math.floor(((new Date(data.block_time)).getTime() / 1000 + 8 * 3600) / 86400);  // score 为这一天
                let dataStr = JSON.stringify({
                    score: score,
                    time: score,
                    round: lastRd,
                    balance_begin: dealersPayin,
                    balance_end: dealersPayout,
                    round_income: dealersPayout - dealersPayin,
                });

                let retry = 25;
                while (retry--) {
                    this.redis.client.watch(key, keySym);
                    if (await this.redis.client.zrank(key, dataStr) !== null || await this.redis.client.zrank(keySym, dataStr) !== null) {
                        this.redis.client.unwatch();
                        break;
                    }

                    // 保留最新的1024条记录
                    let count = await this.redis.client.zcount(key, 0, '+inf');
                    if (count > 1024) {
                        this.redis.client.zremrangebyrank(key, 0, count - 1024);
                    }
                    count = await this.redis.client.zcount(keySym, 0, '+inf');
                    if (count > 1024) {
                        this.redis.client.zremrangebyrank(keySym, 0, count - 1024);
                    }

                    // 在这一天里，保留所有庄家的上一期数据
                    this.redis.client.multi({ pipeline: false });
                    this.redis.client.zadd(key, score, dataStr);
                    this.redis.client.zadd(keySym, score, dataStr);
                    if (await this.redis.client.exec()) {
                        // this.log.info('add result by dealer success:', dataStr);
                        break;
                    }
                }
                if (retry <= 0) {
                    this.log.info('add dragonex result data by all dealer not save:', data);
                }
            }

            for (let dealer of data.dealers) {
                if (data.period === 0 && this.thisDGRoundDealersPayout[symbol] === 0) {   // 本期第一局
                    this.thisDGRoundDealersPayin[symbol]  = this.thisDGRoundDealersPayin[symbol]  + Math.floor(dealer.balance_begin.split(' ')[0] * 10000);
                }
                let maxPeriod = Math.floor(data.id / data.round);
                if (data.period === maxPeriod - 1 && this.thisDGRoundDealersPayin[symbol] !== 0) {  // 本期最后一局
                    this.thisDGRoundDealersPayout[symbol] = this.thisDGRoundDealersPayout[symbol] + Math.floor(dealer.balance_end.split(' ')[0]   * 10000);
                }

                // 某个庄家这一局
                let keySym = `dg:bull:dealer:${symbol}:${dealer.dealer}`;
                let key = `dg:bull:dealer:${dealer.dealer}`, score = data.round;  // score 为这一期
                let dataStr = JSON.stringify({
                    score: score,
                    time: data.block_time,
                    round: data.round,
                    period: data.period,
                    dealer: dealer.dealer,
                    balance_begin: dealer.balance_begin,
                    balance_end: dealer.balance_end,
                });

                let retry = 25;
                while (retry--) {
                    this.redis.client.watch(key, keySym);
                    if (await this.redis.client.zrank(key, dataStr) !== null || await this.redis.client.zrank(keySym, dataStr) !== null) {
                        this.redis.client.unwatch();
                        break;
                    }

                    // 保留最新的1024条记录
                    let count = await this.redis.client.zcount(key, 0, '+inf');
                    if (count > 1024) {
                        this.redis.client.zremrangebyrank(key, 0, count - 1024);
                    }
                    count = await this.redis.client.zcount(keySym, 0, '+inf');
                    if (count > 1024) {
                        this.redis.client.zremrangebyrank(keySym, 0, count - 1024);
                    }

                    // 在这一期里面，添加这个庄家的这一局数据
                    this.redis.client.multi({ pipeline: false });
                    this.redis.client.zadd(key, score, dataStr);
                    this.redis.client.zadd(keySym, score, dataStr);
                    if (await this.redis.client.exec()) {
                        // this.log.info('add result by dealer success:', dataStr);
                        break;
                    }
                }
                if (retry <= 0) {
                    this.log.info('add dragonex result data by one dealer not save:', data);
                }
            }
        } catch (err) {
            this.log.error('catch error when add dragonex result by dealer:', err);
            return false;
        }
    }

    // 更新合约 periods 表
    async updateTbPeriods(data) {
        try {
            let key = 'bull:tb:periods', dataStr = JSON.stringify(data);
            let now = Date.now() / 1000, gameStart = data.begintime, gameEnd = data.endtime;

            // 判断开始投注、停止投注
            if (this.isGameStarted && now >= gameEnd) {
                this.isGameStarted = false;
                this.redis.pub.publish('BullGameStop', dataStr);
            } else if (!this.isGameStarted && gameStart < now && now < gameEnd && data.status === 0) {
                this.isGameStarted = true;
                this.redis.pub.publish('BullGameStart', dataStr);
            }

            await this.redis.client.set(key, dataStr);
        } catch (err) {
            this.log.error('catch error when update table periods:', err);
            return false;
        }
    }

    // 更新合约龙网 periods 表
    async updateDGTbPeriods(rowsDT, rowsUSDT, rowsEOS, rowsSAFE, rowsSNET, rowsTNB) {
        try {
            if (rowsDT) {
                let data = rowsDT;
                let key = 'dg:bull:tb:periods:dt', dataStr = JSON.stringify(data);
                let now = Date.now() / 1000, gameStart = data.begintime, gameEnd = data.endtime;

                // 判断开始投注、停止投注
                if (this.isDGDTGameStarted && now >= gameEnd) {
                    this.isDGDTGameStarted = false;
                    this.redis.pub.publish('DGDTBullGameStop', dataStr);
                } else if (!this.isDGDTGameStarted && gameStart < now && now < gameEnd && data.status === 0) {
                    this.isDGDTGameStarted = true;
                    this.redis.pub.publish('DGDTBullGameStart', dataStr);
                }

                await this.redis.client.set(key, dataStr);
            }
            if (rowsUSDT) {
                let data = rowsUSDT;
                let key = 'dg:bull:tb:periods:usdt', dataStr = JSON.stringify(data);
                let now = Date.now() / 1000, gameStart = data.begintime, gameEnd = data.endtime;

                // 判断开始投注、停止投注
                if (this.isDGUSDTGameStarted && now >= gameEnd) {
                    this.isDGUSDTGameStarted = false;
                    this.redis.pub.publish('DGUSDTBullGameStop', dataStr);
                } else if (!this.isDGUSDTGameStarted && gameStart < now && now < gameEnd && data.status === 0) {
                    this.isDGUSDTGameStarted = true;
                    this.redis.pub.publish('DGUSDTBullGameStart', dataStr);
                }

                await this.redis.client.set(key, dataStr);
            }
            if (rowsEOS) {
                let data = rowsEOS;
                let key = 'dg:bull:tb:periods:eos', dataStr = JSON.stringify(data);
                let now = Date.now() / 1000, gameStart = data.begintime, gameEnd = data.endtime;

                // 判断开始投注、停止投注
                if (this.isDGEOSGameStarted && now >= gameEnd) {
                    this.isDGEOSGameStarted = false;
                    this.redis.pub.publish('DGEOSBullGameStop', dataStr);
                } else if (!this.isDGEOSGameStarted && gameStart < now && now < gameEnd && data.status === 0) {
                    this.isDGEOSGameStarted = true;
                    this.redis.pub.publish('DGEOSBullGameStart', dataStr);
                }

                await this.redis.client.set(key, dataStr);
            }
            if (rowsSAFE) {
                let data = rowsSAFE;
                let key = 'dg:bull:tb:periods:safe', dataStr = JSON.stringify(data);
                let now = Date.now() / 1000, gameStart = data.begintime, gameEnd = data.endtime;

                // 判断开始投注、停止投注
                if (this.isDGSAFEGameStarted && now >= gameEnd) {
                    this.isDGSAFEGameStarted = false;
                    this.redis.pub.publish('DGSAFEBullGameStop', dataStr);
                } else if (!this.isDGSAFEGameStarted && gameStart < now && now < gameEnd && data.status === 0) {
                    this.isDGSAFEGameStarted = true;
                    this.redis.pub.publish('DGSAFEBullGameStart', dataStr);
                }

                await this.redis.client.set(key, dataStr);
            }
            if (rowsSNET) {
                let data = rowsSNET;
                let key = 'dg:bull:tb:periods:snet', dataStr = JSON.stringify(data);
                let now = Date.now() / 1000, gameStart = data.begintime, gameEnd = data.endtime;

                // 判断开始投注、停止投注
                if (this.isDGSNETGameStarted && now >= gameEnd) {
                    this.isDGSNETGameStarted = false;
                    this.redis.pub.publish('DGSNETBullGameStop', dataStr);
                } else if (!this.isDGSNETGameStarted && gameStart < now && now < gameEnd && data.status === 0) {
                    this.isDGSNETGameStarted = true;
                    this.redis.pub.publish('DGSNETBullGameStart', dataStr);
                }

                await this.redis.client.set(key, dataStr);
            }
            if (rowsTNB) {
                let data = rowsTNB;
                let key = 'dg:bull:tb:periods:tnb', dataStr = JSON.stringify(data);
                let now = Date.now() / 1000, gameStart = data.begintime, gameEnd = data.endtime;

                // 判断开始投注、停止投注
                if (this.isDGTNBGameStarted && now >= gameEnd) {
                    this.isDGTNBGameStarted = false;
                    this.redis.pub.publish('DGTNBBullGameStop', dataStr);
                } else if (!this.isDGTNBGameStarted && gameStart < now && now < gameEnd && data.status === 0) {
                    this.isDGTNBGameStarted = true;
                    this.redis.pub.publish('DGTNBBullGameStart', dataStr);
                }

                await this.redis.client.set(key, dataStr);
            }
        } catch (err) {
            this.log.error('catch error when update dragonex table periods:', err);
            return false;
        }
    }

    // 这里更新 pubkey 和 dealers 表
    async updateTbOthers(dealers, dealersdgdt, dealersdgusdt, dealersdgeos, dealersdgsafe, dealersdgsnet, dealersdgtnb) {
        try {
            if (dealers) {
                let key = 'bull:tb:dealers', dataStr = JSON.stringify(dealers);
                let exist = await this.redis.client.get(key);

                // 检查 dealers 表有更新则推送更新
                if (!exist || String(exist) != String(dataStr)) {
                    this.redis.pub.publish('BullDealersChange', dataStr);
                    await this.redis.client.set(key, dataStr);
                }
            }
            if (dealersdgdt) {
                let key = 'dg:bull:tb:dealers:dt', dataStr = JSON.stringify(dealersdgdt);
                let exist = await this.redis.client.get(key);

                // 检查龙网 dealers 表有更新则推送更新
                if (!exist || String(exist) != String(dataStr)) {
                    this.redis.pub.publish('DGDTBullDealersChange', dataStr);
                    await this.redis.client.set(key, dataStr);
                }
            }
            if (dealersdgusdt) {
                let key = 'dg:bull:tb:dealers:usdt', dataStr = JSON.stringify(dealersdgusdt);
                let exist = await this.redis.client.get(key);

                // 检查龙网 dealers 表有更新则推送更新
                if (!exist || String(exist) != String(dataStr)) {
                    this.redis.pub.publish('DGUSDTBullDealersChange', dataStr);
                    await this.redis.client.set(key, dataStr);
                }
            }
            if (dealersdgeos) {
                let key = 'dg:bull:tb:dealers:eos', dataStr = JSON.stringify(dealersdgeos);
                let exist = await this.redis.client.get(key);

                // 检查龙网 dealers 表有更新则推送更新
                if (!exist || String(exist) != String(dataStr)) {
                    this.redis.pub.publish('DGEOSBullDealersChange', dataStr);
                    await this.redis.client.set(key, dataStr);
                }
            }
            if (dealersdgsafe) {
                let key = 'dg:bull:tb:dealers:safe', dataStr = JSON.stringify(dealersdgsafe);
                let exist = await this.redis.client.get(key);

                // 检查龙网 dealers 表有更新则推送更新
                if (!exist || String(exist) != String(dataStr)) {
                    this.redis.pub.publish('DGSAFEBullDealersChange', dataStr);
                    await this.redis.client.set(key, dataStr);
                }
            }
            if (dealersdgsnet) {
                let key = 'dg:bull:tb:dealers:snet', dataStr = JSON.stringify(dealersdgsnet);
                let exist = await this.redis.client.get(key);

                // 检查龙网 dealers 表有更新则推送更新
                if (!exist || String(exist) != String(dataStr)) {
                    this.redis.pub.publish('DGSNETBullDealersChange', dataStr);
                    await this.redis.client.set(key, dataStr);
                }
            }
            if (dealersdgtnb) {
                let key = 'dg:bull:tb:dealers:tnb', dataStr = JSON.stringify(dealersdgtnb);
                let exist = await this.redis.client.get(key);

                // 检查龙网 dealers 表有更新则推送更新
                if (!exist || String(exist) != String(dataStr)) {
                    this.redis.pub.publish('DGTNBBullDealersChange', dataStr);
                    await this.redis.client.set(key, dataStr);
                }
            }
            return true;
        } catch (err) {
            this.log.error('catch error when update others table:', err);
            return false;
        }
    }
}

module.exports = BullMonitorCache;
