nvm use 14
rm -rf dist
rm -rf node_modules
yarn install
npm run patch
yarn build
cp package.json dist/package.json
cd dist
npm publish
