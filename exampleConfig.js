/*

Required Variables:

  services:          Object containing name: config pairs defining services to monitor.
  contacts:          Object defining the contacts and contact groups.

Optional Variables:

  port:              Start a server listening on this UDP port to push metrics to.
  application_name:  App name used in alerts [default: alertd]
  user_agent:        User-Agent header to use for HTTP checks [default: alertd/0.1.0]

*/
{
  services: {
    'example.com': {
      'interval': 120, // check this service every 2 minutes
      'fetch': 'http', // fetch over http
      'check': 'http', // and check using the http checker
      'contact': 'developers', // if checks fail, notify the developers contact

	  // the http checker supports any or all of the following 3 options:
	  //'statusCode': 200, // this is optional and defaults to 200.
      'bodyMatch': /not available for registration/, // ensure body matches a regex
      'duration': 2, // ensure a response is received within 2 seconds

    },
    /*
     * This service has no interval so won't be polled.
     * It's only checked if we're using the statsd backend, or
     * if we're running as a server (the srv.s1.load5 metric is
     * to be pushed to alertd).
     */
    'srv.s1.load5': {
      'check': 'value', // check the value of this metric
      'contact': 'dougal', // notify dougal

	  // the value checker supports the following 2 options:
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
