/**
 * YCombo GUI - App
 * Copyright(c) 2012 Alibaba.Com, Inc.
 * MIT Licensed
 * @author Nanqiao Deng
 */

import Accessibility;
import Alibaba.F2E.Util;
import Microsoft.Win32;
import System;
import System.Diagnostics;
import System.Drawing;
import System.IO;
import System.Reflection;
import System.Resources;
import System.Windows.Forms;

package Alibaba.F2E.YComboGUI
{
	/**
	 * The main window class.
	 */
	class App extends Form
	{
		/**
		 * The online manual URI.
		 */
		private const MANUAL_URI:String = 'http://nqdeng.github.com/YComboGUI/';

		/**
		 * Hold the command-line args.
		 */
		private var initialInput:Array;

		/**
		 * Operate the YCombo command-line app.
		 */
		private var yRunner:YRunner;

		/**
		 * Access version info.
		 */
		private var version:Version;

		/**
		 * Full path of YComboGUI execution file.
		 */
		private var appPath:String;

		/**
		 * Full path of YComboGUI resources file.
		 */
		private var resPath:String;

		/**
		 * Contain the HTML UI.
		 */
		private var browser:WebBrowser;

		/**
		 * Used for add seed files into input list.
		 */
		private var fileDialog:OpenFileDialog;

		/**
		 * Used for add a folder into input list.
		 */
		private var folderDialog:FolderBrowserDialog;

		/**
		 * Create the instance of main window.
		 * @param args The command-line args.
		 */
		function App(args:String[])
		{
			var i;

			this.initialInput = [];
			for (i = 1; i < args.length; ++i) {
				try {
					this.initialInput.push(Path.GetFullPath(args[i]));
				} catch (e) { }
			}

			this.appPath = Process.GetCurrentProcess().MainModule.FileName;
			this.resPath = Path.Combine(Path.GetDirectoryName(this.appPath), 'YComboGUI.Resources.dll');

			InitYRunner();
			InitVersion();
			InitUI();
		}

		/**
		 * Create and init YRunner instance.
		 */
		private function InitYRunner():void
		{
			this.yRunner = new YRunner();
			this.yRunner.AddHandler('log', OnYComboFeedback);
			this.yRunner.AddHandler('info', OnYComboFeedback);
			this.yRunner.AddHandler('warn', OnYComboFeedback);
			this.yRunner.AddHandler('error', OnYComboFeedback);
			this.yRunner.AddHandler('exit', OnYComboExited);
			this.yRunner.AddHandler('fatal', OnYComboFatalError);
			this.yRunner.Init();
		}

		/**
		 * Create and init Version instance.
		 */
		private function InitVersion():void
		{
			this.version = new Version();
			this.version.AddHandler('updated', OnVersionUpdated);
			this.version.AddHandler('unchange', OnVersionUnchange);
			this.version.AddHandler('error', OnVersionError);

			// Check new version at startup.
			this.version.Check(true);
		}

		/**
		 * Init main window and controls.
		 */
		private function InitUI():void
		{
			this.Text = 'YCombo GUI';
			this.Width = 640;
			this.Height = 640;
			this.MinimumSize = new System.Drawing.Size(640, 480);
			this.Icon = new ResourceManager('icon', Assembly.GetExecutingAssembly()).GetObject('AppIcon');

			var menu = new MainMenu();

			var item1 = new MenuItem(),
				item11 = new MenuItem(),
				item12 = new MenuItem(),
				item13 = new MenuItem(),
				item2 = new MenuItem(),
				item21 = new MenuItem(),
				item22 = new MenuItem(),
				item3 = new MenuItem(),
				item31 = new MenuItem(),
				item32 = new MenuItem(),
				item33 = new MenuItem();

			item1.Text = 'File';
			item11.Text = 'Add Seeds...';
			item12.Text = 'Add a Folder...';
			item13.Text = 'Exit';
			item2.Text = 'Integration';
			item21.Text = 'Add Context Menu';
			item22.Text = 'Remove Context Menu';
			item3.Text = 'Help';
			item31.Text = 'View Manual Online';
			item32.Text = 'Check for Update';
			item33.Text = 'About';

			item11.add_Click(OnMenuAddSeeds);
			item12.add_Click(OnMenuAddFolder);
			item13.add_Click(OnMenuExit);
			item21.add_Click(OnMenuAddContextMenu);
			item22.add_Click(OnMenuRemoveContextMenu);
			item31.add_Click(OnMenuViewManual);
			item32.add_Click(OnMenuCheckUpdate);
			item33.add_Click(OnMenuAbout);

			item1.MenuItems.Add(item11);
			item1.MenuItems.Add(item12);
			item1.MenuItems.Add('-');
			item1.MenuItems.Add(item13);

			item2.MenuItems.Add(item21);
			item2.MenuItems.Add(item22);

			item3.MenuItems.Add(item31);
			item3.MenuItems.Add(item32);
			item3.MenuItems.Add('-');
			item3.MenuItems.Add(item33);

			menu.MenuItems.Add(item1);
			menu.MenuItems.Add(item2);
			menu.MenuItems.Add(item3);

			this.Menu = menu;

			this.browser = new WebBrowser();
			this.browser.Size = this.ClientSize;
			this.browser.Anchor = (AnchorStyles.Top | AnchorStyles.Right | AnchorStyles.Bottom | AnchorStyles.Left);
			this.browser.ObjectForScripting = this;
			this.browser.IsWebBrowserContextMenuEnabled = false;

			this.Controls.Add(this.browser);

			this.browser.add_DocumentCompleted(onDocumentCompleted);
			this.browser.Navigate('res://' + this.resPath + '/ui.html');
			this.browser.add_Navigating(onNavigating);

			this.fileDialog = new OpenFileDialog();
			this.fileDialog.Filter = "Seed files (*.seed.js;*.seed.css)|*.seed.js;*.seed.css" ;
			this.fileDialog.FilterIndex = 1;
			this.fileDialog.Multiselect = true;
			this.fileDialog.RestoreDirectory = true;
			this.fileDialog.Title = 'Add seed files';

			this.folderDialog = new FolderBrowserDialog();
			this.folderDialog.Description = 'Add a folder which contains seed files.';
			this.folderDialog.ShowNewFolderButton = false;
			this.folderDialog.SelectedPath = Environment.CurrentDirectory;
		}

		/**
		 * Eval script in browser.
		 * @param cmd The javascript to eval.
		 */
		private function Eval(cmd:String):void
		{
			this.browser.Document.InvokeScript('eval', [ cmd ]);
		}

		/**
		 * Add a file or folder into input list.
		 * @param path The full path of input.
		 */
		private function AddInput(path:String):void
		{
			if (File.Exists(path) && (path.EndsWith('.seed.js') || path.EndsWith('.seed.css'))) {
				Eval('input.addFile(\'' + path.replace(/\\/g, '\\\\') + '\');');
			} else if (Directory.Exists(path)) {
				Eval('input.addFolder(\'' + path.replace(/\\/g, '\\\\') + '\');');
			}
		}

		/**
		 * Compress input files with YCombo.
		 * @param options The command-line options.
		 * @param input The pathes of inputs, seperated with "|".
		 * @param workdir The common workdir of inputs.
		 */
		public function Compress(options:String, input:String, workdir:String):void
		{
			this.yRunner.Run(options, input, workdir);
		}

		/**
		 * Select and add an input file by OpenFileDialog.
		 * @param sender
		 * @param args
		 */
		private function OnMenuAddSeeds(sender:Object, args:EventArgs):void
		{
			var i;

			if (this.fileDialog.ShowDialog() === System.Windows.Forms.DialogResult.OK) {
				for (i = 0; i < this.fileDialog.FileNames.Length; ++i) {
					AddInput(this.fileDialog.FileNames[i]);
				}
			}
		}

		/**
		 * Select and add a folder by FolderBrowserDialog.
		 * @param sender
		 * @param args
		 */
		private function OnMenuAddFolder(sender:Object, args:EventArgs):void
		{
			if (this.folderDialog.ShowDialog() === System.Windows.Forms.DialogResult.OK) {
				AddInput(this.folderDialog.SelectedPath);
			}
		}

		/**
		 * Close main window and exit application.
		 * @param sender
		 * @param args
		 */
		private function OnMenuExit(sender:Object, args:EventArgs):void
		{
			this.Close();
		}

		/**
		 * Register YCombo context menu.
		 * @param sender
		 * @param args
		 */
		private function OnMenuAddContextMenu(sender:Object, args:EventArgs):void
		{
			var path = this.appPath.replace(/\\/g, '\\\\');

			try {
				Registry.SetValue('HKEY_CURRENT_USER\\Software\\Classes\\*\\shell\\YCombo\\command', '', '"' + path + '" %1');
				Registry.SetValue('HKEY_CURRENT_USER\\Software\\Classes\\Folder\\shell\\YCombo\\command', '', '"' + path + '" %1');
				MessageBox.Show(
					'Context Menu added successfully :-)\n\n' +

					'You could launch YCombo by right clicking a file or folder.',

					'System Integration'
				);
			} catch (err) {
				MessageBox.Show(
					'Failed to add Context Menu :-(\n\n' +

					'Error Detail: ' + err,

					'System Integration'
				);
			}
		}

		/**
		 * Unregister YCombo context menu.
		 * @param sender
		 * @param args
		 */
		private function OnMenuRemoveContextMenu(sender:Object, args:EventArgs):void
		{
			var removePath = [
					[ 'Software', 'Classes', '*', 'shell' ],
					[ 'Software', 'Classes', 'Folder', 'shell' ]
				],
				i, j, key;

			try {
				LOOP:
				for (i = 0; i < removePath.length; ++i) {
					key = Registry.CurrentUser;
					for (j = 0; j < removePath[i].length; ++j) {
						key = key.OpenSubKey(removePath[i][j], true);
						if (key == null) {
							continue LOOP;
						}
					}
					if (key.OpenSubKey('YCombo')) {
						key.DeleteSubKeyTree('YCombo');
					}
				}
				MessageBox.Show(
					'Context Menu removed successfully :-)\n\n' +

					'Your Context Menu is left clean and tidy.',

					'System Integration'
				);
			} catch (err) {
				MessageBox.Show(
					'Failed to add Context Menu :-(\n\n' +

					'Error Detail: ' + err,

					'System Integration'
				);
			}
		}

		/**
		 * Open web browser to view manual online.
		 * @param sender
		 * @param args
		 */
		private function OnMenuViewManual(sender:Object, args:EventArgs):void
		{
			Process.Start(this.MANUAL_URI);
		}

		/**
		 * Manually checking update.
		 * @param sender
		 * @param args
		 */
		private function OnMenuCheckUpdate(sender:Object, args:EventArgs):void
		{
			this.version.Check(false);
		}

		/**
		 * Display about dialog.
		 * @param sender
		 * @param args
		 */
		private function OnMenuAbout(sender:Object, args:EventArgs):void
		{
			var msg = ''
				+ 'YCombo GUI ' + this.version.NUMBER + '\n'
				+ 'Copyright(c) 2012 Alibaba.Com, Inc.\n'
				+ 'MIT Licensed\n\n'

				+ '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n\n'

				+ 'Author:\t\tNanqiao Deng <nanqiao.dengnq@alibaba-inc.com>\n'
				+ 'Credits:\t\tUI Assistant: Dan Ye <sandy.yed@alibaba-inc.com>\n'
				+ '        \t\tSoy Sauce: Nuo Xu <nuo.xun@alibaba-inc.com>\n\n'

				+ 'This product is the frontend of YCombo, which includes software from YAHOO YUI Compressor.\n\n'

				+ 'Icons used by this product are created by Everaldo Coelho, Visual Pharm and FatCow Web Hosting.';

			MessageBox.Show(msg, 'About', MessageBoxButtons.OK);
		}

		/**
		 * Write YCombo messages to output area.
		 * @param sender
		 * @param args
		 */
		private function OnYComboFeedback(sender:Object, args:JsEventArgs):void
		{
			var type = args.Type,
				msg = String(args.Data);

			Eval('output.' + type + '("' + escape(msg) + '");');
		}

		/**
		 * Unlock panel when YCombo finished.
		 * @param sender
		 * @param args
		 */
		private function OnYComboExited(sender:Object, args:JsEventArgs):void
		{
			Eval('panel.unlock();');
		}

		/**
		 * Infom user the fatal error and exit application.
		 * @param sender
		 * @param args
		 */
		private function OnYComboFatalError(sender:Object, args:JsEventArgs):void
		{
			var message = String(args.Data);

			MessageBox.Show(message, 'Error');
			Environment.Exit(1);
		}

		/**
		 * Inform user when no new version found.
		 * @param sender
		 * @param args
		 */
		private function OnVersionUnchange(sender:Object, args:JsEventArgs):void
		{
			var currentNumber = String(args.Data.currentNumber);

			var msg = ''
				+ 'No New Version :-(\n\n'

				+ '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n\n'

				+ 'Your Version:\t' + currentNumber + '\n'
				+ 'Latest Version:\t' + currentNumber + '\n';


			MessageBox.Show(msg, 'Version Check', MessageBoxButtons.OK);
		}

		/**
		 * Inform user when new version found.
		 * @param sender
		 * @param args
		 */
		private function OnVersionUpdated(sender:Object, args:JsEventArgs):void
		{
			var currentNumber = String(args.Data.currentNumber),
				downloadURL = String(args.Data.downloadURL),
				log = String(args.Data.log),
				newNumber = String(args.Data.newNumber);

			var msg = ''
				+ 'New Version Found :-)\n\n'

				+ '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n\n'

				+ 'Your Version:\t' + currentNumber + '\n'
				+ 'Latest Version:\t' + newNumber + '\n\n'

				+ 'Change Log:\n'
				+ log + '\n\n'

				+ 'Download Now?';


			if (MessageBox.Show(msg, 'Version Check', MessageBoxButtons.YesNo) == System.Windows.Forms.DialogResult.Yes) {
				Process.Start(downloadURL);
			};
		}

		/**
		 * Inform user when error occurred during version check.
		 * @param sender
		 * @param args
		 */
		private function OnVersionError(sender:Object, args:JsEventArgs):void
		{
			var error = String(args.Data);

			MessageBox.Show(
				'Network problem occurred during Version Check :-(\n\n' +

				'Error Detail: ' + error,

				'Version Check'
			);
		}

		/**
		 * Add initial inputs into input list when HTML UI is ready.
		 * @param sender
		 * @param args
		 */
		private function onDocumentCompleted(sender:Object, args:WebBrowserDocumentCompletedEventArgs):void
		{
			for (var i = 0; i < this.initialInput.length; ++i) {
				AddInput(this.initialInput[i]);
			}
		}

		/**
		 * Add dragged-in file into input list.
		 * @param sender
		 * @param args
		 */
		private function onNavigating(sender:Object, args:WebBrowserNavigatingEventArgs):void
		{
			var path;

			// Prevent page redirecting to the dragged-in file.
			args.Cancel = true;

			try {
				path = args.Url.ToString().match(/^file\:\/\/\/(.*)/)[1];
				path = Path.GetFullPath(path);
				AddInput(path);
			} catch (e) {}
		}
	}
}

// Start Application.
Application.EnableVisualStyles();
Application.Run(new Alibaba.F2E.YComboGUI.App(Environment.GetCommandLineArgs()));