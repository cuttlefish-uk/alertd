/*
 * A statsd backend for alertd
 *
 * To enable this backend, include 'alert' in the backends
 * configuration array:
 *
 *   backends: ['alert']
 *
 * This backend supports the following config options:
 *
 *   alertConfig: Path to alertd config file.
 *
 */

var alerts = require('./alerts')
  , config = require('./config')
  , util = require('util')

var flush_stats = function alert_flush(ts, stats) {

  var key;
  for (key in stats.counters) {
    alerts.check(key, stats.counters[key]);
  }
  for (key in stats.gauges) {
    alerts.check(key, stats.gauges[key]);
  }

};

var backend_status = function alert_status(writeCb) {
  alerts.monitors().forEach(function(monitor) {
    writeCb(null, 'alert', monitor.name, monitor.state);
    for (var k in monitor.stats) {
      writeCb(null, 'alert', monitor.name + '.' + k, monitor.stats[k]);
    }
  });
};

exports.init = function alert_init(startup_time, statsd_config, events) {
  config.configFile(statsd_config.alertConfig, function(config) {
    alerts.configure(config);
  });

  events.on('flush', flush_stats);
  events.on('status', backend_status);

  return true;
};

