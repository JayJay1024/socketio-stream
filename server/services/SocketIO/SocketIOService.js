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

        this.redis.sub.subscribe('NewBet', 'NewChat', 'NewChatResult', (err, count) => {  // 需要订阅的频道在这里添加
            if (err) {
                this.log.error('redis subscribe: ', err);
                return false;
            }
            this.log.info(`redis subscribed ${count} channels...`);

            this.redis.sub.on('message', (channel, message) => {  // 接收频道消息
                switch (channel) {
                    case 'NewBet': {
                        this.handleIO.emit( 'NewBet', message );
                        break;
                    }
                    case 'NewChat': {
                        let _NewChats = [];
                        _NewChats.push(message);
                        this.handleIO.emit( 'NewChats', _NewChats );
                        break;
                    }
                    case 'NewChatResult': {
                        this.handleIO.emit( 'NewChatResult', message );
                        break;
                    }
                    default: {
                        this.log.info(`invalid channel: ${channel} !`);
                    }
                }
            });
        });
    }
}

module.exports = SocketIOService;
