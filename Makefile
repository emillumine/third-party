install: npm-install

.PHONY: npm-install
npm-install:
	npm install

.PHONY: lint-js
lint-js: npm-install ## Lint the javascript codebase
	npm run lint
