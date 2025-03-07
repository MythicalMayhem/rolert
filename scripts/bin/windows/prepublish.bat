@echo off
setlocal EnableDelayedExpansion

@REM del C:\Users\ameur\Desktop\rolert.pkg\out\*.d.ts
 

for %%f in ("out/*") do (
	echo %%f | findstr /r "index.d.ts" > nul  
	set is_index=!errorlevel!
	
	echo %%f | findstr /r "\.d\.ts" > nul
	set is_dts=!errorlevel!
	
	if !is_dts! equ 0 if !is_index! equ 1 (
			del %CD%\out\%%f 
		)
	 

)
  