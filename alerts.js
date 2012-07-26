
var dgram = require('dgram')
, util    = require('util')
, checks  = require('./checks')
, notify  = require('./notify')
, fetch   = require('./fetch')
, helpers = require('./helpers')
, StatsdClient;

try {
  StatsdClient = require('statsd-client')
}
catch(e) {}

var _statsd_client = null;

var statsd_client = function(config) {
  if (_statsd_client === null && StatsdClient && config.statsd) {
    _statsd_client = new StatsdClient(config.statsd);
  }
  return _statsd_client;
};

var Monitor = function(app_config, name, config) {
  this.app_config = app_config;
  this.name = name;
  this.config = config;

  if (typeof config.fetch === 'string') {
    if (!config.check) {
      config.check = config.fetch;
    }
    this.fetch = fetch[config.fetch].bind(this);
  }
  else if (typeof config.fetch === 'function') {
    this.fetch = config.fetch.bind(this);
  }
  if (typeof config.check === 'string') {
    this.check_value = checks[config.check].bind(this);
  }
  else if (typeof config.check === 'function') {
    this.check_value = config.check.bind(this);
  }
  this.state = 'ok';
  this.stats = {
    ok:0,
    warning:0,
    critical:0
  };
};

Monitor.prototype.start = function() {
    if (this.config.interval && !this._timer) {
      var self = this;
      this._timer = setInterval(function() {self.pull();}, 1000 * this.config.interval);
    }
};

Monitor.prototype.stop = function() {
  if (this._timer) {
    clearInterval(this._timer);
    this._timer = null;
  }
};

Monitor.prototype.pull = function() {
  var self = this;
  this.fetch(function(response) {
    self.check(response);
  });
};

Monitor.prototype.check = function(value) {
  var self = this;
  this.app_stat('alertd_check', 'increment', 1);
  this.check_value(value, function(level, error) {
    if (level !== self.state || (level !== 'ok' && self.last_notification_time < (new Date).getTime() - (1000 * (self.config.contact_repeat_rate||3600)))) {
      var contacts = self.get_contacts();
      contacts.forEach(function(contact) {
        var method = contact.method || notify.email;
        if (typeof method === 'string') {
          method = notify[method].bind(self);
        }
        else {
          method = method.bind(self);
        }
        method(contact, value, level, error);
      });

      self.app_stat('alertd_notify_' + level, 'increment', 1);
      ++self.stats[level];
      self.last_notification_time = (new Date).getTime();
      self.state = level;
    }
  });
};

Monitor.prototype.get_contacts = function(optional_property) {
  var self = this;
  function _get(name) {
    var contacts = [];
    var contact = self.app_config.contacts[name];
    if (typeof contact === 'string') {
      contacts = contacts.concat(_get(contact));
    }
    else if (util.isArray(contact)) {
      contact.forEach(function(c) {
        contacts = contacts.concat(_get(c));
      });
    }
    else if (typeof contact === 'object') {
      contacts.push(contact);
    }
    return helpers.array_unique(contacts);
  }
  var contacts;
  if (this.config.contact) {
    contacts = _get(this.config.contact);
  }
  else {
    contacts = [this.config];
  }
  if (optional_property) {
    contacts = contacts.map(function(c) {return c[optional_property];}).filter(function(c) {return c !== undefined;});
  }
  return contacts;
};

Monitor.prototype.app_stat = function(metric, kind, value) {
  var statsd = statsd_client(this.app_config);
  if (statsd) {
    metric = (this.app_config.statsd.key || 'alertd') + '.' + metric;
    statsd[kind](metric, value);
  }
};

Monitor.prototype.stat = function(kind, value) {
  var stat;
  if ((stat = this.config.stat)) {
    if (typeof stat === 'function') {
      stat = stat.bind(this)(kind, value);
    }
    this.app_stat(stat, kind, value);
  }
};

var monitor_list = [];
var monitors = {};
var server;

exports.monitors = function() {
  return monitor_list;
};

exports.configure = function(config) {

  monitor_list.forEach(function(m) {m.stop();});
  monitor_list = [];
  monitors = {};

  var templates = require('./service_templates');

  if (config.templates) {
    Object.keys(config.templates).forEach(function(name) {
      var tpl = config.templates[name];
      if (tpl.extend && templates[tpl.extend]) {
        tpl = helpers.extend({}, templates[tpl.extend], tpl);
      }
      templates[name] = tpl;
    });
  }

  Object.keys(config.services).forEach(function(name) {
    var service = config.services[name];
    if (service.extend && templates[service.extend]) {
      service = helpers.extend({}, templates[service.extend], service);
    }
    var monitor = new Monitor(config, name, service);
    monitors[name] = monitor;
    monitor_list.push(monitor);
    monitor.start();
  });

  if (server === undefined && typeof config.port === 'number') {

    server = dgram.createSocket('udp4', function (msg, rinfo) {
      if (config.dumpMessages) { util.log(msg.toString()); }
      var bits = msg.toString().split(':');
      var key = bits.shift()
        .replace(/\s+/g, '_')
        .replace(/\//g, '-')
        .replace(/[^a-zA-Z_\-0-9\.]/g, '');

      if (listeners[key]) {
        var value;
        if (bits.length == 0) {
          value = 0;
        }
        else {
          value = bits.join(':');
        }
        listeners[key].check(value);
      }
    });

    server.bind(config.port || 8135, config.address || undefined);

    util.log("server is up");

  }
};

if (module.parent === null && process.argv.length > 1) {
  var config = require('./config');
  config.configFile(process.argv[2], function(config, oldConfig) {
    exports.configure(config);
  });
}


