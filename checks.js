
var valueof = function(v) {
  if (typeof v === 'function') {
    return v();
  }
  return v;
};

exports.http = function(res, on_error) {
  var statusCode = this.config.statusCode === undefined ? 200 : valueof(this.config.statusCode);
  var duration_secs = res.duration / 1000;
  if (res.statusCode !== statusCode) {
    if (res.statusCode === 0) {
      return on_error('critical', this.name + ' ' + res.body + ' (in ' + duration_secs + 's)');
    }
    return on_error('critical', this.name + ' response: ' + res.statusCode + ' (expected ' + statusCode + ')\n' + duration_secs + 's' + (res.statusCode === 0 ? "\n" + res.body : ''));
  }
  if (this.config.bodyMatch !== undefined) {
    if (!res.body.match(this.config.bodyMatch)) {
      return on_error('critical', this.name + ' body doesn\'t match ' + this.config.bodyMatch + '\n' + duration_secs + 's');
    }
  }
  if (this.config.duration !== undefined && duration_secs >= valueof(this.config.duration)) {
    return on_error('warning', this.name + ' took ' + duration_secs + 's (warning at ' + valueof(this.config.duration) + 's)');
  }
  on_error('ok', this.name + ' ok (' + duration_secs + 's)');
};

exports.http_200 = function(res, on_error) {
  var duration_secs = res.duration / 1000;
  if (res.statusCode === 200) {
    on_error('ok', this.name + ' response: ' + res.statusCode + ' (' + duration_secs + 's)');
  }
  else {
    on_error('critical', this.name + ' response: ' + res.statusCode + '\n' + duration_secs + 's');
  }
};

exports.value_gt = function(res, on_error) {
  if (typeof this.config.critical !== undefined) {
    if (res > valueof(this.config.critical)) {
      return on_error('critical', this.name + ' is ' + res + ' (has exceeded ' + valueof(this.config.critical) + ')');
    }
  }
  if (typeof this.config.warning !== undefined) {
    if (res > valueof(this.config.warning)) {
      return on_error('warning', this.name + ' is ' + res + ' (has exceeded ' + valueof(this.config.warning) + ')');
    }
  }
  on_error('ok', this.name + ' ok');
};

exports.value_lt = function(res, on_error) {
  if (typeof this.config.critical !== undefined) {
    if (res < valueof(this.config.critical)) {
      return on_error('critical', this.name + ' is ' + res + ' (has fallen below ' + valueof(this.config.critical) + ')');
    }
  }
  if (typeof this.config.warning !== undefined) {
    if (res < valueof(this.config.warning)) {
      return on_error('warning', this.name + ' is ' + res + ' (has fallen below ' + valueof(this.config.warning) + ')');
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

