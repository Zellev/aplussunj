module.exports = {
    "env": {
        "es2021": true,
        "node": true
    },
    "plugins": [
        //"security", too many false positives
    ],        
    "extends": [
        "eslint:recommended" ,
        "prettier",
        //"plugin:security/recommended"
    ],
    "parserOptions": {
        "ecmaVersion": 12,
        "sourceType": "module"
    },
    "rules": {
        "no-unused-vars": ["error", { "argsIgnorePattern": "^next$|^info$|^err$|^\\.$|^Sequelize$" }],
        // "prettier/prettier": 2
    }
};
