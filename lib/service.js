'use strict';

var noIndex = require('./noIndex.js');

function Service(options) {
  var self = this;
  
  if (!(self instanceof Service)) {
    return new Service(options);
  }
  
  if (!noIndex.util.isObject(options)) {
    options = {};
  }
  
  self.getproviders = options.getproviders;
  self.getref = options.getref;
  self.getpath = options.getpath;
  self.getoid = options.getoid;
  self.gettree = options.gettree;
  self.getblob = options.getblob;
  self.gettag = options.gettag;
  self.getusers = options.getusers;
  self.getbranches = options.getbranches;
  self.getrepositories = options.getrepositories;
  
  self.setblob = options.setblob;
  
  self.rmpath = options.rmpath;
  self.rmblob = options.rmblob;
  self.rmtree = options.rmtree;
  self.rmbranch = options.rmbranch;
  self.rmtag = options.rmtag;
  self.rmrepository = options.rmrepository;
}

Service.isService = function(arg) {
  return (arg instanceof Service);
};

module.exports = Service;