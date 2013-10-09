jsduck2jsx
===========================================

Synopsis
---------------

Generate JSX wrapper from JSDuck output files.

Motivation
---------------

It generates JSX wrapper from existing code. If your code using jsduck to generate document, you can use your module from JSX easily.

Installation
---------------

It needs JSDuck to generate JSON style output.

```sh
$ gem jsduck
$ npm install jsduck2jsx
```

Usage
---------------

### Sencha Touch

```sh
$ jsduck --export=full --output st_jsonout touch-2.3.0/src/
$ node_modules/.bin/jsduck2jsx -o sencha-touch.jsx -f "Ext*" -i js/web.jsx -t /node_modules/jsduck2jsx/share/senchatouch_type.json st_jsonout
```

You can use following shortcut. Resulting file will be in the `lib` folder:

```sh
# Use pregenerated JSON
$ node_modules/.bin/jsduck2jsx --sencha-touch
# Use your own JSON
$ node_modules/.bin/jsduck2jsx --sencha-touch st_jsonout
```

### Ext.js

```sh
$ jsduck --export=full --output ej_jsonout ext-4.2.1/src/
$ node_modules/.bin/jsduck2jsx -o ext.jsx -f "Ext*" -i js/web.jsx -t /node_modules/jsduck2jsx/share/extjs_type.json ej_jsonout
```

You can use following shortcut. Resulting file will be in the `lib` folder:

```sh
# Use pregenerated JSON
$ node_modules/.bin/jsduck2jsx --extjs
# Use your own JSON
$ node_modules/.bin/jsduck2jsx --extjs st_jsonout
```

### Options

*   `-o filepath`, `--output=filepath`

    Output JSX file path

*   `-f filter`, `--filter=filter`

    File name filter

*   `-i modulepath`, `--import=modulepath`

    Additional needed JSX module.

*   `-t jsonpath`, `--type=jsonpath`

    Additional type information.

*   `-h`, `--help`

    Display help

### Shortcut

*   `--sencha-touch`
*   `--extjs`

Development
-------------

## Repository

* Repository: git://github.com/shibukawa/jsduck2jsx.git
* Issues: https://github.com/shibukawa/jsduck2jsx/issues

## Run Test

```sh
$ grunt test
```

## Build

```sh
# Build application or library for JS project
$ grunt build

# Generate API reference
$ grunt doc

```

Author
---------

* shibukawa / yoshiki@shibu.jp

License
------------

MIT

Complete license is written in `LICENSE.md`.
