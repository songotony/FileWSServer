var server = require('http').createServer();
var ws = require('ws');

var file = require('./lib/file');
var chat = require('./lib/chat');
var auth = require('./lib/auth');
var pr = require('./lib/pullrequest');
var responses = require('./lib/responses');
var exceptions = require('./lib/exceptions');

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
		project : {
			name : null,
			pullrequest : []
		},
		contentList : {}
	};
	socket.chat = {
		username : null,
		room : null
	};
	socket.pr = {
		username : null,
		actual : {
			title : null,
			description : null,
			date : null,
			dir : null
		}
	};
	
	socket.on('message', function(data, flags) {
		try {
			var event = JSON.parse(data);
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
		try {
			if (result.data == undefined || result.data.token == undefined)
				throw new exceptions.ParametersException("Missing token to authenticate");
			socket.token = result.data.token;
			auth.verify(socket, config.key);
			if (result.data.file != undefined)
				file.auth(socket, result.data.file);
			if (result.data.chat != undefined)
				chat.auth(socket, result.data.chat);
			if (result.data.pullrequest != undefined)
				pr.auth(socket, result.data.pullrequest, wss);
		}
		catch (e) {
			if (e.response != undefined && socket.readyState === ws.OPEN)
				socket.send(JSON.stringify(new e.response(e.message)));
			console.log(e);
		}
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
	
	socket.on('pullrequest', function(result) {
		try {
			if (result.subtype == undefined || result.subtype == "")
				throw new exceptions.ParametersException('Missing pull request subtype');
			for (i = 0; i < pr.funcs.length; i++)
				if (pr.funcs[i].subtype == result.subtype)
					pr.funcs[i].func(socket, result.data, wss);
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
if (config.port != undefined && typeof config.port == "number")
	port = config.port;
if (config.key == undefined || typeof config.key != "string" || config.key == "")
	config.key = "secret";

if (process.argv.length > 2) {
	try {
		if (!isNaN(process.argv[2]))
			port = parseInt(process.argv[2]);
	} catch (e) {
		
	}
}

console.log('Server listening on ' + port + ' !');

try {
	server.listen(port);
}
catch (e) {
	console.log(e);
}