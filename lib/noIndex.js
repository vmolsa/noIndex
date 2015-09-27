'use strict';

var config = {
  init: false,
};

function configure(options) {
  if (options) {
    config.sha = options.sha ? options.sha : config.sha;
    config.$q = options.$q ? options.$q : config.$q;
    config.$http = options.$http ? options.$http : config.$http;
    config.util = options.util ? options.util : config.util;
    config.btoa = options.btoa ? options.btoa : config.btoa;
  }
  
  if (!config.sha) {
    config.sha = require('sha1');
  }
  
  noIndex.sha = config.sha;
  
  if (!config.$q) {
    config.$q = require('./$q.js');
  }
  
  noIndex.$q = config.$q;
  
  if (!config.$http) {
    config.$http = require('./$http.js');
  }
  
  noIndex.$http = config.$http;
  
  if (!config.util) {
    config.util = require('underscore');
  }
  
  noIndex.util = config.util;
  
  if (!config.btoa) {
    config.btoa = function(str) {
      var src = Buffer.isBuffer(str) ? str : new Buffer(str);     
      return src.toString('base64');
    }
  }
  
  noIndex.btoa = config.btoa;
  
  if (!config.File) {
    config.File = require('./file.js');
  }
  
  noIndex.File = config.File;

  if (!config.Driver) {
    config.Driver = require('./driver.js');
  }
  
  noIndex.Driver = config.Driver;
  
  if (!config.Service) {
    config.Service = require('./service.js');
  }

  noIndex.Service = config.Service;
}

function noIndex(options) {
  var self = this;

  if (options || !config.init) {
    configure(options);
  }

  self.services = {};
  self.driver = new config.Driver();
}

noIndex.prototype.getService = function(noFile) {
  var self = this;
  
  return noIndex.$q(function(resolve, reject) {
    if (noFile && self.services[noFile.service]) {
      resolve(self.services[noFile.service]);
    } else {
      reject(null);
    }
  });
};

noIndex.prototype.getServices = function() {
  var self = this;
  
  return noIndex.$q(function(resolve, reject) {
    var res = [];
    
    noIndex.util.forEach(self.services, function(value, key) {
      res.push(new noIndex.File({
        service: key,
      }));
    });
    
    resolve(res);
  });
};

noIndex.prototype.query = function(callback, noFile, options, key) {
  var self = this;
  var service = null;
  
  key = key || noFile.blob || noFile.tree || noFile.commit || noFile.oid || noFile.tag || noFile.branch;
  
  function fetch(resolve, reject) {
    service[callback](service, noFile, options).then(function(reply) {
      if (key) {
        self.driver.hset(noFile.meta, key, reply, options).finally(function() {          
          resolve(reply);
        });
      } else {
        self.driver.set(noFile.meta, reply, options).finally(function() {
          resolve(reply);
        });
      }
    }).catch(function(error) {
      reject(error);
    });
  }
  
  return noIndex.$q(function(resolve, reject) {
    if (noFile && self.services[noFile.service]) {
      service = self.services[noFile.service];
      
      if (noIndex.util.isFunction(service[callback])) {
        if (key) {
          return self.driver.hget(noFile.meta, key, options).then(function(value) {
            if (value) { 
              return resolve(value); 
            }
            
            fetch(resolve, reject);
          }).catch(function() {
            fetch(resolve, reject);
          });
        } else {
          return self.driver.get(noFile.meta, options).then(function(value) {
            if (value) {
              return resolve(value); 
            }
            
            fetch(resolve, reject);
          }).catch(function() {
            fetch(resolve, reject);
          });
        }
      }
      
      return reject('Unknown method');
    }
    
    reject('Unknown Service');
  });
};

noIndex.prototype.getPath = function(noFile, options) {
  var self = this;
  var entry = noIndex.File.parse(noFile);
    
  return self.query('gettree', entry, options);
};

noIndex.prototype.get = function(noFile, options) {
  var self = this;
  var entry = noIndex.File.parse(noFile);
  
  if (!noIndex.util.isObject(options)) {
    options = {};
  }
  
  options.cache = options.cache ? options.cache : 'session';
  options.encoding = options.encoding ? options.encoding : 'utf8';
  options.request = options.request ? options.request : entry.path ? 'tree' : null;
  
  if (!entry.service || entry.service == '?') {
    return self.getServices();
  } else if (!entry.provider || entry.provider == '?') {
    return self.query('getproviders', entry, options);
  } else if (!entry.owner || entry.owner == '?') {
    return self.query('getusers', entry, options);
  } else if (!entry.repository || entry.repository == '?') {
    return self.query('getrepositories', entry, options);
  } else if (entry.fullpath) {
    return self.getPath(entry, options);
  } else if (entry.tree && entry.tree !== '?') {   
    return self.query('gettree', entry, options);
  } else if (entry.blob && entry.blob !== '?') {    
    return self.query('getblob', entry, options);
  } else if (entry.commit && entry.commit !== '?') {
    if (entry.tree == '?') {
      options.request = 'tree';
      entry.tree = null;
    }
    
    return self.query('getcommit', entry, options, 'commit/' + entry.commit);
  } else if (entry.tag) {
    if (entry.tag == '?') {
      return self.query('gettags', entry, options, 'tags');
    }
    
    if (entry.commit == '?') {
      options.request = 'commit';
      entry.commit = null;
    }
    
    if (entry.tree == '?') {
      options.request = 'tree';
      entry.tree = null;
    }
    
    return self.query('gettag', entry, options, 'tag/' + entry.tag);
  } else if (entry.branch) {
    if (entry.branch == '?') {
      return self.query('getbranches', entry, options, 'branches');
    }
    
    if (entry.tree == '?') {
      options.request = 'tree';
      entry.tree = null;
    }
    
    return self.query('getbranch', entry, options, 'branch/' + entry.branch);
  } else {
    noIndex.$q.reject(null);
  }
};

