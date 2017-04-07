var ws = require('ws');

var config = {};
try {
	config = require('../config.json');
}
catch (e) {
}

var auth = require('./auth.js');
var responses = require('./responses.js');
var exceptions = require('./exceptions.js');

if (!config.hasOwnProperty('key'))
	config.key = "secret";

function authUserChat(socket, json) {
	if (json == undefined || json.username == undefined || json.username == "" || json.room == undefined || json.room == "")
		throw new exceptions.ParametersException('Missing chat auth parameters');
	socket.chat.username = json.username;
	socket.chat.room = json.room;
	if (socket.readyState === ws.OPEN)
		socket.send(JSON.stringify(new responses.OK("chatAuth", "OK")));
}

function messageChat(socket, json, server)
{
	if (json == undefined || json.message == undefined || json.message == "")
		throw new exceptions.ParametersException('Missing chat message parameters');
	json.username = socket.username;
	server.clients.forEach(function(client) {
		if (client !== socket && client.chat.room == socket.chat.room && client.readyState == ws.OPEN)
			client.send(JSON.stringify(new responses.OK("chatMessage", json)));
	});
	if (socket.readyState === ws.OPEN)
		socket.send(JSON.stringify(new responses.OK("chatMessage", "OK")));
}

module.exports = {
	funcs : [
		{'auth', authUserChat},
		{'message', messageChat}
	]
}
