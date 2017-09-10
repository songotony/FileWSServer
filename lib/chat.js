var ws = require('ws');

var auth = require('./auth');
var responses = require('./responses');
var exceptions = require('./exceptions');
var config = require('./config');
var console = require('./logger');

function authUserChat(socket, json) {
	if (json == undefined || json.username == undefined || json.username == "" || json.room == undefined || json.room == "")
		throw new exceptions.ParametersException('Missing chat auth parameters');
	socket.chat.username = json.username;
	socket.chat.room = json.room;
	if (socket.readyState === ws.OPEN)
		socket.send(JSON.stringify(new responses.OK("chatAuth", "OK")));
	console.log("Client " + socket.chat.username + " : pre-authentified on chat");
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
	console.log("Client " + socket.chat.username + " : message sent");
}

module.exports = {
	auth : authUserChat,
	funcs : [
		{subtype : 'auth', func : authUserChat},
		{subtype : 'message', func : messageChat}
	]
}
