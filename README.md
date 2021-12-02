# Sandpack Packager

> A packager used to aggregate all relevant files from a combination of npm dependencies

## Installing

```
npm install codesandbox-dependency-packager --save
yarn add codesandbox-dependency-packager --save
```

## How To Use
```
const { call } = require('codesandbox-dependency-packager/packager');

call({
  name: "@jd/jmtd-pro",
  version: "1.27.0",
  css: "dist/themes/datamill.css",
  nodePath: null,
}, {} as any, (err, result) => {
  console.log(err);
  console.log('====>', result.version);
  console.log('====>', result.source);
});


```
