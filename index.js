var babelify = require('babelify');
var brfs = require('brfs');
var browserify = require('browserify');
var bytes = require('bytes');
var chalk = require('chalk');
var connect = require('gulp-connect');
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
	function doBundle (target, name, dest) {
		return target.bundle()
			.on('error', function(err) {
				var parts = err.message.split('.js: ');
				var br = '\n           ';
				var msg = parts.length === 2 ? chalk.red('Browserify Error in ') + chalk.red.underline(parts[0] + '.js') + br + parts[1] : chalk.red('Browserify Error:') + br + err.message;
				gutil.log(msg);
			})
			.pipe(source(name))
			.pipe(gulp.dest(dest))
			.pipe(connect.reload());
	}

	function watchBundle (bundle, name, dest) {
		return watchify(bundle)
			.on('log', function (message) {
				message = message.replace(/(\d+) bytes/, function() {
					return bytes.format(Number(arguments[1]));
				});
				gutil.log(chalk.grey(message));
			})
			.on('time', function (time) {
				gutil.log(chalk.green('Application built in ' + (Math.round(time / 10) / 100) + 's'));
			})
			.on('update', function (ids) {
				var changed = ids.map(function (x) {
					return chalk.blue(x.replace(__dirname, ''));
				});

				if (changed.length > 1) {
					gutil.log(changed.length + ' scripts updated:\n* ' + changed.join('\n* ') + '\nrebuilding...');
				} else {
					gutil.log(changed[0] + ' updated, rebuilding...');
				}

				doBundle(bundle, name, dest);
			});
	}

	function buildApp (entries, transforms, dest, watch) {
		var opts = xtend(watch && watchify.args, {
			entries: entries,
			debug: process.env.NODE_ENV !== 'production'
		});

		var app = browserify(opts);
		var react = browserify();

		transforms.forEach(function (target) {
			app.transform(target);
		});

		['react', 'react/addons'].forEach(function (pkg) {
			app.exclude(pkg);
			react.require(pkg);
		});

		if (watch) {
			watchBundle(app, 'app.js', dest);
		}

		return merge(doBundle(react, 'react.js', dest), doBundle(app, 'app.js', dest));
	}

	function plumb (src, transforms, dest) {
		var stream = gulp.src(src);

		transforms.forEach(function (transform) {
			stream = stream.pipe(transform());
		});

		return stream.pipe(gulp.dest(dest)).pipe(connect.reload());
	}

	var babelifyTransform = babelify.configure({
		plugins: [require('babel-plugin-object-assign')]
	});

	// Build
	gulp.task('fonts', plumb.bind(null, 'src/fonts/**', [], 'www/fonts'));
	gulp.task('html', plumb.bind(null, 'src/index.html', [], 'www'));
	gulp.task('images', plumb.bind(null, 'src/img/**', [], 'www/img'));
	gulp.task('less', plumb.bind(null, 'src/css/app.less', [less], 'www/css'));
	gulp.task('scripts', buildApp.bind(null, ['./src/js/app.js'], [babelifyTransform, brfs], './www/js'));
	gulp.task('scripts-watch', buildApp.bind(null, ['./src/js/app.js'], [babelifyTransform, brfs], './www/js', true));

	gulp.task('clean', function () { return del(['./www/*']); });
	gulp.task('build-assets', ['html', 'images', 'fonts', 'less']);
	gulp.task('build', ['build-assets', 'scripts']);
	gulp.task('watch', ['build-assets', 'scripts-watch'], function () {
		gulp.watch(['src/index.html'], ['html']);
		gulp.watch(['src/css/**/*.less'], ['less']);
		gulp.watch(['src/img/**/*.*'], ['images']);
		gulp.watch(['src/fonts/**/*.*'], ['fonts']);
	});

	// Development
	gulp.task('serve', function () {
		connect.server({
			root: 'www',
			port: 8000,
			livereload: true
		});
	});

	gulp.task('dev', ['serve', 'watch']);

	// Cordova
	gulp.task('prepare', ['build'], function () {
		return gulp.src('').pipe(plumber()).pipe(shell(['cordova prepare'], { cwd: __dirname }));
	});
};
