# Generative

Generative, procedural, rule-based simulations.

This library allows you to run small simulations, which are defined by a system (`context`), and a set of `rules`.

Rules are actions applied to specific objects when a condition is met.

## Installation

First, install the package:

```sh
npm install https://github.com/adri326/Generative.git
```

Then require it in your program and use it:

```js
const Generative = require("generative");

let context = {};
let system = new Generative(context);
```

## Basic usage
