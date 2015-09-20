'use strict';

var noIndex = require('../lib/noIndex.js');

var db = {};

var options = {
  get: function(resolve, reject, driver, key) {
    
  },
  set: function(resolve, reject, driver, key, value) {
    
  },
  del: function(resolve, reject, driver, key) {
    
  },
  hget: function(resolve, reject, driver, key, hash) {
	  
  },
  hset: function(resolve, reject, driver, key, hash, value) {
	  
  }, 
  hdel: function(resolve, reject, driver, key, hash) {
	  
  }, 
};

module.exports = new noIndex.Driver(options);