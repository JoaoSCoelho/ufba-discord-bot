module.exports = {
    'env': {
        'es2021': true,
        'node': true
    },
    'extends': [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'prettier'
    ],
    'overrides': [
        {
            'env': {
                'node': true
            },
            'files': [
                '.eslintrc.{js,cjs}',
            ],
            'parserOptions': {
                'sourceType': 'script'
            }
        },
        {
            'files': ['*.js'],
            'rules': {
                '@typescript-eslint/no-var-requires': 'off'
            }
        }
    ],
    'parser': '@typescript-eslint/parser',
    'parserOptions': {
        'ecmaVersion': 'latest',
        'sourceType': 'module'
    },
    'plugins': [
        '@typescript-eslint'
    ],
    'rules': {
        '@typescript-eslint/no-duplicate-enum-values': 'off',
        'indent': [
            'error',
            4,
            { 'SwitchCase': 1 }
        ],
        'quotes': [
            'error',
            'single'
        ],
        'semi': [
            'error',
            'always'
        ]
    }
};
