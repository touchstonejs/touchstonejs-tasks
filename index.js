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
var xtend = require('xtend');

module.exports = function (gulp) {
	function bundler (target, name, dest) {
		return target.bundle()
			.on('error', gutil.log.bind(gutil, 'Browserify Error'))
			.pipe(source(name))
			.pipe(gulp.dest(dest));
	}

	function watchBundle (bundle, name, dest) {
		return watchify(bundle)
			.on('log', gutil.log)
			.on('update', function (ids) {
				var changed = ids.map(function (i) {
					return chalk.blue(i.replace(__dirname, ''));
				});

				if (changed.length > 1) {
					gutil.log(changed.length + ' scripts updated:\n* ' + changed.join('\n* ') + '\nrebuilding...');
				} else {
					gutil.log(changed[0] + ' updated, rebuilding...');
				}

				bundler(bundle, name, dest)
			})
			.on('time', function (time) {
				gutil.log(chalk.green('Application built in ' + (Math.round(time / 10) / 100) + 's'));
			});
	}

	function buildApp (entries, dest, watch) {
		var opts = xtend(watch && watchify.args, {
			entries: entries,
			debug: process.env.NODE_ENV !== 'production'
		});

		var app = browserify(opts).transform(babelify).transform(brfs);
		var react = browserify();

		['react', 'react/addons'].forEach(function (pkg) {
			app.exclude(pkg);
			react.require(pkg);
		});

		if (watch) {
			watchBundle(app, 'app.js', dest);
		}

		return merge(
			bundler(react, 'react.js', dest),
			bundler(app, 'app.js', dest)
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
	gulp.task('scripts', function () { return buildApp(['./src/js/app.js'], './www/js'); })
	gulp.task('scripts-watch', function () { return buildApp(['./src/js/app.js'], './www/js', true); })

	gulp.task('clean', function () { return del(['./www/*']); });
	gulp.task('build-assets', ['html', 'images', 'fonts', 'less']);
	gulp.task('build', ['build-assets', 'scripts']);
	gulp.task('watch', ['build-assets', 'scripts-watch'], function () {
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
