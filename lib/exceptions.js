var util = require('util');

var responses = require('./responses');

function AuthException(message) {
	Error.captureStackTrace(this, this.constructor);
	this.name = this.constructor.name;
	this.message = message;
	this.response = responses.BadParameters;
}

function ParametersException(message) {
	Error.captureStackTrace(this, this.constructor);
	this.name = this.constructor.name;
	this.message = message;
	this.response = responses.BadParameters;
}

function ReadFileException(message) {
	Error.captureStackTrace(this, this.constructor);
	this.name = this.constructor.name;
	this.message = message;
	this.response = responses.BadReadFile;
}

function ReadPathException(message) {
	Error.captureStackTrace(this, this.constructor);
	this.name = this.constructor.name;
	this.message = message;
	this.response = responses.BadReadPath;
}

function WriteFileException(message) {
	Error.captureStackTrace(this, this.constructor);
	this.name = this.constructor.name;
	this.message = message;
	this.response = responses.BadWriteFile;
}

util.inherits(AuthException, Error);
util.inherits(ParametersException, Error);
util.inherits(ReadFileException, Error);
util.inherits(ReadPathException, Error);
util.inherits(WriteFileException, Error);

module.exports = {
	ParametersException,
	ReadFileException,
	ReadPathException,
	WriteFileException
}