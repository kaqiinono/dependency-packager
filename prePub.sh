rm -rf dist
npm run build
npm run patch
cp package.json ./dist
cp README.md ./dist
cd dist
npm publish

