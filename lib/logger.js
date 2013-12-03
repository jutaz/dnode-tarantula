var colours = require('colors');
var util = require('util');

function logger(level) {
    this.level = ('Number' != typeof level && level !== false) ? 5 : level;
    this.level = (!this.level) ? 0 : this.level;
    this.levels = {
        'debug': 5,
        'log': 4,
        'info': 3,
        'warn': 2,
        'error': 1
    }
}

logger.prototype.debug = function() {
    var args = arguments;
    this.satisfies('debug', function() {
        process.stdout.write("debug - ".yellow+util.format.apply(this, args));
    });
}

logger.prototype.log = function() {
    var args = arguments;
    this.satisfies('log', function() {
        process.stdout.write("log - ".cyan+util.format.apply(this, args));
    });
}

logger.prototype.info = function() {
    var args = arguments;
    this.satisfies('info', function() {
        process.stdout.write("info - ".blue+util.format.apply(this, args));
    });
}

logger.prototype.warn = function() {
    var args = arguments;
    this.satisfies('warn', function() {
        process.stdout.write("warn - ".yellow+util.format.apply(this, args));
    });
}

logger.prototype.error = function() {
    var args = arguments;
    this.satisfies('error', function() {
        process.stdout.write("error - ".red+util.format.apply(this, args));
    });
}

logger.prototype.satisfies = function(name, callback) {
    if(this.levels[name] && this.levels[name] <= this.level) {
        callback();
    }
    //do not callback othervise. Simple Solution™
}

module.exports = logger;