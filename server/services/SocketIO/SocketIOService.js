const Koa = require('koa');
const app = new Koa();
const router = require('koa-router')();
const server = require('http').Server(app.callback());
// const fetch = require('node-fetch');

router.get('/', async (ctx, next) => {
    ctx.response.body = `<h1>stream server version v1 ^_^</h1>`;
});
app.use(router.routes());

class SocketIOService {
    constructor(config, log, redis, cacheSvc) {
        this.log          = log;
        this.cacheSvc     = cacheSvc;
        this.handleIO     = require('socket.io')(server);
        this.redis        = {
            sub: redis.redisSub,
            // pub: redis.redisPub,
            // client: redis.redisClient,
        };
        this.newestTopn   = null;

        server.listen(config.socketioPort);
    }

    // async minertop( socket ) {
    //     let fetch_url  = 'http://data.trust.bet/v1/history/get_mine_table';
    //     let fetch_opts = {
    //         method: 'POST',
    //         body: JSON.stringify({'name':'trustbetmine'}),
    //     };

    //     fetch( fetch_url, fetch_opts )
    //         .then(response => response.json())
    //         .then(res_json => {
    //             let after_sort = res_json.results;

    //             if ( after_sort.length > 0 ) {
    //                 after_sort = res_json.results.sort((a, b) => {
    //                     return (b.balance[0].split(' ')[0] * 1 - a.balance[0].split(' ')[0] * 1);  // 降序
    //                 });
    //             }
    //             let miner_top = after_sort.slice(0, 20);  // top 20

    //             if ( socket && socket.connected ) {
    //                 socket.emit( 'MinerTop', miner_top );
    //             }
    //         })
    //         .catch(err => {
    //             this.log.error( 'fetch miner top error: ', err );
    //         });
    // }

