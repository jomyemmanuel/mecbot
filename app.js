var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');

var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use('/static', express.static(path.join(__dirname, 'public')));
app.use('/', routes);
app.use('/users', users);
app.set('json spaces', 40);

var TelegramBot = require('node-telegram-bot-api'),
    telegram = new TelegramBot("API TOKEN", { polling: true });

telegram.on("text", (message) => {
  msg = message.text.split(" ");
  console.log(msg.length);
  if(msg.length === 3){
    request({
      uri: "http://www-mec.mec.ac.in/sessional-marks/sessional-individual-student.php",
      method: "POST",
      timeout: 5000,
      form: {
        "class" : msg[1].toUpperCase(),
        "rollno" : msg[2]
      }
    },
    function(error, response, body) {
      if(error) {
        console.log(error);
        var str = "*Please Send It In This Format*\n" + "/marks <class> <rollno>"
        telegram.sendMessage(message.chat.id, str , {
          parse_mode: "Markdown"
        });
      } else {
        var $ = cheerio.load(body);
        var row = $('tr');
        if (row.length > 0) {
          var str = '';
          for( i = 3; i < row.length; i++){
            var build = [];
            $(row[i]).find('td').each (function() {
              var text = $( this ).html().trim();
              build.push(text);
            });
            var marks = {
              'sub' : build[0],
              'asg1' : build[1],
              'asg2' : build[2],
              'attn' : build[3],
              'ser1' : build[4],
              'ser2' : build[5]
            };
            if(build.length > 5){
              marks['total'] = build[6];
            }
            else{
              marks['total'] = '--';
            }
            str = str + '*Sub*' + " : " + marks['sub'] + '\n' +
                      '*asg1*' + " : " + marks['asg1'] + '\n' +
                      '*asg2*' + " : " + marks['asg2'] + '\n' +
                      '*attn*' + " : " + marks['attn'] + '\n' +
                      '*ser1*' + " : " + marks['ser1'] + '\n' +
                      '*ser2*' + " : " + marks['ser2'] + '\n' +
                      '*total*' + " : " + marks['total'] + '\n\n';
          }
          telegram.sendMessage(message.chat.id, str, {
            parse_mode: "Markdown"
          });
        }
        else {
          var str = "*No Such Record Exists!*\n";
          telegram.sendMessage(message.chat.id, str , {
            parse_mode: "Markdown"
          });
        }
      }
    });    
  }
  else{
    telegram.sendMessage(message.chat.id, "Unrecognized Command");
  }
});


app.get('/marks/:class/:roll', function(req, res){
  if (req.method === 'GET') {
    request({
      uri: "http://www-mec.mec.ac.in/sessional-marks/sessional-individual-student.php",
      method: "POST",
      timeout: 5000,
      form: {
        "class" : req.params.class,
        "rollno" : req.params.roll
      }
    },
    function(error, response, body) {
      if(error) {
        console.log(error);
      } else {
        //console.log(response.statusCode);
        var $ = cheerio.load(body);
        //console.log($("table tbody tr:nth-child(2)").text());
        // $("table:first > tr").eq(2).filter(function(){
        //   var data = $(this);
        //   console.log(data);
        // })
        //console.log($("table:eq(1) tbody tr:nth-child(3)")[0]);
        var row = $("table tr td");
        var array = [];
        var row = $('tr');
        for( i = 3; i < row.length; i++){
          var build = [];
          $(row[i]).find('td').each (function() {
            var text = $( this ).html().trim();
            build.push(text);
          });
          var marks = {
            'sub' : build[0],
            'asg1' : build[1],
            'asg2' : build[2],
            'attn' : build[3],
            'ser1' : build[4],
            'ser2' : build[5]
          };
          if(build.length > 5){
            marks['total'] = build[6];
          }
          else{
            marks['total'] = '--';
          }
          array.push(marks);
        }
        console.log(array);
        //array = JSON.stringify(array);
        res.json(array);
      }
    });    
  } else {
    req.statusCode = 404;
    req.end();
  }
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

//app.listen('8081')

module.exports = app;
