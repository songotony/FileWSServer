var jwt = require('jsonwebtoken');

function verifyToken(socket, key) {
	jwt.verify(socket.token, key, function(err, decoded) {
		if (err) {
			socket.send(JSON.stringify({error:"Error at verifying jwt, check content", content:err}));
			return (false);
		}
		return (true);
	});
}

module.exports = {verifyToken}