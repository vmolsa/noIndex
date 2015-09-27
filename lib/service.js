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
  self.getusers = options.getusers;
  self.getref = options.getref;
  self.gettree = options.gettree;
  self.getblob = options.getblob;
  self.gettag = options.gettag;
  self.gettags = options.gettags;
  self.getcommit = options.getcommit;
  self.getcommits = options.getcommits;
  self.getbranch = options.getbranch;
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