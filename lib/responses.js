function OkResponse(type, message) {
	this.code = 200;
	this.type = type;
	this.data = message;
}

function BadAuthResponse(message) {
	this.code = 401;
	this.type = "error";
	this.message = message;
}

function BadParametersResponse(message) {
	this.code = 400;
	this.type = "error";
	this.message = message;
}

function BadReadFileResponse(file) {
	this.code = 409;
	this.type = "error";
	this.message = "File " + file + " doesn't exist or cannot be read";
}

function BadReadPathResponse(path) {
	this.code = 409;
	this.type = "error";
	this.message = "Path " + path + " doesn't exist or cannot be read";
}

function BadWriteFileResponse(file) {
	this.code = 409;
	this.type = "error";
	this.message = "File " + file + " cannot be created or writen";
}

module.exports = {
	OK : OkResponse,
	BadAuth : BadAuthResponse,
	BadParameters : BadParametersResponse,
	BadReadFile : BadReadFileResponse,
	BadReadPath : BadReadPathResponse,
	BadWriteFile : BadWriteFileResponse
}