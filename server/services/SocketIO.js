const Koa = require('koa');
const app = new Koa();
const router = require('koa-router')();
const server = require('http').Server(app.callback());

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

    async init() {
        this.handleIO.on('connection', async (socket) => {
            let origin = socket.handshake.headers.origin;
            this.log.info( `connection: ${origin}` );

            socket.on('disconnect', () => {
                this.log.info( `disconnect: ${origin}` );
            });

            socket.on('Login', async (player) => {
                this.log.info( `login: ${player}` );
                let playerBetList = await this.svc.getAcitons( player );
                if ( playerBetList && socket.connected ) {
                    socket.emit( 'PlayerBetList', playerBetList );
                }
            });

            let trustBetList = await this.svc.getAcitons( 'trustbetgame' );
            let eosDailyRank = await this.svc.getEosDailyRank();

            if ( socket.connected ) {
                if ( eosDailyRank )  { socket.emit( 'EosDailyRank', eosDailyRank ); }
                if ( trustBetList )  { socket.emit( 'TrustBetList', trustBetList ); }
            }
        });

        this.monitorSvc.on('NewAction', (actData) => {
            this.handleIO.emit( 'NewBet', actData );
        });
    }
}

module.exports = SocketIO;
