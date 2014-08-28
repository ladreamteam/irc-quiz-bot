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
     *   "title": "some question?",
     *   "answer": "some answer",
     *   "started": "2014-01-01Z00:00:00",
     *   "hints": {
     *     "given": 0,
     *     "date": "2014-01-01Z00:00:00",
     *     "revealed" : [0,3,5,7]
     *
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
 * Starts a new question.
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
            self.question.hints = {
                "given": 0,
                "date": self.question.started,
                "revealed": []
            };

            // return the title
            self.message(self.question.title);
        } else {
            // if there is no question available, just notify
            self.message('Je n\'ai plus aucune question.');
        }
    } else {
        // we can't run 2 questions at the same time
        self.message('Je suis déjà en train de poser des questions.');
    }
};

/**
 * Repeats the question.
 */
Quiz.prototype.repeat = function () {
    'use strict';
    var self = this;

    if (self.question !== null) {
        // just send back the question
        self.message(self.question.title);
    } else {
        // we can't stop anything
        self.message('Je ne pose aucune question actuellement.');
    }
};

/**
 * Gives an hint to the current question
 */
Quiz.prototype.hint = function () {
    'use strict';
    var self = this;

    if (self.question !== null) {
        var date = self.question.hints.date;

        // wait 10s before !hint possible
        if (((new Date()) >= (new Date(date.getTime())).setSeconds(date.getSeconds() + 10))
            && self.question.hints.given < 3) {
            // save that we gave an hint
            self.question.hints.given += 1;
            self.question.hints.date = new Date();
        }

        // repeat always the same thing
        switch (self.question.hints.given - 1) {
            case 0:
                self.message(self.revealAnswer(0));
                break;
            case 1:
                self.message(self.revealAnswer(1 / 3));
                break;
            case 2:
                self.message(self.revealAnswer(1 / 2));
                break;
            default :
                self.message('Je n\'ai pas les moyens de vous aider pour le moment (ou pour toujours).');
                break;
        }
    } else {
        // we can't stop anything
        self.message('Je ne pose aucune question actuellement.');
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
            self.message(util.format('La réponse était : %s.', self.question.answer));
            self.message('Prochaine question dans 15 secondes.');

            // reset current and start a new one after 15s
            self.question = null;
            setTimeout(function () {
                self.start();
            }, 15 * 1000);
        } else {
            // we can't next to soon (avoid abuse)
            self.message('Tentez de chercher avant, ça pourrait être intéressant.');
        }
    } else {
        // we can't stop anything
        self.message('Je ne pose aucune question actuellement.');
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
        self.message(util.format('%s. %s (%s)', (i + 1), self.players[i].name, self.players[i].score));
    }
};

/**
 * Provides some help.
 */
Quiz.prototype.help = function () {
    'use strict';
    var self = this;

    self.message('Commandes: !repeat, !hint, !next, !ladder, !help.');
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

            // how many points ?
            var points = 4 - self.question.hints.given;

            self.message(util.format('Bravo %s ! La réponse était : %s, pour %s points.', name, self.question.answer, points));
            self.message('Prochaine question dans 15 secondes.');

            // reset current and start a new one after 15s
            self.question = null;
            setTimeout(function () {
                self.start();
            }, 15 * 1000);

            // add point (use some to short circuit)
            var add = function (element) {
                if (element.name === name) {
                    element.score += points;
                    return true;
                }
                return false;
            };

            // use it to insert or update
            if (!self.players.some(add)) {
                self.players.push({"name": name, "score": points});
            }

            // save the file
            fs.writeFile(self.pFile, JSON.stringify(self.players));
        }
    }
};

/**
 * Emits a "message" event.
 *
 * @param message
 */
Quiz.prototype.message = function (message) {
    'use strict';
    var self = this;

    self.emitter.emit('message', message);
};

/**
 * Return a new string without all accented char from var string.
 *
 * @param string
 *
 * @returns {string}
 */
Quiz.prototype.normalize = function (string) {
    'use strict';

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
 * Reveals a random portion of the string.
 *
 * @param ratio
 *
 * @returns {string}
 */
Quiz.prototype.revealAnswer = function (ratio) {
    'use strict';
    var self = this;

    // get already revealed letters and compute
    // how many letters we need to have
    var toReveal = Math.floor(ratio * self.question.answer.length);
    var _string = self.normalize(self.question.answer).replace(/[^\W_]/gi, '*').split('');

    // add some random letters
    while (self.question.hints.revealed.length < toReveal) {
        var rand = Math.floor(Math.random() * self.question.answer.length); //A random position in the string
        if ((_string[rand] === '*') && (self.question.hints.revealed.indexOf(rand) === -1)) {
            self.question.hints.revealed.push(rand);
        }
    }

    // remove *
    for (var i = 0; i < self.question.hints.revealed.length; i++) {
        _string[self.question.hints.revealed[i]] = self.question.answer[self.question.hints.revealed[i]];
    }

    return _string.join('');
};

module.exports = Quiz;