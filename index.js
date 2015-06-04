var babelify = require('babelify');
var brfs = require('brfs');
var browserify = require('browserify');
var chalk = require('chalk');
var del = require('del');
var gutil = require('gulp-util');
var less = require('gulp-less');
var merge = require('merge-stream');
var plumber = require('gulp-plumber');
var shell = require('gulp-shell');
var source = require('vinyl-source-stream');
var watchify = require('watchify');

/**
 * This package exports a function that binds tasks to a gulp instance
 */
module.exports = function (gulp) {
	function doBundle (target, name, dest) {
		return target.bundle()
			.on('error', gutil.log.bind(gutil, 'Browserify Error'))
			.pipe(source(name))
			.pipe(gulp.dest(dest));
	}

	function watchBundle (target, name, dest) {
		return watchify(target)
			.on('update', function (scriptIds) {
				scriptIds = scriptIds.filter(function (i) {
					return i.substr(0, 2) !== './';
				}).map(function (i) {
					return chalk.blue(i.replace(__dirname, ''));
				});

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

	function buildApp (dev) {
		var src = './src/js';
		var dest = './www/js';
		var name = 'app.js';

		var opts = dev ? {
			cache: {},
			packageCache: {},
			debug: process.env.NODE_ENV !== 'production'
		} : {};
		var appBundle = browserify(opts)
			.add([src, name].join('/'))
			.transform(babelify)
			.transform(brfs);

		var reactBundle = browserify();

		['react', 'react/addons'].forEach(function (pkg) {
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

	function plumb (src, pumps, dest) {
		var stream = gulp.src(src);

		pumps.forEach(function (pump) {
			stream = stream.pipe(pump);
		})

		return stream.pipe(gulp.dest(dest))
	}

	// Build
	gulp.task('fonts', plumb.bind(null, 'src/fonts/**', [], 'www/fonts'));
	gulp.task('html', plumb.bind(null, 'src/index.html', [], 'www'));
	gulp.task('images', plumb.bind(null, 'src/img/**', [], 'www/img'));
	gulp.task('less', plumb.bind(null, 'src/css/app.less', [less()], 'www/css'));
	gulp.task('scripts', function () { return buildApp(); });
	gulp.task('watch-scripts', function () { return buildApp(true); });

	gulp.task('clean', function () { return del(['./www/*']); });
	gulp.task('build-assets', ['html', 'images', 'fonts', 'less']);
	gulp.task('build', ['build-assets', 'scripts']);
	gulp.task('watch', ['build-assets', 'watch-scripts'], function () {
		gulp.watch(['src/index.html'], ['html']);
		gulp.watch(['src/css/**/*.less'], ['less']);
		gulp.watch(['src/img/**/*.*'], ['images']);
		gulp.watch(['src/fonts/**/*.*'], ['fonts']);
	});

	// Local HTTP Server
	gulp.task('serve', function () {
		var express = require('express');
		var app = express();
		var port = process.env.PORT || 8000;

		app.use(express.static('./www'));
		app.listen(process.env.PORT || 8000, function () { console.log('Local Server ready on port %d', port); });
	});

	// Development
	gulp.task('dev', ['watch', 'serve']);

	// Cordova
	gulp.task('prepare', ['build'], function () {
		return gulp.src('').pipe(plumber()).pipe(shell(['cordova prepare'], { cwd: __dirname }));
	});
};
