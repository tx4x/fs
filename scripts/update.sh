npm run build
npm run test
sh scripts/docs.sh
node scripts/gen_typings.js
git push --mirror https://github.com/xblox/fs-jetpack.git
gitc $1
