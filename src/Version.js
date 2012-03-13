/**
 * YCombo GUI - Version
 * Copyright(c) 2012 Alibaba.Com, Inc.
 * MIT Licensed
 * @author Nanqiao Deng
 */

import Accessibility;
import Alibaba.F2E.Util;
import System;
import System.IO;
import System.Net;
import System.Text;
import System.Threading;

package Alibaba.F2E.YComboGUI
{
	/**
	 * A class for version management.
	 */
	class Version extends JsEventEmitter
	{
		/**
		 * Current version number.
		 */
		public static const NUMBER:String = '0.1.3';

		/**
		 * URI of remote version info file.
		 */
		private const VERSION_INFO_URI:String = 'http://nqdeng.github.com/YComboGUI/version.txt';

		/**
		 * Indicate whether version check is current processing.
		 */
		private var checking:Boolean = false;

		/**
		 * Check whether update is available.
		 * @param silence Inform user when no update available?
		 */
		public function Check(silence:Boolean):void
		{
			if (!this.checking) {
				this.checking = true;
				new Thread(ParameterizedThreadStart(RequestVersionInfo)).Start(silence);
			}
		}

		/**
		 * Request version info from remote server.
		 * @param arg Inform user when no update available?
		 */
		private function RequestVersionInfo(arg:Object):void
		{
			var silence = Boolean(arg),
				req = WebRequest.Create(this.VERSION_INFO_URI),
				res,
				reader,
				text;

			try {
				res = HttpWebResponse(req.GetResponse());

				if (res.StatusCode == HttpStatusCode.OK) {
					reader = new StreamReader(res.GetResponseStream(), Encoding.UTF8);
					text = reader.ReadToEnd();
					reader.Close();

					CompareVerisonNumber(text, silence);
				}

				res.Close();
			} catch (err) {
				if (!silence) {
					this.Emit('error', err.message);
				}
			}

			this.checking = false;
		}

		/**
		 * Parse version info file and check version.
		 * @param info Text content of version info file.
		 * @param silence Inform user when no update available?
		 */
		private function CompareVerisonNumber(text:String, silence:Boolean):void
		{
			var obj = ParseVersionFile(text.Trim()),
				downloadURL = obj['DOWNLOAD URL'],
				newNumber = obj['VERSION'],
				log = obj['CHANGE LOG'];

			if (newNumber != Version.NUMBER) {
				this.Emit('updated', {
					currentNumber: Version.NUMBER,
					downloadURL: downloadURL,
					log: log,
					newNumber: newNumber
				});
			} else if (!silence) {
				this.Emit('unchange', {
					currentNumber: Version.NUMBER
				});
			}
		}

		/**
		 * Convert version info file into a JScript object.
		 * @param text Text content of version info file.
		 * @returns The corresponded JScript object.
		 */
		private function ParseVersionFile(text:String):Object
		{
			var reg = /\[([\s\S]*?)\]([\s\S]*?)(?=\[|$)/g,
				arr,
				obj = {}

			while ((arr = reg.exec(text)) !== null) {
				obj[arr[1].Trim()] = arr[2].Trim();
			}

			return obj;
		}
	}
}