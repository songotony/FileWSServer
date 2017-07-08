var ws = require('ws');
var mkdirp = require('mkdirp');
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

var auth = require('./auth');
var file = require('./file');
var responses = require('./responses');
var exceptions = require('./exceptions');
var config = require('./config');

function authUserPullRequest(socket, json, server) {
	if (json == undefined || json.username == undefined || json.username == ""
	|| json.streamer == undefined || json.streamer == "" || json.project == undefined || json.project == "")
		throw new exceptions.ParametersException('Missing pull request auth parameters');
	if (server == undefined)
		return;
	server.clients.forEach(function(client) {
		if (client !== socket && client.file.username == json.streamer && client.file.project == json.project) {
			socket.file.username = json.streamer;
			socket.file.project.name = json.project;
		}
	});
	if (socket.file.username == null || socket.file.project.name == null)
		throw new exceptions.ParametersException("The streamer is not connected or the project is wrong");
	socket.pr.username = json.username;
	if (socket.readyState === ws.OPEN)
		socket.send(JSON.stringify(new responses.OK("pullRequestAuth", "OK")));
}

function getPullRequest(socket, json) {
	var i = 0;

	if (socket.file.username == null || socket.file.username == "")
		throw new exceptions.AuthException("Missing auth pullrequest or file for client");
	if (json.id == undefined || json.id == "")
		throw new exceptions.ParametersException("Missing create pullrequest parameters");
	for (; i < socket.file.project.pullrequest.length; i++)
		if (socket.file.project.pullrequest[i] == json.id)
			break;
	if (i == socket.file.project.pullrequest.length)
		throw new exceptions.ParametersException("Pullrequest ID does not exist");
	json.name = path.join("/", json.id);
	json.username = socket.file.username;
	json.project = socket.file.project;
	json.recursivly = true;
	file.getFile(socket, json);
}

function createPullRequest(socket, json) {
	var cipher = crypto.createCipher(config.crypto.algorithm, config.crypto.password);
	var date = Date(Date.now());

	if (!auth.verify(socket, config.key))
		return;
	if (socket.pr.username == null || socket.pr.username == "")
		throw new exceptions.AuthException("Missing auth pullrequest for client");
	if (json.title == undefined || json.title == "" || json.description == undefined)
		throw new exceptions.ParametersException("Missing create pullrequest parameters");
	var dest = cipher.update(socket.pr.username + date, "utf8", "hex") + cipher.final("hex");
	fs.mkdirSync(path.join(config.baseDir, socket.pr.streamer, socket.pr.project, dest));
	socket.pr.actual.dir = dest;
	socket.pr.actual.title = json.title;
	socket.pr.actual.description = json.description;
	socket.pr.actual.date = date;
	if (socket.readyState === ws.OPEN)
		socket.send(JSON.stringify(new responses.OK("pullRequestCreation", "OK")));
}

function finishPullRequest(socket, json, server) {
	if (!auth.verify(socket, config.key))
		return;
	if (socket.pr.actual.dir == null)
		return;
	server.clients.forEach(function(client) {
		if (socket !== client && client.file.username == socket.file.username && client.file.project == socket.file.project) {
			client.file.project.pullrequest.push(socket.pr.actual.dir);
			if (client.readyState === ws.OPEN)
				client.send(JSON.stringify(new responses.OK("pullRequestCreated", {id : socket.pr.actual.dir, owner : socket.pr.username, title : socket.pr.actual.title, description : socket.pr.actual.description, date : socket.pr.actual.date})));
		}
	});
	socket.pr.actual.dir = null;
	if (socket.readyState === ws.OPEN)
		socket.send(JSON.stringify(new responses.OK("pullRequestFinish", "OK")));
}

module.exports = {
	auth : authUserPullRequest,
	funcs : [
		{subtype : 'auth', func : authUserPullRequest} ,
		{subtype : 'creation', func : createPullRequest},
		{subtype : 'finish', func : finishPullRequest}
	]
}
