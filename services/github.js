'use strict';

var noIndex = require('../lib/noIndex.js');

var config = {
  getproviders: function(service, entry, options) {
    return noIndex.$q(function(resolve, reject) {
      resolve([
        new noIndex.File({
          service: entry.service,
          provider: 'gists',
        }),
        new noIndex.File({
          service: entry.service,
          provider: 'repositories',
        }),
      ]);
    });
  },
  getusers: function(service, entry, options) {
    return noIndex.$q(function(resolve, reject) {
      noIndex.$http.get(service.api + '/user', service.config).then(function(reply) {
        if (reply.data && reply.data.login) {
          service.loginName = reply.data.login;
          resolve([new noIndex.File({
            service: entry.service,
            provider: entry.provider,
            owner: reply.data.login,
          })]);
        } else {
          reject('Invalid reply');
        }
      }).catch(function(error) {
        reject(error);
      });
    });
  },  
  getref: function(service, entry, options) {
    return noIndex.$q(function(resolve, reject) {
      var uri = service.api + '/repos/' + entry.owner + '/' + entry.repository;
      
      if (entry.tag) {
        uri += '/git/refs/tags/' + entry.tag;
      } else if (entry.branch) {
        if (entry.branch == 'HEAD') {
          // TODO(): Get HEAD!? -> Typo in API?
          entry.branch = 'master';
        }
        
        uri += '/git/refs/heads/' + entry.branch;
      }
      
      if (entry.tag || (entry.branch && entry.branch !== 'HEAD')) {
        noIndex.$http.get(uri, service.config).then(function(reply) {
          resolve(new noIndex.File({
            service: entry.service,
            provider: entry.provider,
            owner: entry.owner,
            repository: entry.repository,
            oid: reply.data.object.sha,
            commit: (reply.data.object.type == 'commit') ? reply.data.object.sha : null,
          }));
        }).catch(function(error) {
          reject(error);
        });
      } else {
        reject('Invalid reference');
      }
    });
  },
  getcommit: function(service, entry, options) {
    return noIndex.$q(function(resolve, reject) {
      var uri = service.api + '/repos/' + entry.owner + '/' + entry.repository + '/git/commits/' + entry.commit || entry.oid;
      
      noIndex.$http.get(uri, service.config).then(function(reply) {
        var commit = new noIndex.File({
          service: entry.service,
          provider: entry.provider,
          owner: entry.owner,
          repository: entry.repository,
          author: reply.data.author,
          committer: reply.data.committer,
          message: reply.data.message,
          commit: reply.data.sha,
          tree: reply.data.tree.sha,
        });
        
        if (options.request == 'tree') {
          service.gettree(service, commit, options).then(function(tree) {
            resolve(tree);
          }).catch(function(error) {
            reject(error);
          });
        } else {
          resolve(commit);
        }
      }).catch(function(error) {
        reject(error);
      });
    });
  },
  gettree: function(service, entry, options) {
    return noIndex.$q(function(resolve, reject) {
      options.request = 'tree';
      
      if (!entry.tree) {
        if (entry.tag) {
          return service.gettag(service, entry, options).then(function(tree) {
            resolve(tree);
          }).catch(function(error) {
            reject(error);
          });
        }
        
        if (entry.branch) {
          return service.getbranch(service, entry, options).then(function(tree) {
            resolve(tree);
          }).catch(function(error) {
            reject(error);
          });
        }
        
        if (entry.blob) {
          return service.getblob(service, entry, options).then(function(blob) {
            resolve(blob);
          }).catch(function(error) {
            reject(error);
          });
        }
        
        reject('Invalid tree request');
      } else {
        var uri = service.api + '/repos/' + entry.owner + '/' + entry.repository + '/git/trees/' + entry.tree || entry.oid;
        
        noIndex.$http.get(uri, service.config).then(function(reply) {         
          if (reply.data.truncated) {
            reject('Local Clone Required!');
          } else {
            var tree = reply.data.tree;
            var res = [];
            
            tree.forEach(function(data) {
              res.push(new noIndex.File({
                service: entry.service,
                provider: entry.provider,
                owner: entry.owner,
                repository: entry.repository,
                branch: entry.branch,
                blob: (data.type == 'blob') ? data.sha : null,
                tree: (data.type == 'tree') ? data.sha : null,
                mode: data.mode,
                fullpath: data.path,
              }));
            });
            
            resolve(res);
          }
        }).catch(function(error) {
          reject(error);
        });
      }
    });
  },
  getblob: function(service, entry, options) {
    return noIndex.$q(function(resolve, reject) {
      var uri = service.api + '/repos/' + entry.owner + '/' + entry.repository + '/git/blobs/' + entry.blob || entry.oid;
      
      var config = {
        headers: {
          'Host': service.config.headers['Host'],
          'Authorization': service.config.headers['Authorization'],
          'User-Agent': service.config.headers['User-Agent'],
        },
        responseType: 'json',
      };
      
      switch (options.encoding) {
        case 'diff':
          config.headers['Accept'] = 'application/vnd.github.v3.diff+json';
          break;
        case 'patch':
          config.headers['Accept'] = 'application/vnd.github.v3.patch+json';
          break;
        case 'base64':
          config.headers['Accept'] = 'application/vnd.github.v3.base64+json';
          break;
        default:
          config.headers['Accept'] = 'application/vnd.github.v3.raw+json';
          break;
      }
      
      noIndex.$http.get(uri, config).then(function(reply) {
        resolve(new noIndex.File({
          service: entry.service,
          provider: entry.provider,
          owner: entry.owner,
          repository: entry.repository,
          branch: entry.branch,
          blob: reply.data.sha,
          data: reply.data.content,
          encoding: reply.data.encoding,
        }));
      }).catch(function(error) {
        reject(error);
      });
    });
  },
  gettag: function(service, entry, options) {
    return noIndex.$q(function(resolve, reject) {
      service.getref(service, entry, options).then(function(ref) {
        var uri = service.api + '/repos/' + entry.owner + '/' + entry.repository + '/git/tags/' + ref.oid;
        
        noIndex.$http.get(uri, service.config).then(function(reply) {
          ref.tag = entry.tag;
          ref.commit = reply.data.object.sha;
          ref.tagger = reply.data.tagger;
          
          if (options.request == 'commit' || options.request == 'tree') {
            service.getcommit(service, ref, options).then(function(commit) {
              resolve(commit);
            }).catch(function(error) {
              reject(error);
            });
          } else {
            resolve(ref);
          }
        }).catch(function(error) {
          reject(error);
        });
      }).catch(function(error) {
        reject(error);
      });
    });
  },
  gettags: function(service, entry, options) {        
    return noIndex.$q(function(resolve, reject) {
      var uri = service.api + '/repos/' + entry.owner + '/' + entry.repository + '/tags';
      
      noIndex.$http.get(uri, service.config).then(function(reply) {
        var res = [];
        
        reply.data.forEach(function(tag) {          
          res.push(new noIndex.File({
            service: entry.service,
            provider: entry.provider,
            owner: entry.owner,
            repository: entry.repository,
            tag: tag.name,
            commit: tag.commit.sha,
          }));
        });
        
        resolve(res);
      }).catch(function(error) {
        reject(error);
      });
    });
  },
  getbranch: function(service, entry, options) {
    return noIndex.$q(function(resolve, reject) {
      if (entry.branch === 'HEAD') {
        // TODO(): Get HEAD!? -> Typo in API?
        entry.branch = 'master';
      }
      
      var uri = service.api + '/repos/' + entry.owner + '/' + entry.repository + '/branches/' + entry.branch;
      
      noIndex.$http.get(uri, service.config).then(function(reply) {
        var commit = new noIndex.File({
          service: entry.service,
          provider: entry.provider,
          owner: entry.owner,
          repository: entry.repository,
          branch: reply.data.name,
          commit: reply.data.commit.sha,
          author: reply.data.commit.commit.author,
          committer: reply.data.commit.commit.committer,
          message: reply.data.commit.commit.message,
          tree: reply.data.commit.commit.tree.sha,
        });
        
        if (options.request == 'tree') {
          service.gettree(service, commit, options).then(function(tree) {
            resolve(tree);
          }).catch(function(error) {
            reject(error);
          });
        } else {
          resolve(commit);
        }
      }).catch(function(error) {
        reject(error);
      });
    });
  },
  getbranches: function(service, entry, options) {
    return noIndex.$q(function(resolve, reject) {
      var uri = service.api + '/repos/' + entry.owner + '/' + entry.repository + '/branches';
      
      noIndex.$http.get(uri, service.config).then(function(reply) {
        var res = [];
        
        reply.data.forEach(function(repo) {
          res.push(new noIndex.File({
            service: entry.service,
            provider: entry.provider,
            owner: entry.owner,
            repository: entry.repository,
            branch: repo.name,
            commit: repo.commit.sha,
          }));
        });
        
        resolve(res);
      }).catch(function(error) {
        reject(error);
      });
    });
  },
  getrepositories: function(service, entry, options) {
    return noIndex.$q(function(resolve, reject) {
      var uri = service.api + ((entry.owner == service.loginName) ? '/user/repos' : ('/users/' + entry.owner + '/repos'));
      
      noIndex.$http.get(uri, service.config).then(function(reply) {
        if (noIndex.util.isArray(reply.data)) {
          var res = [];
          
          reply.data.forEach(function(repo) {
            res.push(new noIndex.File({
              service: entry.service,
              provider: entry.provider,
              owner: entry.owner,
              repository: repo.name,
            }));
          });
          
          resolve(res);
        } else {
          reject('Invalid reply');
        }
      }).catch(function(error) {
        reject(error);
      });
    });
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
  
  if (!noIndex.util.isObject(options)) {
    options = {};
  }
  
  service.api = noIndex.util.isString(options.api) ? service.api : 'https://api.github.com';
  service.headers = noIndex.util.isObject(service.headers) ? service.headers : {}; 
  
  service.headers['User-Agent'] = 'noindex/1.0';
  service.headers['Host'] = 'api.github.com';
  
  if (!service.headers['Accept']) {
    service.headers['Accept'] = 'application/vnd.github.v3+json';
  }
  
  if (noIndex.util.isString(options.token)) {
    service.headers['Authorization'] = 'token ' + options.token;
  } else if (noIndex.util.isString(options.username) && noIndex.util.isString(options.password)) {
    service.headers['Authorization'] = 'Basic ' + noIndex.btoa(options.username + ':' + options.password);
  }
  
  service.config = {
    responseType: 'json',
    headers: service.headers,
  };
  
  noIndex.$http.get(service.api + '/user', service.config).then(function(reply) {
    if (reply.data && reply.data.login) {
      service.loginName = reply.data.login;
    }
  });
  
  return service;
};