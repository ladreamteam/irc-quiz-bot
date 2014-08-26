var fs = require('fs');
var util = require('util');
var events = require('events');

/**
 * Quiz class
 *
 * @constructor
 */
function Quiz() {
    'use strict';

    /**
     * @type {exports.EventEmitter}
     */
    this.emitter = new events.EventEmitter();

    /**
     * [
     *   {
     *     "title": "?",
     *     "answer": "."
     *   }
     * ]
     * @type {Array}
     */
    this.questions = [];

    /**
     * [
     *   {
     *     "name": "nick",
     *     "score": 0
     *   }
     * ]
     * @type {Array}
     */
    this.players = [];

    /**
     * {
     *   "title": "?",
     *   "answer": ".",
     *   "started": "2014-01-01Z00:00:00",
     *   "hints": {
     *     "given": 0,
     *     "date": "2014-01-01Z00:00:00"
     *   }
     * }
     * @type {null|{}}
     */
    this.question = null;

    /**
     * Files
     *
     * @type {string}
     */
    this.qFile = __dirname + '/../resources/questions.json';
    this.pFile = __dirname + '/../resources/players.json';

    // init
    this.initQuestions(this.qFile);
    this.initPlayers(this.pFile);
}

/**
 * Initializes the list of questions.
 *
 * @param filename the JSON Object file
 */
Quiz.prototype.initQuestions = function (filename) {
    'use strict';
    var self = this;

    // read the file
    fs.readFile(filename, function (error, data) {
        // throw error if one
        if (error) {
            throw error;
        }

        // store the questions
        self.questions = JSON.parse(data);
    });
};

/**
 * Initializes the list of players.
 *
 * @param filename the JSON Object file
 */
Quiz.prototype.initPlayers = function (filename) {
    'use strict';
    var self = this;

    // read the file
    fs.readFile(filename, function (error, data) {
        // throw error if one
        if (error) {
            throw error;
        }

        // store the players
        self.players = JSON.parse(data);
    });
};

/**
 * Starts the quiz.
 */
Quiz.prototype.start = function () {
    'use strict';
    var self = this;

    // only starts if there is no current question
    if (self.question === null) {
        // and if there is some questions available
        if (self.questions.length !== 0) {
            // pick a random question and send it back
            self.question = self.questions[Math.floor(Math.random() * self.questions.length)];
            self.question.started = new Date();
            self.question.hints = {"given": 0, "date": self.question.started};

            // return the title
            self.emitter.emit('message', self.question.title);
        } else {
            // if there is no question av²ailable, just notify
            self.emitter.emit('message', 'Je n\'ai plus aucune question.');
        }
    } else {
        // we can't run 2 questions at the same time
        self.emitter.emit('message', 'Je suis déjà en train de poser des questions.');
    }
};

/**
 * Stops the quiz.
 */
Quiz.prototype.stop = function () {
    'use strict';
    var self = this;

    // if there is a current question
    if (self.question !== null) {
        // remove it
        self.question = null;
        self.emitter.emit('message', 'Je vois que les incultes ne veulent plus parfaire leur culture.');
    } else {
        // we can't stop anything
        self.emitter.emit('message', 'Je ne pose aucune question actuellement.');
    }
};

/**
 * Gives an hint to the current question
 */
Quiz.prototype.hint = function () {
    'use strict';
    var self = this;

    if (self.question !== null) {
        // wait 10s before !hint possible
        var date = self.question.hints.date;
        if ((new Date()) >= (new Date(date.getTime())).setSeconds(date.getSeconds() + 10)) {
            // give more hints everytime
            switch (self.question.hints.given) {
                case 0:
                    self.emitter.emit('message', self.reveal(self.question.answer, [0]));
                    break;
                case 1:
                    self.emitter.emit('message', self.reveal(self.question.answer, [4]));
                    break;
                default:
                    self.emitter.emit('message', self.reveal(self.question.answer, [4, 2]));
                    break;
            }

            // save that we gave an hint
            self.question.hints.given += 1;
            self.question.hints.date = new Date();
        } else {
            // repeat last
            switch (self.question.hints.given) {
                case 1:
                    self.emitter.emit('message', self.reveal(self.question.answer, [0]));
                    break;
                case 2:
                    self.emitter.emit('message', self.reveal(self.question.answer, [4]));
                    break;
                default:
                    self.emitter.emit('message', self.reveal(self.question.answer, [4, 2]));
                    break;
            }
        }
    } else {
        // we can't stop anything
        self.emitter.emit('message', 'Je ne pose aucune question actuellement.');
    }
};

