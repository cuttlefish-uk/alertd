// vim: et:sw=2:ts=2

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
  var queue_time = Date.now(), start = null, timing = {};

  var module = request.protocol === 'https:' ? https : http;

  var client = module.request(request, function(res) {
    res.setEncoding('utf8');
    var body = '';
    var data_start;
    res.on('data', function(chunk) {
      if (typeof data_start === 'undefined') {
        data_start = Date.now();
        timing.data_start = data_start - (timing.socket_connected ? timing.socket_connected : start);
      }
      body += chunk;
    });
    res.on('end', function() {
      var now = Date.now();
      var duration = now - start;
      if (typeof data_start !== 'undefined') {
        timing.data_duration = now - data_start;
      }
      self.stat('timing', duration);
      self.stat('gauge', duration);
      callback({statusCode:res.statusCode, headers:res.headers, body:body, duration:duration, timing:timing});
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

  client.on('socket', function(socket) {
    start = Date.now();
    timing.queue_wait = start - queue_time;
    socket.on('connect', function() {
      var now = Date.now();
      timing.socket_connected = now;
      timing.socket_connect = now - start;
    });
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

