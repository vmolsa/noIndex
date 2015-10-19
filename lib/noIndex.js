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

noIndex.prototype.get = function(noFile, options) {
  var self = this;
  
  if (noIndex.util.isArray(noFile)) {
    noFile = noFile[0];
  }
  
  var entry = noIndex.File.parse(noFile);
  
  if (!noIndex.util.isObject(options)) {
    options = {};
  }
  
  function fetch(callback, req, opt) {
    if (req && self.services[req.service]) {
      var service = self.services[req.service];
      
      if (noIndex.util.isFunction(service[callback])) {
        return service[callback](service, self.driver, req, opt);
      }
      
      return noIndex.$q.reject('Unknown method');
    }
    
    return noIndex.$q.reject('Unknown Service');
  }  
  
  function resolveTree(resolve, reject, path, tree, opt) {    
    if (!path.length) {
      return resolve(tree);
    }
    
    for (var index = 0; index < tree.length; index++) {
      if (tree[index].path == path[0]) {       
        if (tree[index].tree) {
          return fetch('gettree', tree[index], { request: 'tree' }).then(function(tree) {
            path.splice(0, 1);
            resolveTree(resolve, reject, path, tree, opt);
          }).catch(function(error) {
            reject(error);
          });
        } else if (tree[index].blob) {
          return fetch('getblob', tree[index], opt).then(function(blob) {
            resolve(blob);
          }).catch(function(error) {
            reject(error);
          });
        }
      }
    }
    
    reject('Not Found!');
  }
  
  options.cache = options.cache ? options.cache : 'session';
  options.encoding = options.encoding ? options.encoding : 'utf8';
  
  if (!entry.service || entry.service == '?') {
    return noIndex.$q(function(resolve, reject) {
      var res = [];
      
      noIndex.util.forEach(self.services, function(value, key) {
        res.push(new noIndex.File({
          service: key,
        }));
      });
      
      resolve(res);
    });
  } else if (!entry.provider || entry.provider == '?') {
    return fetch('getproviders', entry, options);
  } else if (!entry.owner || entry.owner == '?') {
    return fetch('getusers', entry, options);
  } else if (!entry.repository || entry.repository == '?') {
    return fetch('getrepositories', entry, options);
  } else if (entry.path) {
    return noIndex.$q(function(resolve, reject) {      
      entry.blob = null;
      entry.tree = null;
      entry.tag = (entry.tag && entry.tag !== '?') ? entry.tag : null;
      entry.commit = (entry.commit && entry.commit !== '?') ? entry.commit : null;
      entry.branch = (entry.branch && entry.branch !== '?') ? entry.branch : 'HEAD';
      
      fetch('gettree', entry, { request: 'tree' }).then(function(tree) {
        var parts = entry.path.split('/');
        var path = [];
      
        parts.forEach(function(name) {
          if (name) { path.push(name); }
        });
        
        return resolveTree(resolve, reject, path, tree, options); 
      }).catch(function(error) {
        reject(error);
      });
    });
  } else if (entry.tree && entry.tree !== '?') {   
    return fetch('gettree', entry, options);
  } else if (entry.blob && entry.blob !== '?') {    
    return fetch('getblob', entry, options);
  } else if (entry.commit && entry.commit !== '?') {
    if (entry.tree == '?') {
      options.request = 'tree';
      entry.tree = null;
    }

    return fetch('getcommit', entry, options);
  } else if (entry.tag) {
    if (entry.tag == '?') {
      return fetch('gettags', entry, options);
    }
    
    if (entry.commit == '?') {
      options.request = 'commit';
      entry.commit = null;
    }
    
    if (entry.tree == '?') {
      options.request = 'tree';
      entry.tree = null;
    }
    
    return fetch('gettag', entry, options);
  } else if (entry.branch) {
    if (entry.branch == '?') {
      return fetch('getbranches', entry, options);
    }
    
    if (entry.tree == '?') {
      options.request = 'tree';
      entry.tree = null;
    }
    
    return fetch('getbranch', entry, options);
  } else {
    noIndex.$q.reject(null);
  }
};

noIndex.prototype.log = function(noFile, options) {
  var self = this;
  var entry = noIndex.File.parse(noFile);
  
  if (!noIndex.util.isObject(options)) {
    options = {};
  }
  
  function fetch(callback, req, opt) {
    if (req && self.services[req.service]) {
      var service = self.services[req.service];
      
      if (noIndex.util.isFunction(service[callback])) {
        return service[callback](service, self.driver, req, opt);
      }
      
      return noIndex.$q.reject('Unknown method');
    }
    
    return noIndex.$q.reject('Unknown Service');
  } 
  
  options.cache = options.cache ? options.cache : 'session';
  options.encoding = options.encoding ? options.encoding : 'utf8';
  
  if (entry.owner && entry.repository) {
    return fetch('getcommits', entry, options);
  } else {
    return noIndex.$q.reject('Invalid Request');
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