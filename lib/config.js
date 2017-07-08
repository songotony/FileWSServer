var config = {
	"port":3000,
	"baseDir":"./",
	"key":"secret",
	"crypto" : {
		"algorithm":"aes256",
		"password":"password"
	}
};

try {
	var configFile = require('../config.json');
	Object.assign(config, configFile);
}
catch (e) {
}

module.exports = config;