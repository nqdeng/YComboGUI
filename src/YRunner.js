/**
 * YCombo GUI - Version
 * Copyright(c) 2012 Alibaba.Com, Inc.
 * MIT Licensed
 * @author Nanqiao Deng
 */

import Accessibility;
import Alibaba.F2E.Util;
import System;
import System.Diagnostics;
import System.IO;

package Alibaba.F2E.YComboGUI
{
	/**
	 * A class for manipulating the YCombo command-line app.
	 */
	class YRunner extends JsEventEmitter
	{
		/**
		 * Full path of Java execution file.
		 */
		private var javaPath : String;

		/**
		 * Full path of YCombo execution file.
		 */
		private var yComboPath : String;

		/**
		 * Time stamp for measuring YCombo execution time.
		 */
		private var startTime : Date;

		/**
		 * Match YCombo log type.
		 */
		private var PATTERN_TYPE : RegExp;

		/**
		 * Init the instance of YRunner.
		 */
		public function Init():void
		{
			this.PATTERN_TYPE = /^\[(\w+)\]/;
			FindJava();
			FindYCombo();
		}

		/**
		 * Find Java execution path.
		 */
		private function FindJava():void
		{
			var envPath = Environment.GetEnvironmentVariable('PATH').split(';');

			for (var i = 0; i < envPath.length; ++i) {
				try {
					this.javaPath = Path.Combine(envPath[i].Trim(), 'java.exe');
					if (File.Exists(this.javaPath)) {
						return;
					}
				} catch (e) { }
			}

			this.Emit(
				'fatal',

				'You need JRE(Java Runtime Environment) to run this program.\n\n' +

				'Download and install it from http://www.java.com first.'
			);
		}

		/**
		 * Find YCombo execution path.
		 */
		private function FindYCombo():void
		{
			var appPath = Process.GetCurrentProcess().MainModule.FileName,
				appFolder = Path.GetDirectoryName(appPath),
				files = Directory.GetFiles(appFolder, 'ycombo-' + Version.NUMBER + '.jar');

			if (files.Length > 0) {
				this.yComboPath = files[0];
			} else {
				this.Emit(
					'fatal',

					'Cannot find ycombo-' + Version.NUMBER + '.jar in app folder.\n\n' +

					'Reinstall this program may resolve this problem.'
				);
			}
		}

		/**
		 * Generate YCombo command-line arguments.
		 * @param options The command-line options.
		 * @param files The input files.
		 * @returns The joined command-line arguments.
		 */
		private function GenerateArguments(options:String, files:Array):String
		{
			var i,
				tmp = [ options ],
				cmd;

			for (i = 0; i < files.length; ++i) {
				tmp.push('"' + files[i].replace(/\\/g, '\\\\') + '"');
			}

			cmd = tmp.join(' ');

			this.Emit('info', '[INFO] Start YCombo with arguments: ' + cmd);
			return '-jar "' + yComboPath + '" ' + cmd;
		}

		/**
		 * Lanch YCombo with given options and input files.
		 * @param options The command-line options.
		 * @param input The pathes of inputs, seperated with "|".
		 * @param workdir The common workdir of inputs.
		 */
		public function Run(options:String, input:String, workdir:String):void
		{
			if (input.length === 0) {
				this.Emit('error', '[ERROR] No input files.');
				this.Emit('exit');
				return;
			}

			if (workdir === '') {
				this.Emit('warn', '[WARNING] Cannot detect common working directory of input files, use present working directory instead.');
				workdir = Environment.CurrentDirectory;
			}

			var files = input.split('|'),
				proc = new Process();

			proc.EnableRaisingEvents = true;

			proc.StartInfo.FileName = javaPath;
			proc.StartInfo.Arguments = GenerateArguments(options, files);
			proc.StartInfo.WorkingDirectory = workdir;
			proc.StartInfo.CreateNoWindow = true;
			proc.StartInfo.UseShellExecute = false;
			proc.StartInfo.RedirectStandardError = true;

			proc.add_ErrorDataReceived(OnErrorDataReceived);
			proc.add_Exited(OnExited);

			startTime = new Date();

			proc.Start();
			proc.BeginErrorReadLine();
		}

		/**
		 * Redirect stderr output of YCombo to output area.
		 * @param sender
		 * @param args
		 */
		private function OnErrorDataReceived(sender:Object, args:DataReceivedEventArgs):void
		{
			var log = args.Data,
				result;

			if (!System.String.IsNullOrEmpty(log)) {
				log = log.Trim();
				result = log.match(this.PATTERN_TYPE)
				if (result) {
					switch (result[1]) {
					case 'INFO':
						this.Emit('info', log);
						break;
					case 'WARNING':
						this.Emit('warn', log);
						break;
					case 'ERROR':
						this.Emit('error', log);
						break;
					default:
					}
				} else {
					this.Emit('log', log);
				}
			}
		}

		/**
		 * Clean up when YCombo finished execution.
		 * @param sender
		 * @param args
		 */
		private function OnExited(sender:Object, args:EventArgs):void
		{
			var elapsedTime = (new Date() - this.startTime) / 1000,
				proc = Process(sender),
				exitCode = proc.ExitCode;

			proc.CancelErrorRead();
			proc.Close();

			this.Emit('exit');

			if (exitCode == 0) {
				this.Emit('info', '[INFO] YCombo finished in ' + elapsedTime + ' seconds.');
			} else {
				this.Emit('error', '[ERROR] YCombo failed with errors.');
			}
		}
	}
}