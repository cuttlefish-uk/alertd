alertd
======

A simple, lightweight monitoring and alerting daemon. Designed to run either as a backend to [statsd](https://github.com/etsy/statsd) or standalone.

statsd backend
--------------

In your statsd config you'll want something along the lines of:

	{
	  graphitePort: 2003
	, graphiteHost: "127.0.0.1"
	, port: 8125
	, mgmt_port: 8126
	, flushInterval: 60000
	, backends: [
		'./backends/graphite.js'
	  , '../alertd/statsd_backend.js'
	]
	, alertConfig: '../alertd-config.js'
	}

alertd-config.js will be reloaded on changes in the same way as the statsd config.

standalone
---------

Run alertd standalone using:

    node alerts.js /path/to/alertd-config.js

configuration
-----------

See exampleConfig.js for a basic rundown of the layout.