/**
 * Skips to the next question.
 */
Quiz.prototype.next = function () {
    'use strict';
    var self = this;

    if (self.question !== null) {
        // wait 15s before !next possible
        var started = self.question.started;
        if ((new Date()) >= (new Date(started.getTime())).setSeconds(started.getSeconds() + 15)) {
            // send the answer, to bring some knowledge
            self.emitter.emit('message', util.format('La réponse était : %s.', self.question.answer));
            self.emitter.emit('message', 'Prochaine question dans 15 secondes.');

            // reset current and start a new one after 15s
            self.question = null;
            setTimeout(function () {
                self.start();
            }, 15 * 1000);
        } else {
            // we can't next to soon (avoid abuse)
            self.emitter.emit('message', 'Tentez de chercher avant, ça pourrait être intéressant.');
        }
    } else {
        // we can't stop anything
        self.emitter.emit('message', 'Je ne pose aucune question actuellement.');
    }
};

/**
 * Finds the 5 best players.
 */
Quiz.prototype.ladder = function () {
    'use strict';
    var self = this;

    // sort array by score
    self.players.sort(function (p1, p2) {
        return p2.score - p1.score
    });

    // only get the 5 best
    for (var i = 0; ((i < 5) && (i < self.players.length)); i++) {
        self.emitter.emit('message', util.format('%s. %s (%s)', (i + 1), self.players[i].name, self.players[i].score));
    }
};

/**
 * Compares an answer with the current question.
 *
 * @param name name of the quizzer
 * @param answer submitted answer
 */
Quiz.prototype.compare = function (name, answer) {
    'use strict';
    var self = this;

    if (self.question !== null) {
        // if the answer matches the real answer (without any accented char)
        if (self.normalize(self.question.answer) === self.normalize(answer)) {
            self.emitter.emit('message', util.format('Bravo %s ! La réponse était : %s.', name, self.question.answer));
            self.emitter.emit('message', 'Prochaine question dans 15 secondes.');

            // add point (use some to short circuit)
            var add = function (element) {
                if (element.name === name) {
                    element.score += 1;
                    return true;
                }
                return false;
            };

            // use it to insert or update
            if (!self.players.some(add)) {
                self.players.push({"name": name, "score": 1});
            }

            // save the file
            fs.writeFile(self.pFile, JSON.stringify(self.players));

            // reset current and start a new one after 15s
            self.question = null;
            setTimeout(function () {
                self.start();
            }, 15 * 1000);
        }
    }
};

/**
 * Return a new string without all accented char from var string.
 *
 * @param string
 *
 * @returns {string}
 */
Quiz.prototype.normalize = function (string) {

    var accents = 'ÀÁÂÃÄÅàáâãäåÒÓÔÕÕÖØòóôõöøÈÉÊËèéêëðÇçÐÌÍÎÏìíîïÙÚÛÜùúûüÑñŠšŸÿýŽž';
    var _accents = "AAAAAAaaaaaaOOOOOOOooooooEEEEeeeeeCcDIIIIiiiiUUUUuuuuNnSsYyyZz";

    var _string = string.split('');

    for (var i = 0; i < _string.length; i++) {
        var char = accents.indexOf(_string[i]);
        if (char !== -1) {
            _string[i] = _accents.substr(char, 1);
        }
    }

    return _string.join('').toLocaleLowerCase().trim();
};

/**
 * Reveals a portion of the string.
 *
 * @param string
 * @param every
 *
 * @returns {string}
 */
Quiz.prototype.reveal = function (string, every) {

    var _string = this.normalize(string).replace(/[^\W_]/gi, '*').split('');

    for (var i = 1; i <= _string.length; i++) {
        var isRevealed = false;

        // check if we need to reveal
        for (var y = 0; y < every.length; y++) {
            isRevealed = isRevealed || (i % every[y] === 0);
        }

        // if to reveal
        if (isRevealed) {
            _string[i] = string[i];
        }
    }

    return _string.join('');
};

module.exports = Quiz;