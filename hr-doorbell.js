var Imap = require('imap'),
    inspect = require('util').inspect;
var exec = require('child_process').exec,
    child;

var imap = new Imap({
  user: '',
  password: '',
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
});

var nameRegex = /([A-Za-z\- \'@\.\_\d]+).+\</;
var emailRegex = /([A-Za-z\.\_\-\d]+@[A-Za-z\.\_\-]+)/;
var studentDefault = 'Unknown'; // Fallback in case both Regexs fail for some reason.
var student;

var openInbox = function (cb) {
  imap.openBox('INBOX', false, cb);
};

var processMail = function() {
  openInbox(function(err, box) {
    if (err) throw err;
    var f = imap.seq.fetch('1:3', {
      bodies: 'HEADER.FIELDS (FROM TO SUBJECT DATE)',
      struct: true
    });
    f.on('message', function(msg, seqno) {
      console.log('Message #%d', seqno);
      var prefix = '(#' + seqno + ') ';
      msg.on('body', function(stream, info) {
        var buffer = '';
        stream.on('data', function(chunk) {
          buffer += chunk.toString('utf8');
        });
        stream.once('end', function() {
          imap.seq.addFlags(seqno,'DELETED', function(err) {
            //console.log('addFlags err: ',err);
          });
          console.log(prefix + 'Parsed header: %s', inspect(Imap.parseHeader(buffer)));
          var studentName = nameRegex.exec(Imap.parseHeader(buffer).from[0]) || [];
          var studentEmail = emailRegex.exec(Imap.parseHeader(buffer).from[0]) || [];
          student = studentName[1] || studentEmail[1] || studentDefault;
          console.log('From: ',student);
        });
      });
      msg.once('attributes', function(attrs) {
        console.log(prefix + 'Attributes: %s', inspect(attrs, false, 8));
      });
      msg.once('end', function() {
        console.log(prefix + 'Finished');
        exec('afplay doorbell-1.mp3');
        exec('sleep 3', function() {
          exec('say Door requested by '+student);
        });
      });
    });
    f.once('error', function(err) {
      console.log('Fetch error: ' + err);
    });
    f.once('end', function() {
      //console.log('Done fetching all messages!');
      //imap.end();
    });
  });
};

imap.once('ready', function() {
  setInterval(processMail,5000);
});

imap.once('error', function(err) {
  console.log(err);
});

imap.once('end', function() {
  console.log('Connection ended');
});

imap.connect();