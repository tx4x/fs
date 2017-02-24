rm -rf docs
typedoc --out ./docs/ src/**/*.ts
git add -A ./docs/*
gitc "doc update"
