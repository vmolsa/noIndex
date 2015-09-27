'use strict';

var noIndex = require('../lib/noIndex.js');

var db = {};

var config = {
  get: function(resolve, reject, driver, key, options) {   
	  if (db[key]) {
      return resolve(db[key]);
    }

    reject(null);
  },
  set: function(resolve, reject, driver, key, value, options) {   
    if (value) {
      db[key] = value;
      resolve(value);
    }
    
    reject(null);
  },
  del: function(resolve, reject, driver, key, options) {
    var value = db[key];
    
    if (value) {
	    delete db[key];
      return resolve(value);
    }
    
    reject(null);
  },
  hget: function(resolve, reject, driver, key, hash, options) {
	  if (db[key]) {
      var entry = db[key];
      
      if (entry[hash]) {
        return resolve(entry[hash]);
      }
    }
    
    reject(null);
  },
  hset: function(resolve, reject, driver, key, hash, value, options) {
    if (value) {
      if (!db[key]) {
        db[key] = {};
      }
      
      db[key].hash = value;
      resolve(value);
    }
    
    reject(null);
  }, 
  hdel: function(resolve, reject, driver, key, hash, options) {
    var value = null;
    
    if (db[key]) {
      var entry = db[key];  
      
      if (entry[hash]) {
        value = entry[hash];
	      delete entry[hash];
      }
      
      if (!Object.keys(entry).length) {
        delete db[key];
      }
    }
    
    value ? resolve(value) : reject(null);
  }, 
};

module.exports = function(options) {
  return new noIndex.Driver(config);
}