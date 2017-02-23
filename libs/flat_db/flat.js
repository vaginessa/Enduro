// * ———————————————————————————————————————————————————————— * //
// * 	Flat file handler
// * 	Handles flat file storage
// *
// *	save
// *	save_by_string
// *	load
// *	loadsync
// *	get_full_path_to_cms
// *	file_exists
// *	add
// *
// * ———————————————————————————————————————————————————————— * //
var flat = function () {}

// Vendor dependencies
var Promise = require('bluebird')
var fs = require('fs')
var require_from_string = require('require-from-string')
var decode = require('urldecode')
var stringify_object = require('stringify-object')
var path = require('path')

// local dependencies
var flat_helpers = require(ENDURO_FOLDER + '/libs/flat_db/flat_helpers')

// * ———————————————————————————————————————————————————————— * //
// * 	Save cms file
// *	@param {String} filename - Path to file without extension, relative to /cms folder
// *	@param {Object} contents - Content to be saved
// *	@return {Promise} - Promise with no content. Resolve if saved successfully, reject otherwise
// * ———————————————————————————————————————————————————————— * //
flat.prototype.save = function (filename, contents) {
	return new Promise(function (resolve, reject) {
		// TODO: maybe the file could be backed up somewhere before overwriting
		contents = contents || {}

		// url decode filename
		filename = decode(filename)

		var fullpath_to_cms_file = get_full_path_to_cms(filename)

		var flatObj = require_from_string('module.exports = ' + JSON.stringify(contents))

		// formats js file so it can be edited by hand later
		var prettyString = stringify_object(flatObj, {indent: '	', singleQuotes: true})

		// save cms file
		flat_helpers.ensure_directory_existence(fullpath_to_cms_file)
			.then(() => {
				fs.writeFile(fullpath_to_cms_file, prettyString, function (err) {
					if (err) {
						reject()
					}
					resolve()
				})
			})
	})
}

// * ———————————————————————————————————————————————————————— * //
// * 	Save cms file with string as content
// *	@param {String} filename - Path to file without extension, relative to /cms folder
// *	@param {String} contents - Content to be saved
// *	@return {Promise} - Promise from save function
// * ———————————————————————————————————————————————————————— * //
flat.prototype.save_by_string = function (filename, contents) {
	return this.save(filename, JSON.parse(contents))
}

// * ———————————————————————————————————————————————————————— * //
// * 	Load cms file
// *	@param {String} filename - Path to file without extension, relative to /cms folder
// *	@return {Promise} - Promise returning an object
// * ———————————————————————————————————————————————————————— * //
flat.prototype.load = function (filename) {
	return new Promise(function (resolve, reject) {

		// url decode filename
		filename = decode(filename)

		var fullpath_to_cms_file = get_full_path_to_cms(filename)

		// check if file exists. return empty object if not
		if (!flat_helpers.file_exists_sync(fullpath_to_cms_file)) {
			resolve({})
		} else {
			fs.readFile(fullpath_to_cms_file, function (err, raw_context_data) {
				if (err) { reject() }

				// check if file is empty. return empty object if so
				if (raw_context_data == '') {
					return resolve({})
				}

				// strip whatever is before the first curly brace
				raw_context_data = raw_context_data.toString().substring(raw_context_data.indexOf('{'))

				// convert the string-based javascript into an object
				var flatObj = require_from_string('module.exports = ' + raw_context_data)

				resolve(flatObj)
			})
		}
	})
}

// * ———————————————————————————————————————————————————————— * //
// * 	Load cms file synchronously
// *	@param {String} filename - Path to file without extension, relative to /cms folder
// *	@return {String} - Raw string
// * ———————————————————————————————————————————————————————— * //
flat.prototype.loadsync = function (filename) {
	filename = decode(filename)

	if (!flat_helpers.file_exists_sync(CMD_FOLDER + '/cms/' + filename + '.js')) {
		return {}
	}

	data = fs.readFileSync(CMD_FOLDER + '/cms/' + filename + '.js', 'utf-8')
	return require_from_string('module.exports = ' + data)
}

// * ———————————————————————————————————————————————————————— * //
// * 	Get full path of a cms file
// *	@param {string} filename - path to file without extension, relative to /cms folder
// *	@return {string} - peturns full server path to specified file
// * ———————————————————————————————————————————————————————— * //
flat.prototype.get_full_path_to_cms = get_full_path_to_cms

