'use strict';

var noIndex = require('../lib/noIndex.js');

var config = {
  getproviders: function(service, driver, entry, options) {
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
  getusers: function(service, driver, entry, options) {
    return noIndex.$q(function(resolve, reject) {
      var meta = [
        entry.service,
        entry.provider,
      ].join('/');
     
      driver.get(meta, options).then(function(data) {
        resolve(data);
      }).catch(function() {
        noIndex.$http.get(service.api + '/user', service.config).then(function(reply) {
          if (reply.data && reply.data.login) {
            service.loginName = reply.data.login;
            
            var users = [
              new noIndex.File({
                service: entry.service,
                provider: entry.provider,
                owner: reply.data.login,
              }),
            ];
            
            driver.set(meta, users, options).finally(function() {
              resolve(users);
            });
          } else {
            reject('Invalid reply');
          }
        }).catch(function(error) {
          reject(error);
        });
      });
    });
  },
  getref: function(service, driver, entry, options) {
    return noIndex.$q(function(resolve, reject) {    
      var uri = service.api + '/repos/' + entry.owner + '/' + entry.repository;
      var meta = [
        entry.service,
        entry.provider,
        entry.owner,
        'repository',
        entry.repository,
        'ref'
      ];
      
      if (entry.tag) {
        uri += '/git/refs/tags/' + entry.tag;
        
        meta.push('tag');
        meta.push(entry.tag);
      } else if (entry.branch) {
        if (entry.branch == 'HEAD') {
          // TODO(): Get HEAD!? -> Typo in API?
          entry.branch = 'master';
        }
        
        uri += '/git/refs/heads/' + entry.branch;
        
        meta.push('branch');
        meta.push(entry.branch);
      }

      var key = meta.join('/');
     
      if (entry.tag || (entry.branch && entry.branch)) {
        driver.get(key, options).then(function(data) {
          resolve(data);
        }).catch(function() {
          noIndex.$http.get(uri, service.config).then(function(reply) {
            var ref = new noIndex.File({
              service: entry.service,
              provider: entry.provider,
              owner: entry.owner,
              repository: entry.repository,
              oid: reply.data.object.sha,
              commit: (reply.data.object.type == 'commit') ? reply.data.object.sha : null,
            });
            
            driver.set(key, ref, options).finally(function() {
              resolve(ref);
            });
          }).catch(function(error) {
            reject(error);
          });
        });
      } else {
        reject('Invalid reference');
      }
    });
  },
  getcommit: function(service, driver, entry, options) {
    return noIndex.$q(function(resolve, reject) {
      var uri = service.api + '/repos/' + entry.owner + '/' + entry.repository + '/git/commits/' + entry.commit || entry.oid;
      var meta = [
        entry.service,
        entry.provider,
        entry.owner,
        'repository',
        entry.repository,
        'commit',
        entry.commit || entry.oid,
      ].join('/');
      
      driver.get(meta, options).then(function(data) {
        if (options.request == 'tree') {
          service.gettree(service, driver, data, options).then(function(tree) {
            resolve(tree);
          }).catch(function(error) {
            reject(error);
          });
        } else {
          resolve(data);
        }
      }).catch(function() {
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
          
          driver.set(meta, commit, options).finally(function() {
            if (options.request == 'tree') {
              service.gettree(service, driver, commit, options).then(function(tree) {
                resolve(tree);
              }).catch(function(error) {
                reject(error);
              });
            } else {
              resolve(commit);
            }
          });
        }).catch(function(error) {
          reject(error);
        });
      });
    });
  },
  getcommits: function(service, driver, entry, options) {
    return noIndex.$q(function(resolve, reject) {
      
    });
  },
  gettree: function(service, driver, entry, options) {
    return noIndex.$q(function(resolve, reject) {
      options.request = 'tree';
      
      if (!entry.tree) {
        if (entry.commit) {
          return service.getcommit(service, driver, entry, options).then(function(tree) {
            resolve(tree);
          }).catch(function(error) {
            reject(error);
          });
        }
        
        if (entry.tag) {
          return service.gettag(service, driver, entry, options).then(function(tree) {
            resolve(tree);
          }).catch(function(error) {
            reject(error);
          });
        }
        
        if (entry.branch) {
          return service.getbranch(service, driver, entry, options).then(function(tree) {
            resolve(tree);
          }).catch(function(error) {
            reject(error);
          });
        }
        
        if (entry.blob) {
          return service.getblob(service, driver, entry, options).then(function(blob) {
            resolve(blob);
          }).catch(function(error) {
            reject(error);
          });
        }
        
        reject('Invalid tree request');
      } else {
        var uri = service.api + '/repos/' + entry.owner + '/' + entry.repository + '/git/trees/' + entry.tree || entry.oid;
        var meta = [
          entry.service,
          entry.provider,
          entry.owner,
          'repository',
          entry.repository,
          'tree',
          entry.tree || entry.oid,
        ].join('/');
        
        driver.get(meta, options).then(function(data) {
          resolve(data);
        }).catch(function() {
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
                  path: data.path,
                }));
              });
              
              driver.set(meta, res, options).finally(function() {
                resolve(res);
              });
            }
          }).catch(function(error) {
            reject(error);
          });
        });
      }
    });
  },
  getblob: function(service, driver, entry, options) {
    return noIndex.$q(function(resolve, reject) {
      var uri = service.api + '/repos/' + entry.owner + '/' + entry.repository + '/git/blobs/' + entry.blob || entry.oid;
      var meta = [
        entry.service,
        entry.provider,
        entry.owner,
        'repository',
        entry.repository,
        'blob',
        entry.blob || entry.oid,
      ].join('/');

      var config = {
        headers: {
          'Host': service.config.headers['Host'],
          'Authorization': service.config.headers['Authorization'],
          'User-Agent': service.config.headers['User-Agent'],
          'Accept': service.config.headers['Accept'],
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
          config.headers['Accept'] = 'application/vnd.github.v3+json';
          break;
      }
      
      driver.get(meta, options).then(function(data) {
        resolve(data);
      }).catch(function() {
        noIndex.$http.get(uri, config).then(function(reply) {
          var blob = new noIndex.File({
            service: entry.service,
            provider: entry.provider,
            owner: entry.owner,
            repository: entry.repository,
            branch: entry.branch,
            blob: reply.data.sha,
            data: reply.data.content,
            encoding: reply.data.encoding,
          });
          
          driver.set(meta, blob, options).finally(function() {
            resolve(blob);
          });
        }).catch(function(error) {
          reject(error);
        });
      });
    });
  },
  gettag: function(service, driver, entry, options) {
    return noIndex.$q(function(resolve, reject) {
      service.getref(service, driver, entry, options).then(function(ref) {
        var uri = service.api + '/repos/' + entry.owner + '/' + entry.repository + '/git/tags/' + ref.oid;
        var meta = [
          entry.service,
          entry.provider,
          entry.owner,
          'repository',
          entry.repository,
          'tag',
          ref.oid,
        ].join('/');
      
        driver.get(meta, options).then(function(data) {
          if (options.request == 'commit' || options.request == 'tree') {
            service.getcommit(service, driver, data, options).then(function(commit) {
              resolve(commit);
            }).catch(function(error) {
              reject(error);
            });
          } else {
            resolve(data);
          }
        }).catch(function() {
          noIndex.$http.get(uri, service.config).then(function(reply) {
            ref.tag = entry.tag;
            ref.commit = reply.data.object.sha;
            ref.tagger = reply.data.tagger;
            
            driver.set(meta, ref, options).finally(function() {
              if (options.request == 'commit' || options.request == 'tree') {
                service.getcommit(service, driver, ref, options).then(function(commit) {
                  resolve(commit);
                }).catch(function(error) {
                  reject(error);
                });
              } else {
                resolve(ref);
              }
            });
          }).catch(function(error) {
            reject(error);
          });
        });
      }).catch(function(error) {
        reject(error);
      });
    });
  },
  gettags: function(service, driver, entry, options) {        
    return noIndex.$q(function(resolve, reject) {
      var uri = service.api + '/repos/' + entry.owner + '/' + entry.repository + '/tags';
      var meta = [
        entry.service,
        entry.provider,
        entry.owner,
        'repository',
        entry.repository,
        'tags',
      ].join('/');
      
      driver.get(meta, options).then(function(data) {
        resolve(data);
      }).catch(function() {
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
          
          driver.set(meta, res, options).finally(function() {          
            resolve(res);
          });
        }).catch(function(error) {
          reject(error);
        });
      });
    });
  },
  getbranch: function(service, driver, entry, options) {
    return noIndex.$q(function(resolve, reject) {
      if (entry.branch === 'HEAD') {
        // TODO(): Get HEAD!? -> Typo in API?
        entry.branch = 'master';
      }
      
      var uri = service.api + '/repos/' + entry.owner + '/' + entry.repository + '/branches/' + entry.branch;
      var meta = [
        entry.service,
        entry.provider,
        entry.owner,
        'repository',
        entry.repository,
        'branch',
        entry.branch,
      ].join('/');
      
      driver.get(meta, options).then(function(data) {
        if (options.request == 'tree') {
          service.gettree(service, driver, data, options).then(function(tree) {
            resolve(tree);
          }).catch(function(error) {
            reject(error);
          });
        } else {
          resolve(data);
        }
      }).catch(function() {
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
          
          driver.set(meta, commit, options).finally(function() { 
            if (options.request == 'tree') {
              service.gettree(service, driver, commit, options).then(function(tree) {
                resolve(tree);
              }).catch(function(error) {
                reject(error);
              });
            } else {
              resolve(commit);
            }
          });
        }).catch(function(error) {
          reject(error);
        });
      });
    });
  },
  getbranches: function(service, driver, entry, options) {
    return noIndex.$q(function(resolve, reject) {
      var uri = service.api + '/repos/' + entry.owner + '/' + entry.repository + '/branches';
      var meta = [
        entry.service,
        entry.provider,
        entry.owner,
        'repository',
        entry.repository,
        'branches',
      ].join('/');
      
      driver.get(meta, options).then(function(data) {
        resolve(data);
      }).catch(function() {
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
          
          driver.set(meta, res, options).finally(function() { 
            resolve(res);
          });
        }).catch(function(error) {
          reject(error);
        });
      });
    });
  },
  getrepositories: function(service, driver, entry, options) {
    return noIndex.$q(function(resolve, reject) {
      var uri = service.api + ((entry.owner == service.loginName) ? '/user/repos' : ('/users/' + entry.owner + '/repos'));
      var meta = [
        entry.service,
        entry.provider,
        entry.owner,
        'repositories',
      ].join('/');
      
      driver.get(meta, options).then(function(data) {
        resolve(data);
      }).catch(function() {
        noIndex.$http.get(uri, service.config).then(function(reply) {
          var res = [];
          
          reply.data.forEach(function(repo) {
            res.push(new noIndex.File({
              service: entry.service,
              provider: entry.provider,
              owner: entry.owner,
              repository: repo.name,
            }));
          });
          
          driver.set(meta, res, options).finally(function() {
            resolve(res);
          });
        }).catch(function(error) {
          reject(error);
        });
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
  
  service.headers['User-Agent'] = 'noIndex/1.0';
  service.headers['Host'] = 'api.github.com';
  
  if (!service.headers['Accept']) {
    service.headers['Accept'] = 'application/vnd.github.v3.raw+json';
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