"use strict";

var winston = require("winston");
var path = require("path");
var fs = require("fs");

var logger = new (winston.Logger)({
	transports: [

	new (winston.transports.Console)({
			'timestamp':       true,
			colorize:          true,
			handleExceptions:  true
		}),

		new (winston.transports.File)({
			timestamp:         true,
			colorize:          false,
			handleExceptions:  true,
			filename:          path.resolve("./logs", "repository_logs_"),
			maxsize:           5*1024*1024,
			maxFiles:          10,
			json:              false
		})			
	]
});

try {
	fs.accessSync("./logs", fs.constants.W_OK);
} catch (e) {
	fs.mkdirSync("./logs");
}

var console = {
	log : function(msg) {
		logger.info(msg);
	},
	warn : function(msg) {
		logger.warn(msg);
	},
	error : function(msg) {
		logger.error(msg);
	}
}

exports = module.exports = console;