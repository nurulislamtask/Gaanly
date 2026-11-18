; Gaanly: hooks for the electron-builder NSIS installer (picked up automatically from build/installer.nsh).
;
; The user's library lives in %APPDATA%\Gaanly\data, outside the install folder, and the installer
; never removes it ("deleteAppDataOnUninstall": false, and updates always keep app data).
; As a second safety net, copy it aside before the old version is replaced.

!macro customInit
  Push $R0
  ; Electron keeps app data per user, whatever the install mode: use the user's own Roaming folder.
  ReadEnvStr $R0 APPDATA
  IfFileExists "$R0\Gaanly\data\library.json" 0 gaanly_no_library
    CreateDirectory "$R0\Gaanly\backups"
    CopyFiles /SILENT "$R0\Gaanly\data\library.json" "$R0\Gaanly\backups\library-before-install-${VERSION}.json"
  gaanly_no_library:
  Pop $R0
!macroend
