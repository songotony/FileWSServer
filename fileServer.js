var server = require('http').createServer();
var ws = require('ws');
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');

var wss = new ws.Server({server : server});

function getAuth(socket, json) {
	if (!json.hasOwnProperty('username')) {
		socket.send('{"error":"Missing username"}');
		return;
	}
	if (!json.hasOwnProperty('project')) {
		socket.send('{"error":"Missing project name"}');
		return;
	}
	socket.username = json.username;
	socket.project = json.project;
	console.log("Client authentified");
}

function getFile(socket, json) {
	var part, maxPart = 1;

	if (socket.username == null || socket.project == null) {
		socket.send('{"error":"Client not authentified"}');
	}
	if (!json.hasOwnProperty('name')) {
		socket.send('{"error":"Missing file name"}');
		return;
	}
	if (!json.hasOwnProperty('content')) {
		socket.send('{"error":"Missing file content"}');
		return;
	}
	if (!socket.contentList.hasOwnProperty(json.name))
		socket.contentList[json.name] = [];
	part = socket.contentList[json.name].length;
	if (json.hasOwnProperty('part'))
		part = json.part;
	if (json.hasOwnProperty('maxPart'))
		maxPart = json.maxPart;
	socket.contentList[json.name].splice(part, 0, json.content);
	if (socket.contentList[json.name].length == maxPart) {
		mkdirp(path.dirname(socket.username + "/" + socket.project + "/" + json.name), function(err) {
			if (err)
				return;
			
			socket.contentList[json.name] = [];
		});
	}
}

wss.on('connection', function(socket) {
	console.log("Client connected");
	
	socket.username = null;
	socket.project = null;
	socket.contentList = {};
	
	socket.on('message', function(data, flags) {
		try {
			var result = JSON.parse(data);
			if (!result.hasOwnProperty('type'))
				socket.send('{"error":"Missing type message"}');
			if (result.type == 'auth')
				getAuth(socket, result);
			if (result.type == "file")
				getFile(socket, result);
			console.log(JSON.stringify(result, null, 2));
		}
		catch (e) {
			console.log(e);
			socket.send('{"error":"parsing failed"}');
		}
	});
	
	socket.on('close', function(code, reason) {
		console.log("Client disconnection with code " + code + (reason != "" ? " with reason " + reason : ""));
	});
});

var port = 3005;

if (process.argv.length > 2) {
	try {
		port = parseInt(process.argv[2]);
	} catch (e) {
		
	}
}

console.log('Server listening on ' + port + ' !');

server.listen(port);