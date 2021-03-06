/**
 * @license
 * Copyright (c) 2015 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

'use strict';

const express = require('express');
const findPort = require('find-port');
const http = require('http');
const makeApp = require('./make_app');
const opn = require('opn');

/**
 * @return {Promise} A Promise that completes when the server has started.
 */
function startServer(options) {
  return new Promise((resolve, reject) => {
    if (options.port) {
      resolve(options);
    } else {
      findPort(8080, 8180, function(ports) {
        options.port = ports[0];
        resolve(options);
      });
    }
  }).then((opts) => startWithPort(opts));
}

let portInUseMessage = (port) => `
ERROR: Port in use: ${port}
Please choose another port, or let an unused port be chosen automatically.
`;

/**
 * @param {Object} options
 * @param {Number} options.port -- port number
 * @param {String} options.host -- hostname string
 * @param {String=} options.page -- page path, ex: "/", "/index.html"
 * @param {(String|String[])} options.browser -- names of browser apps to launch
 * @return {Promise}
 */
function startWithPort(options) {

  options.port = options.port || 8080;
  options.host = options.host || "localhost";

  console.log('Starting Polyserve on port ' + options.port);

  let app = express();
  let polyserve = makeApp({
    componentDir: options.componentDir,
    packageName: options.packageName,
    root: process.cwd(),
  });

  app.get('/', function (req, res) {
    res.redirect(301, `/components/${polyserve.packageName}/`);
  });

  app.use('/components/', polyserve);

  let server = http.createServer(app);
  let serverStartedResolve;
  let serverStartedReject;
  let serverStartedPromise = new Promise((resolve, reject) => {
    serverStartedResolve = resolve;
    serverStartedReject = reject;
  });

  server = app.listen(options.port, options.host,
      () => serverStartedResolve(server));

  server.on('error', function(err) {
    if (err.code === 'EADDRINUSE') {
      console.error(portInUseMessage(options.port));
    }
    serverStartedReject(err);
  });

  let baseUrl = `http://${options.host}:${options.port}/components/${polyserve.packageName}/`;
  console.log(`Files in this directory are available under ${baseUrl}`);

  if (options.page) {
    let url = baseUrl + (options.page === true ? 'index.html' : options.page);
    if (Array.isArray(options.browser)) {
      for (let i = 0; i < options.browser.length; i++)
        opn(url, options.browser[i]);
    }
    else {
      opn(url, options.browser);
    }
  }

  return serverStartedPromise;
}

module.exports = startServer;
