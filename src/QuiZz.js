var Quiz = require('./Quiz');
var irc = require('irc');
var colors = require('irc-colors');

/**
 * QuiZz class
 *
 * @constructor
 */
function QuiZz(options) {
    'use strict';
    var self = this;

    /**
     * @type {Quiz}
     */
    self.quiz = new Quiz;

    /**
     * @type {irc.Client}
     */
    self.client = new irc.Client(null, null, options);

    // NS ID ?
    self.identified = false;

    // on join channel
    self.client.addListener('join', function (c, n, message) {
        if (self.identified) {
            if ((options.channels[0] === c) && (options.nick === n)) {
                self.quiz.start();
            }
        }
        else {
            self.identified = true;
            self.client.say('NickServ', 'IDENTIFY ' + options.password);
            self.client.part(c);
            self.client.join(c);
        }
    });

    // what to do when a message is received
    self.client.addListener('message', function (from, to, message) {
        switch (message) {
            case '!repeat':
                self.quiz.repeat();
                break;
            case '!hint':
                self.quiz.hint();
                break;
            case '!next':
                self.quiz.next();
                break;
            case '!ladder':
                self.quiz.ladder();
                break;
            case '!help':
                self.quiz.help();
                break;
            default :
                self.quiz.compare(from, colors.stripColorsAndStyle(message));
                break;
        }
    });

    // on IRC errors
    self.client.addListener('error', function (error) {
        self.client.say(options.channels[0], colors.bold.green(error.command));
        console.log(error);
    });

    // when the quizz want to answer
    self.quiz.emitter.on('message', function (message) {
        self.client.say(options.channels[0], colors.bold.red(message));
    });
}

module.exports = QuiZz;