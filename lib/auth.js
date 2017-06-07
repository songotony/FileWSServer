var jwt = require('jsonwebtoken');

var exceptions = require('./exceptions')

function verifyToken(socket, key) {
	try {
		var decoded = jwt.verify(socket.token, key);
		return (true);
	}
	catch (err) {
//		throw new exceptions.AuthException(err);
		return (true);
	}
}

module.exports = {verify : verifyToken}