'use strict';

var _ = require('underscore');
var http = require('http');
var https = require('https');
var url = require('url');
var fs = require('fs');
var $q = require('./$q.js');

function isPromise(promise) {
  return (_.isObject(promise) && _.isFunction(promise.then));
}

function setHeaders(config) {
  if (!_.isObject(config.headers)) {
    config.headers = {};
  }
  
  if (!config.headers['Accept']) {
    config.headers['Accept'] = '*/*';
  }
  
  if (_.isString(config.hostname)) {
    if (config.port && (config.port !== 443 && config.port !== 80)) {
      config.headers['Host'] = config.hostname + ':' + config.port;
    } else {
      config.headers['Host'] = config.hostname;
    }
  }
}

function $http(config) {
  if (!_.isObject(config)) {
    return $q.reject(new Error('Invalid Argument'));
  }
  
  if (!_.isString(config.url)) {
    config.url = 'http://localhost/';
  }
  
  if (!_.isString(config.method)) {
    return $q.reject(new Error('Invalid Method'));
  }
  
  config.method.toUpperCase();
  
  var uri = url.parse(config.url);
  var timer = null;
  var socket = null;
  var req = $q.defer();
  
  config.ssl = (uri.protocol == 'https:') ? true : false;
  config.port = config.port || uri.port || config.ssl ? 443 : 80;
  config.hostname = uri.hostname || 'localhost';
  config.local = (uri.protocol == 'file:');
  config.path = uri.pathname;
  config.path = uri.search ? config.path + uri.search : config.path;

  function onAbort() {
    if (socket) {
      socket.abort();
    }
    
    req.reject(new Error('Timeout'));
  }
  
  function onRequest(status, headers, data) {
    clearTimeout(timer);
    
    if ((status >= 301 && status <= 303) || status == 307) {
      delete config.port;
      delete config.hostname;
      
      config.url = headers.location;
      
      if (status == 303) {
        config.method = 'GET';
      }
      
      $http(config).then(function(res) {
        req.resolve(res);
      }).catch(function(error) {
        req.reject(error);
      }); 
    } else {
      var res = {
        status: status,
        headers: headers,
        data: data,
      };

      return (res.status >= 200 && res.status <= 300) ? req.resolve(res) : req.reject(res);
    }
  }
  
  function onError(error) {
    clearTimeout(timer);
    req.reject(error);
  }
  
  if (config.local) { 
    if (config.method !== 'GET') {
      req.reject(new Error('Invalid method for local protocol'));
    }
    
    fs.readFile(url.pathname, "utf8", function(error, content) {
      if (error) {
        return onError(error);
      } else {
        return onRequest(200, {}, content);
      }
    });
  } else {
    if (config.timeout > 0) {
      timer = setTimeout(onAbort, config.timeout);
    } else if (isPromise(config.timeout)) {
      config.timeout.then(onAbort);
    }
    
    setHeaders(config);
    
    if (config.data) {
      if (!_.isString(config.data)) {
        try {
          config.data = JSON.stringify(config.data);
          
          if (!config.headers['Content-Type']) {
            config.headers['Content-Type'] = 'application/json; charset=utf-8';
          }
        } catch(error) {
          req.reject(error);
        }
      }
      
      if (!config.headers['Content-Type']) {
        config.headers['Content-Type'] = 'text/plain';
      }
      
      config.headers['Content-Length'] = config.data.length;
    }
    
    var xhr = config.ssl ? https.request : http.request;
    
    if (config.username && config.password) {
      config.auth = config.username + ':' + config.password;
    }

    config.agent = false;
    socket = xhr(config, function(res) {
      var offset = 0;
      var length = parseInt(res.headers['content-length']);
      
      if (length < 0) {
        length = 0;
      } 
      
      var buffer = new Buffer(length);
        
      res.on('data', function(chunk) {        
        if (!length) {
          buffer = Buffer.concat([ buffer, chunk ]);
        } else {
          chunk.copy(buffer, offset);
          offset += chunk.length;
        }
      });
      
      res.on('end', function() {
        var data = null;
        
        if (offset < length) {
          req.reject(new Error('Invalid Data'));
        }
        
        switch (config.responseType) {
          case 'blob':
          case 'document':
          case 'arraybuffer':
            data = new Uint8Array(buffer).buffer;
            break;
          case 'json':
            try {
              data = JSON.parse(buffer.toString('utf8'));
            } catch (error) {
              req.reject(error);
            }
            
            break;
          default:
            data = buffer.toString('utf8');
            break;
        }
        
        onRequest(res.statusCode, res.headers, data);
      });
    }).on('error', onError);
    
    if (config.data) {
      socket.write(config.data);
    }
        
    socket.end();
  }
  
  return req.promise;
}

$http.get = function(url, config) {
  if (!_.isObject(config)) {
    config = {};
  }
  
  config.url = url;
  config.method = 'GET';
  
  return $http(config);
};

$http.delete = function(url, config) {
  if (!_.isObject(config)) {
    config = {};
  }
  
  config.url = url;
  config.method = 'DELETE';
  
  return $http(config);
};

$http.head = function(url, config) {
  if (!_.isObject(config)) {
    config = {};
  }
  
  config.url = url;
  config.method = 'HEAD';
  
  return $http(config);
};

$http.jsonp = function(url, config) {
  if (!_.isObject(config)) {
    config = {};
  }
  
  config.url = url;
  config.method = 'JSONP';
  
  return $http(config);
};

$http.post = function(url, data, config) {
  if (!_.isObject(config)) {
    config = {};
  }
  
  config.url = url;
  config.method = 'POST';
  config.data = data;
  
  return $http(config);
};

$http.put = function(url, data, config) {
  if (!_.isObject(config)) {
    config = {};
  }
  
  config.url = url;
  config.method = 'PUT';
  config.data = data;
  
  return $http(config);
};

$http.patch = function(url, config) {
  if (!_.isObject(config)) {
    config = {};
  }
  
  config.url = url;
  config.method = 'PATCH';
  
  return $http(config);
};

module.exports = $http;