[![TravisCI Build Status](https://travis-ci.com/mlocati/php-cs-fixer-configurator.svg?branch=master)](https://travis-ci.com/mlocati/php-cs-fixer-configurator)

# PHP-CS-Fixer Configurator

This project lets you check all the available fixers and presets built in [PHP-CS-Fixer](https://github.com/FriendsOfPHP/PHP-CS-Fixer) in a visual way.

It allows you also to create configuration files via a guided interface.


## Updating the PHP-CS-Fixer data

The PHP-CS-Fixer data is extracted by a couple of PHP scripts.

> NOTE: on Windows, use backslashes (`\`) instead of forward slashes (`/`).

### One time setup

1. install [PHP](https://php.net/)
2. install [Composer](https://getcomposer.org/) and add it to the `PATH` environment variable, so that it can be executed by running `composer`
3. run
   ```sh
   composer install
   ```

### Updating the data to the most recent versions

```sh
./bin/update-docs-all
```


### (Re)Generate the data for all the versions

```sh
./bin/update-docs-all --force
```

### Generating the data for a specific version

For example, to (re) generate the data for version 2.15.1:

```sh
./bin/update-docs 2.15.1
```


## Building the web application

The web application is written in [TypeScript](https://www.typescriptlang.org/) and [Vue](https://vuejs.org/), and it's compiled with [Laravel Mix](https://laravel-mix.com/).

### One time setup

1. install [node.js](https://nodejs.org/) - including npm.
2. run
   ```sh
   npm install
   ```

### Building the app for production

```sh
npm run prod
```

### Building the app while developing

```sh
npm run watch
```


## Submitting pull requests

Because of security reasons and to reduce merge conflicts, the following files are generated automatically:

- `docs/css/*`
- `docs/fonts/*`
- `docs/js/*`
- `docs/index.html`

So, please don't add these files to your commits when submitting pull requests.


## Credits

[PHP-CS-Fixer Configurator](https://mlocati.github.io/php-cs-fixer-configurator/) uses some great open source tools.

You can find their licenses in the [licenses](https://github.com/mlocati/php-cs-fixer-configurator/tree/master/licenses) directory.


## Do you want to really say thank you?

You can offer me a [monthly coffee](https://github.com/sponsors/mlocati) or a [one-time coffee](https://paypal.me/mlocati) :wink:
