// vim: et:sw=2:ts=2

var email = require('emailjs')
, https = require('https')
, os = require('os')
, querystring = require('querystring')
, url = require('url')
, util = require('util')

exports.console = function(contact, value, level, error) {
  util.log(level + ': ' + error);
};

exports.email = function(contact, value, level, error) {
  var to = contact.email;
  if (util.isArray(to)) {
    to = to.join(', ');
  }
  var server  = email.server.connect({
    "host": "localhost"
  });
  server.send({
    "text": error + "\n\n" + (new Date),
    "subject": level + ': ' + this.name,
    "from": this.app_config.email_from || ("alertd@" + os.hostname()),
    "to": to
  }, function(err, message) {
    util.log((err ? 'error sending ' : 'sent ') + level + ' to ' + to + ': ' + error);
  });
};

exports.prowl = function(contact, value, level, error) {
  var key = contact.api_key;
  var application_name = this.app_config.application_name || 'alertd';
  var event_name = level + ': ' + this.name;
  var priority = level === 'critical' ? 2 : 0;
  var event_url = this.config.url || null;
  var description = error + (this.config.url ? "\n" + this.config.url : '');

  var endpoint = contact.endpoint || this.app_config.prowl_endpoint || "https://api.prowlapp.com/publicapi/";
  var query = {
    event:event_name,
    application:application_name,
    apikey:key,
    priority:priority,
    url:event_url,
    description:description,
  };

  var api_url = endpoint + 'add?' + querystring.stringify(query);

  var request = url.parse(api_url);
  request.method = 'POST';
  var client = https.request(request, function(res) {
    res.setEncoding('utf8');
    var body = '';
    res.on('data', function(chunk) {
      body += chunk;
    });
    res.on('end', function() {
      if (res.statusCode !== 200) {
        console.log(res.statusCode, res.headers, body);
      }
    });
  });
  client.on('error', function() {console.log('Error posting to prowl', arguments);});
  client.end();

};

