# noIndex
noIndex is database for multiple users / repositories / backend. in-memory cache for git content.

## Why noIndex?

Reason:

```html
<a href="openInEditor('github:repositories:username:reponame=1f8ad68b023efdef5489fe37488c1a9693cf6eca')">BlobName</a>
```

```html
<ul>
  <li ng-repeat="repo in noIndex.get('github:repositories:username:?')">
    <span>repo.repository</span>
  </li>
</ul>
```

## Usage

```sh
$ npm install noindex --save
```

```js
var noIndex = require('noindex');

var cache = new noIndex();

cache.setDriver(noIndex.getDriver('memory')); // plain memory storage or
cache.setDriver(noIndex.getDriver('redis')); // using redis for storage. session / offline

cache.setService(noIndex.getService('github', {
  token: GITHUB_OAUTH_TOKEN, // OR
  username: GITHUB_USERNAME,
  password: GITHUB_PASSWORD,
}));
```

## Syntax

```js
cache.get('service');
cache.get('service:provider');
cache.get('service:provider:username');
cache.get('service:provider:username:repository');
cache.get('service:provider:username:repository:branchName');
cache.get('service:provider:username:repository#tagName');
cache.get('service:provider:username:repository@commit_sha');
cache.get('service:provider:username:repository=blob_sha');
cache.get('service:provider:username:repository/by/path');

cache.get('service:provider:username:repository:master/README.md');
```

#### list services

```js
cache.get(''); // or
cache.get('?');
```

#### list service providers

```js
cache.get('github') // or
cache.get('github:?')
```

#### list users

```js
cache.get('github:repositories') // or
cache.get('github:repositories:?')
```

#### list repositories

```js
cache.get('github:repositories:username') // or
cache.get('github:repositories:username:?')
```

#### git branch -r

list repository branches

```js
cache.get('github:repositories:username:reponame')	// or
cache.get('github:repositories:username:reponame:?')
```

#### git log -n 1

get latest commit by branch

```js
cache.get('github:repositories:username:reponame:master')
```

#### git log -n 1 f7e24dc3bf04e2278bd780abb8ad28867bdbc16d

get commit by sha

```js
cache.get('github:repositories:username:reponame@f7e24dc3bf04e2278bd780abb8ad28867bdbc16d')
```

#### git ls-tree HEAD

get tree by branch

```js
cache.get('github:repositories:username:reponame:master$?')
```

#### git ls-tree ac49c253adf03ed87af773ef5bba525dfe179ebe 

get tree by sha

```js
cache.get('github:repositories:username:reponame$ac49c253adf03ed87af773ef5bba525dfe179ebe')
```

#### git cat-file blob 1f8ad68b023efdef5489fe37488c1a9693cf6eca 

get blob by sha

```js
cache.get('github:repositories:username:reponame=1f8ad68b023efdef5489fe37488c1a9693cf6eca')
```

#### git show HEAD:README.md

get blob by path

```js
cache.get('github:repositories:username:reponame/README.md')
```

#### git tag

list repository tags

```js
cache.get('github:repositories:username:reponame#?')
```

#### git log v1.0.2 -n 1

get commit / tag by tagname

```js
cache.get('github:repositories:username:reponame#v1.0.2')
```
