var server = require('http').createServer();
var ws = require('ws');
var jwt = require('jsonwebtoken');

var config = require('./config.json');
var file = require('./lib/file.js');

var wss = new ws.Server({server : server});

wss.on('connection', function(socket) {
	console.log("Client connected");
	
	socket.file = {
		username : null,
		project : null,
		contentList : {}
	};
	
	socket.on('message', function(data, flags) {
		try {
			var event = JSON.parse(data);
			console.log(JSON.stringify(event, null, 2));
			if (!event.hasOwnProperty('type')) {
				if (socket.readyState == ws.OPEN)
					socket.send(JSON.stringify({error:"Missing type message"}));
				return;
			}
			this.emit(event.type, event);
		}
		catch (e) {
			console.log(e);
		}
	});
	
	socket.on('authenticate', function(result) {
		jwt.verify(result.token, config.key);
	});
	
	socket.on('file', function(result) {
		if (!result.hasOwnProperty('subtype')) {
			if (socket.readyState == ws.OPEN)
				socket.send(JSON.stringify({error:"Missing subtype file message"}));
			return;
		}
		for (i = 0; i < file.funcs.length; i++)
			if (file.funcs[i].subtype == result.subtype)
				file.funcs[i].func(socket, result);
	});
	
	socket.on('close', function(code, reason) {
		console.log("Client disconnection with code " + code + (reason != "" ? " with reason " + reason : ""));
	});
});

var port = 3005;
if (config.hasOwnProperty('port') && typeof config.port == "number")
	port = config.port;

if (!config.hasOwnProperty('baseDir') || config.baseDir == null || config.baseDir == "")
	config.baseDir = ".";

if (!config.hasOwnProperty('key'))
	config.key = "secret";

if (process.argv.length > 2) {
	try {
		if (!isNaN(process.argv[2]))
			port = parseInt(process.argv[2]);
	} catch (e) {
		
	}
}

console.log('Server listening on ' + port + ' !');

server.listen(port);