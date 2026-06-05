@echo off
rem Launches the Workflow Runner local server. Prefers the bundled
rem embeddable Python in .\python\ (set up via setup-python.cmd) so the
rem app works on machines without a system-wide Python install. Falls
rem back to whatever "python" resolves to on PATH if the bundled copy
rem isn't there — useful while developing.

if exist "%~dp0python\python.exe" (
  "%~dp0python\python.exe" "%~dp0server.py" %*
) else (
  python "%~dp0server.py" %*
)
