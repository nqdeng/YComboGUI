/**
 * YCombo GUI - UI Script
 * Copyright(c) 2012 Alibaba.Com, Inc.
 * MIT Licensed
 * @author Nanqiao Deng
 */


/**
 * Object for output control.
 */
var output = (function () {
	var outputEl = document.getElementById('output');

	/**
	 * Clear output console.
	 * @public
	 */
	function clear() {
		outputEl.innerHTML = '';
	}

	/**
	 * Output error message.
	 * @public
	 * @param {String} msg
	 */
	function error(msg) {
		log(msg, 'error');
	}

	/**
	 * Output information message.
	 * @public
	 * @param {String} msg
	 */
	function info(msg) {
		log(msg, 'info');
	}

	/**
	 * Output message by type.
	 * @public
	 * @param {String} msg
	 * @param {String} type
	 */
	function log(msg, type) {
		var el = document.createElement('p');
		el.innerHTML = unescape(msg);
		el.className = type || '';
		outputEl.appendChild(el);
		outputEl.scrollTop = outputEl.scrollHeight;
	}

	/**
	 * Output warn message.
	 * @public
	 * @param {String} msg
	 */
	function warn(msg) {
		log(msg, 'warn');
	}

	// Exports interfaces.
	return { clear: clear, error: info, info: info, log: log, warn: warn };
}());

/**
 * Object for input control.
 */
var input = (function () {
	var inputEl = document.getElementById('input'),
		listEl = document.getElementById('list'),
		list = {},
		workdir = '';

	/**
	 * Add an input.
	 * @private
	 * @param {String} path
	 * @param {String} type
	 */
	function add(path, type) {
		if (!list[path]) {
			var el = document.createElement('a');
			el.innerHTML = '<span class="remove" title="remove"></span>' + path;
			el.className = type;
			el.href = path;
			listEl.appendChild(el);
			inputEl.scrollTop = inputEl.scrollHeight;
			list[path] = true;

			// Refresh root options after input list changed.
			panel.setRootOptions(generateRootOptions());
		}
	}

	/**
	 * Add a file.
	 * @public
	 * @param {String} path
	 */
	function addFile(path) {
		add(path, 'file');
	}

	/**
	 * Add a folder.
	 * @public
	 * @param {String} path
	 */
	function addFolder(path) {
		add(path, 'folder');
	}

	/**
	 * Remove an input.
	 * @private
	 * @param {Object} e The event arg.
	 */
	function remove(e) {
		e = window.event || e;
		var target = e.srcElement || e.target,
			className = target.className,
			el, path;

		target.hideFocus = true;

		if (className.indexOf('remove') != -1) {
			el = target.parentNode;
			path = el.href;
			delete list[path];
			el.parentNode.removeChild(el);
		}

		if (typeof e.preventDefault === 'function') {
			e.preventDefault();
		} else {
			e.returnValue = false;
		}

		// Refresh root options after input list changed.
		panel.setRootOptions(generateRootOptions());
	}

	/**
	 * Generate root options based on the latest input list.
	 * @private
	 * @returns {Array} Parts of common root path of inputs.
	 */
	function generateRootOptions() {
		var input = [],
			intersection = [],
			key,
			i,
			index = 0,
			part;

		for (key in list) {
			if (list.hasOwnProperty(key)) {
				input.push(key.split('\\'));
			}
		}

		LOOP:
		while (input.length > 0) {
			part = null;
			for (i = 0; i < input.length; ++i) {
				if (index >= input[i].length) {
					break LOOP;
				}
				if (!part) {
					part = input[i][index];
				} else if (part !== input[i][index]) {
					break LOOP;
				}
			}
			intersection.push(part);
			index += 1;
		}

		if (/\.(?:js|css)$/.test(intersection[intersection.length - 1])) {
			intersection.pop();
		}

		workdir = intersection.length > 0 ? intersection.join('\\') : '';

		return intersection;
	}

	/**
	 * Return array of input files.
	 * @public
	 * @returns {Array}
	 */
	function getFiles() {
		var files = [],
			key;

		for (key in list) {
			if (list.hasOwnProperty(key)) {
				files.push(key);
			}
		}

		return files;
	}

	/**
	 * Return workdir.
	 * @public
	 * @returns {String}
	 */
	function getWorkdir() {
		return workdir;
	}

	// Bind event handler.
	listEl.attachEvent('onclick', remove);

	// Exports interfaces.
	return { addFile: addFile,addFolder: addFolder, getFiles: getFiles, getWorkdir: getWorkdir };
}());

/**
 * Object for panel control.
 */
var panel = (function () {
	var linebreakOpt = document.getElementById('linebreakOpt'),
		charsetOpt = document.getElementById('charsetOpt'),
		rootOpt = document.getElementById('rootOpt'),
		verboseOpt = document.getElementById('verboseOpt'),
		nomungeOpt = document.getElementById('nomungeOpt'),
		preserveSemiOpt = document.getElementById('preserveSemiOpt'),
		disableOptimizationsOpt = document.getElementById('disableOptimizationsOpt'),
		comboBtn = document.getElementById('comboBtn');

	/**
	 * Generate YCombo options and input and pass to backend.
	 * @private
	 * @param {Object} e The event arg.
	 */
	function combo(e) {
		e = window.event || e;
		var target = e.srcElement || e.target,
			args = [],
			value;

		if (linebreakOpt.value) {
			args.push('--line-break ' + linebreakOpt.value);
		}

		args.push('--charset ' + charsetOpt.options[charsetOpt.selectedIndex].value);

		if (value = rootOpt.options[rootOpt.selectedIndex].value) {
			args.push('--root "' + value.replace(/\\/g, '\\\\') + '"');
		}

		if (verboseOpt.checked) {
			args.push('--verbose');
		}

		if (nomungeOpt.checked) {
			args.push('--nomunge');
		}

		if (preserveSemiOpt.checked) {
			args.push('--preserve-semi');
		}

		if (disableOptimizationsOpt.checked) {
			args.push('--disable-optimizations');
		}

		output.clear();

		// Disable YCombo button during YCombo processing.
		target.disabled = true;

		// Pass options and inputs to backend.
		window.external.Compress(args.join(' '), input.getFiles().join('|'), input.getWorkdir());
	}

	/**
	 * Reset root options dropmenu with new data.
	 * @public
	 * @param {Array} Parts of common root path of inputs.
	 */
	function setRootOptions(parts) {
		var el, i,
			path = '',
			options = rootOpt.options,
			selected;

		if (options.length > 0) {
			selected = options[rootOpt.selectedIndex].value;
		}

		rootOpt.innerHTML = '';
		rootOpt.disabled = !parts.length;

		el = document.createElement('option');
		el.value = '';
		el.innerHTML = '[Automatic]';
		rootOpt.appendChild(el);

		for (i = 0; i < parts.length; ++i) {
			path += parts[i] + '\\';
			el = document.createElement('option');
			el.value = path;
			el.innerHTML = path;
			el.selected = (path === selected);
			rootOpt.appendChild(el);
		}
	}

	/**
	 * Unlock YCombo button.
	 * @public
	 */
	function unlock() {
		comboBtn.disabled = false;
	}

	// Bind event handler.
	comboBtn.attachEvent('onclick', combo);

	// Exports interfaces.
	return { setRootOptions: setRootOptions, unlock: unlock };
}());