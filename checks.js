// vim: et:sw=2:ts=2

var valueof = function(v) {
  if (typeof v === 'function') {
    return v();
  }
  return v;
};

var round = function(v, dp) {
  if (dp) {
    var scale = Math.pow(10, dp);
    return Math.round(v * scale) / scale;
  }
  return Math.round(v);
};

var format = function(v, config) {
  v = valueof(v);
  if (config && config.format_scale) v *= config.format_scale;
  if (config.format === 'bytes') {
    if (v < 1024) {
      return v + ' bytes';
    }
    else if (v < Math.pow(1024, 2)) {
      return round(v / 1024, 2) + ' Kb';
    }
    else if (v < Math.pow(1024, 3)) {
      return round(v / Math.pow(1024, 2), 2) + ' Mb';
    }
    else if (v < Math.pow(1024, 4)) {
      return round(v / Math.pow(1024, 3), 2) + ' Gb';
    }
    else {
      return round(v / Math.pow(1024, 4), 2) + ' Tb';
    }
  }
  return v;
};

var timing = function(times) {
  var s = '';
  if (times) {
    if (typeof times.queue_wait !== 'undefined') {
      s += "queue_wait: " + round(times.queue_wait / 1000, 6) + "\n";
    }
    if (typeof times.socket_connect !== 'undefined') {
      s += "socket_connect: " + round(times.socket_connect / 1000, 6) + "\n";
    }
    if (typeof times.data_start !== 'undefined') {
      s += "data_start: " + round(times.data_start / 1000, 6) + "\n";
    }
    if (typeof times.data_duration !== 'undefined') {
      s += "data_duration: " + round(times.data_duration / 1000, 6) + "\n";
    }
    s = s.trim();
  }
  return s;
};

exports.http = function(res, on_error) {
  var statusCode = this.config.statusCode === undefined ? 200 : valueof(this.config.statusCode);
  var duration_secs = res.duration / 1000;
  if (res.statusCode !== statusCode) {
    if (res.statusCode === 0) {
      return on_error('critical', this.name + ' ' + res.body + ' (in ' + duration_secs + 's)\n' + timing(res.timing));
    }
    return on_error('critical', this.name + ' response: ' + res.statusCode + ' (expected ' + statusCode + ')\n' + duration_secs + 's' + (res.statusCode === 0 ? "\n" + res.body : ''));
  }
  if (this.config.bodyMatch !== undefined) {
    if (!res.body.match(this.config.bodyMatch)) {
      return on_error('critical', this.name + ' body doesn\'t match ' + this.config.bodyMatch + '\n' + duration_secs + 's\n' + timing(res.timing));
    }
  }
  if (this.config.duration !== undefined && duration_secs >= valueof(this.config.duration)) {
    return on_error('warning', this.name + ' took ' + duration_secs + 's (warning at ' + valueof(this.config.duration) + 's)\n' + timing(res.timing));
  }
  on_error('ok', this.name + ' ok (' + duration_secs + 's)\n' + timing(res.timing));
};

exports.http_200 = function(res, on_error) {
  var duration_secs = res.duration / 1000;
  if (res.statusCode === 200) {
    on_error('ok', this.name + ' response: ' + res.statusCode + ' (' + duration_secs + 's)\n' + timing(res.timing));
  }
  else {
    on_error('critical', this.name + ' response: ' + res.statusCode + '\n' + duration_secs + 's\n' + timing(res.timing));
  }
};

exports.value_gt = function(res, on_error) {
  if (typeof this.config.critical !== undefined) {
    if (res > valueof(this.config.critical)) {
      return on_error('critical', this.name + ' is ' + format(res, this.config) + ' (has exceeded ' + format(this.config.critical, this.config) + ')');
    }
  }
  if (typeof this.config.warning !== undefined) {
    if (res > valueof(this.config.warning)) {
      return on_error('warning', this.name + ' is ' + format(res, this.config) + ' (has exceeded ' + format(this.config.warning, this.config) + ')');
    }
  }
  on_error('ok', this.name + ' ok');
};

exports.value_lt = function(res, on_error) {
  if (typeof this.config.critical !== undefined) {
    if (res < valueof(this.config.critical)) {
      return on_error('critical', this.name + ' is ' + format(res, this.config) + ' (has fallen below ' + format(this.config.critical, this.config) + ')');
    }
  }
  if (typeof this.config.warning !== undefined) {
    if (res < valueof(this.config.warning)) {
      return on_error('warning', this.name + ' is ' + format(res, this.config) + ' (has fallen below ' + format(this.config.warning, this.config) + ')');
    }
  }
  on_error('ok', this.name + ' ok');
};

exports.value_eq = function(res, on_error) {
  if (typeof this.config.critical !== undefined) {
    if (res == valueof(this.config.critical)) {
      return on_error('critical', this.name + ' is ' + valueof(this.config.critical));
    }
  }
  if (typeof this.config.warning !== undefined) {
    if (res == valueof(this.config.warning)) {
      return on_error('warning', this.name + ' is ' + valueof(this.config.warning));
    }
  }
  on_error('ok', this.name + ' ok');
};

