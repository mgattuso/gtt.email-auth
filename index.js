'use strict';

var async = require('async');
var express = require('express');
var router = express.Router();
var cryptoService = require('./crypto-service');
var cookieService = require('./cookie-service');
var authServiceFn = require('./authorization-service');

function emailLogin(elasticSearchClient, sendgrid) {

    var authService = authServiceFn(elasticSearchClient);

    router.get("/session/destroy", function(req, res) {
        cookieService.deleteCookie('gtt.auth', res);
        cookieService.deleteCookie('gtt.connect', res);
        res.redirect('/');
    });

    router.get("/session/create", function(req, res) {
        res.send('<html>' +
            '<head></head>' +
            '<body>' +
            '<form method="post"><label form="email">Email Address:</label><br>' +
            '<input id="email" name="email" />' +
            '<button type="submit">Sign in</button>' +
            '</form>' +
            '</body>' +
            '</html>');
    });

    router.post("/session/create", function(req, res) {
        var email = req.body.email;

        async.waterfall([
            // create or update the user account
            function(callback) {
                authService.createOrUpdateUser(email, callback);
            },
            // create authorization token
            function(userData, callback) {
                authService.createAuthToken(userData.email, userData.unique, callback);
            },
            function(auth, callback) {
                var payload   = {
                    to      : auth.email,
                    from    : 'noreply@gtt.me',
                    subject : 'Auth token',
                    text    : req.protocol + "://" + req.headers.host + "/session/auth/" + auth.token
                }
                sendgrid.send(payload, function(err, json) {
                    if (err) { console.error(err); }
                    callback(err, auth);
                });
            }
        ], function(error, auth) {
            if (error) {
                console.log("ERROR", error);
                res.send("There was a problem creating the authorization token");
            } else {
                res.send('Please check your email to complete the sign up process');
            }
        });
    });

    router.get('/session/auth/:token', function(req, res) {
        var token = req.params.token;

        async.waterfall([

            function(callback) {
                return authService.getAuthToken(token, callback);
            },
            function(authToken, callback) {
                return authService.createOrUpdateSessionToken(token, authToken.user, authToken.unique, callback);
            }
        ], function(error, result) {

            if (result == null) {
                res.send("Authorization not found or expired");
            } else {
                cookieService.createPermanentCookie('gtt.auth', result.sessionToken, 90, res);

                var user = {
                    email: result.email,
                    unique: result.unique
                };

                req.user = user;
                var user_string = JSON.stringify(user);
                var secure = cryptoService.encrypt(user_string,result.sessionToken);
                cookieService.createSessionCookie('gtt.connect', secure, res);
                res.redirect("/");
            }
        });
    });

    router.use(function (req, res, next) {
        if (req.user) {
            return next();
        }

        var auth = req.cookies['gtt.auth'];
        if (!auth) {
            return res.redirect('/session/create');
        }

        var connect = req.cookies['gtt.connect'];
        if (!connect) {
            authService.getSessionToken(auth, function(errors, sessionToken) {
                console.log("datga", sessionToken);
                if (errors || sessionToken == null) {
                    return res.redirect("/session/create");
                } else {

                    var user = {
                        email: sessionToken.email,
                        unique: sessionToken.unique
                    };
                    req.user = user;
                    var user_string = JSON.stringify(user);
                    var secure = cryptoService.encrypt(user_string, auth);
                    cookieService.createSessionCookie('gtt.connect', secure, res);
                    return next();
                }
            });
        } else {
            var user = JSON.parse(cryptoService.decrypt(connect, auth));
            req.user = user;
            cookieService.createPermanentCookie('gtt.auth', auth, 90, res);
            return next();
        }
    });

    return router;
}

module.exports = emailLogin;