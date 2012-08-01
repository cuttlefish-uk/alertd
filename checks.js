
exports.http = function(res, on_error) {
  var statusCode = this.config.statusCode === undefined ? 200 : this.config.statusCode;
  var duration_secs = res.duration / 1000;
  if (res.statusCode !== statusCode) {
    return on_error('critical', this.name + ' response: ' + res.statusCode + ' (expected ' + statusCode + ')\n' + duration_secs + 's');
  }
  if (this.config.bodyMatch !== undefined) {
    if (!res.body.match(this.config.bodyMatch)) {
      return on_error('critical', this.name + ' body doesn\'t match ' + this.config.bodyMatch + '\n' + duration_secs + 's');
    }
  }
  if (this.config.duration !== undefined && duration_secs >= this.config.duration) {
    return on_error('warning', this.name + ' took ' + duration_secs + 's (warning at ' + this.config.duration + 's)');
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

exports.value_over = function(res, on_error) {
  if (typeof this.config.critical !== undefined) {
    if (res > this.config.critical) {
      return on_error('critical', this.name + ' is ' + res + ' (has exceeded ' + this.config.critical + ')');
    }
  }
  if (typeof this.config.warning !== undefined) {
    if (res > this.config.warning) {
      return on_error('warning', this.name + ' is ' + res + ' (has exceeded ' + this.config.warning + ')');
    }
  }
  on_error('ok', this.name + ' ok');
};
exports.value_gt = exports.value_over;

exports.value_under = function(res, on_error) {
  if (typeof this.config.critical !== undefined) {
    if (res < this.config.critical) {
      return on_error('critical', this.name + ' is ' + res + ' (has fallen below ' + this.config.critical + ')');
    }
  }
  if (typeof this.config.warning !== undefined) {
    if (res < this.config.warning) {
      return on_error('warning', this.name + ' is ' + res + ' (has fallen below ' + this.config.warning + ')');
    }
  }
  on_error('ok', this.name + ' ok');
};
exports.value_lt = exports.value_under;

exports.value_equal = function(res, on_error) {
  if (typeof this.config.critical !== undefined) {
    if (res == this.config.critical) {
      return on_error('critical', this.name + ' is ' + this.config.critical);
    }
  }
  if (typeof this.config.warning !== undefined) {
    if (res == this.config.warning) {
      return on_error('warning', this.name + ' is ' + this.config.warning);
    }
  }
  on_error('ok', this.name + ' ok');
};
exports.value_eq = exports.value_equal;

