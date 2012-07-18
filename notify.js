
var email = require('emailjs')
, Prowl = require('./node_modules/node-prowl/lib/prowl')
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
    "from": "servers@cuttlefish.com",
    "to": to
  }, function(err, message) { console.log(err || (new Date) + ' ' + level + ' sent to ' + to); });
};

exports.prowl = function(contact, value, level, error) {
  var key = contact.api_key;
  var prowl = new Prowl(key);
  prowl.push(level + ': ' + this.name, this.app_config.application_name||'alertd', {
    priority: (level === 'critical' ? 2 : 0),
    url: this.config.url ? this.config.url : null,
    description: error
  }, function(err, res) {
    if (err) console.log(err);
  });
};

