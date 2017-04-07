var server = require('http').createServer();
var ws = require('ws');

var file = require('./lib/file.js');
var auth = require('./lib/auth.js');
var responses = require('./lib/responses.js');
var exceptions = require('./lib/exceptions.js');

var config = {};
try {
	config = require('./config.json');
}
catch (e) {
}

var wss = new ws.Server({server : server});

wss.on('connection', function(socket) {
	console.log("Client connected");
	
	socket.token = "";
	socket.file = {
		username : null,
		project : null,
		contentList : {}
	};
	socket.chat = {
		username : null,
		room : null
	};
	
	socket.on('message', function(data, flags) {
		try {
			var event = JSON.parse(data);
			console.log(JSON.stringify(event, null, 2));
			if (event.type == undefined || event.type == "") 
				throw new exceptions.ParametersException("Missing type");
			if (event.type == "message" || event.type == "close")
				throw new exceptions.ParametersException("Wrong type");
			this.emit(event.type, event);
		}
		catch (e) {
			if (e.response != undefined && socket.readyState === ws.OPEN)
				socket.send(JSON.stringify(new e.response(e.message)));
			console.log(e);
		}
	});
	
	socket.on('authenticate', function(result) {
		socket.token = result.token;
		auth.verifyToken(socket, config.key);
	});
	
	socket.on('file', function(result) {
		try {
			if (result.subtype == undefined || result.subtype == "")
				throw new exceptions.ParametersException('Missing file subtype');
			for (i = 0; i < file.funcs.length; i++)
				if (file.funcs[i].subtype == result.subtype)
					file.funcs[i].func(socket, result.data);
		}
		catch (e) {
			if (e.response != undefined && socket.readyState === ws.OPEN)
				socket.send(JSON.stringify(new e.response(e.message)));
			console.log(e);
		}
	});
	
	socket.on('chat', function(result) {
		try {
			if (result.subtype == undefined || result.subtype == "") 
				throw new exceptions.ParametersException('Missing chat subtype');
			for (i = 0; i < chat.funcs.length; i++)
				if (chat.funcs[i].subtype == result.subtype)
					chat.funcs[i].func(socket, result.data, wss);
		}
		catch (e) {
			if (e.response != undefined && socket.readyState === ws.OPEN)
				socket.send(JSON.stringify(new e.response(e.message)));
			console.log(e);
		}
	});
	
	socket.on('close', function(code, reason) {
		console.log("Client disconnection with code " + code + (reason != "" ? " with reason " + reason : ""));
	});
});

var port = 3005;
if (config.hasOwnProperty('port') && typeof config.port == "number")
	port = config.port;

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