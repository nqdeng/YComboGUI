/**
 * YCombo GUI - Resources Generator
 * Copyright(c) 2012 Alibaba.Com, Inc.
 * MIT Licensed
 */

import System;
import System.Drawing;
import System.Resources;

// Generate managed resources file.
(function Main() {
	var rw = new ResourceWriter('res\\icon.resources');
	rw.AddResource('AppIcon', new Icon('res\\tree.ico'));
	rw.Generate();
	rw.Close();
})();