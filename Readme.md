# Install as command-line tool

    npm install -g nodemeta


# Install as node library

    npm install nodemeta


# Usage

    nodemeta samples/Arithmetic.ometa > ~/myproject/Arithmetic.js

    cd ~/myproject

    npm install --save nodemeta


    ```
    var Arithmetic = require('./Arithmetic.js');
    console.log(Arithmetic.Numbers.matchAll('12', 'number'))
    console.log(Arithmetic.Expression.matchAll('12+12', 'expression'))

    ```



