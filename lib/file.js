var ws = require('ws');
var mkdirp = require('mkdirp');
var fs = require('fs');
var path = require('path');

var config = require('../config.json');
var constants = require('./constants.js');

function authUserFile(socket, json) {
	if (!json.hasOwnProperty('username') || json.username == null || !json.hasOwnProperty('project') || json.project == null) {
		if (socket.readyState === ws.OPEN)
			socket.send(JSON.stringify({error:"Missing auth file parameters"}));
		return;
	}
	socket.file.username = json.username;
	socket.file.project = json.project;
	console.log("Client authentified");
}

function getFile(socket, json) {
	if (!json.hasOwnProperty('user') || json.user == null || !json.hasOwnProperty('project') || json.project == null || !json.hasOwnProperty('file') || json.file == null) {
		if (socket.readyState === ws.OPEN)
			socket.send(JSON.stringify({error:"Missing get file parameters"}));
		return;
	}
	console.log("GETTING FILE " + config.baseDir + "/" + json.user + "/" + json.project + "/" + json.file);
	fs.access(config.baseDir + "/" + json.user + "/" + json.project + "/" + json.file, fs.constants.R_OK, function(err) {
		if (err) {
			if (socket.readyState === ws.OPEN)
				socket.send(JSON.stringify({error:"File does not exist or cannot be read"}));
			return;
		}
		rs = fs.createReadStream(config.baseDir + "/" + json.user + "/" + json.project + "/" + json.file);
		content = '';
		msg = {name:json.file};
		rs.on('data', function(data) {
			content += data;
		});
		rs.on('end', function() {
			for (i = 0; i < content.length; i += constants.FILEPARTSIZE) {
				msg.content = content.substring(i, constants.FILEPARTSIZE);
				msg.part = parseInt(i / constants.FILEPARTSIZE) + 1;
				msg.maxPart = parseInt(content.length / constants.FILEPARTSIZE) + 1;
				if (socket.readyState === ws.OPEN)
					socket.send(JSON.stringify(msg));
			}
		});
	});
}

function postFile(socket, json) {
	var part, maxPart = 1;

	if (socket.file.username == null || socket.file.project == null) {
		if (socket.readyState === ws.OPEN)
			socket.send(JSON.stringify({error:"Client not authentified"}));
		return;
	}
	if (!json.hasOwnProperty('name') || json.name == null || !json.hasOwnProperty('content') || json.content == null) {
		if (socket.readyState === ws.OPEN)
			socket.send(JSON.stringify({error:"Missing post file parameters"}));
		return;
	}
	if (!socket.file.contentList.hasOwnProperty(json.name))
		socket.file.contentList[json.name] = {};
	part = socket.file.contentList[json.name].length;
	if (json.hasOwnProperty('part') && typeof json.part == "number")
		part = json.part;
	if (json.hasOwnProperty('maxPart') && typeof json.maxPart == "number")
		maxPart = json.maxPart;
	socket.file.contentList[json.name][part] = json.content;
	if (Object.keys(socket.file.contentList[json.name]).length == maxPart) {
		mkdirp(path.dirname(config.baseDir + "/" + socket.file.username + "/" + socket.file.project + "/" + json.name), function(err) {
			if (err)
				return;
			var totalContent = "";
			for (i = 1; i <= maxPart; i++)
				totalContent += socket.file.contentList[json.name][i];
			fs.writeFile(config.baseDir + "/" + socket.file.username + "/" + socket.file.project + "/" + json.name, totalContent, function(err) {
				if (err)
					return;
				console.log("Content successfully wrote");
			});
			socket.file.contentList[json.name] = {};
		});
	}
}
	
module.exports = {
	funcs : [
		{subtype:'auth', func:authUserFile},
		{subtype:'get', func:getFile},
		{subtype:'post', func:postFile}
	]
}
