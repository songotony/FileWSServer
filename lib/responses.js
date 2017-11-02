function OkResponse(type, message) {
	this.code = 200;
	this.type = type;
	this.data = message;
}

function BadAuthResponse(message) {
	this.code = 401;
	this.type = "badAuthError";
	this.message = message;
}

function BadParametersResponse(message) {
	this.code = 400;
	this.type = "badParametersError";
	this.message = message;
}

function BadReadFileResponse(file) {
	this.code = 409;
	this.type = "failReadFileError";
	this.file = file;
	this.message = "File " + file + " doesn't exist or cannot be read";
}

function BadReadPathResponse(path) {
	this.code = 409;
	this.type = "failReadPathError";
	this.path = path;
	this.message = "Path " + path + " doesn't exist or cannot be read";
}

function BadWriteFileResponse(file) {
	this.code = 409;
	this.type = "failWriteFileError";
	this.file = file;
	this.message = "File " + file + " cannot be created or written";
}

module.exports = {
	OK : OkResponse,
	BadAuth : BadAuthResponse,
	BadParameters : BadParametersResponse,
	BadReadFile : BadReadFileResponse,
	BadReadPath : BadReadPathResponse,
	BadWriteFile : BadWriteFileResponse
}