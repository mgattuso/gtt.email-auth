var crypto = require('crypto');

function CryptoService() {
    var algorithm = 'aes256'; // or any other algorithm supported by OpenSSL
    var salt  = "9CD4B5D2B1FDFF61A354AC5F203FC1514E4579C9377595D77EDAD496A9BDF1BE";

    var encrypt = function(string, key) {
        var cipher = crypto.createCipher(algorithm, key + salt);
        var encrypted = cipher.update(string, 'utf8', 'hex') + cipher.final('hex');
        return encrypted;
    };

    var decrypt = function(secureString, key) {
        var decipher = crypto.createDecipher(algorithm, key + salt);
        var decrypted = decipher.update(secureString, 'hex', 'utf8') + decipher.final('utf8');
        return decrypted;
    };

    return {
        encrypt: encrypt,
        decrypt: decrypt
    };
}

module.exports = CryptoService;