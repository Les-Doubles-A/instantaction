; Installeur Inno Setup de instantaction. Compilation : iscc installer\instantaction.iss
; Le setup est cree dans installer\Output\instantaction-Setup-1.0.0.exe
#define MyAppName "instantaction"
#define MyAppVersion "1.0.0"
#define MyAppURL "https://github.com/Les-Doubles-A/instantaction"

[Setup]
AppId={{938FA468-A32B-5EBA-8822-0EB53BA5D71A}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher=Les-Doubles-A
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}/releases
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
OutputDir=Output
OutputBaseFilename={#MyAppName}-Setup-{#MyAppVersion}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
CloseApplications=yes
SetupIconFile=instantaction.ico
UninstallDisplayIcon={app}\instantaction.ico
InfoAfterFile=INSTALLATION.txt
Uninstallable=yes

[Languages]
Name: "french"; MessagesFile: "compiler:Languages\French.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "INSTALLATION.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "instantaction.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\manifest.json"; DestDir: "{app}\extension"; Flags: ignoreversion
Source: "..\actions\*"; DestDir: "{app}\extension\actions"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\background\*"; DestDir: "{app}\extension\background"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\content\*"; DestDir: "{app}\extension\content"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\icons\*"; DestDir: "{app}\extension\icons"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\notes\*"; DestDir: "{app}\extension\notes"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\options\*"; DestDir: "{app}\extension\options"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\popup\*"; DestDir: "{app}\extension\popup"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\shared\*"; DestDir: "{app}\extension\shared"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\{#MyAppName} - dossier de l'extension"; Filename: "{app}\extension"; IconFilename: "{app}\instantaction.ico"
Name: "{autoprograms}\{#MyAppName} - instructions"; Filename: "{app}\INSTALLATION.txt"

[Run]
Filename: "{app}\extension"; Description: "Ouvrir le dossier de l'extension"; Flags: postinstall shellexec skipifsilent nowait
