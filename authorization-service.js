var async = require('async');
var idgen = require('idgen');

function authorizationService(client, index) {

index = index || 'auth';

    var createOrUpdateUser = function(email, callback) {

        async.waterfall([
                function(callback) {
                    getUser(email, function(error, userRecord) {
                        if (error) {
                            callback(null, null);
                        } else {
                            callback(error, userRecord);
                        }

                    });
                },
                function(user, callback) {
                    var unique = user == null ? idgen(128) : user.unique;
                    callback(null, user, unique);
                },
                function(user, unique, callback) {

                    client.update({
                        index: index,
                        type: 'user',
                        id: email,
                        body: {
                            upsert: {
                                email: email,
                                unique: unique,
                                created: new Date(),
                                last_accessed: new Date()
                            },
                            doc: {
                                last_accessed: new Date()
                            }
                        }
                    }, function(error, result) {
                        var data = { email: email, unique: unique };
                        console.log("END", "createOrUpdateUser", error, data);
                        callback(error, data);
                    });
                }
            ],
            function(error, user) {
                callback(error, user);
            }
        );


    };

    var createAuthToken = function(email, unique, callback) {
        console.log("START", "createAuthToken", email, unique);
        var token = idgen(64);
        client.create({
            index: '',
            type: index,
            id: token,
            body: {
                user: email,
                unique: unique,
                created: new Date(),
                ip: ""
            },
            ttl: '10m'
        }, function(error, result) {
            var data = { token: token, email: email, unique: unique };
            console.log("END", "createAuthToken", data);
            return callback(error, data);
        });
    };

    var getUser = function(email, callback) {
        console.log("START", "getUser", email);
        client.get({
            index: index,
            type: 'user',
            id: email
        }, function(error, userRecord) {
            if (!error && userRecord.found) {
                callback(null, userRecord._source);
            } else {
                callback(error, null);
            }
        });
    };

    var getAuthToken = function(token, callback) {
        console.log("START", "getAuthToken", token);
        client.get({
            index: index,
            type: 'auth',
            id: token
        },function(error, authRecord) {
            console.log("END", "getAuthToken", authRecord);
            if (!error && authRecord.found) {
                return callback(null, authRecord._source);
            }
            return callback(error, null);
        });
    };

    var getSessionToken = function(token, callback) {
        console.log("START", "getSessionToken", token);
        client.get({
            index: index,
            type: 'session',
            id: token
        }, function(error, sessionRecord) {
            console.log("END", "getSessionToken", sessionRecord);
            if (!error && sessionRecord.found) {
                return callback(null, sessionRecord._source);
            } else {
                return callback(error, null);
            }
        })
    };

    var createOrUpdateSessionToken = function(authToken, email, unique, callback) {
        console.log("START", "createOrUpdateSessionToken", authToken, email, unique);
        var sessionToken = idgen(128);
        client.update({
            index: index,
            type: 'session',
            id: sessionToken,
            body: {
                upsert: {
                    id: sessionToken,
                    email: email,
                    unique: unique,
                    created: new Date(),
                    from_auth_token: authToken,
                    last_accessed: new Date()
                },
                doc: {
                    last_accessed: new Date()
                }
            },
            ttl: '90d'
        }, function(error, sessionRecord) {
            var data = {
                sessionToken: sessionToken,
                authToken: authToken,
                email: email,
                unique: unique
            };
            console.log("END", "createOrUpdateSessionToken", data);
            callback(error, data);
        });
    };

    return {
        getUser: getUser,
        createOrUpdateUser: createOrUpdateUser,
        createAuthToken: createAuthToken,
        getAuthToken: getAuthToken,
        createOrUpdateSessionToken: createOrUpdateSessionToken,
        getSessionToken: getSessionToken
    };
}

module.exports = authorizationService;