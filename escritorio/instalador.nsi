Unicode true
ManifestDPIAware true
!include "MUI2.nsh"
!define NOMBRE "Cierre Cignetti"
!define VERSION "1.0.0"
!define EXE "Cierre Cignetti.exe"
!define REGKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\CierreCignetti"
Name "${NOMBRE}"
OutFile "out/Instalar Cierre Cignetti.exe"
InstallDir "$LOCALAPPDATA\Programs\${NOMBRE}"
RequestExecutionLevel user
SetCompressor /SOLID lzma
BrandingText "${NOMBRE} ${VERSION}"
VIProductVersion "${VERSION}.0"
VIAddVersionKey /LANG=1034 "ProductName" "${NOMBRE}"
VIAddVersionKey /LANG=1034 "FileDescription" "Instalador de ${NOMBRE}"
VIAddVersionKey /LANG=1034 "FileVersion" "${VERSION}"
VIAddVersionKey /LANG=1034 "CompanyName" "Mateo Gutiérrez"
VIAddVersionKey /LANG=1034 "LegalCopyright" "Mateo Gutiérrez"
!define MUI_ICON "pkg/resources/app/icono.ico"
!define MUI_UNICON "pkg/resources/app/icono.ico"
!define MUI_FINISHPAGE_RUN "$INSTDIR\${EXE}"
!define MUI_FINISHPAGE_RUN_TEXT "Abrir ${NOMBRE}"
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "Spanish"

Section "Instalar"
  nsExec::Exec 'taskkill /F /IM "${EXE}"'
  Sleep 800
  RMDir /r "$INSTDIR\resources\app"
  SetOutPath "$INSTDIR"
  File /r "pkg/*"
  WriteUninstaller "$INSTDIR\Desinstalar.exe"
  CreateShortCut "$DESKTOP\${NOMBRE}.lnk" "$INSTDIR\${EXE}" "" "$INSTDIR\${EXE}" 0
  CreateDirectory "$SMPROGRAMS\${NOMBRE}"
  CreateShortCut "$SMPROGRAMS\${NOMBRE}\${NOMBRE}.lnk" "$INSTDIR\${EXE}" "" "$INSTDIR\${EXE}" 0
  CreateShortCut "$SMPROGRAMS\${NOMBRE}\Desinstalar ${NOMBRE}.lnk" "$INSTDIR\Desinstalar.exe"
  WriteRegStr HKCU "${REGKEY}" "DisplayName" "${NOMBRE}"
  WriteRegStr HKCU "${REGKEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "${REGKEY}" "Publisher" "Mateo Gutiérrez"
  WriteRegStr HKCU "${REGKEY}" "DisplayIcon" "$INSTDIR\${EXE}"
  WriteRegStr HKCU "${REGKEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${REGKEY}" "UninstallString" '"$INSTDIR\Desinstalar.exe"'
  WriteRegDWORD HKCU "${REGKEY}" "NoModify" 1
  WriteRegDWORD HKCU "${REGKEY}" "NoRepair" 1
SectionEnd

Section "Uninstall"
  nsExec::Exec 'taskkill /F /IM "${EXE}"'
  Sleep 800
  Delete "$DESKTOP\${NOMBRE}.lnk"
  RMDir /r "$SMPROGRAMS\${NOMBRE}"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKCU "${REGKEY}"
SectionEnd