    async start() {
        this.log.info('socket.io service start...');

        this.handleIO.on('connection', async (socket) => {
            let lastRank = null;
            let handleLoop = null;  // EOS Daily Rank Loop

            // let origin = socket.handshake.headers.origin;
            // this.log.info( `connection: ${origin}` );

            socket.on('disconnect', () => {
                if ( handleLoop ) {
                    clearInterval( handleLoop );
                }

                // this.log.info( `disconnect: ${origin}` );
            });

            socket.on('Login', async (player) => {
                this.log.info( `login: ${player}` );
                let playerBetList = await this.cacheSvc.getSicRecords( player );
                if ( playerBetList && socket.connected ) {
                    socket.emit( 'PlayerBetList', playerBetList );
                }
            });

            // 水果机下注记录
            socket.on('getCashPlayerList', async (account) => {  // 某个玩家
                let cashBetList = await this.cacheSvc.getCashBetList(account);
                if (cashBetList && socket.connected) {
                    socket.emit('CashPlayerList', cashBetList);
                }
            });
            socket.on('getCashAllList', async () => {  // 所有玩家
                let account = 'trustbetcash';
                let cashBetList = await this.cacheSvc.getCashBetList(account);
                if (cashBetList && socket.connected) {
                    socket.emit('CashAllList', cashBetList);
                }
            });

            // 推送聊天记录
            socket.on('getChatList', async (params) => {
                if ( typeof params === 'string' ) {
                    params = JSON.parse(params);
                }

                let _key = 'chat:trustbetchat';
                let _listChat = await this.cacheSvc.getChats(_key, params);

                if ( _listChat && socket.connected ) {
                    socket.emit( 'ChatList', _listChat );
                }
            });

            // 推送中奖记录
            socket.on('getChatResultList', async (params) => {
                if ( typeof params === 'string' ) {
                    params = JSON.parse(params);
                }

                let _key = 'results:trustbetchat';
                let _listChatResult = await this.cacheSvc.getChatResults(_key, params);

                if ( _listChatResult && socket.connected ) {
                    socket.emit( 'ChatResultList', _listChatResult );
                }
            });

            // 推送EOS排行榜奖励发放记录
            socket.on('getTopnResList', async (params) => {
                if ( typeof params === 'string' ) {
                    params = JSON.parse(params);
                }
                let _key = 'tr:trustbetinfo';
                let _listTopnRes = await this.cacheSvc.getTopnRes(_key, params);

                if ( _listTopnRes && socket.connected ) {
                    socket.emit( 'TopnResList', _listTopnRes );
                }
            });

            // 推送实时排行
            socket.on('getNewestTopnRes', async (p) => {
                if ( this.newestTopn && socket.connected ) {
                    socket.emit( 'NewestTopnRes', this.newestTopn );
                }
            });

            // ******************************* 牛牛 Start ****************************
            // 进入牛牛游戏
            socket.on('openBull', async (p) => {
                let data = await this.cacheSvc.getBullInfo();
                if (data && socket.connected) {
                    socket.emit('welcomeBull', JSON.stringify(data));
                }
            });
            // 最近5局牌型记录
            socket.on('getBullLastNCards', async (p) => {
                let data = await this.cacheSvc.getBullLastFiveCards();
                if (data.length && socket.connected) {
                    socket.emit('onBullLastNCards', JSON.stringify(data));
                }
            });
            // 投注记录
            socket.on('getBullBetRecords', async (account) => {
                let data = await this.cacheSvc.getBullBetRecords(account);
                if (data && socket.connected) {
                    socket.emit('onBullBetRecords', JSON.stringify(data));
                }
            });
            // 上庄弹窗
            socket.on('BullDealerCmd', async (cmdStr) => {
                let data = null, cmdJson = JSON.parse(cmdStr);
                if (cmdJson === null) { return; }
                switch (cmdJson.type) {
                    case 'CurrentDealers':    // 当前庄家
                    case 'DealersWaiting': {  // 预约上庄
                        data = await this.cacheSvc.getBullCurAndWaitingDealers(cmdJson);
                        break;
                    }
                    case 'DealersIncome':     // 庄家收益
                    case 'MyDealer': {        // 我的庄家
                        data = await this.cacheSvc.getBullMyAndAllDealerIncome(cmdJson);
                        break;
                    }
                }
                if (data && socket.connected) {
                    socket.emit('onBullDealerCmd', JSON.stringify(data));
                }
            });
            // 在线玩家
            socket.on('getBullOnlinePlayers', async (p) => {
                let data = await this.cacheSvc.getBullOnlinePlayers();
                if (data.length && socket.connected) {
                    socket.emit('onBullOnlinePlayers', JSON.stringify(data));
                }
            });
            // ******************************* 牛牛 End   ****************************

            // this.minertop( socket );

            setImmediate(async () => {         
                //发送排行榜
                let latestRank = await this.cacheSvc.getEosDailyRank();
                if ( latestRank &&
                     socket.connected &&
                     JSON.stringify(lastRank) !== JSON.stringify(latestRank) )  {

                    lastRank = latestRank;
                    socket.emit( 'EosDailyRank', latestRank );
                }

                //发送所有投注
                let trustBetList = await this.cacheSvc.getSicRecords( 'trustbetgame' );
                if ( socket.connected ) {
                    if ( trustBetList )  { socket.emit( 'TrustBetList', trustBetList ); }
                }       
            });

            handleLoop = setInterval(async () => {
                let latestRank = await this.cacheSvc.getEosDailyRank();
                if ( latestRank &&
                     socket.connected &&
                     JSON.stringify(lastRank) !== JSON.stringify(latestRank) )  {

                    lastRank = latestRank;
                    socket.emit( 'EosDailyRank', latestRank );
                }
            }, 3000);  // 3s
        });

        this.redis.sub.subscribe('NewBet', 'NewCashBet', 'NewChat', 'NewTopnRes', 'NewChatResult', 'NewestTopnRes', 'BullResult', 'NewBullBet', 'BullGameStop', 'BullGameStart', 'BullDealersChange', (err, count) => {  // 需要订阅的频道在这里添加
            if (err) {
                this.log.error('redis subscribe: ', err);
                return false;
            }
            this.log.info(`redis subscribed ${count} channels...`);

            this.redis.sub.on('message', (channel, message) => {  // 接收频道消息
                switch (channel) {
                    case 'NewBet': {
                        this.handleIO.emit( 'NewBet', JSON.stringify(message) );
                        break;
                    }
                    case 'NewCashBet': {
                        this.handleIO.emit( 'NewCashBet', JSON.stringify(message) );
                        break;
                    }
                    case 'NewChat': {
                        let _NewChats = [];
                        _NewChats.push(message);
                        this.handleIO.emit( 'NewChats', JSON.stringify(_NewChats) );
                        break;
                    }
                    case 'NewTopnRes': {
                        this.handleIO.emit( 'NewTopnRes', JSON.stringify(message) );
                        break;
                    }
                    case 'NewChatResult': {
                        this.handleIO.emit( 'NewChatResult', JSON.stringify(message) );
                        break;
                    }
                    case 'NewestTopnRes': {
                        if ( JSON.stringify(message) != JSON.stringify(this.newestTopn) ) {
                            this.newestTopn = message;
                            this.handleIO.emit( 'NewestTopnRes', JSON.stringify(message) );
                        }
                        break;
                    }
                    // ******************************* 牛牛 Start ****************************
                    case 'BullResult':
                    case 'NewBullBet':
                    case 'BullGameStop':
                    case 'BullGameStart': {
                        let stepInfo = {
                            step: channel,
                            info: message
                        }
                        this.handleIO.emit('BullStep', JSON.stringify(stepInfo));
                        break;
                    }
                    case 'BullDealersChange': {
                        this.handleIO.emit('onBullDealersChange', message);
                        break;
                    }
                    // ******************************* 牛牛 End   ****************************
                    default: {
                        this.log.info(`invalid channel: ${channel} !`);
                    }
                }
            });
        });
    }
}

module.exports = SocketIOService;
