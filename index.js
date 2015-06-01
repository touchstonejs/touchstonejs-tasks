var babelify = require('babelify');
var brfs = require('brfs');
var browserify = require('browserify');
var chalk = require('chalk');
var del = require('del');
var gulp = require('gulp');
var gutil = require('gulp-util');
var less = require('gulp-less');
var merge = require('merge-stream');
var plumber = require('gulp-plumber');
var shell = require('gulp-shell');
var source = require('vinyl-source-stream');
var watchify = require('watchify');


/**
 * Check that a compatible version of gulp is available in the project
 */

function fatal(err) {
	var msg = '\n\n';
	if (Array.isArray(err)) {
		err.forEach(function(i) {
			msg += i + '\n\n';
		});
	} else {
		msg += (err || 'Fatal error, bailing.') + '\n\n';
	}
	console.log(msg);
	process.exit(1);
}

try {
	var projectGulpVersion = require(module.parent.paths[0] + '/gulp/package.json').version;
} catch(e) {
	// If we can't find gulp in the parent project, it's a fatal problem.
	fatal(
		'You do not seem to have Gulp installed in your project.',
		'Please add gulp ^' + packageGulpVersion + ' to your package.json, npm install and try again.'
	);
}

/**
 * This package exports a function that binds tasks to a gulp instance
 */

module.exports = function(gulp) {

	/**
	* Clean
	*/

	gulp.task('clean', function() {
		del(['./www/*']);
	});


	/**
	* Preview Server
	*/

	gulp.task('serve', function() {
		var express = require('express');
		var app = express();
		
		app.use(express.static('./www'));
		
		var server = app.listen(process.env.PORT || 8000, function() {
			console.log('Local Server ready on port %d', server.address().port);
		});
	});


	/**
	* Build
	*/

	gulp.task('less', function() {
		return gulp.src('src/css/app.less')
		.pipe(less())
		.pipe(gulp.dest('www/css'));
	});

	gulp.task('html', function() {
		return gulp.src('src/index.html')
		.pipe(gulp.dest('www'));
	});

	gulp.task('images', function() {
		return gulp.src('src/img/**')
		.pipe(gulp.dest('www/img'));
	});

	gulp.task('fonts', function() {
		return gulp.src('src/fonts/**')
		.pipe(gulp.dest('www/fonts'));
	});

	function doBundle(target, name, dest) {
		return target.bundle()
			.on('error', function(e) {
				gutil.log('Browserify Error', e.message);
			})
			.pipe(source(name))
			.pipe(gulp.dest(dest));
	}

	function watchBundle(target, name, dest) {
		return watchify(target)
			.on('update', function (scriptIds) {
				scriptIds = scriptIds
				.filter(function(i) { return i.substr(0,2) !== './' })
				.map(function(i) { return chalk.blue(i.replace(__dirname, '')) });
				if (scriptIds.length > 1) {
					gutil.log(scriptIds.length + ' Scripts updated:\n* ' + scriptIds.join('\n* ') + '\nrebuilding...');
				} else {
					gutil.log(scriptIds[0] + ' updated, rebuilding...');
				}
				doBundle(target, name, dest);
			})
			.on('time', function (time) {
				gutil.log(chalk.green(name + ' built in ' + (Math.round(time / 10) / 100) + 's'));
			});
	}

	function buildApp(dev) {
		
		var opts = dev ? {
			cache: {},
			packageCache: {},
			debug: process.env.NODE_ENV !== 'production'
		} : {};
		
		var src = './src/js';
		var dest = './www/js';
		var name = 'app.js';
		
		var appBundle = browserify(opts)
			.add([src, name].join('/'))
			.transform(babelify)
			.transform(brfs);

		var reactBundle = browserify();
		['react','react/addons'].forEach(function(pkg) {
			appBundle.exclude(pkg);
			reactBundle.require(pkg);
		});
		
		if (dev) {
			watchBundle(appBundle, name, dest);
		}
		
		return merge(
			doBundle(reactBundle, 'react.js', dest),
			doBundle(appBundle, name, dest)
		);
		
	}

	gulp.task('scripts', function() {
		return buildApp();
	});

	gulp.task('watch-scripts', function() {
		return buildApp(true);
	});

	gulp.task('build', ['html', 'images', 'fonts', 'less', 'scripts']);

	gulp.task('watch', ['html', 'images', 'fonts', 'less', 'watch-scripts'], function() {
		gulp.watch(['src/index.html'], ['html']);
		gulp.watch(['src/css/**/*.less'], ['less']);
		gulp.watch(['src/img/**/*.*'], ['images']);
		gulp.watch(['src/fonts/**/*.*'], ['fonts']);
	});

	gulp.task('dev', ['watch', 'serve']);


	/**
	* Cordova
	*/

	gulp.task('prepare', ['html', 'images', 'fonts', 'less', 'scripts'], function() {
		return gulp.src('')
		.pipe(plumber())
		.pipe(shell(['cordova prepare'], { cwd: __dirname }));
	});
	
}
