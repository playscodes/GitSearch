const express = require('express');
const router = express.Router();
const url = require('url');
const crypto = require('crypto');
const request = require('request');
var cookieParser = require('cookie-parser');
const pgp = require('pg-promise')(/*options*/);
var db = pgp('bdconnectstring');


/* GET home page. */
router.get('/', function(req, res, next) {
    var ip = req.headers['x-forwarded-for']||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress

    if (req.session.uid){

        db.one(`
            select distinct on (u.uid)
            u.login
                ,s.sid
            from public.users u
            left join sessions s
            on u.uid = s.uid
            where u.uid = '${req.session.uid}'
            order by  u.uid,s.last_action_dt desc`)
            .then(function (data) {

                        if (req.sessionID === data.sid) {
                            db.any(`
                                select
                                  q
                                  ,url
                                  ,description
                                  ,lang
                                  ,author
                                  ,score
                                from public.bookmarks
                                where uid = '${req.session.uid}'
                                `).then(function(bookmarks)  {
                                res.render('index', {
                                    title: 'Search',
                                    login: data.login,
                                    bookmarks: bookmarks
                                });
                            });
                         
                        } else {
                            req.session.uid = false;
                            res.redirect('/');
                        }
                    });



    } else {
        if (req.query.code && req.query.state){
            var acess_token = '';
            request.post({
                headers: {
                    "Accept": "application/json"
                },
                url:'https://github.com/login/oauth/access_token',
                form: {
                    "client_id": "",
                    "client_secret": "",
                    "redirect_uri": "http://176.100.19.179/",
                    "code": req.query.code,
                    "state": req.query.state
                }}, function(err,httpResponse,body){
                acess_token = JSON.parse(body).access_token;



                request.get({
                    headers: {
                        "User-Agent": "GitSearch-App",
                        "Accept": "application/vnd.github.v3+json",
                        "Authorization": `token ${acess_token}`
                    },
                    url:`https://api.github.com/user`,
                }, function(err,httpResponse,body){
                    req.session.uid = JSON.parse(body).id;
                    db.none(`insert into public.users (uid, login, acess_token)
                            values ('${JSON.parse(body).id}', '${JSON.parse(body).login}','${acess_token}')
                            ON CONFLICT (uid)
                            DO UPDATE SET acess_token = '${acess_token}';
                            update public.sessions set uid = '${JSON.parse(body).id}'
                                                ,ip = '${ip}'
                                                , last_action_dt = now() where sid = '${req.sessionID}'`);
                    res.redirect('/');

                });
            });
        } else {
            let state = crypto.randomBytes(12).toString('hex');

            db.none(`insert into public.sessions (sid, start_dt, last_action_dt, ip) values ('${req.sessionID}',now(),now(),'${ip}')`);
            // req.session.state = state;
            res.redirect(url.format({
                pathname:"https://github.com/login/oauth/authorize",
                query: {
                    "client_id": "",
                    "redirect_uri": "http://176.100.19.179/",
                    "scope":"read:user",
                    "state": state
                }
            }));
        }

    }


});


router.post('/', function(req, res, next) {
    db.one(`
            select distinct on (u.uid)
                u.login
                ,u.acess_token
                ,s.sid
            from public.users u
            left join sessions s
            on u.uid = s.uid
            where u.uid = '${req.session.uid}'
            order by  u.uid,s.last_action_dt desc`)
        .then(function (data) {
            if (req.sessionID === data.sid) {
                db.any(`
                select
                  q
                  ,url
                  ,description
                  ,lang
                  ,author
                  ,score
                from public.bookmarks
                where uid = '${req.session.uid}'
                `).then(function (bookmarks) {

                request.get({
                    headers: {
                        "User-Agent": "GitSearch-App",
                        "Accept": "application/vnd.github.v3+json",
                        "Authorization": `token ${data.acess_token}`
                    },
                    url:`https://api.github.com/search/repositories`,
                    qs: {
                        "q": req.body.search,
                        "sort": "stars",
                        "page": req.body.page
                        },
                }, function(err,httpResponse,body){
                    var next = String(httpResponse.headers.link).match(/page=(\d+)>; rel="next"/g);
                    var last = String(httpResponse.headers.link).match(/page=(\d+)>; rel="last"/g);
                    var prev = String(httpResponse.headers.link).match(/page=(\d+)>; rel="prev"/g);


                    if(httpResponse.headers.link){
                        if (last && next){
                            last = Number(last[0].replace(/[^0-9.]/g, ""));
                            next = Number(next[0].replace(/[^0-9.]/g, ""))-1;
                        } else{
                            last = Number(prev[0].replace(/[^0-9.]/g, ""))+1    ;
                            next = Number(prev[0].replace(/[^0-9.]/g, ""))+1;
                        }
                        res.render('index', {
                            title: 'Search',
                            login: data.login,
                            q: req.body.search,
                            max_page: last,
                            current_page: next,
                            total_count: JSON.parse(body).total_count,
                            items: JSON.parse(body).items,
                            bookmarks: bookmarks
                        });
                    }else{
                        res.render('index', {
                            title: 'No results',
                            login: data.login,
                            total_count: 'Not valid request',
                            bookmarks: bookmarks
                        });
                    }
                });
                });



            } else {
                req.session.uid = false;
                res.redirect('/');
            }
        });
});


/* GET home page. */
router.get('/bookmarks', function(req, res, next) {

    if (req.session.uid){

        db.one(`
            select distinct on (u.uid)
            u.login
                ,s.sid
            from public.users u
            left join sessions s
            on u.uid = s.uid
            where u.uid = '${req.session.uid}'
            order by  u.uid,s.last_action_dt desc`)
            .then(function (data) {

                if (req.sessionID === data.sid) {
                    if (req.query.ins === 'true'){
                        db.none(`
                            insert into public.bookmarks (uid, q, date_dt, url, description, lang, author, score)
                            values ('${req.session.uid}', '${req.query.q}', now(), 
                            '${req.query.url}', '${req.query.description}', '${req.query.lang}', 
                            '${req.query.author}', '${req.query.score}') ON CONFLICT (url, uid) DO NOTHING;`)
                            .then(function (data) {

                                res.json({
                                    "success": "Updated Successfully",
                                    "status" : 200,
                                    "bookmarks": data
                                })
                            });
                    }else if(req.query.ins === 'false'){
                        db.none(`delete from public.bookmarks where uid = '${req.session.uid}' and url = '${req.query.url}'`)
                    }


                } else {
                    req.session.uid = false;
                    res.redirect('/');
                }
            });



    } else {
        req.session.uid = false;
        res.redirect('/');

    }


});


module.exports = router;
