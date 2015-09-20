'use strict';

var noIndex = require('./noIndex.js');

function File(options) {
  var self = this;
	
  if (noIndex.util.isString(options)) {
    return File.parse(options);
  }
  
  if (!noIndex.util.isObject(options)) {
    options = {};
  }
  
  if (!(self instanceof File)) {
    return new File(options);
  }

	self.service = options.service;
	self.provider = options.provider;
	self.owner = options.owner;
	self.repository = options.repository;
	self.branch = options.branch;
	self.path = options.path;
	self.mode = options.mode;
	self.data = options.data;
	self.type = options.type;
	self.tree = options.tree;
  self.tag = options.tag;
  self.oid = options.oid;
  self.meta = options.meta;
}

File.isFile = function(arg) {
  return (arg instanceof File);
};

File.parse = function(src) {
  var options = {};
  
  if (File.isFile(src)) {
    return src;
  } else if (noIndex.util.isString(src) && src.length) {
    src = src.replace(/\/\/+/, '/');
	
    var p = (/^(.*?)\/(.*?)\/(.*?)\/(.*?)([\$|@|#|\/].*)|^(.*?)\/(.*?)\/(.*?)\/(.*)/i).exec(src);
    
    if (p) {
      if (p[5]) {
        var branch = (/\$(.*?)[\$|@|#|\/]|\$(.*)/i).exec(p[5]);
        var tag = (/#(.*?)[\$|@|#|\/]|#(.*)/i).exec(p[5]);
        var oid = (/@(.*?)[\$|@|#|\/]|@(.*)/i).exec(p[5]);
        var path = (/(\/.*?)[\$|@|#]|(\/.*)/i).exec(p[5]);
        
        options = {
          service: p[1],
          provider: p[2],
          owner: p[3],
          repository: p[4],
          branch: branch ? (branch[1] || branch[2]) : null,
          tag: tag ? (tag[1] || tag[2]) : null,
          oid: oid ? (oid[1] || oid[2]) : null,
          path: path ? (path[1] || path[2]) : null,
        };
      } else {
        options = {
          service: p[6],
          provider: p[7],
          owner: p[8],
          repository: p[9],
        };
      }
    } else {
      p = (/^(.*?)\/(.*?)\/(.*)/i).exec(src);
      
      if (p) {
        options = {
          service: p[1],
          provider: p[2],
          owner: p[3],
        };
      } else {
        p = (/^(.*?)\/(.*)|^(.*)/i).exec(src);
        
        if (p) {
          options = {
            service: p[1] ? p[1] : p[3] ? p[3] : null,
            provider: p[2] ? p[2] : null,
          };
        }
      }
    }
  } else if (noIndex.util.isObject(src)) {
    options = src;
  }
  
  return new File(options);
};

module.exports = File;
