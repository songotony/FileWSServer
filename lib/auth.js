var jwt = require('jsonwebtoken');

var exceptions = require('./exceptions')

function verifyToken(socket, key) {
	try {
		return (jwt.verify(socket.token, key, {algorithms:"HS256"}));
	}
	catch (err) {
		throw new exceptions.AuthException("This token is wrong or expired");
	}
}

module.exports = {verify : verifyToken}