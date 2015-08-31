function CookieService() {

    var seconds = 1000;
    var minutes = seconds * 60;
    var hours = minutes * 60;
    var days = hours * 24;

    return {
        createPermanentCookie: function(name, value, ageInDays, res) {
            res.cookie(name, value, {maxAge: ageInDays * days, httpOnly: true});
        },
        createSessionCookie: function(name, value, res) {
            res.cookie(name, value, { httpOnly: true });
        },
        deleteCookie: function(name,res) {
            res.cookie(name, "", {maxAge: -1, httpOnly: true});
        }
    };
}