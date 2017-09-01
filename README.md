# OpenTok Embed appointment demo

A small demo application in PHP demonstrating usage of [OpenTok video embeds](https://tokbox.com/developer/embeds/) in appointments.

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/kaustavdm/opentok-video-embed-demo/tree/php)

## Installing

- Install PHP v5.6+.

Change directory to the project root.

```sh
$ cd opentok-video-embed-demo
```

### Install dependencies

Install [Composer](https://getcomposer.org/download/) if you do not already have it installed. The instruction on the linked page will create a `composer.phar` file in the current directory. Skip this step if you already have `composer` installed.

With `composer` available, install the dependencies by doing:

```sh
$ php composer.phar install
```

Note: Replace `php composer.phar` with path to the `composer` executible if `composer` is not installed in the current directory.

### Launch the application

The application ships with a utility script called `./run-demo` that launches PHP's inbuilt web server. This is useful for launching the server locally. run:

```sh
$ ./run-demo
```

Stop the server by pressing `Ctrl-C` on the terminal.

