var ws = require('ws');
var mkdirp = require('mkdirp');
var fs = require('fs');
var path = require('path');
var Promise = require('bluebird');

var auth = require('./auth');
var constants = require('./constants');
var responses = require('./responses');
var exceptions = require('./exceptions');
var config = require('./config');
var console = require('./logger');

function authUserFile(socket, json) {
	if (json == undefined || json.username == undefined || json.username == "" || json.project == undefined || json.project == "")
		throw new exceptions.ParametersException('Missing file auth parameters');
	socket.file.username = json.username;
	socket.file.project.name = json.project;
	if (socket.readyState === ws.OPEN)
		socket.send(JSON.stringify(new responses.OK("fileAuth", "OK")));
	console.log("Client " + socket.file.username + " pre-authentified on file");
}

function getOneFile(socket, json) {
	return new Promise(function(accept, reject) {
		var msg = {name:json.name};

		try {
			fs.accessSync(path.join(config.baseDir, json.username, json.project, json.name), fs.constants.R_OK);
			content = new Buffer(fs.readFileSync(path.join(config.baseDir, json.username, json.project, json.name), 'utf8'), "binary").toString("base64");
			if (json.username == socket.file.username && socket.pr.username == null) {
				var splittedPath = msg.name.split(path.sep);

				splittedPath.splice(1, 1);
				msg.name = splittedPath.join(path.sep);
			}
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
			console.log("Client " + (socket.pr.username == null ? socket.file.username : socket.pr.username) + " : Successfully retrieved " + json.name);
			accept();
		}
		catch (err) {
			if (socket.readyState === ws.OPEN)
				socket.send(JSON.stringify(new responses.BadReadFile(json.name)));
			console.error(err);
		}
	});
}

function getOneDir(socket, json) {
	return new Promise(function(accept, reject) {
		fs.readdir(path.join(config.baseDir, json.username, json.project, json.name), function(err, files) {
			if (err)
				throw new exceptions.ReadPathException(json.name);
			var promises = files.map(function(file) {
				var tmp = JSON.parse(JSON.stringify(json));
				tmp.name = path.join(json.name, file);
				var stats = fs.statSync(path.join(config.baseDir, json.username, json.project, tmp.name));
				if (stats.isDirectory() && json.recursively) {
					if (!socket.file.project.pullrequest.includes(file) || (socket.file.username == json.username && socket.pr.username == null))
						return (getOneDir(socket, JSON.parse(JSON.stringify(tmp))));
				}
				else if (stats.isFile())
					return (getOneFile(socket, JSON.parse(JSON.stringify(tmp))));
			});
			Promise.all(promises).then(function() {
				accept();
			});
		});
	});
}

function getProject(socket, json) {
	json.name = "/";
	json.recursively = true;
	return getOneDir(socket, json);
}

function getFile(socket, json) {
	if (json == undefined || json.username == undefined || json.username == "" || json.project == undefined || json.project == "")
		throw new exceptions.ParametersException('Missing file get parameters');
	if (json.name == undefined || json.name == "")
		return getProject(socket, json);
	else {
		var stats = fs.statSync(path.join(config.baseDir, socket.file.username, socket.file.project.name, json.name));
		if (stats.isDirectory()) {
			if (!socket.file.project.pullrequest.includes(json.name) || (socket.file.username == json.username && socket.pr.username == null))
				return getOneDir(socket, json);
			else
				throw new exceptions.ParametersException("This directory is out of your bounds");
		}
		else if (stats.isFile())
			return getOneFile(socket, json);
	}
}

function postFile(socket, json, server) {
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
	socket.file.contentList[json.name][part] = new Buffer(json.content, "base64");
	if (Object.keys(socket.file.contentList[json.name]).length == maxPart) {
		var destPath = path.join(config.baseDir, socket.file.username, socket.file.project.name, (socket.pr.actual.dir != null ? path.join(socket.pr.actual.dir, json.name) : json.name));
		mkdirp(path.dirname(destPath), function(err) {
			if (err)
				throw new exceptions.WriteFileException(json.name);
			var totalContent = "";
			if (!socket.file.contentList[json.name])
				return;
			for (i = 1; i <= maxPart; i++)
				totalContent += socket.file.contentList[json.name][i];
			fs.writeFile(destPath, totalContent.toString("binary"), "binary", function(err) {
				if (err)
					throw new exceptions.WriteFileException(json.name);
				console.log("Client " + (socket.pr.username == null ? socket.file.username : socket.pr.username) + " : Content successfully wrote in file " + destPath);
				if (socket.readyState === ws.OPEN)
					socket.send(JSON.stringify(new responses.OK("filePost", {message : "OK", file : json.name})));
				if (socket.pr.username == null) {
					for (let client of server.clients)
						if (client !== socket && client.file.username == socket.file.username && client.file.project.name == socket.file.project.name)
							getOneFile(client, {name : path.join(json.name), username : socket.file.username, project : socket.file.project.name});
				}
				else
					socket.pr.actual.files.push(json.name);
			});
			delete socket.file.contentList[json.name];
		});
	}
}

function deleteFile(socket, json, server) {
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
			console.log("Client " + (socket.pr.username == null ? socket.file.username : socket.pr.username) + " : Successfully deleted " + path.join(config.baseDir, socket.file.username, socket.file.project.name, json.name));
			if (socket.readyState === ws.OPEN)
				socket.send(JSON.stringify(new responses.OK("fileDelete", {message : "OK", file : json.name})));
			if (socket.pr.username == null)
				for (let client of server.clients)
					if (client !== socket && client.file.username == socket.file.username && client.file.project.name == socket.file.project.name && client.readyState === ws.OPEN)
						client.send(JSON.stringify(new responses.OK("fileDeleted", {message : "OK", file : path.join(json.name)})));
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
