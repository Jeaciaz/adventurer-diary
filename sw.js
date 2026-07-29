/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-9abe4650'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();

  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "6b211cdf645bbf3f39c75f56ae4a1c73"
  }, {
    "url": "pwa-512x512.png",
    "revision": "9681220f2201a25fc5c48d42168aa908"
  }, {
    "url": "pwa-192x192.png",
    "revision": "dedc845d49297ff642268968a5cf8b9a"
  }, {
    "url": "index.html",
    "revision": "63499b07cdf8cbdede6df975bff8bd0a"
  }, {
    "url": "favicon.svg",
    "revision": "c4a6f93f3a95f6c9184221b81d212430"
  }, {
    "url": "assets/index-F8zV8U9l.css",
    "revision": null
  }, {
    "url": "assets/index-ArjCIpQn.js",
    "revision": null
  }, {
    "url": "favicon.svg",
    "revision": "c4a6f93f3a95f6c9184221b81d212430"
  }, {
    "url": "pwa-192x192.png",
    "revision": "dedc845d49297ff642268968a5cf8b9a"
  }, {
    "url": "pwa-512x512.png",
    "revision": "9681220f2201a25fc5c48d42168aa908"
  }, {
    "url": "manifest.webmanifest",
    "revision": "c9679e29fe6bdcbf6a8b2d70708a2eab"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));

}));
