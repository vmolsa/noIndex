'use strict';

var _ = require('underscore');
var delayedCall = null;

if (_.isFunction(setImmediate)) {
  delayedCall = setImmediate;
} else {
  if (_.isFunction(process.nextTick)) {
    delayedCall = process.nextTick;
  }
}

function asyncCall(callback) {
  if (_.isFunction(delayedCall)) {
    return delayedCall(callback);
  } else {
    return setTimeout(callback, 0);
  }
}

function Promise() {
  
}

Promise.prototype.then = function(onResolve, onReject, onNotify) {
  var self = this;
  
  if (_.isFunction(onResolve)) {
    if (!_.isArray(self.onresolve)) {
      self.onresolve = [];
    }
    
    self.onresolve.push(onResolve);
  }
    
  if (_.isFunction(onReject)) {
    if (!_.isArray(self.onreject)) {
      self.onreject = [];
    }
    
    self.onreject.push(onReject);
  }
      
  if (_.isFunction(onNotify)) {
    if (!_.isArray(self.onnotify)) {
      self.onnotify = [];
    }
    
    self.onnotify.push(onNotify);
  }
  
  return self;
};

Promise.prototype.catch = function(onError) {
  var self = this;
  
  if (_.isFunction(onError)) {
    if (!_.isArray(self.onreject)) {
      self.onreject = [];
    }
    
    self.onreject.push(onError);
  }
  
  return self;
};

Promise.prototype.finally = function(onResolve, onNotify) {
  var self = this;
  
  return self.then(function() {
    onResolve();
  }, function() {
    onResolve();
  }, onNotify);
};

function Defer() {
  this.promise = new Promise();
}

Defer.prototype.then = function(onResolve, onReject, onNotify) {
  return this.promise.then(onResolve, onReject, onNotify);
};

Defer.prototype.catch = function(onError) {
  return this.promise.catch(onError);
};

Defer.prototype.finally = function(onResolve, onNotify) {
  return this.promise.finally(onResolve, onNotify);
};

Defer.prototype.resolve = function(arg) {
  var self = this;
  
  asyncCall(function() {
    if (_.isArray(self.promise.onresolve) && !self.rejected) {
      var callbacks = self.promise.onresolve;

      callbacks.forEach(function(callback) {
        try {
          callback.call(self, arg);
        } catch(ignored) {}
      });
      
      self.promise.onresolve = null;
      self.promise.onreject = null;
      self.promise.onnotify = null;
    }
  });
  
  return self.promise;
};

Defer.prototype.reject = function(arg) {
  var self = this;
  
  self.rejected = true;
  
  asyncCall(function() {
    if (_.isArray(self.promise.onreject)) {
      var callbacks = self.promise.onreject;
    
      callbacks.forEach(function(callback) {
        try {
          callback.call(self, arg);
        } catch(ignored) {}
      });
    }
    
    self.promise.onresolve = null;
    self.promise.onreject = null;
    self.promise.onnotify = null;
  });
  
  return self.promise;
};

Defer.prototype.notify = function(arg) {
  var self = this;
  
  asyncCall(function() {
    if (_.isArray(self.promise.onnotify)) {
      var callbacks = self.promise.onnotify;
    
      callbacks.forEach(function(callback) {
        try {
          callback.call(self, arg);
        } catch(ignored) {}
      });
    }
  });
};

var $q = function(callback) {
  var req = new Defer();
  
  function onResolve(data) {
    req.resolve(data);
  }
  
  function onReject(data) {
    req.reject(data);
  }
  
  function onNotify(data) {
    req.notify(data);
  }
  
  asyncCall(function() {
    try {
      callback(onResolve, onReject, onNotify);
    } catch(error) {
      req.reject(error);
    }
  });
  
  return req.promise;
}

$q.defer = function() {
  return new Defer();
};

$q.when = function(arg, onResolve, onReject, onNotify) {
  if (arg && _.isFunction(arg.then)) {
    return arg.then.call(arg, onResolve, onReject, onNotify);
  }

  var req = new Defer();
  
  req.resolve(arg);
  
  return req.promise;
};

$q.resolve = $q.when;

$q.reject = function(arg) {
  var req = new Defer();
  
  req.reject(arg);
    
  return req.promise;
};

$q.all = function(targets) {
  var req = new Defer();
  var list = targets;
  var res = [];
  var len = 0;
  
  if (targets instanceof Promise) {
    list = [ targets ]; 
  }

  try {
    len = list.length;
    
    if (len) {
      list.forEach(function(promise, index) {
        promise.then(function(arg) {
          len--;
          res[index] = arg;
          
          if (!len) {
            req.resolve(res);
          }
        }, function(error) {
          req.reject(error);
        });
      });
    } else {
      req.resolve([]);
    }
  } catch (error) {
    req.reject(error);
  }

  return req.promise;
};

module.exports = $q;