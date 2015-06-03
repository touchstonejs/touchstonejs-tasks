touchstonejs-tasks
==================

### README out of date - please see [#4](https://github.com/touchstonejs/touchstonejs-tasks/issues/4) 


This package provides common gulp tasks for TouchstoneJS projects with:

* Browserify for transforming JSX and creating distribution builds
* Watchify for automatic, efficient rebundling on file changes
* Express for serving examples during development
* LESS stylesheets

In future versions, you'll be able to configure the tasks (including which tasks are run, source files and folder paths, etc).


## Project setup

The tasks assume you are following the following conventions for your project:

* Your app has a single entry point in a source folder
* Source consists of
	* Static file(s) (e.g. html, images, etc)
	* One or more stylesheets to be generated with LESS
	* One or more scripts to be bundled with Browserify
* Everything will be packaged into the `www` folder and built with Cordova

### Example project structure

```
package.json
config.xml
gulpfile.js
src/
	index.html
	img/...
	fonts/...
	css/
		app.less
	js/
		app.js
```

For a complete example see [Thinkmill/touchstone-starter](https://github.com/Thinkmill/touchstone-starter)


## Usage

```
npm install --save-dev touchstonejs-tasks gulp reactify
```

**Note** You need to install `gulp` and `reactify` in your `devDependencies` along with `touchstonejs-tasks`, because they must exist in the root `node_modules` directory of your project.

In your gulpfile, call this package with your `gulp` instance and `config`. It will add the tasks to gulp for you. You can also add your own tasks if you want.

```javascript
var gulp = require('gulp'),
	initGulpTasks = require('touchstonejs-tasks');

initGulpTasks(gulp);
```

### Task Config

Coming soon.


## Contributing

I wrote this package because maintaining build processes across multiple projects became a repetitive chore with large margin for error.

Although its quite opinionated, hopefully it will be a useful resource for other projects.

Please let me know if you think anything could be done better or you'd like to see a feature added. Issues and PR's welcome.


## License

MIT. Copyright (c) 2014 Jed Watson.

