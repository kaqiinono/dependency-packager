# Sandpack Packager

> A packager used to aggregate all relevant files from a combination of npm dependencies

## Installing

```
npm install codesandbox-dependency-packager-api --save
yarn add codesandbox-dependency-packager-api --save
```

## How To Use
```
const { call } = require('codesandbox-dependency-packager-api/packager');

call(dep, ctx, (err, result) => {
    console.log(err);

    if (result.error) {
        res.status(422).json(result);
    } else {
        cacheDependency(dep, result);
        res.json(readJsonFile(cache));
    }
});
```