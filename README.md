alertd
======

A simple, lightweight monitoring and alerting daemon for nodejs. Designed to run either as a backend to [statsd](https://github.com/etsy/statsd) or standalone.

We are using this as a replacement for a Nagios setup which we were finding overcomplicated for what we need. This provides similar alerting capabilities and
is a breeze to add new monitors to. Especially useful for alerting based on metrics already being sent through statsd.

requirements
------------

* node (tested with v0.8.2)
* emailjs (tested with v0.3.0)

Optional:

* statsd-client (tested with v0.0.4)

statsd backend
--------------

In your statsd config you'll want something along the lines of:

```js
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
```

alertd-config.js will be reloaded on changes in the same way as the statsd config.

standalone
---------

Run alertd standalone using:

    node alerts.js /path/to/alertd-config.js

configuration
-----------

See [exampleConfig.js](https://github.com/cuttlefish-uk/alertd/blob/master/exampleConfig.js) for a basic rundown of the layout.

