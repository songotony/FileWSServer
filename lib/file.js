var ws = require('ws');
var mkdirp = require('mkdirp');
var fs = require('fs');
var path = require('path');

var config = {};
try {
	config = require('../config.json');
}
catch (e) {
}

var auth = require('./auth');
var constants = require('./constants');
var responses = require('./responses');
var exceptions = require('./exceptions');

if (config.baseDir == undefined || typeof config.baseDir != "string" || config.baseDir == "")
	config.baseDir = ".";
if (config.key == undefined || typeof config.key != "string" || config.key == "")
	config.key = "secret";

function authUserFile(socket, json) {
	if (json == undefined || json.username == undefined || json.username == "" || json.project == undefined || json.project == "")
		throw new exceptions.ParametersException('Missing file auth parameters');
	socket.file.username = json.username;
	socket.file.project.name = json.project;
	if (socket.readyState === ws.OPEN)
		socket.send(JSON.stringify(new responses.OK("fileAuth", "OK")));
}

function getOneFile(socket, json) {
	var msg = {name:json.name};

	try {
		fs.accessSync(path.join(config.baseDir, json.username, json.project, json.name), fs.constants.R_OK);
		content = fs.readFileSync(path.join(config.baseDir, json.username, json.project, json.name), 'utf8');
		for (i = 0; i < content.length; i += constants.FILEPARTSIZE) {
			if (i + constants.FILEPARTSIZE < content.length)
				msg.content = content.slice(i, i + constants.FILEPARTSIZE);
			else
				msg.content = content.slice(i);
			msg.part = parseInt(i / constants.FILEPARTSIZE) + 1;
			msg.maxPart = parseInt(content.length / constants.FILEPARTSIZE) + 1;
			if (socket.readyState === ws.OPEN)
				socket.send(JSON.stringify(new responses.OK("fileGet", msg)));
		}
	}
	catch (err) {
		console.log(err);
		if (socket.readyState === ws.OPEN)
			socket.send(JSON.stringify(new responses.BadReadFile(json.name)));
	}
}

function getOneDir(socket, json) {
	fs.readdir(path.join(config.baseDir, json.username, json.project, json.name), function(err, files) {
		if (err)
			throw new exceptions.ReadPathException(json.name);
		files.forEach(function(file) {
			var tmp = JSON.parse(JSON.stringify(json));
			tmp.name = path.join(json.name, file);
			fs.stat(path.join(config.baseDir, json.username, json.project, tmp.name), function(err, stats) {
				if (err)
					return;
				if (stats.isDirectory() && json.recursivly)
					getOneDir(socket, JSON.parse(JSON.stringify(tmp)));
				else if (stats.isFile())
					getOneFile(socket, JSON.parse(JSON.stringify(tmp)));
			});
		});
	});
}

function getProject(socket, json) {
	json.name = "/";
	json.recursivly = true;
	getOneDir(socket, json);
}

function getFile(socket, json) {
	if (json == undefined || json.username == undefined || json.username == "" || json.project == undefined || json.project == "")
		throw new exceptions.ParametersException('Missing file get parameters');
	if (json.name == undefined || json.name == "")
		getProject(socket, json);
	else
		fs.stat(path.join(config.baseDir, socket.file.username, socket.file.project.name, json.name), function(err, stats) {
			if (err)
				return;
			if (stats.isDirectory())
				getOneDir(socket, json);
			else if (stats.isFile())
				getOneFile(socket, json);
		});
}

function postFile(socket, json) {
	var part, maxPart = 1;

	if (!auth.verify(socket, config.key))
		return;
	if (socket.file.username == null)
		throw new exceptions.AuthException("Missing auth file for client");
	if (json == undefined || json.name == undefined || json.name == "" || json.content == undefined || json.content == "")
		throw new exceptions.ParametersException('Missing file post parameters');
	if (!socket.file.contentList.hasOwnProperty(json.name))
		socket.file.contentList[json.name] = {};
	part = Object.keys(socket.file.contentList[json.name]).length + 1;
	if (json.hasOwnProperty('part') && typeof json.part == "number")
		part = json.part;
	if (json.hasOwnProperty('maxPart') && typeof json.maxPart == "number")
		maxPart = json.maxPart;
	socket.file.contentList[json.name][part] = new Buffer(json.content, "base64").toString("binary");
	if (Object.keys(socket.file.contentList[json.name]).length == maxPart) {
		var destPath = path.join(config.baseDir, socket.file.username, socket.file.project.name, (socket.pr.actual.dir != null ? path.join(socket.pr.actual.dir, json.name) : json.name));
		mkdirp(path.dirname(destPath), function(err) {
			if (err)
				throw new exceptions.WriteFileException(json.name);
			var totalContent = "";
			for (i = 1; i <= maxPart; i++)
				totalContent += socket.file.contentList[json.name][i];
			fs.writeFile(destPath, totalContent, "binary", function(err) {
				if (err)
					throw new exceptions.WriteFileException(json.name);
				console.log("Content successfully wrote");
				if (socket.readyState === ws.OPEN)
					socket.send(JSON.stringify(new responses.OK("filePost", "OK")));
			});
			socket.file.contentList[json.name] = {};
		});
	}
}

function deleteFile(socket, json) {
	if (!auth.verify(socket, config.key))
		return;
	if (socket.file.username == null || socket.file.project.name == null)
		throw new exceptions.AuthException("Missing auth file for client");
	if (json == undefined || json.name == undefined || json.name == "")
		throw new exceptions.ParametersException('Missing file delete parameters');
	fs.access(path.join(config.baseDir, socket.file.username, socket.file.project.name, json.name), function(err) {
		if (err)
			return;
		fs.unlink(path.join(config.baseDir, socket.file.username, socket.file.project.name, json.name), function(err) {
			if (err)
				return;
			console.log("Successfully deleted " + path.join(config.baseDir, socket.file.username, socket.file.project.name, json.name));
			if (socket.readyState === ws.OPEN)
				socket.send(JSON.stringify(new responses.OK("fileDelete", "OK")));
		});
	});
}

module.exports = {
	auth : authUserFile,
	get : getFile,
	funcs : [
		{subtype:'auth', func:authUserFile},
		{subtype:'get', func:getFile},
		{subtype:'post', func:postFile},
		{subtype:'delete', func:deleteFile}
	]
}
