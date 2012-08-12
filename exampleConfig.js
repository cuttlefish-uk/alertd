/*

Required Variables:

services:          Object containing name: config pairs defining services to monitor.
contacts:          Object defining the contacts and contact groups.

Optional Variables:

port:              Start a server listening on this UDP port to push metrics to.
application_name:  App name used in alerts [default: alertd]
email_from:        Email address for alerts to come from [default: alertd@{os.hostname()}]
user_agent:        User-Agent header to use for HTTP checks [default: alertd/0.1.0]
statsd:            Object containing host, port, and key (a prefix assigned to all alertd-generated statsd keys)
templates:         Service templates to reduce boilerplate. a service can "extend" a template to inherit all its attributes.

*/
{
  // enabling statsd allows us to record info about the behaviour of alertd
  //
  statsd: {
    'host': '127.0.0.1',
    'port': 8125,
    'key': 'alertd',
  },

  // template service definitions help reduce boilerplate in the config
  templates: {
    'my_http': {
      'extend': 'http', // extend the built-in http template
      'interval': 120,
      'verify_interval': 10,
      'contact': 'developers',
    },
  },

  // services are things we want to monitor
  //
  services: {
    // here's a full example
    'example.com': {
      'interval': 120, // check this service every 2 minutes
      'verify_interval': 10, // if state changes, check again 10 seconds later. if same we'll notify the contact.
      'fetch': 'http', // fetch over http
      'check': 'http', // and check using the http checker
      'contact': 'developers', // if checks fail, notify the developers contact

      // the http checker supports any or all of the following 3 options:
      //'statusCode': 200, // this is optional and defaults to 200.
      //'bodyMatch': /not available for registration/, // ensure body matches a regex
      'duration': 2, // ensure a response is received within 2 seconds

      //'url': 'http://example.com', // URL is optional and defaults to service name unless request is specified:
      //'request': {
      // // this is passed directly to http.request so can include custom headers etc.
      //},
    },

    // here's a trimmed down version of the above using the built-in http service template.
    'example.com/2': {
      'extend': 'http',
      'interval': 120,
      'verify_interval': 10,
      'contact': 'developers',
    },

    // and trimmed down further using our defined template
    'example.com/3': {'extend': 'my_http'},

    /*
    * This service has no 'fetch' or 'interval' so won't be polled.
    * It's only checked if we're using the statsd backend, or
    * if we're running as a server (the srv.s1.load5 metric is
    * to be pushed to alertd).
    */
    'srv.s1.load5': {
      'check': 'value_gt', // check whether the value of this metric exceeds thresholds
      'contact': 'dougal', // notify dougal

      // the value checkers (gt, lt, eq) support the following 2 threshold options:
      'warning': 2, // warn if > 2
      'critical': 5, // send critical alert if > 5

      // quiet time checks are specified as xx:xx-xx:xx time ranges. these are recursive
      // checks so arrays or weekday objects can contain further arrays/objects.
      'quiet_times': [
        '02:00-02:30', // no alerts between 2 and 2:30am on any day
        {
          'tue': '03:30-03:45', // extra 15-minute quiet period on tuesday
          'wed': ['01:00-02:00', '04:00-04:30'], // extra quiet periods on wednesday
        },
      ],
    },

    // poll the load by executing a command
    'localhost.load1': {
      'interval': 60,
      'fetch': 'exec',
      'cmd': "awk '{print $1}' < /proc/loadavg",
      'check': '>2|5', // shorthand for check: value_gt, warning: 2, critical: 5
      'contact': 'developers',
    },

  },

  contacts: {
    'ted': {
      'email': 'ted@example.com',
    },
    'dougal': {
      'email': 'dougal@example.com'
    },
    'jack_mobile': {
      'method': 'prowl',
      'api_key': 'insert prowl api key here',
      'quiet_times': '23:00-06:00', // don't wake jack.
    },
    // a contact may be an array of other contact names
    'developers': ['ted', 'dougal', 'jack_mobile']
  }
}
