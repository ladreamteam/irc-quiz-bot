var config = require('./resources/config.json');
var QuiZz = require('./src/QuiZz');

new QuiZz(config.irc.host, config.irc.nick, config.irc.channel);
