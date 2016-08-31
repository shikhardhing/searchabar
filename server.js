//Bugs:error on offline server, second search of diff city

var express = require('express')
var app = express()
var request=require('request')
var twitterAPI=require('node-twitter-api')
var session = require('express-session');
var mongoose = require('mongoose');
const MongoStore = require('connect-mongo')(session);
//var url= 'mongodb://shikhar97:(xyz123)@ds019076.mlab.com:19076/nightlife'
var url= 'mongodb://localhost:27017/nightlife'
mongoose.connect(url);
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    console.log("connected");
});

app.use(session({
    key: 'session_cookie_name',
    secret: 'session_cookie_secret',
    store:new MongoStore({mongooseConnection:db}),
    resave: true,
    saveUninitialized: true
}));
/*var searchSchema=mongoose.Schema({
    place:String,
    id:Number
})
var searchRecords=mongoose.model('searchSchema',searchSchema)*/
var resSchema=mongoose.Schema({
    resID:Number,
    id:Number
})
var resRecords=mongoose.model('resSchema',resSchema)

//add city to database(post),restaturant,twitterID(post)
var bodyParser = require('body-parser')
app.use(bodyParser.json());       // to support JSON-encoded bodies
app.post('/api/postcity',function(req,res){
    console.log('postcity'+req.body)
    /*var q='{"place":'+req.body.place+',"id":'+req.session.twitterID+'}'
    var record=new searchRecords(JSON.parse(q))
    record.save(function(err){
        if(err) throw err;
        console.log("saved")
    })*/
    req.session.city=req.body.place
    res.end()
})
app.post('/api/post/restaurant/:resID',function(req,res){
    var q='{"resID":'+req.params.resID+',"id":'+req.session.twitterID+'}'
    console.log(q)
    resRecords.find(JSON.parse(q),function(err,results){
        if(err) throw err
        console.log(results)
        console.log(!!results[0])
        console.log(!results[0])
        if(!results[0]){
            var record=new resRecords(JSON.parse(q))
            record.save(function(err){
                if(err) throw err
                console.log("saved")
                res.end()
            })
        }
        else{
            resRecords.remove(JSON.parse(q),function(err){
                if(err) throw err
                console.log("remove")
                res.end()
            })
        }
    })

})
app.get('/api/restaurant/:resID',function(req,res){
    var q='{"resID":'+req.params.resID+'}'
    resRecords.count(JSON.parse(q),function(err,count){
        if(err) throw err
        console.log(req.params.resID+' '+count)
        res.send('{"count":'+count+'}')
    })
})
app.get('/api/getcity/:id',function(req,res){
    searchRecords.find({id:req.params.id},function(err,results){
        if(err) throw err;
        res.send(results[0].place);
    })
})

app.get('/api/:city',function(req,res,next){
    var options = {
        url: 'https://developers.zomato.com/api/v2.1/locations?query='+req.params.city,
        headers: {
            'user-key': '2860255c5360818c2b245f8e3504057d'
        }
    }
    function callback(error, response, body) {
        console.log(req.params.city);
        var info = JSON.parse(body)
        if (!error && response.statusCode == 200 && !!info.location_suggestions[0]) {
            var city=info.location_suggestions[0].entity_id
            //console.log(city)
            request({
                url: 'https://developers.zomato.com/api/v2.1/search?entity_id='+city+'&entity_type=city&establishment_type=7',
                headers: {
                    'user-key': '2860255c5360818c2b245f8e3504057d'
                }
            },function(err,resp,bod){
                if (!err && resp.statusCode == 200) {
                    var inf=JSON.parse(bod)
                    res.send(inf)
                }
            })
        }
        else{
            res.send(JSON.parse('{"results_shown":0}'))
        }
    }
    request(options, callback)
})

app.get('/login',function(req,res,next){
    //SIGN IN WITH TWITTER
    twitter = new twitterAPI({
        consumerKey: 'J5uwAAsAVCL5qXypuD2JvEZpH',
        consumerSecret: 'D9pID6kpYZ31J9hcbWWx8d1B4aBHAwhjjlrzeSEdGrK3k20hue',
        callback: req.protocol + '://' + req.get('host') + '/callback'
    });
    twitter.getRequestToken(function(error, requestToken, requestTokenSecret, results){
        if (error) {
            console.log("Error getting OAuth request token : " + error);
        }
        else {
            requestTokeng=requestToken;
            requestTokenSecretg=requestTokenSecret;
            res.redirect('https://twitter.com/oauth/authenticate?oauth_token='+requestToken);
        }
    });
});
app.get('/callback',function(req,res,next){
    oauth_verifierg=req.query.oauth_verifier;
    twitter.getAccessToken(requestTokeng, requestTokenSecretg, oauth_verifierg, function(error, accessToken, accessTokenSecret, results) {
        if (error) console.log(error);
        else {
            accessTokeng=accessToken;
            accessTokenSecretg=accessTokenSecret;
        }
        twitter.verifyCredentials(accessTokeng,accessTokenSecretg,function(error,data,response){
            var time = 864000000;
            req.session.cookie.maxAge = time;
            req.session.sessionID=req.sessionID;
            req.session.twitterID=data.id;
            res.redirect('/');
        });
    });
})
app.get('/getcookie',function(req,res,next){
    res.send(req.session);
});

app.use(express.static(__dirname));
app.get('/',function (req, res, next) {
    res.sendFile("/index.html");
});

app.set('port',(process.env.port||8081))
var server = app.listen(app.get('port'), function () {
    var host = 'localhost'
    var port = server.address().port
    console.log("Example app listening at http://%s:%s", host, port)
}); 