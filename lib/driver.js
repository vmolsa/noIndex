'use strict';

var noIndex = require('./noIndex.js');

function Driver(options) {
  var self = this;
  
  if (!(self instanceof Driver)) {
    return new Driver(options);
  }
  
  if (!noIndex.util.isObject(options)) {
    options = {};
  }
  
  self.key_get = options.get;
  self.key_set = options.set;
  self.key_del = options.del;
  self.key_hget = options.hget;
  self.key_hset = options.hset;
  self.key_hdel = options.hdel;
}

Driver.isDriver = function(arg) {
  return (arg instanceof Driver);
};

Driver.prototype.get = function(key, options) {
  var self = this;
  
  return noIndex.$q(function(resolve, reject) {
    if (noIndex.util.isFunction(self.key_get)) {
      self.key_get(resolve, reject, self, key, options);
    } else {
      reject(null);
    }
  });
};

Driver.prototype.set = function(key, value, options) {
  var self = this;
  
  return noIndex.$q(function(resolve, reject) {
    if (noIndex.util.isFunction(self.key_set)) {
      self.key_set(resolve, reject, self, key, value, options);
    } else {
      reject(null);
    }
  });
};

Driver.prototype.del = function(key, options) {
  var self = this;
  
  return noIndex.$q(function(resolve, reject) {
    if (noIndex.util.isFunction(self.key_del)) {
      self.key_del(resolve, reject, self, key, options);
    } else {
      reject(null);
    }
  });
};

Driver.prototype.hget = function(key, hash, options) {
  var self = this;
  
  return noIndex.$q(function(resolve, reject) {
    if (noIndex.util.isFunction(self.key_hget)) {
      self.key_hget(resolve, reject, self, key, hash, options);
    } else {
      reject(null);
    }
  });
};

Driver.prototype.hset = function(key, hash, value, options) {
  var self = this;
  
  return noIndex.$q(function(resolve, reject) {
    if (noIndex.util.isFunction(self.key_hset)) {
      self.key_hset(resolve, reject, self, key, hash, value, options);
    } else {
      reject(null);
    }
  });
};

Driver.prototype.hdel = function(key, hash, options) {
  var self = this;
  
  return noIndex.$q(function(resolve, reject) {
    if (noIndex.util.isFunction(self.key_hdel)) {
      self.key_hdel(resolve, reject, self, key, hash, options);
    } else {
      reject(null);
    }
  });
};

module.exports = Driver;