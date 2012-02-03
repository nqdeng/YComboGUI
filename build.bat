@rc res\resources.rc
@rc res\icon.rc
@C:\Windows\Microsoft.NET\Framework\v2.0.50727\jsc.exe src\Resources.js
@Resources.exe

@C:\Windows\Microsoft.NET\Framework\v2.0.50727\jsc.exe /t:winexe /r:lib\Alibaba.F2E.JsEventEmitter.dll /resource:res\icon.resources /win32res:res\icon.res /out:bin\app.exe src\App.js src\YRunner.js src\Version.js
@C:\Windows\Microsoft.NET\Framework\v2.0.50727\jsc.exe /t:library /win32res:res\resources.res /out:bin\YComboGUI.Resources.dll src\Empty.js
@ilmerge /t:winexe /ndebug /out:bin\YComboGUI.exe bin\app.exe lib\Alibaba.F2E.JsEventEmitter.dll

@del Resources.exe
@del bin\app.exe
@del res\resources.res
@del res\icon.res
@del res\icon.resources