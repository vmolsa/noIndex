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

noIndex.prototype.get = function(noFile, options) {
  var self = this;
  var entry = noIndex.File.parse(noFile);
  
  if (!noIndex.util.isObject(options)) {
    options = {};
  }
  
  options.cache = options.cache ? options.cache : 'session';
  options.encoding = options.encoding ? options.encoding : 'utf8';
  
  return noIndex.$q(function(resolve, reject) { 
    self.getService(entry).then(function(service) {
      if (!entry.provider) {
        if (noIndex.util.isFunction(service.getproviders)) {
          service.getproviders(resolve, reject, self, service, self.driver, entry, options);
        } else {
          reject(new Error('Unknown method'));
        }
      } else if (!entry.owner) {
        if (noIndex.util.isFunction(service.getusers)) {
          service.getusers(resolve, reject, self, service, self.driver, entry, options);
        } else {
          reject(new Error('Unknown method'));
        }
      } else if (!entry.repository) {
        if (noIndex.util.isFunction(service.getrepositories)) {
          service.getrepositories(resolve, reject, self, service, self.driver, entry, options);
        } else {
          reject(new Error('Unknown method'));
        }
      } else if (entry.oid) {
        if (noIndex.util.isFunction(service.getoid)) {
          service.getoid(resolve, reject, self, service, self.driver, entry, options);
        } else {
          reject(new Error('Unknown method'));
        }
      } else if (entry.path) {
        if (noIndex.util.isFunction(service.getpath)) {
          service.getpath(resolve, reject, self, service, self.driver, entry, options);
        } else {
          reject(new Error('Unknown method'));
        }
      } else if (entry.tag) {
        if (noIndex.util.isFunction(service.gettag)) {
          service.gettag(resolve, reject, self, service, self.driver, entry, options);
        } else {
          reject(new Error('Unknown method'));
        }
      } else if (!entry.branch && !entry.path) {
        if (noIndex.util.isFunction(service.getbranches)) {
          service.getbranches(resolve, reject, self, service, self.driver, entry, options);
        } else {
          reject(new Error('Unknown method'));
        }
      } else {
        entry.path = entry.path ? entry.path : '';
        entry.branch = entry.branch ? entry.branch : 'HEAD';
        
        if (noIndex.util.isFunction(service.getpath)) {
          service.getpath(resolve, reject, self, service, self.driver, entry, options);
        } else {
          reject(new Error('Unknown method'));
        }
      }
    }).catch(function() {
      if (Object.keys(self.services).length) {
        var res = [];
        
        noIndex.util.forEach(self.services, function(value, key) {
          res.push(key);
        });
        
        resolve(res);
      } else {
        reject(new Error('No Services'));
      }
    });
  });
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
        reject(new Error('Invalid arguments'));
      } else if (entry.type == 'blob') {
        if (noIndex.util.isFunction(service.setblob)) {
          service.setblob(resolve, reject, self, service, self.driver, entry, data, message, mode, options);
        } else {
          reject(new Error('Unknown method'));
        }
      } else {
        reject(new Error('Invalid data'));
      }
    }).catch(function() {
      reject(new Error('Unknow Service'));
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
        reject(new Error('Invalid arguments'));
      } else if (entry.path) {
        switch (entry.type) {
          case 'blob':
            if (noIndex.util.isFunction(service.rmblob)) {
              service.rmblob(resolve, reject, self, service, self.driver, entry, message, options);
            } else {
              reject(new Error('Unknown method'));
            }
            
            break;
          case 'tree':
            if (noIndex.util.isFunction(service.rmtree)) {
              service.rmtree(resolve, reject, self, service, self.driver, entry, message, options);
            } else {
              reject(new Error('Unknown method'));
            }
            
            break;
          case 'commit':
            break;
          default:
            if (noIndex.util.isFunction(service.rmpath)) {
              service.rmpath(resolve, reject, self, service, self.driver, entry, message, options);
            } else {
              reject(new Error('Unknown method'));
            }
            
            break;
        }
      } else if (entry.branch) {
        if (noIndex.util.isFunction(service.rmbranch)) {
          service.rmbranch(resolve, reject, self, service, self.driver, entry, message, options);
        } else {
          reject(new Error('Unknown method'));
        }
      } else if (entry.tag) {
        if (noIndex.util.isFunction(service.rmtag)) {
          service.rmtag(resolve, reject, self, service, self.driver, entry, message, options);
        } else {
          reject(new Error('Unknown method'));
        }
      } else {
        if (noIndex.util.isFunction(service.rmrepository)) {
          service.rmrepository(resolve, reject, self, service, self.driver, entry, message, options);
        } else {
          reject(new Error('Unknown method'));
        }
      }
    }).catch(function() {
      reject(new Error('Unknow Service'));
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
      reject(new Error('Unknow Service'));
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
    
    reject(new Error('Invalid arguments'));
  });
};

noIndex.prototype.setDriver = function(noDriver) {
	var self = this;
  
  return noIndex.$q(function(resolve, reject) {
    if (noIndex.Driver.isDriver(noDriver)) {
      self.driver = noDriver;
      return resolve(true);
    }
    
    reject(new Error('Invalid argument'));
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

module.exports = noIndex;