const Koa = require('koa');
const app = new Koa();
const router = require('koa-router')();
const server = require('http').Server(app.callback());
const fetch = require('node-fetch');

router.get('/', async (ctx, next) => {
    ctx.response.body = `<h1>stream server version v1 ^_^</h1>`;
});
app.use(router.routes());

class SocketIO {
    constructor( conf, log, cacheSvc, monitorSvc) {
        this.log = log;
        this.svc = cacheSvc;
        this.monitorSvc = monitorSvc;
        this.handleIO = require('socket.io')(server);

        server.listen(conf.socketioPort);
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

    async init() {
        this.handleIO.on('connection', async (socket) => {
            let lastRank = null;
            let handleLoop = null;  // EOS Daily Rank Loop

            let origin = socket.handshake.headers.origin;
            this.log.info( `connection: ${origin}` );

            socket.on('disconnect', () => {
                if ( handleLoop ) {
                    clearInterval( handleLoop );
                }

                this.log.info( `disconnect: ${origin}` );
            });

            socket.on('Login', async (player) => {
                this.log.info( `login: ${player}` );
                let playerBetList = await this.svc.getAcitons( player );
                if ( playerBetList && socket.connected ) {
                    socket.emit( 'PlayerBetList', playerBetList );
                }
            });

            // this.minertop( socket );

            setImmediate(async () => {         
                //发送排行榜
                let latestRank = await this.svc.getEosDailyRank();
                if ( latestRank &&
                     socket.connected &&
                     JSON.stringify(lastRank) !== JSON.stringify(latestRank) )  {

                    lastRank = latestRank;
                    socket.emit( 'EosDailyRank', latestRank );
                }

                //发送所有投注
                let trustBetList = await this.svc.getAcitons( 'trustbetgame' );    
                if ( socket.connected ) {
                    if ( trustBetList )  { socket.emit( 'TrustBetList', trustBetList ); }
                }       
            });

            handleLoop = setInterval(async () => {
                let latestRank = await this.svc.getEosDailyRank();
                if ( latestRank &&
                     socket.connected &&
                     JSON.stringify(lastRank) !== JSON.stringify(latestRank) )  {

                    lastRank = latestRank;
                    socket.emit( 'EosDailyRank', latestRank );
                }
            }, 3000);  // 3s
        });

        this.monitorSvc.on('NewBet', (actData) => {
            this.handleIO.emit( 'NewBet', actData );
        });
    }
}

module.exports = SocketIO;
