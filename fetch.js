var http = require('http')
, https = require('https')
, url = require('url')
, helpers = require('./helpers')
, child_process = require('child_process')

exports.http = function(callback) {
  var request;
  if (this.config.request) {
    request = helpers.extend(this.config.request, url.parse(this.config.request.url));
  }
  else if (this.config.url) {
    request = url.parse(this.config.url);
  }
  else {
    if (this.name.match(/^https?:/)) request = url.parse(this.name);
    else request = url.parse('http://' + this.name);
  }
  if (!request.headers) {
    request.headers = {};
  }
  if (!request.headers['User-Agent']) {
    request.headers['User-Agent'] = this.app_config.user_agent || 'alertd/0.1.0';
  }

  var self = this;
  var start = null;

  var module = request.protocol === 'https:' ? https : http;

  var client = module.request(request, function(res) {
    res.setEncoding('utf8');
    var body = '';
    res.on('data', function(chunk) {
      body += chunk;
    });
    res.on('end', function() {
      var duration = Date.now() - start;
      self.stat('timing', duration);
      self.stat('gauge', duration);
      callback({statusCode:res.statusCode, headers:res.headers, body:body, duration:duration});
    });
  });

  var on_error = function(e) {
      var duration = Date.now() - start;
      self.stat('timing', duration);
      self.stat('gauge', duration);
      console.log(e);
      var message = e.message;
      if (e.syscall === 'getaddrinfo' && e.errno === 'ENOTFOUND') {
        message = 'DNS lookup failed';
      }
      callback({statusCode:0, headers:{}, body:message, duration:duration});
  };

  client.on('socket', function() {
    start = Date.now();
  });
  client.on('error', on_error);
  client.setTimeout(60000, function() {
    on_error({message: "Timeout after 60s",});
  });
  if (request.body) client.write(request.body);
  client.end();
};

exports.exec = function(callback) {
  child_process.exec(this.config.cmd, function(error, stdout, stderr) {
    callback(stdout);
  });
};

