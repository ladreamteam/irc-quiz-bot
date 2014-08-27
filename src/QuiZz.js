var Quiz = require('./Quiz');
var irc = require('irc');
var colors = require('irc-colors');

/**
 * QuiZz class
 *
 * @constructor
 */
function QuiZz(host, nick, channel) {
    'use strict';
    var self = this;

    /**
     * @type {Quiz}
     */
    this.quiz = new Quiz;

    /**
     * @type {irc.Client}
     */
    this.client = new irc.Client(host, nick, {"channels": [channel]});

    // what to do when a message is received
    this.client.addListener('message', function (from, to, message) {
        switch (message) {
            case '!start':
                self.quiz.start();
                break;
            case '!stop':
                self.quiz.stop();
                break;
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

    // when the quizz want to answer
    this.quiz.emitter.on('message', function (message) {
        self.client.say(channel, colors.bold.red(message));
    });
}

module.exports = QuiZz;