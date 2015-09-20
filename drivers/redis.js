'use strict';

var noIndex = require('../lib/noIndex.js');
var redis = require('ioredis');

var db = {};

var config = {
  get: function(resolve, reject, driver, key) {
	  driver.io.get(key).then(function(value) {
      resolve(value);
    }).catch(function(error) {
      reject(error);
    });
  },
  set: function(resolve, reject, driver, key, value) {
	  driver.io.set(key, value).then(function(value) {
      resolve(value);
    }).catch(function(error) {
      reject(error);
    });
  },
  del: function(resolve, reject, driver, key) {
	  driver.io.del(key).then(function(value) {
      resolve(value);
    }).catch(function(error) {
      reject(error);
    });
  },
  hget: function(resolve, reject, driver, key, hash) {
	  driver.io.hget(key, hash).then(function(value) {
      resolve(value);
    }).catch(function(error) {
      reject(error);
    });
  },
  hset: function(resolve, reject, driver, key, hash, value) {
	  driver.io.hset(key, hash, value).then(function(value) {
      resolve(value);
    }).catch(function(error) {
      reject(error);
    });
  }, 
  hdel: function(resolve, reject, driver, key, hash) {
	  driver.io.hdel(key, hash).then(function(value) {
      resolve(value);
    }).catch(function(error) {
      reject(error);
    });
  }, 
};

module.exports = function(options) {
  var driver = new noIndex.Driver(config);
  
  driver.io = new redis(options);
 
  return driver;  
}