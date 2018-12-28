## Server Side

#### Install Redis
Must install redis first.

#### Start Server
```
// after install nodejs
$ npm install
$ pm2 start --env production
// now go to client demo
```

#### Stop Server
```
// get the id
$ pm2 list

// stop via id
$ pm2 stop id
```
