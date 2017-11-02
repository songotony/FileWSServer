var server = require('http').createServer();
var ws = require('ws');

var file = require('./lib/file');
var chat = require('./lib/chat');
var auth = require('./lib/auth');
var pr = require('./lib/pullrequest');
var responses = require('./lib/responses');
var exceptions = require('./lib/exceptions');
var config = require('./lib/config');
var console = require('./lib/logger');

var wss = new ws.Server({server : server});

wss.on('connection', function(socket) {
	console.log("New client connected");
	
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
			try {
				var event = JSON.parse(data);
			} catch (e) {
				throw new exceptions.ParametersException(e.message);
			}
			if (event.type == undefined || event.type == "") 
				throw new exceptions.ParametersException("Missing type");
			if (event.type == "message" || event.type == "close")
				throw new exceptions.ParametersException("Wrong type");
			if (event.type != "authenticate" && event.type != "file" && event.type != "chat" && event.type != "pullrequest")
				throw new exceptions.ParametersException("Undefined type");
			this.emit(event.type, event);
		}
		catch (e) {
			if (e.response != undefined && socket.readyState === ws.OPEN) {
				socket.send(JSON.stringify(new e.response(e.message)));
				console.warn(e);
			}
			else
				console.error(e);
		}
	});
	
	socket.on('authenticate', function(result) {
		try {
			if (result.data == undefined || result.data.token == undefined)
				throw new exceptions.ParametersException("Missing token to authenticate");
			socket.token = result.data.token;
			var decoded = auth.verify(socket, config.key);
			if (result.data.file != undefined) {
				file.auth(socket, result.data.file);
				if (socket.file.username != decoded.streamername || socket.file.project.name != decoded.streamname)
					throw new exceptions.AuthException("Your token doesn't match your provided values");
			}
			if (result.data.chat != undefined) {
				chat.auth(socket, result.data.chat);
				if (socket.chat.username != decoded.username || socket.chat.room != decoded.room)
					throw new exceptions.AuthException("Your token doesn't match your provided values");
			}
			if (result.data.pullrequest != undefined) {
				pr.auth(socket, result.data.pullrequest, wss);
				if (socket.pr.username != decoded.username || socket.file.username != decoded.streamername || socket.file.project.name != decoded.streamname)
					throw new exceptions.AuthException("Your token doesn't match your provided values");
			}
			if (socket.readyState == ws.OPEN)
				socket.send(JSON.stringify(new responses.OK("authentication", "OK")));
			console.log("Client " + (socket.file.username == null ? socket.chat.username == null ? socket.pr.username : socket.chat.username : socket.file.username) + " authentified");
		}
		catch (e) {
			socket.token = "";
			if (e.response != undefined && socket.readyState === ws.OPEN) {
				socket.send(JSON.stringify(new e.response(e.message)));
				console.warn(e);
			}
			else
				console.error(e);
		}
	});
	
	socket.on('file', function(result) {
		try {
			if (result.subtype == undefined || result.subtype == "")
				throw new exceptions.ParametersException('Missing file subtype');
			var i = 0;
			for (; i < file.funcs.length; i++)
				if (file.funcs[i].subtype == result.subtype) {
					file.funcs[i].func(socket, result.data);
					break;
				}
			if (i == file.funcs.length)
				throw new exceptions.ParametersException('Undefined file subtype');
		}
		catch (e) {
			if (e.response != undefined && socket.readyState === ws.OPEN) {
				var response = new e.response(e.message);
				
				if (result.data && result.data.name)
					response.file = result.data.name;
				socket.send(JSON.stringify(response));
				console.warn(e);
			}
			else
				console.error(e);
		}
	});
	
	socket.on('chat', function(result) {
		try {
			if (result.subtype == undefined || result.subtype == "") 
				throw new exceptions.ParametersException('Missing chat subtype');
			var i = 0;
			for (; i < chat.funcs.length; i++)
				if (chat.funcs[i].subtype == result.subtype) {
					chat.funcs[i].func(socket, result.data, wss);
					break;
				}
			if (i == chat.funcs.length)
				throw new exceptions.ParametersException('Undefined chat subtype');
		}
		catch (e) {
			if (e.response != undefined && socket.readyState === ws.OPEN) {
				socket.send(JSON.stringify(new e.response(e.message)));
				console.warn(e);
			}
			else
				console.error(e);
		}
	});
	
	socket.on('pullrequest', function(result) {
		try {
			if (result.subtype == undefined || result.subtype == "")
				throw new exceptions.ParametersException('Missing pull request subtype');
			var i = 0;
			for (; i < pr.funcs.length; i++)
				if (pr.funcs[i].subtype == result.subtype) {
					pr.funcs[i].func(socket, result.data, wss);
					break;
				}
			if (i == pr.funcs.length)
				throw new exceptions.ParametersException('Undefined pull request subtype');
		}
		catch (e) {
			if (e.response != undefined && socket.readyState === ws.OPEN) {
				socket.send(JSON.stringify(new e.response(e.message)));
				console.warn(e);
			}
			else
				console.error(e);
		}
	});
	
	socket.on('close', function(code, reason) {
		console.log("Client disconnection with code " + code + (reason && reason != "" ? " with reason " + reason : ""));
	});
});


function main() {
	var port = 3005;

	if (config.port != undefined && typeof config.port == "number")
		port = config.port;
	if (process.argv.length > 2) {
		try {
			if (!isNaN(process.argv[2]))
				port = parseInt(process.argv[2]);
		} catch (e) {
			
		}
	}
	try {
		server.listen(port);
		console.log('Server listening on ' + port + ' !');
	}
	catch (e) {
		console.error(e);
	}
}

main();