
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


var day_names = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

// parse strings of the form "01:30 - 03:45" returning array of 2 timestamps (in ms)
function parse_time_range_relative_to(time_range, relative_to_ms) {
  relative_to_ms = relative_to_ms || Date.now();
  var bits = time_range.match(/^(\d{1,2})(:(\d{1,2}))?\s*-\s*(\d{1,2})(:(\d{1,2}))?$/);
  var from_h = parseInt(bits[1], 10);
  var from_m = bits[3] ? parseInt(bits[3], 10) : 0;
  var from = new Date;
  from.setHours(from_h, from_m, 0);
  var to_h = parseInt(bits[4], 10);
  var to_m = bits[6] ? parseInt(bits[6], 10) : 0;
  var to = new Date;
  to.setHours(to_h, to_m, 0);
  from = from.getTime();
  to = to.getTime();
  // work out whether we're inside the time range.
  // if from > to (e.g. 22:00-09:00) we need to adjust start and
  // end relative to today.
  if (from > to) {
    if (from > relative_to_ms) from -= 86400000;
    else to += 86400000;
  }
  return [from, to];
}

var unit_multiplier = {
  'T':1.099512e12, 'G':1.073742e9, 'M':1048576.0, 'K':1024.0,
};

/*
 * A Monitor object will be created for each defined service.
 *
 * If it's a polled service (has config.interval) it will fetch then check and notify if necessary.
 * Otherwise it will wait to have its check called and notify if necessary.
 */
var Monitor = function(app_config, name, config) {
  this.app_config = app_config;
  this.name = name;
  this.config = config;
  this.repeat_count = 0;

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

  this.contact_repeat_rate = 1000 * (this.config.contact_repeat_rate || 3600)

  this.state = 'ok';

  this.stats = {
    ok:0,
    warning:0,
    critical:0
  };
};