// * ———————————————————————————————————————————————————————— * //
// * 	get cms filename from a full path
// *	@param {string} full_path - absolute, server-root-related path to the file
// *	@return {string} - returns file name relative to /cms folder
// * ———————————————————————————————————————————————————————— * //
flat.prototype.get_cms_filename_from_fullpath = get_cms_filename_from_fullpath

// * ———————————————————————————————————————————————————————— * //
// * 	checks if specified file exists
// *	@param {string} filename - path to file without extension, relative to /cms folder
// *	@return {boolean} - returns true if specified file exists
// * ———————————————————————————————————————————————————————— * //
flat.prototype.file_exists = function (filename) {
	return flat_helpers.file_exists_sync(get_full_path_to_cms(filename))
}

// * ———————————————————————————————————————————————————————— * //
// * 	adds content to a file.
// *	@param {string} filename - path to file without extension, relative to /cms folder
// *	@param {object} context_to_add - content to be added
// *	@param {string} key - key in the root of the file where the specified content should be added. defaults to 'items'
// *	@return {promise} - returns promise from save function
// * ———————————————————————————————————————————————————————— * //
flat.prototype.add = function (filename, context_to_add, key) {
	var self = this

	context_to_add = context_to_add || {}
	key = key || 'items'

	return self.load(filename)
		.then((context) => {
			if (!(key in context)) {
				context[key] = []
			}

			context[key].push(context_to_add)
			return self.save(filename, context)
		})
}

// * ———————————————————————————————————————————————————————— * //
// * 	adds array to a file.
// *	@param {string} filename - path to file without extension, relative to /cms folder
// *	@param {object} context_to_add - content to be added
// *	@param {string} key - key in the root of the file where the specified content should be added. defaults to 'items'
// *	@return {promise} - returns promise from save function
// * ———————————————————————————————————————————————————————— * //
flat.prototype.add_array = function (filename, context_to_add, key) {
	var self = this

	context_to_add = context_to_add || []
	key = key || 'items'

	return self.load(filename)
		.then((context) => {
			if (!(key in context)) {
				context[key] = []
			}

			// Extend loaded file with default configuration
			context[key] = context[key].concat(context_to_add.filter((new_culture) => {
				if (context[key].indexOf(new_culture) == -1) {
					return new_culture
				}
			}))
			return self.save(filename, context)
		})
}

// * ———————————————————————————————————————————————————————— * //
// * 	checks filename and returns if it defines a generator file or not
// *	@param {string} filename - path to file without extension, relative to /cms folder
// *	@return {bool} - returns true if filename belongs to a generator
// * ———————————————————————————————————————————————————————— * //
flat.prototype.is_generator = function (filename) {
	return filename.split('/')[0] == 'generators'
}

// * ———————————————————————————————————————————————————————— * //
// * 	returns url from filename, takes into account generators
// *	@param {string} filename - path to file without extension, relative to /cms folder
// *	@return {string} - returns relative url to the file
// * ———————————————————————————————————————————————————————— * //
flat.prototype.url_from_filename = function (filename) {
	if (this.is_generator(filename)) {
		return filename.split('/').slice(1).join('/')
	}

	return filename
}

// * ———————————————————————————————————————————————————————— * //
// * 	returns url from filename, takes into account generators
// *	@param {string} filename - path to file without extension, relative to /cms folder
// *	@return {string} - returns relative url to the file
// * ———————————————————————————————————————————————————————— * //
flat.prototype.has_page_associated = function (filename) {
	return !['global', 'generators'].indexOf(filename.split('/')[0].toLowerCase())
}

// * ———————————————————————————————————————————————————————— * //
// * 	makes a decision whether this content file is deletable
// *	currently only generator content files are deletable
// *	@param {string} filename - path to file without extension, relative to /cms folder
// *	@return {bool} - returns true if particular content file is deletable
// * ———————————————————————————————————————————————————————— * //
flat.prototype.is_deletable = function (filename) {
	return this.is_generator(filename)
}

// Private functions
function get_full_path_to_cms (filename) {
	return path.join(CMD_FOLDER, 'cms', filename + '.js')
}

function get_cms_filename_from_fullpath (full_path) {
	return full_path.match(/(?:\/|\\)cms(?:\/|\\)(.*)\..*/)[1]
}

module.exports = new flat()