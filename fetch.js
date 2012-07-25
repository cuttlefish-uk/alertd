var http = require('http')
, url = require('url')

var extend = function(target) {
  var i = 1, length = arguments.length, source;
  for ( ; i < length; i++ ) {
    // Only deal with defined values
    if ( (source = arguments[i]) != undefined ) {
      Object.getOwnPropertyNames(source).forEach(function(k){
        var d = Object.getOwnPropertyDescriptor(source, k) || {value:source[k]};
        if (d.get) {
          target.__defineGetter__(k, d.get);
          if (d.set) target.__defineSetter__(k, d.set);
        }
        else if (target !== d.value) {
          target[k] = d.value;
        }
      });
    }
  }
  return target;
};

exports.http = function(callback) {
  var request;
  if (this.config.request) {
    request = extend(this.config.request, url.parse(this.config.request.url));
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
  var start = new Date;
  var client = http.request(request, function(res) {
    res.setEncoding('utf8');
    var body = '';
    res.on('data', function(chunk) {
      body += chunk;
    });
    res.on('end', function() {
      var duration = (new Date).getTime() - start.getTime();
      self.stat('timing', duration);
      self.stat('gauge', duration);
      callback({statusCode:res.statusCode, headers:res.headers, body:body, duration:duration});
    });
  });
  if (request.body) client.write(request.body);
  client.end();
};