Monitor.prototype.start = function() {
    if (this.config.interval && this.fetch && !this._timer) {
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

Monitor.prototype.is_time = function(time) {
  var now = new Date;
  var now_time = now.getTime();

  var is_time_now = function(time) {
      var times = parse_time_range_relative_to(time, now_time);
      return times[0] <= now_time && times[1] >= now_time;
  };

  var check = function(qt) {
    if (typeof qt === 'string') {
      return is_time_now(qt);
    }
    else if (util.isArray(qt)) {
      for (var i = 0; i < qt.length; ++i) {
        if (check(qt[i])) {
          return true;
        }
      }
    }
    else if (typeof qt === 'object') {
      if (qt[day_names[now.getDay()]] !== undefined) {
        return check(qt[day_names[now.getDay()]]);
      }
    }
    return false;
  };

	return check(time);
};

Monitor.prototype.current_config = function(config) {
  if (config.at) {
    var original = config;
    Object.keys(config.at).forEach(function(time) {
      if (self.is_time(time)) {
        if (config === original) {
          config = helpers.extend({}, config);
        }
        config = helpers.extend(config, config.at[time]);
      }
    });
  }
  return config;
};

Monitor.prototype.check = function(value) {
  var self = this;
  var config = this.current_config(this.config);
  if (config.silent || this.is_time(config.quiet_times || config.quiet_time)) {
    return;
  }
  this.app_stat('alertd_check', 'increment', 1);
  this.check_value(value, function(level, error) {
    if (level !== self.state || (level !== 'ok' && self.last_notification_time < Date.now() - self.contact_repeat_rate)) {
      if (++self.repeat_count >= (config.contact_threshold || 0)) {
        self.repeat_count = 0;
        if (config.verify_interval && config.verify_interval < config.interval) {
          if (!self.verifying) {
            self.verifying = {
              date: new Date,
              error: error,
            };
            setTimeout(function() {self.pull();}, config.verify_interval * 1000);
            return;
          }
          if (self.verifying) {
            error = self.verifying.date.toLocaleTimeString() + ') ' + self.verifying.error + "\n" + (new Date).toLocaleTimeString() + ") " + error;
          }
          self.verifying = null;
        }
        var contacts = self.get_contacts(config);
        contacts.forEach(function(contact) {
          contact = self.current_config(contact);
          if (!self.is_time(contact.quiet_times || contact.quiet_time)) {
            var method = contact.method || notify.email;
            if (typeof method === 'string') {
              method = notify[method].bind(self);
            }
            else {
              method = method.bind(self);
            }
            method(contact, value, level, error);
          }
          else {
            util.log('Suppressed due to quiet time: ' + error);
          }
        });

        self.app_stat('alertd_notify_' + level, 'increment', 1);
        ++self.stats[level];
        self.last_notification_time = Date.now();
        self.state = level;
      }
    }
    else {
      self.repeat_count = 0;
      self.verifying = null;
    }
  });
};

Monitor.prototype.get_contacts = function(config, optional_property) {
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
  if (config.contact) {
    contacts = _get(config.contact);
  }
  else {
    contacts = [config];
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
var listener_list = [];
var listeners = {};
var pattern_monitor_list = [];
var pattern_monitors = {};
var server;

exports.Monitor = Monitor;

exports.monitors = function() {
  return monitor_list;
};

exports.check = function(key, value) {
  if (monitors[key]) {
    monitors[key].check(value);
  }
  else {
    for (var i = 0; i < pattern_monitor_list.length; ++i) {
      var pattern_monitor = pattern_monitor_list[i];
      if (pattern_monitor.regex.test(key)) {
        var monitor = new Monitor(pattern_monitor.app_config, key, pattern_monitor.config);
        monitors[key] = monitor;
        listener_list.push(monitor);
        monitor.check(value);
        break;
      }
    }
  }
};

exports.configure = function(config) {

  var expand_config = function(config) {
    if (typeof config.check === 'string') {
      var m = config.check.match(/^([<=>])(([0-9\.-]+)([TGMK])?)|(([0-9\.-]+)([TGMK])?)$/);
      if (m) {
        config.check = (m[1] === '<' ? 'value_lt' : (m[1] === '=' ? 'value_eq' : 'value_gt'));
        config.warning = parseFloat(m[3]);
        if (m[4] && typeof unit_multiplier[m[4]] === 'number') {
          config.warning *= unit_multiplier[m[4]];
        }
        config.critical = parseFloat(m[6]);
        if (m[7] && typeof unit_multiplier[m[7]] === 'number') {
          config.critical *= unit_multiplier[m[7]];
        }
      }
    }
    return config;
  };

  monitor_list.forEach(function(m) {m.stop();});
  monitor_list = []; monitors = {};
  listener_list.forEach(function(m) {m.stop();});
  listener_list = []; listeners = {};
  pattern_monitor_list.forEach(function(m) {m.stop();});
  pattern_monitor_list = []; pattern_monitors = {};

  var templates = require('./service_templates');

  Object.keys(templates).forEach(function(name) {
    templates[name] = expand_config(templates[name]);
  });

  if (config.templates) {
    Object.keys(config.templates).forEach(function(name) {
      var tpl = expand_config(config.templates[name]);
      if (tpl.extend && templates[tpl.extend]) {
        tpl = helpers.extend({}, templates[tpl.extend], tpl);
      }
      templates[name] = tpl;
    });
  }

  Object.keys(config.services).forEach(function(name) {
    var service = expand_config(config.services[name]);
    if (service.extend && templates[service.extend]) {
      service = helpers.extend({}, templates[service.extend], service);
    }
    var monitor = new Monitor(config, name, service);
    monitors[name] = monitor;
    if (service.interval) {
      monitor_list.push(monitor);
    }
    else if (-1 === name.indexOf('*')) {
      listener_list.push(monitor);
    }
    else {
      monitor.regex = new RegExp(name.replace('.', '\\.').replace('*', '.*'));
      pattern_monitor_list.push(monitor);
    }
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

      var value;
      if (bits.length == 0) {
        value = 0;
      }
      else {
        value = bits.join(':');
      }

      exports.check(key, value);

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


