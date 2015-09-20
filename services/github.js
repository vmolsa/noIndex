'use strict';

var noIndex = require('../lib/noIndex.js');

var config = {
  getproviders: function(resolve, reject, index, service, driver, entry, options) {
    resolve(['repositories', 'gists']);
  },
  getref: function(resolve, reject, index, service, driver, entry, options) {
    reject('Not implemented yet');
  },
  getoid: function(resolve, reject, index, service, driver, entry, options) {
    reject('Not implemented yet');
  },
  gettree: function(resolve, reject, index, service, driver, entry, options) {
    reject('Not implemented yet');
  },
  getblob: function(resolve, reject, index, service, driver, entry, options) {
    reject('Not implemented yet');
  },
  gettag: function(resolve, reject, index, service, driver, entry, options) {
    reject('Not implemented yet');
  },
  getusers: function(resolve, reject, index, service, driver, entry, options) {
    reject('Not implemented yet');
  },
  getbranches: function(resolve, reject, index, service, driver, entry, options) {
    reject('Not implemented yet');
  },
  getrepositories: function(resolve, reject, index, service, driver, entry, options) {
    reject('Not implemented yet');
  },
  setblob: function(resolve, reject, index, service, driver, entry, data, message, mode, options) {
    reject('Not implemented yet');
  },
  rmtree: function(resolve, reject, index, service, driver, entry, message, options) {
    reject('Not implemented yet');
  },
  rmblob: function(resolve, reject, index, service, driver, entry, message, options) {
    reject('Not implemented yet');
  },
  rmpath: function(resolve, reject, index, service, driver, entry, message, options) {
    reject('Not implemented yet');
  },
  rmbranch: function(resolve, reject, index, service, driver, entry, message, options) {
    reject('Not implemented yet');
  },
  rmtag: function(resolve, reject, index, service, driver, entry, message, options) {
    reject('Not implemented yet');
  },
  rmrepository: function(resolve, reject, index, service, driver, entry, message, options) {
    reject('Not implemented yet');
  },
};

module.exports = function(options) {
  var service = new noIndex.Service(config);
  
  if (noIndex.util.isObject(options)) {
    service.options = options;
  } else {
    service.options = {
      token: null,
      user: null,
      password: null,
    };
  }

  return service;
};