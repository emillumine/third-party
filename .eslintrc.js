module.exports = {
    "env": {
        "browser": true,
        "es2021": true
    },
    "extends": "eslint:recommended",
    "parserOptions": {
        "ecmaVersion": 12
    },
    "ignorePatterns": [
        "jquery*.js",
        "*.min.js",
        "**/vendor/**/*.js",
        "**/bootstrap/**/*.js",
        "**/datatables/**/*.js",
        "**/fontawesome/**/*.js",
        "**/jstree/**/*.js",
        "urlify.js",
        "download.js",
        "fp.js",
        "pouchdb.min*.js",
        "browser-polyfill.js",
        "fullcalendar.js",
        "locale-all.js"
    ],
    "rules": {
        "accessor-pairs": "error",
        "array-bracket-newline": "warn",
        "array-bracket-spacing": "warn",
        "array-callback-return": "warn",
        "array-element-newline": "warn",
        "arrow-body-style": "off",
        "arrow-parens": "off",
        "arrow-spacing": [
            "error",
            {
                "after": true,
                "before": true
            }
        ],
        "block-scoped-var": "off",
        "block-spacing": "warn",
        "brace-style": "warn",
        "callback-return": "off",
        "camelcase": "off",
        "capitalized-comments": "off",
        "class-methods-use-this": "error",
        "comma-dangle": "warn",
        "comma-spacing": "warn",
        "comma-style": "warn",
        "complexity": "off",
        "computed-property-spacing": "off",
        "consistent-return": "warn",
        "consistent-this": "warn",
        "curly": "off",
        "default-case": "warn",
        "default-case-last": "warn",
        "default-param-last": "error",
        "dot-location": "off",
        "dot-notation": "off",
        "eol-last": "off",
        "eqeqeq": "off",
        "func-call-spacing": "warn",
        "func-name-matching": "warn",
        "func-names": "off",
        "func-style": "off",
        "function-call-argument-newline": "off",
        "function-paren-newline": "warn",
        "generator-star-spacing": "error",
        "global-require": "off",
        "grouped-accessor-pairs": "error",
        "guard-for-in": "off",
        "handle-callback-err": "off",
        "id-blacklist": "error",
        "id-denylist": "error",
        "id-length": "off",
        "id-match": "error",
        "implicit-arrow-linebreak": [
            "error",
            "beside"
        ],
        "indent": "warn",
        "indent-legacy": "off",
        "init-declarations": "warn",
        "jsx-quotes": "error",
        "key-spacing": "off",
        "keyword-spacing": "warn",
        "line-comment-position": "off",
        "linebreak-style": "warn",
        "lines-around-comment": "off",
        "lines-around-directive": "off",
        "lines-between-class-members": [
            "error",
            "always"
        ],
        "max-classes-per-file": "error",
        "max-depth": "off",
        "max-len": "off",
        "max-lines": "off",
        "max-lines-per-function": "off",
        "max-nested-callbacks": "error",
        "max-params": "off",
        "max-statements": "off",
        "max-statements-per-line": "off",
        "multiline-comment-style": "off",
        "multiline-ternary": "off",
        "new-parens": "off",
        "newline-after-var": "warn",
        "newline-before-return": "warn",
        "newline-per-chained-call": "warn",
        "no-alert": "off",
        "no-array-constructor": "error",
        "no-await-in-loop": "error",
        "no-bitwise": "off",
        "no-buffer-constructor": "error",
        "no-caller": "error",
        "no-catch-shadow": "off",
        "no-confusing-arrow": "off",
        "no-console": "off",
        "no-constructor-return": "error",
        "no-continue": "off",
        "no-div-regex": "error",
        "no-duplicate-imports": "error",
        "no-else-return": "off",
        "no-empty-function": "off",
        "no-eq-null": "off",
        "no-eval": "off",
        "no-extend-native": "off",
        "no-extra-bind": "error",
        "no-extra-label": "error",
        "no-extra-parens": "off",
        "no-floating-decimal": "off",
        "no-implicit-coercion": [
            "error",
            {
                "boolean": false,
                "number": false,
                "string": false
            }
        ],
        "no-implicit-globals": "off",
        "no-implied-eval": "error",
        "no-inline-comments": "off",
        "no-invalid-this": "off",
        "no-iterator": "error",
        "no-label-var": "off",
        "no-labels": "off",
        "no-lone-blocks": "off",
        "no-lonely-if": "off",
        "no-loop-func": "off",
        "no-loss-of-precision": "error",
        "no-magic-numbers": "off",
        "no-mixed-operators": "off",
        "no-mixed-requires": "error",
        "no-multi-assign": "off",
        "no-multi-spaces": "warn",
        "no-multi-str": "error",
        "no-multiple-empty-lines": "off",
        "no-native-reassign": "off",
        "no-negated-condition": "off",
        "no-negated-in-lhs": "error",
        "no-nested-ternary": "off",
        "no-new": "off",
        "no-new-func": "off",
        "no-new-object": "error",
        "no-new-require": "error",
        "no-new-wrappers": "off",
        "no-nonoctal-decimal-escape": "error",
        "no-octal-escape": "error",
        "no-param-reassign": "off",
        "no-path-concat": "error",
        "no-plusplus": "off",
        "no-process-env": "off",
        "no-process-exit": "error",
        "no-promise-executor-return": "error",
        "no-proto": "off",
        "no-restricted-exports": "error",
        "no-restricted-globals": "error",
        "no-restricted-imports": "error",
        "no-restricted-modules": "error",
        "no-restricted-properties": "error",
        "no-restricted-syntax": "error",
        "no-return-assign": "off",
        "no-return-await": "error",
        "no-script-url": "error",
        "no-self-assign": [
            "error",
            {
                "props": false
            }
        ],
        "no-self-compare": "off",
        "no-sequences": "off",
        "no-shadow": "off",
        "no-spaced-func": "off",
        "no-sync": "error",
        "no-tabs": "off",
        "no-template-curly-in-string": "error",
        "no-ternary": "off",
        "no-throw-literal": "off",
        "no-trailing-spaces": "warn",
        "no-undef-init": "error",
        "no-undef": "off",
        "no-undefined": "off",
        "no-underscore-dangle": "off",
        "no-unmodified-loop-condition": "off",
        "no-unneeded-ternary": "off",
        "no-unreachable-loop": "off",
        "no-unsafe-optional-chaining": "error",
        "no-unused-expressions": "off",
        "no-unused-vars": "warn",
        "no-use-before-define": "off",
        "no-useless-backreference": "error",
        "no-useless-call": "off",
        "no-useless-computed-key": "error",
        "no-useless-concat": "off",
        "no-useless-constructor": "error",
        "no-useless-rename": "error",
        "no-useless-return": "off",
        "no-var": "off",
        "no-void": "off",
        "no-warning-comments": "off",
        "no-whitespace-before-property": "off",
        "nonblock-statement-body-position": [
            "error",
            "any"
        ],
        "object-curly-newline": "off",
        "object-curly-spacing": "off",
        "object-property-newline": "off",
        "object-shorthand": "off",
        "one-var": "off",
        "one-var-declaration-per-line": "off",
        "operator-assignment": "off",
        "operator-linebreak": "off",
        "padded-blocks": "off",
        "padding-line-between-statements": "error",
        "prefer-arrow-callback": "off",
        "prefer-const": "off",
        "prefer-destructuring": "off",
        "prefer-exponentiation-operator": "off",
        "prefer-named-capture-group": "off",
        "prefer-numeric-literals": "error",
        "prefer-object-spread": "off",
        "prefer-promise-reject-errors": "error",
        "prefer-reflect": "off",
        "prefer-regex-literals": "off",
        "prefer-rest-params": "off",
        "prefer-spread": "off",
        "prefer-template": "off",
        "quote-props": "off",
        "quotes": "off",
        "radix": "off",
        "require-atomic-updates": "off",
        "require-await": "error",
        "require-jsdoc": "off",
        "require-unicode-regexp": "off",
        "rest-spread-spacing": [
            "error",
            "never"
        ],
        "semi": "warn",
        "semi-spacing": "warn",
        "semi-style": "warn",
        "sort-imports": "error",
        "sort-keys": "off",
        "sort-vars": "off",
        "space-before-blocks": "warn",
        "space-before-function-paren": "off",
        "space-in-parens": "warn",
        "space-infix-ops": "off",
        "space-unary-ops": "off",
        "spaced-comment": "off",
        "strict": "off",
        "switch-colon-spacing": "off",
        "symbol-description": "error",
        "template-curly-spacing": [
            "error",
            "never"
        ],
        "template-tag-spacing": "error",
        "unicode-bom": "off",
        "valid-jsdoc": "off",
        "valid-typeof": [
            "error",
            {
                "requireStringLiterals": false
            }
        ],
        "vars-on-top": "off",
        "wrap-iife": "off",
        "wrap-regex": "off",
        "yield-star-spacing": "error",
        "yoda": "off"
    }
};
