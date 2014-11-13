# Install as command-line tool
[![Gitter](https://badges.gitter.im/Join Chat.svg)](https://gitter.im/keeyip/nodemeta?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

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