noIndex.prototype.set = function(noFile, data, message, mode, options) {
  var self = this;
  var entry = noIndex.File.parse(noFile);
  
  if (!noIndex.util.isObject(options)) {
    options = {};
  }
  
  options.cache = options.cache ? options.cache : 'session';
  options.encoding = options.encoding ? options.encoding : 'utf8';  
  
  return noIndex.$q(function(resolve, reject) { 
    self.getService(entry).then(function(service) {
      if (!entry.owner || !entry.repository || !entry.path) {
        reject('Invalid arguments');
      } else if (entry.type == 'blob') {
        if (noIndex.util.isFunction(service.setblob)) {
          service.setblob(resolve, reject, self, service, self.driver, entry, data, message, mode, options);
        } else {
          reject('Unknown method');
        }
      } else {
        reject('Invalid data');
      }
    }).catch(function() {
      reject('Unknow Service');
    });
  });
};

noIndex.prototype.remove = function(noFile, message, options) {
  var self = this;
  var entry = noIndex.File.parse(noFile);

  if (!noIndex.util.isObject(options)) {
    options = {};
  }
  
  options.cache = options.cache ? options.cache : 'session';
  
  return noIndex.$q(function(resolve, reject) { 
    self.getService(entry).then(function(service) {
      if (!entry.owner || !entry.repository) {
        reject('Invalid arguments');
      } else if (entry.path) {
        switch (entry.type) {
          case 'blob':
            if (noIndex.util.isFunction(service.rmblob)) {
              service.rmblob(resolve, reject, self, service, self.driver, entry, message, options);
            } else {
              reject('Unknown method');
            }
            
            break;
          case 'tree':
            if (noIndex.util.isFunction(service.rmtree)) {
              service.rmtree(resolve, reject, self, service, self.driver, entry, message, options);
            } else {
              reject('Unknown method');
            }
            
            break;
          case 'commit':
            break;
          default:
            if (noIndex.util.isFunction(service.rmpath)) {
              service.rmpath(resolve, reject, self, service, self.driver, entry, message, options);
            } else {
              reject('Unknown method');
            }
            
            break;
        }
      } else if (entry.branch) {
        if (noIndex.util.isFunction(service.rmbranch)) {
          service.rmbranch(resolve, reject, self, service, self.driver, entry, message, options);
        } else {
          reject('Unknown method');
        }
      } else if (entry.tag) {
        if (noIndex.util.isFunction(service.rmtag)) {
          service.rmtag(resolve, reject, self, service, self.driver, entry, message, options);
        } else {
          reject('Unknown method');
        }
      } else {
        if (noIndex.util.isFunction(service.rmrepository)) {
          service.rmrepository(resolve, reject, self, service, self.driver, entry, message, options);
        } else {
          reject('Unknown method');
        }
      }
    }).catch(function() {
      reject('Unknow Service');
    });
  });
};

noIndex.prototype.copy = function(noFileSrc, noFileDst, message, options) {
	var self = this;
  var src = noIndex.File.parse(noFileSrc);
  var dst = noIndex.File.parse(noFileDst);
  
  return noIndex.$q(function(resolve, reject) {
    reject('Not implemented yet');
  });
};

noIndex.prototype.move = function(noFileSrc, noFileDst, message, options) {
  var self = this;
	var src = noIndex.File.parse(noFileSrc);
  var dst = noIndex.File.parse(noFileDst);

  return noIndex.$q(function(resolve, reject) {
    reject('Not implemented yet');
  });
};

noIndex.prototype.sync = function(noFile, options) {
  var self = this;
  var entry = noIndex.File.parse(noFile);
  
  return noIndex.$q(function(resolve, reject) {
    self.getService(entry).then(function(service) {
      if (!entry.owner || !entry.repository) {
        
      }
      
      reject('Not implemented yet');
    }).catch(function() {
      reject('Unknow Service');
    });
  });
};

noIndex.prototype.setService = function(noFile, noService) {
	var self = this;
  var entry = noIndex.File.parse(noFile);
  
  return noIndex.$q(function(resolve, reject) {
    if (entry.service && noIndex.Service.isService(noService)) {
      self.services[entry.service] = noService;
      return resolve(true);
    }
    
    reject('Invalid arguments');
  });
};

noIndex.prototype.setDriver = function(noDriver) {
	var self = this;
  
  return noIndex.$q(function(resolve, reject) {
    if (noIndex.Driver.isDriver(noDriver)) {
      self.driver = noDriver;
      return resolve(true);
    }
    
    reject('Invalid argument');
  });
};

noIndex.prototype.cache = function(noFile, options) {
	var self = this;
  var entry = noIndex.File.parse(noFile);
  
  return noIndex.$q(function(resolve, reject) {
    reject('Not implemented yet');
  });
};

noIndex.prototype.clear = function(noFile, options) {
	var self = this;
  var entry = noIndex.File.parse(noFile);
  
  return noIndex.$q(function(resolve, reject) {
    reject('Not implemented yet');
  });
};

noIndex.getDriver = function(name, options) {
  var driver = require('../drivers/' + name);
  return driver(options);
};

noIndex.getService = function(name, options) {
  var service = require('../services/' + name);
  return service(options);
};

module.exports = noIndex;