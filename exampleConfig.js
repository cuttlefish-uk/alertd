/*

Required Variables:

services:          Object containing name: config pairs defining services to monitor.
contacts:          Object defining the contacts and contact groups.

Optional Variables:

port:              Start a server listening on this UDP port to push metrics to.
application_name:  App name used in alerts [default: alertd]
user_agent:        User-Agent header to use for HTTP checks [default: alertd/0.1.0]
statsd:            Object containing host, port, and key (a prefix assigned to all alertd-generated statsd keys)

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
    * This service has no interval so won't be polled.
    * It's only checked if we're using the statsd backend, or
    * if we're running as a server (the srv.s1.load5 metric is
    * to be pushed to alertd).
    */
    'srv.s1.load5': {
      'check': 'value_gt', // check whether the value of this metric exceeds thresholds
      'contact': 'dougal', // notify dougal

      // the value checkers (gt, lt, eq) support the following 2 threshold options:
      'warning': 2, // warn if >= 2
      'critical': 5, // send critical alert if >= 5
    },
  },
  contacts: {
    'ted': {
      'email': 'ted@example.com'
    },
    'ted_mobile': {
      'method': 'prowl',
      'api_key': 'insert prowl api key here',
    },
    'dougal': {
      'email': 'dougal@example.com'
    },
    // a contact may be an array of other contact names
    'developers': ['ted', 'ted_mobile', 'dougal']
  }
}
